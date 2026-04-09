"use client";

import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import { findSidebarItem } from "@/data/adminNavigation";
import {
	fetchActiveCategoriesForAds,
	fetchHomePlacementsConfig,
	fetchHomePromoSectionConfig,
	updateHomePlacementsConfig,
	updateHomePromoSectionConfig,
} from "@/lib/adminApi";
import { toErrorMessage } from "@/lib/adminClient";

type BannerKey = "leftImage" | "middleImage" | "rightImage";

type HomePlacementsForm = {
	leftImage: string;
	middleImage: string;
	rightImage: string;
};

const PROMO_CARD_SPECS = [
	{ cardId: "card-1", title: "Card 1", width: 900, height: 1200, ratio: "3:4" },
	{ cardId: "card-2", title: "Card 2", width: 900, height: 1200, ratio: "3:4" },
	{ cardId: "card-3", title: "Card 3", width: 900, height: 1200, ratio: "3:4" },
	{ cardId: "card-4", title: "Card 4", width: 900, height: 1200, ratio: "3:4" },
	{ cardId: "card-5", title: "Card 5", width: 900, height: 1200, ratio: "3:4" },
] as const;

type PromoCardId = (typeof PROMO_CARD_SPECS)[number]["cardId"];

type PromoCardForm = {
	cardId: PromoCardId;
	categoryId: string;
	image: string;
};

type PromoSectionForm = {
	heading: string;
	cards: PromoCardForm[];
};

type PromoCategoryOption = {
	id: string;
	name: string;
	slug?: string;
};

type PromoSectionApiShape = {
	heading?: string;
	cards?: Array<{
		cardId?: string;
		categoryId?: string;
		image?: string;
	}>;
};

const MEDIA_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PROMO_DEFAULT_HEADING = "Featured Offers";

const BANNER_SPECS: Array<{
	key: BannerKey;
	title: string;
	width: number;
	height: number;
	ratio: string;
	coverage: string;
	previewClass: string;
}> = [
	{
		key: "leftImage",
		title: "Left Banner",
		width: 1600,
		height: 900,
		ratio: "16:9",
		coverage: "40% width",
		previewClass: "md:col-span-2 lg:col-span-4",
	},
	{
		key: "middleImage",
		title: "Middle Banner",
		width: 1200,
		height: 900,
		ratio: "4:3",
		coverage: "30% width",
		previewClass: "lg:col-span-3",
	},
	{
		key: "rightImage",
		title: "Right Banner",
		width: 1200,
		height: 900,
		ratio: "4:3",
		coverage: "30% width",
		previewClass: "lg:col-span-3",
	},
];

const BANNER_HEIGHT_CLASS = "h-[170px] sm:h-[190px] lg:h-[200px]";
const PROMO_CARD_HEIGHT_CLASS = "h-[210px] sm:h-[220px]";

const EMPTY_FORM: HomePlacementsForm = {
	leftImage: "",
	middleImage: "",
	rightImage: "",
};

const normalizeMedia = (value: string) => String(value || "").trim();

const isValidMedia = (value: string) => {
	const normalized = normalizeMedia(value);
	if (!normalized) return true;
	return MEDIA_URL_REGEX.test(normalized) || IMAGE_DATA_URL_REGEX.test(normalized);
};

const fileToDataUrl = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			if (!result) {
				reject(new Error("Could not read the selected file"));
				return;
			}
			resolve(result);
		};
		reader.onerror = () => reject(new Error("Could not read the selected file"));
		reader.readAsDataURL(file);
	});

const normalizePromoForm = (section?: PromoSectionApiShape): PromoSectionForm => {
	const cardsInput = Array.isArray(section?.cards) ? section.cards : [];
	const cardById = new Map(
		cardsInput
			.map((card) => ({
				cardId: String(card?.cardId || "").trim(),
				categoryId: String(card?.categoryId || "").trim(),
				image: normalizeMedia(String(card?.image || "")),
			}))
			.filter((card) => card.cardId)
			.map((card) => [card.cardId, card])
	);

	return {
		heading: String(section?.heading || "").trim() || PROMO_DEFAULT_HEADING,
		cards: PROMO_CARD_SPECS.map((spec) => {
			const card = cardById.get(spec.cardId);
			return {
				cardId: spec.cardId,
				categoryId: card?.categoryId || "",
				image: card?.image || "",
			};
		}),
	};
};

const toPromoUpdatePayload = (form: PromoSectionForm) => ({
	heading: String(form.heading || "").trim(),
	cards: form.cards.map((card) => ({
		cardId: card.cardId,
		categoryId: String(card.categoryId || "").trim() || undefined,
		image: normalizeMedia(card.image) || undefined,
	})),
});

export default function AdsPage() {
	return (
		<Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
			<AdsPageContent />
		</Suspense>
	);
}

function AdsPageContent() {
	const searchParams = useSearchParams();
	const viewId = searchParams.get("view") || "home-placements";
	const activeItem = findSidebarItem(viewId);
	const isHomePlacementsView = viewId === "home-placements";
	const isPartnersPromotionsView = viewId === "partners-promotions";

	const [form, setForm] = useState<HomePlacementsForm>(EMPTY_FORM);
	const [promoForm, setPromoForm] = useState<PromoSectionForm>(normalizePromoForm(undefined));
	const [promoCategories, setPromoCategories] = useState<PromoCategoryOption[]>([]);

	const [loading, setLoading] = useState(isHomePlacementsView || isPartnersPromotionsView);
	const [saving, setSaving] = useState(false);
	const [promoSaving, setPromoSaving] = useState(false);
	const [uploadingKey, setUploadingKey] = useState<BannerKey | null>(null);
	const [deletingKey, setDeletingKey] = useState<BannerKey | null>(null);
	const [promoUploadingCardId, setPromoUploadingCardId] = useState<PromoCardId | null>(null);
	const [promoDeletingCardId, setPromoDeletingCardId] = useState<PromoCardId | null>(null);

	const [message, setMessage] = useState<string | null>(null);
	const [errorText, setErrorText] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Partial<Record<BannerKey, string>>>({});
	const [promoUploadErrors, setPromoUploadErrors] = useState<Partial<Record<PromoCardId, string>>>({});

	useEffect(() => {
		if (!isHomePlacementsView) return;

		let active = true;

		const load = async () => {
			setLoading(true);
			setErrorText(null);

			try {
				const placements = await fetchHomePlacementsConfig();
				if (!active) return;

				setForm({
					leftImage: normalizeMedia(placements.leftImage || ""),
					middleImage: normalizeMedia(placements.middleImage || ""),
					rightImage: normalizeMedia(placements.rightImage || ""),
				});
			} catch (loadError) {
				if (!active) return;
				setErrorText(toErrorMessage(loadError, "Failed to load home placements"));
			} finally {
				if (!active) return;
				setLoading(false);
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [isHomePlacementsView]);

	useEffect(() => {
		if (!isPartnersPromotionsView) return;

		let active = true;

		const load = async () => {
			setLoading(true);
			setErrorText(null);

			try {
				const [section, categories] = await Promise.all([
					fetchHomePromoSectionConfig(),
					fetchActiveCategoriesForAds(),
				]);

				if (!active) return;

				setPromoForm(normalizePromoForm(section));
				setPromoCategories(
					categories.map((item) => ({
						id: item.id,
						name: item.name,
						slug: item.slug,
					}))
				);
			} catch (loadError) {
				if (!active) return;
				setErrorText(toErrorMessage(loadError, "Failed to load partners promotions"));
			} finally {
				if (!active) return;
				setLoading(false);
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [isPartnersPromotionsView]);

	const hasInvalidInput = useMemo(
		() => BANNER_SPECS.some((item) => !isValidMedia(form[item.key])),
		[form]
	);

	const hasPromoInvalidInput = useMemo(
		() => promoForm.cards.some((card) => !isValidMedia(card.image)),
		[promoForm]
	);

	const setField = (key: BannerKey, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setUploadErrors((prev) => ({ ...prev, [key]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const setPromoCardField = (cardId: PromoCardId, patch: Partial<PromoCardForm>) => {
		setPromoForm((prev) => ({
			...prev,
			cards: prev.cards.map((card) => (card.cardId === cardId ? { ...card, ...patch } : card)),
		}));
		setPromoUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const handleSave = async () => {
		if (!isHomePlacementsView) return;

		setErrorText(null);
		setMessage(null);

		if (hasInvalidInput) {
			setErrorText("Please provide valid image URLs or uploaded image data.");
			return;
		}

		setSaving(true);
		try {
			const placements = await updateHomePlacementsConfig({
				leftImage: normalizeMedia(form.leftImage),
				middleImage: normalizeMedia(form.middleImage),
				rightImage: normalizeMedia(form.rightImage),
			});

			setForm({
				leftImage: normalizeMedia(placements.leftImage || ""),
				middleImage: normalizeMedia(placements.middleImage || ""),
				rightImage: normalizeMedia(placements.rightImage || ""),
			});
			setMessage("Home banner placements updated successfully.");
		} catch (saveError) {
			setErrorText(toErrorMessage(saveError, "Failed to update home placements"));
		} finally {
			setSaving(false);
		}
	};

	const handleSavePromoSection = async () => {
		if (!isPartnersPromotionsView) return;

		setErrorText(null);
		setMessage(null);

		if (hasPromoInvalidInput) {
			setErrorText("Please provide valid image URLs or uploaded image data for promo cards.");
			return;
		}

		setPromoSaving(true);
		try {
			const section = await updateHomePromoSectionConfig(toPromoUpdatePayload(promoForm));
			setPromoForm(normalizePromoForm(section));
			setMessage("Partners promotions updated successfully.");
		} catch (saveError) {
			setErrorText(toErrorMessage(saveError, "Failed to update partners promotions"));
		} finally {
			setPromoSaving(false);
		}
	};

	const handleUpload = async (key: BannerKey, event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setUploadErrors((prev) => ({ ...prev, [key]: "Please upload image files only." }));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			setUploadErrors((prev) => ({ ...prev, [key]: "Image must be below 10MB." }));
			return;
		}

		const previousForm = {
			leftImage: normalizeMedia(form.leftImage),
			middleImage: normalizeMedia(form.middleImage),
			rightImage: normalizeMedia(form.rightImage),
		};

		try {
			const imageData = await fileToDataUrl(file);
			const nextForm = {
				leftImage: key === "leftImage" ? imageData : previousForm.leftImage,
				middleImage: key === "middleImage" ? imageData : previousForm.middleImage,
				rightImage: key === "rightImage" ? imageData : previousForm.rightImage,
			};

			setForm(nextForm);
			setMessage(null);
			setErrorText(null);
			setUploadErrors((prev) => ({ ...prev, [key]: undefined }));
			setUploadingKey(key);

			const placements = await updateHomePlacementsConfig(nextForm);
			setForm({
				leftImage: normalizeMedia(placements.leftImage || ""),
				middleImage: normalizeMedia(placements.middleImage || ""),
				rightImage: normalizeMedia(placements.rightImage || ""),
			});

			const bannerLabel = BANNER_SPECS.find((item) => item.key === key)?.title || "Banner";
			setMessage(`${bannerLabel} image updated successfully.`);
		} catch {
			setForm(previousForm);
			setUploadErrors((prev) => ({ ...prev, [key]: "Unable to upload selected image." }));
		} finally {
			setUploadingKey(null);
		}
	};

	const handlePromoUpload = async (cardId: PromoCardId, event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setPromoUploadErrors((prev) => ({ ...prev, [cardId]: "Please upload image files only." }));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			setPromoUploadErrors((prev) => ({ ...prev, [cardId]: "Image must be below 10MB." }));
			return;
		}

		const previousForm = {
			heading: promoForm.heading,
			cards: promoForm.cards.map((card) => ({ ...card })),
		};

		try {
			const imageData = await fileToDataUrl(file);
			const nextForm: PromoSectionForm = {
				heading: previousForm.heading,
				cards: previousForm.cards.map((card) =>
					card.cardId === cardId
						? {
								...card,
								image: imageData,
							}
						: card
				),
			};

			setPromoForm(nextForm);
			setPromoUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
			setMessage(null);
			setErrorText(null);
			setPromoUploadingCardId(cardId);

			const section = await updateHomePromoSectionConfig(toPromoUpdatePayload(nextForm));
			setPromoForm(normalizePromoForm(section));
			setMessage(`${PROMO_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Card"} image updated successfully.`);
		} catch {
			setPromoForm(previousForm);
			setPromoUploadErrors((prev) => ({ ...prev, [cardId]: "Unable to upload selected image." }));
		} finally {
			setPromoUploadingCardId(null);
		}
	};

	const handleDelete = async (key: BannerKey) => {
		const currentValue = normalizeMedia(form[key]);
		if (!currentValue || deletingKey || uploadingKey) return;

		const bannerLabel = BANNER_SPECS.find((item) => item.key === key)?.title || "Banner";
		const confirmed = window.confirm(`Delete ${bannerLabel} image? This will remove it from homepage.`);
		if (!confirmed) return;

		setMessage(null);
		setErrorText(null);
		setUploadErrors((prev) => ({ ...prev, [key]: undefined }));
		setDeletingKey(key);

		try {
			const placements = await updateHomePlacementsConfig({
				leftImage: key === "leftImage" ? "" : normalizeMedia(form.leftImage),
				middleImage: key === "middleImage" ? "" : normalizeMedia(form.middleImage),
				rightImage: key === "rightImage" ? "" : normalizeMedia(form.rightImage),
			});

			setForm({
				leftImage: normalizeMedia(placements.leftImage || ""),
				middleImage: normalizeMedia(placements.middleImage || ""),
				rightImage: normalizeMedia(placements.rightImage || ""),
			});

			setMessage(`${bannerLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${bannerLabel.toLowerCase()} image`));
		} finally {
			setDeletingKey(null);
		}
	};

	const handlePromoDelete = async (cardId: PromoCardId) => {
		const card = promoForm.cards.find((item) => item.cardId === cardId);
		if (!card || !normalizeMedia(card.image) || promoDeletingCardId || promoUploadingCardId) return;

		const cardLabel = PROMO_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Card";
		const confirmed = window.confirm(`Delete ${cardLabel} background image?`);
		if (!confirmed) return;

		const nextForm: PromoSectionForm = {
			heading: promoForm.heading,
			cards: promoForm.cards.map((item) =>
				item.cardId === cardId
					? {
							...item,
							image: "",
						}
					: item
			),
		};

		setMessage(null);
		setErrorText(null);
		setPromoUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setPromoDeletingCardId(cardId);

		try {
			const section = await updateHomePromoSectionConfig(toPromoUpdatePayload(nextForm));
			setPromoForm(normalizePromoForm(section));
			setMessage(`${cardLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${cardLabel.toLowerCase()} image`));
		} finally {
			setPromoDeletingCardId(null);
		}
	};

	const saveDisabled =
		loading ||
		uploadingKey !== null ||
		deletingKey !== null ||
		promoUploadingCardId !== null ||
		promoDeletingCardId !== null ||
		(isHomePlacementsView ? saving : promoSaving);

	const showSaveButton = isHomePlacementsView || isPartnersPromotionsView;

	return (
		<AdminShell title="Homepage Layout" subtitle="Manage homepage banners and category-linked cards.">
			<PageLayout
				title={activeItem?.label || "Header Banners"}
				subtitle={
					isPartnersPromotionsView
						? "Configure the dynamic promotional card section displayed below homepage categories."
						: "Upload and preview homepage banner images in the same 40/30/30 layout used on the website."
				}
				actions={
					showSaveButton ? (
						<button
							type="button"
							onClick={() => {
								if (isHomePlacementsView) {
									void handleSave();
									return;
								}
								void handleSavePromoSection();
							}}
							disabled={saveDisabled}
							className="rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isHomePlacementsView
								? saving
									? "Saving..."
									: "Save Header Banners"
								: promoSaving
									? "Saving..."
									: "Save Category Link Cards"}
						</button>
					) : undefined
				}
			>
				{!isHomePlacementsView && !isPartnersPromotionsView ? (
					<section className="rounded-xl border border-(--border) bg-(--surface-muted) p-4">
						<p className="text-sm text-(--text-soft)">
							{activeItem?.label || "This placement"} module is ready for API integration.
						</p>
					</section>
				) : (
					<>
						{message ? (
							<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p>
						) : null}

						{errorText ? (
							<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{errorText}</p>
						) : null}

						{isHomePlacementsView ? (
							<section className="rounded-xl border border-(--border) bg-(--surface) p-4">
								<h3 className="text-base font-semibold text-(--text-strong)">Homepage Preview (40/30/30)</h3>
								<div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-10">
									{BANNER_SPECS.map((item) => {
										const image = normalizeMedia(form[item.key]);
										const invalid = Boolean(image && !isValidMedia(image));
										const hasImage = Boolean(image);
										const isUploadingCurrent = uploadingKey === item.key;
										const isDeletingCurrent = deletingKey === item.key;

										return (
											<article
												key={`preview-${item.key}`}
												className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${item.previewClass}`}
											>
												<p className="text-sm font-semibold text-slate-900">{item.title}</p>

												<div className={`${BANNER_HEIGHT_CLASS} mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}>
													{image ? (
														<img src={image} alt={`${item.title} preview`} className="block h-full w-full object-cover" loading="lazy" />
													) : (
														<div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
															<span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-600 text-2xl font-semibold leading-none text-white">^</span>
															<p className="text-sm font-semibold tracking-wide text-slate-800">
																RECOMMENDED SIZE : {item.width} X {item.height}
															</p>
														</div>
													)}
												</div>

												<div className="mt-2 space-y-0.5 text-xs text-slate-500">
													<p>Recommended: {item.width} x {item.height}px</p>
													<p>Ratio: {item.ratio}</p>
												</div>

												<div className="mt-2 flex flex-wrap items-center gap-2">
													<label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
														Upload
														<input
															type="file"
															accept="image/*"
															className="hidden"
															disabled={isDeletingCurrent || isUploadingCurrent || loading}
															onChange={(event) => void handleUpload(item.key, event)}
														/>
													</label>
													<button
														type="button"
														onClick={() => void handleDelete(item.key)}
														disabled={!hasImage || isDeletingCurrent || isUploadingCurrent || loading}
														className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{isDeletingCurrent ? "Deleting..." : "Delete"}
													</button>
												</div>

												{isUploadingCurrent ? (
													<p className="mt-2 text-xs text-cyan-700">Uploading and saving image...</p>
												) : null}

												{uploadErrors[item.key] ? (
													<p className="mt-2 text-xs text-rose-700">{uploadErrors[item.key]}</p>
												) : null}

												{invalid ? (
													<p className="mt-2 text-xs text-rose-700">Image must be a valid URL or uploaded image data.</p>
												) : null}
											</article>
										);
									})}
								</div>
							</section>
						) : null}

						{isPartnersPromotionsView ? (
							<section className="rounded-xl border border-(--border) bg-(--surface) p-4">
								<h3 className="text-base font-semibold text-(--text-strong)">Homepage Dynamic Promo Cards</h3>
								<label className="mt-3 block text-xs text-slate-600">
									Section heading
									<input
										value={promoForm.heading}
										onChange={(event) => {
											setPromoForm((prev) => ({ ...prev, heading: event.target.value }));
											setMessage(null);
											setErrorText(null);
										}}
										placeholder="Featured Offers"
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
									/>
								</label>

								<div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
									{PROMO_CARD_SPECS.map((spec) => {
										const card = promoForm.cards.find((item) => item.cardId === spec.cardId) || {
											cardId: spec.cardId,
											categoryId: "",
											image: "",
										};
										const image = normalizeMedia(card.image);
										const hasImage = Boolean(image);
										const invalid = Boolean(image && !isValidMedia(image));
										const isUploadingCurrent = promoUploadingCardId === spec.cardId;
										const isDeletingCurrent = promoDeletingCardId === spec.cardId;
										const selectedCategory = promoCategories.find((item) => item.id === card.categoryId);

										return (
											<article key={spec.cardId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
												<p className="text-sm font-semibold text-slate-900">{spec.title}</p>

												<div className={`${PROMO_CARD_HEIGHT_CLASS} mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}>
													{image ? (
														<img src={image} alt={`${spec.title} preview`} className="block h-full w-full object-cover" loading="lazy" />
													) : (
														<div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
															<span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-600 text-2xl font-semibold leading-none text-white">^</span>
															<p className="text-sm font-semibold tracking-wide text-slate-800">
																RECOMMENDED SIZE : {spec.width} X {spec.height}
															</p>
														</div>
													)}
												</div>

												<div className="mt-2 space-y-0.5 text-xs text-slate-500">
												</div>

												<label className="mt-2 block text-xs text-slate-600">
													Link category
													<select
														value={card.categoryId}
														onChange={(event) => setPromoCardField(spec.cardId, { categoryId: event.target.value })}
														disabled={loading || isUploadingCurrent || isDeletingCurrent}
														className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
													>
														<option value="">Select category</option>
														{promoCategories.map((category) => (
															<option key={category.id} value={category.id}>
																{category.name}
															</option>
														))}
													</select>
												</label>

												<p className="mt-1 text-[11px] text-slate-500">
													{selectedCategory?.slug ? `Link: /category/${selectedCategory.slug}` : "Link: not selected"}
												</p>

												<div className="mt-2 flex flex-wrap items-center gap-2">
													<label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
														Upload
														<input
															type="file"
															accept="image/*"
															className="hidden"
															disabled={loading || isUploadingCurrent || isDeletingCurrent}
															onChange={(event) => void handlePromoUpload(spec.cardId, event)}
														/>
													</label>
													<button
														type="button"
														onClick={() => void handlePromoDelete(spec.cardId)}
														disabled={!hasImage || loading || isUploadingCurrent || isDeletingCurrent}
														className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{isDeletingCurrent ? "Deleting..." : "Delete"}
													</button>
												</div>

												{isUploadingCurrent ? (
													<p className="mt-2 text-xs text-cyan-700">Uploading and saving image...</p>
												) : null}

												{promoUploadErrors[spec.cardId] ? (
													<p className="mt-2 text-xs text-rose-700">{promoUploadErrors[spec.cardId]}</p>
												) : null}

												{invalid ? (
													<p className="mt-2 text-xs text-rose-700">Image must be a valid URL or uploaded image data.</p>
												) : null}
											</article>
										);
									})}
								</div>
							</section>
						) : null}
					</>
				)}
			</PageLayout>
		</AdminShell>
	);
}
