"use client";

import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import { findSidebarItem } from "@/data/adminNavigation";
import {
	fetchActiveCategoriesForAds,
	fetchHomeExploreSectionConfig,
	fetchHomePlacementsConfig,
	fetchHomePromoSectionConfig,
	fetchHomeSponsorSectionConfig,
	fetchHomeWellnessSectionConfig,
	updateHomeExploreSectionConfig,
	updateHomePlacementsConfig,
	updateHomePromoSectionConfig,
	updateHomeSponsorSectionConfig,
	updateHomeWellnessSectionConfig,
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

const EXPLORE_CARD_SPECS = [
	{ cardId: "card-1", title: "Explore Card 1", width: 1600, height: 720, ratio: "20:9" },
	{ cardId: "card-2", title: "Explore Card 2", width: 1600, height: 720, ratio: "20:9" },
	{ cardId: "card-3", title: "Explore Card 3", width: 1600, height: 720, ratio: "20:9" },
	{ cardId: "card-4", title: "Explore Card 4", width: 1600, height: 720, ratio: "20:9" },
	{ cardId: "card-5", title: "Explore Card 5", width: 1600, height: 720, ratio: "20:9" },
] as const;

const WELLNESS_CARD_SPECS = [
	{ cardId: "card-1", title: "Wellness Card 1", width: 1000, height: 1400, ratio: "5:7" },
	{ cardId: "card-2", title: "Wellness Card 2", width: 1000, height: 1400, ratio: "5:7" },
	{ cardId: "card-3", title: "Wellness Card 3", width: 1000, height: 1400, ratio: "5:7" },
	{ cardId: "card-4", title: "Wellness Card 4", width: 1000, height: 1400, ratio: "5:7" },
	{ cardId: "card-5", title: "Wellness Card 5", width: 1000, height: 1400, ratio: "5:7" },
] as const;

const SPONSOR_CARD_SPECS = [
	{ cardId: "card-1", title: "Sponsor Card 1", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-2", title: "Sponsor Card 2", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-3", title: "Sponsor Card 3", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-4", title: "Sponsor Card 4", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-5", title: "Sponsor Card 5", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-6", title: "Sponsor Card 6", width: 1200, height: 640, ratio: "15:8" },
	{ cardId: "card-7", title: "Sponsor Card 7", width: 1200, height: 640, ratio: "15:8" },
] as const;

type HomeCardId = (typeof SPONSOR_CARD_SPECS)[number]["cardId"];

type PromoCardForm = {
	cardId: HomeCardId;
	categoryId: string;
	title: string;
	image: string;
	link: string;
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
		title?: string;
		image?: string;
		link?: string;
	}>;
};

const MEDIA_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PROMO_DEFAULT_HEADING = "Featured Offers";
const EXPLORE_DEFAULT_HEADING = "Explore";
const WELLNESS_DEFAULT_HEADING = "Health & Wellness";
const SPONSOR_DEFAULT_HEADING = "Brand Partners";
const SPONSOR_LINK_REGEX = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;

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
const EXPLORE_CARD_HEIGHT_CLASS = "h-[130px] sm:h-[145px]";
const WELLNESS_CARD_HEIGHT_CLASS = "h-[245px] sm:h-[275px]";

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

const isValidSponsorLink = (value: string) => {
	const normalized = String(value || "").trim();
	if (!normalized) return true;
	return SPONSOR_LINK_REGEX.test(normalized);
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

const normalizeSectionForm = (
	section: PromoSectionApiShape | undefined,
	specs: ReadonlyArray<{ cardId: HomeCardId }>,
	defaultHeading: string
): PromoSectionForm => {
	const cardsInput = Array.isArray(section?.cards) ? section.cards : [];
	const cardById = new Map(
		cardsInput
			.map((card) => ({
				cardId: String(card?.cardId || "").trim(),
				categoryId: String(card?.categoryId || "").trim(),
				title: String(card?.title || "").trim(),
				image: normalizeMedia(String(card?.image || "")),
				link: String(card?.link || "").trim(),
			}))
			.filter((card) => card.cardId)
			.map((card) => [card.cardId, card])
	);

	return {
		heading: String(section?.heading || "").trim() || defaultHeading,
		cards: specs.map((spec) => {
			const card = cardById.get(spec.cardId);
			return {
				cardId: spec.cardId,
				categoryId: card?.categoryId || "",
				title: card?.title || "",
				image: card?.image || "",
				link: card?.link || "",
			};
		}),
	};
};

const toPromoUpdatePayload = (form: PromoSectionForm) => ({
	heading: String(form.heading || "").trim(),
	cards: form.cards.map((card) => ({
		cardId: card.cardId,
		categoryId: String(card.categoryId || "").trim() || undefined,
		title: String(card.title || "").trim() || undefined,
		image: normalizeMedia(card.image) || undefined,
		link: String(card.link || "").trim() || undefined,
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
	const isExploreCardsView = viewId === "product-promotions";

	const [form, setForm] = useState<HomePlacementsForm>(EMPTY_FORM);
	const [promoForm, setPromoForm] = useState<PromoSectionForm>(
		normalizeSectionForm(undefined, PROMO_CARD_SPECS, PROMO_DEFAULT_HEADING)
	);
	const [exploreForm, setExploreForm] = useState<PromoSectionForm>(
		normalizeSectionForm(undefined, EXPLORE_CARD_SPECS, EXPLORE_DEFAULT_HEADING)
	);
	const [wellnessForm, setWellnessForm] = useState<PromoSectionForm>(
		normalizeSectionForm(undefined, WELLNESS_CARD_SPECS, WELLNESS_DEFAULT_HEADING)
	);
	const [sponsorForm, setSponsorForm] = useState<PromoSectionForm>(
		normalizeSectionForm(undefined, SPONSOR_CARD_SPECS, SPONSOR_DEFAULT_HEADING)
	);
	const [promoCategories, setPromoCategories] = useState<PromoCategoryOption[]>([]);

	const [loading, setLoading] = useState(isHomePlacementsView || isPartnersPromotionsView || isExploreCardsView);
	const [saving, setSaving] = useState(false);
	const [promoSaving, setPromoSaving] = useState(false);
	const [exploreSaving, setExploreSaving] = useState(false);
	const [uploadingKey, setUploadingKey] = useState<BannerKey | null>(null);
	const [deletingKey, setDeletingKey] = useState<BannerKey | null>(null);
	const [promoUploadingCardId, setPromoUploadingCardId] = useState<HomeCardId | null>(null);
	const [promoDeletingCardId, setPromoDeletingCardId] = useState<HomeCardId | null>(null);
	const [exploreUploadingCardId, setExploreUploadingCardId] = useState<HomeCardId | null>(null);
	const [exploreDeletingCardId, setExploreDeletingCardId] = useState<HomeCardId | null>(null);
	const [wellnessUploadingCardId, setWellnessUploadingCardId] = useState<HomeCardId | null>(null);
	const [wellnessDeletingCardId, setWellnessDeletingCardId] = useState<HomeCardId | null>(null);
	const [sponsorUploadingCardId, setSponsorUploadingCardId] = useState<HomeCardId | null>(null);
	const [sponsorDeletingCardId, setSponsorDeletingCardId] = useState<HomeCardId | null>(null);

	const [message, setMessage] = useState<string | null>(null);
	const [errorText, setErrorText] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Partial<Record<BannerKey, string>>>({});
	const [promoUploadErrors, setPromoUploadErrors] = useState<Partial<Record<HomeCardId, string>>>({});
	const [exploreUploadErrors, setExploreUploadErrors] = useState<Partial<Record<HomeCardId, string>>>({});
	const [wellnessUploadErrors, setWellnessUploadErrors] = useState<Partial<Record<HomeCardId, string>>>({});
	const [sponsorUploadErrors, setSponsorUploadErrors] = useState<Partial<Record<HomeCardId, string>>>({});

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

				setPromoForm(normalizeSectionForm(section, PROMO_CARD_SPECS, PROMO_DEFAULT_HEADING));
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

	useEffect(() => {
		if (!isExploreCardsView) return;

		let active = true;

		const load = async () => {
			setLoading(true);
			setErrorText(null);

			try {
				const [exploreSection, wellnessSection, sponsorSection, categories] = await Promise.all([
					fetchHomeExploreSectionConfig(),
					fetchHomeWellnessSectionConfig(),
					fetchHomeSponsorSectionConfig(),
					fetchActiveCategoriesForAds(),
				]);

				if (!active) return;

				setExploreForm(normalizeSectionForm(exploreSection, EXPLORE_CARD_SPECS, EXPLORE_DEFAULT_HEADING));
				setWellnessForm(normalizeSectionForm(wellnessSection, WELLNESS_CARD_SPECS, WELLNESS_DEFAULT_HEADING));
				setSponsorForm(normalizeSectionForm(sponsorSection, SPONSOR_CARD_SPECS, SPONSOR_DEFAULT_HEADING));
				setPromoCategories(
					categories.map((item) => ({
						id: item.id,
						name: item.name,
						slug: item.slug,
					}))
				);
			} catch (loadError) {
				if (!active) return;
				setErrorText(toErrorMessage(loadError, "Failed to load explore, wellness and sponsor cards"));
			} finally {
				if (!active) return;
				setLoading(false);
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [isExploreCardsView]);

	const hasInvalidInput = useMemo(
		() => BANNER_SPECS.some((item) => !isValidMedia(form[item.key])),
		[form]
	);

	const hasPromoInvalidInput = useMemo(
		() => promoForm.cards.some((card) => !isValidMedia(card.image)),
		[promoForm]
	);

	const hasExploreInvalidInput = useMemo(
		() => exploreForm.cards.some((card) => !isValidMedia(card.image)),
		[exploreForm]
	);

	const hasWellnessInvalidInput = useMemo(
		() => wellnessForm.cards.some((card) => !isValidMedia(card.image)),
		[wellnessForm]
	);

	const hasSponsorInvalidInput = useMemo(
		() => sponsorForm.cards.some((card) => !isValidMedia(card.image)),
		[sponsorForm]
	);

	const hasSponsorInvalidLinks = useMemo(
		() => sponsorForm.cards.some((card) => !isValidSponsorLink(card.link)),
		[sponsorForm]
	);

	const setField = (key: BannerKey, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setUploadErrors((prev) => ({ ...prev, [key]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const setPromoCardField = (cardId: HomeCardId, patch: Partial<PromoCardForm>) => {
		setPromoForm((prev) => ({
			...prev,
			cards: prev.cards.map((card) => (card.cardId === cardId ? { ...card, ...patch } : card)),
		}));
		setPromoUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const setExploreCardField = (cardId: HomeCardId, patch: Partial<PromoCardForm>) => {
		setExploreForm((prev) => ({
			...prev,
			cards: prev.cards.map((card) => (card.cardId === cardId ? { ...card, ...patch } : card)),
		}));
		setExploreUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const setWellnessCardField = (cardId: HomeCardId, patch: Partial<PromoCardForm>) => {
		setWellnessForm((prev) => ({
			...prev,
			cards: prev.cards.map((card) => (card.cardId === cardId ? { ...card, ...patch } : card)),
		}));
		setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setMessage(null);
		setErrorText(null);
	};

	const setSponsorCardField = (cardId: HomeCardId, patch: Partial<PromoCardForm>) => {
		setSponsorForm((prev) => ({
			...prev,
			cards: prev.cards.map((card) => (card.cardId === cardId ? { ...card, ...patch } : card)),
		}));
		setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
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
			setPromoForm(normalizeSectionForm(section, PROMO_CARD_SPECS, PROMO_DEFAULT_HEADING));
			setMessage("Partners promotions updated successfully.");
		} catch (saveError) {
			setErrorText(toErrorMessage(saveError, "Failed to update partners promotions"));
		} finally {
			setPromoSaving(false);
		}
	};

	const handleSaveExploreSections = async () => {
		if (!isExploreCardsView) return;

		setErrorText(null);
		setMessage(null);

		if (hasExploreInvalidInput || hasWellnessInvalidInput || hasSponsorInvalidInput) {
			setErrorText("Please provide valid image URLs or uploaded image data for explore, wellness and sponsor cards.");
			return;
		}

		if (hasSponsorInvalidLinks) {
			setErrorText("Please provide valid sponsor links. Use a full URL (https://...) or a relative path starting with /.");
			return;
		}

		setExploreSaving(true);
		try {
			const [exploreSection, wellnessSection, sponsorSection] = await Promise.all([
				updateHomeExploreSectionConfig(toPromoUpdatePayload(exploreForm)),
				updateHomeWellnessSectionConfig(toPromoUpdatePayload(wellnessForm)),
				updateHomeSponsorSectionConfig(toPromoUpdatePayload(sponsorForm)),
			]);

			setExploreForm(normalizeSectionForm(exploreSection, EXPLORE_CARD_SPECS, EXPLORE_DEFAULT_HEADING));
			setWellnessForm(normalizeSectionForm(wellnessSection, WELLNESS_CARD_SPECS, WELLNESS_DEFAULT_HEADING));
			setSponsorForm(normalizeSectionForm(sponsorSection, SPONSOR_CARD_SPECS, SPONSOR_DEFAULT_HEADING));
			setMessage("Explore, Health & Wellness and Brand Sponsor cards updated successfully.");
		} catch (saveError) {
			setErrorText(toErrorMessage(saveError, "Failed to update explore, wellness and sponsor cards"));
		} finally {
			setExploreSaving(false);
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

	const handlePromoUpload = async (cardId: HomeCardId, event: ChangeEvent<HTMLInputElement>) => {
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
			setPromoForm(normalizeSectionForm(section, PROMO_CARD_SPECS, PROMO_DEFAULT_HEADING));
			setMessage(`${PROMO_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Card"} image updated successfully.`);
		} catch {
			setPromoForm(previousForm);
			setPromoUploadErrors((prev) => ({ ...prev, [cardId]: "Unable to upload selected image." }));
		} finally {
			setPromoUploadingCardId(null);
		}
	};

	const handleExploreUpload = async (cardId: HomeCardId, event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setExploreUploadErrors((prev) => ({ ...prev, [cardId]: "Please upload image files only." }));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			setExploreUploadErrors((prev) => ({ ...prev, [cardId]: "Image must be below 10MB." }));
			return;
		}

		const previousForm = {
			heading: exploreForm.heading,
			cards: exploreForm.cards.map((card) => ({ ...card })),
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

			setExploreForm(nextForm);
			setExploreUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
			setMessage(null);
			setErrorText(null);
			setExploreUploadingCardId(cardId);

			const section = await updateHomeExploreSectionConfig(toPromoUpdatePayload(nextForm));
			setExploreForm(normalizeSectionForm(section, EXPLORE_CARD_SPECS, EXPLORE_DEFAULT_HEADING));
			setMessage(`${EXPLORE_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Explore card"} image updated successfully.`);
		} catch {
			setExploreForm(previousForm);
			setExploreUploadErrors((prev) => ({ ...prev, [cardId]: "Unable to upload selected image." }));
		} finally {
			setExploreUploadingCardId(null);
		}
	};

	const handleWellnessUpload = async (cardId: HomeCardId, event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: "Please upload image files only." }));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: "Image must be below 10MB." }));
			return;
		}

		const previousForm = {
			heading: wellnessForm.heading,
			cards: wellnessForm.cards.map((card) => ({ ...card })),
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

			setWellnessForm(nextForm);
			setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
			setMessage(null);
			setErrorText(null);
			setWellnessUploadingCardId(cardId);

			const section = await updateHomeWellnessSectionConfig(toPromoUpdatePayload(nextForm));
			setWellnessForm(normalizeSectionForm(section, WELLNESS_CARD_SPECS, WELLNESS_DEFAULT_HEADING));
			setMessage(`${WELLNESS_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Wellness card"} image updated successfully.`);
		} catch {
			setWellnessForm(previousForm);
			setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: "Unable to upload selected image." }));
		} finally {
			setWellnessUploadingCardId(null);
		}
	};

	const handleSponsorUpload = async (cardId: HomeCardId, event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: "Please upload image files only." }));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: "Image must be below 10MB." }));
			return;
		}

		const previousForm = {
			heading: sponsorForm.heading,
			cards: sponsorForm.cards.map((card) => ({ ...card })),
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

			setSponsorForm(nextForm);
			setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
			setMessage(null);
			setErrorText(null);
			setSponsorUploadingCardId(cardId);

			const section = await updateHomeSponsorSectionConfig(toPromoUpdatePayload(nextForm));
			setSponsorForm(normalizeSectionForm(section, SPONSOR_CARD_SPECS, SPONSOR_DEFAULT_HEADING));
			setMessage(`${SPONSOR_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Sponsor card"} image updated successfully.`);
		} catch {
			setSponsorForm(previousForm);
			setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: "Unable to upload selected image." }));
		} finally {
			setSponsorUploadingCardId(null);
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

	const handlePromoDelete = async (cardId: HomeCardId) => {
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
			setPromoForm(normalizeSectionForm(section, PROMO_CARD_SPECS, PROMO_DEFAULT_HEADING));
			setMessage(`${cardLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${cardLabel.toLowerCase()} image`));
		} finally {
			setPromoDeletingCardId(null);
		}
	};

	const handleExploreDelete = async (cardId: HomeCardId) => {
		const card = exploreForm.cards.find((item) => item.cardId === cardId);
		if (!card || !normalizeMedia(card.image) || exploreDeletingCardId || exploreUploadingCardId) return;

		const cardLabel = EXPLORE_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Explore card";
		const confirmed = window.confirm(`Delete ${cardLabel} background image?`);
		if (!confirmed) return;

		const nextForm: PromoSectionForm = {
			heading: exploreForm.heading,
			cards: exploreForm.cards.map((item) =>
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
		setExploreUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setExploreDeletingCardId(cardId);

		try {
			const section = await updateHomeExploreSectionConfig(toPromoUpdatePayload(nextForm));
			setExploreForm(normalizeSectionForm(section, EXPLORE_CARD_SPECS, EXPLORE_DEFAULT_HEADING));
			setMessage(`${cardLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${cardLabel.toLowerCase()} image`));
		} finally {
			setExploreDeletingCardId(null);
		}
	};

	const handleWellnessDelete = async (cardId: HomeCardId) => {
		const card = wellnessForm.cards.find((item) => item.cardId === cardId);
		if (!card || !normalizeMedia(card.image) || wellnessDeletingCardId || wellnessUploadingCardId) return;

		const cardLabel = WELLNESS_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Wellness card";
		const confirmed = window.confirm(`Delete ${cardLabel} background image?`);
		if (!confirmed) return;

		const nextForm: PromoSectionForm = {
			heading: wellnessForm.heading,
			cards: wellnessForm.cards.map((item) =>
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
		setWellnessUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setWellnessDeletingCardId(cardId);

		try {
			const section = await updateHomeWellnessSectionConfig(toPromoUpdatePayload(nextForm));
			setWellnessForm(normalizeSectionForm(section, WELLNESS_CARD_SPECS, WELLNESS_DEFAULT_HEADING));
			setMessage(`${cardLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${cardLabel.toLowerCase()} image`));
		} finally {
			setWellnessDeletingCardId(null);
		}
	};

	const handleSponsorDelete = async (cardId: HomeCardId) => {
		const card = sponsorForm.cards.find((item) => item.cardId === cardId);
		if (!card || !normalizeMedia(card.image) || sponsorDeletingCardId || sponsorUploadingCardId) return;

		const cardLabel = SPONSOR_CARD_SPECS.find((item) => item.cardId === cardId)?.title || "Sponsor card";
		const confirmed = window.confirm(`Delete ${cardLabel} background image?`);
		if (!confirmed) return;

		const nextForm: PromoSectionForm = {
			heading: sponsorForm.heading,
			cards: sponsorForm.cards.map((item) =>
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
		setSponsorUploadErrors((prev) => ({ ...prev, [cardId]: undefined }));
		setSponsorDeletingCardId(cardId);

		try {
			const section = await updateHomeSponsorSectionConfig(toPromoUpdatePayload(nextForm));
			setSponsorForm(normalizeSectionForm(section, SPONSOR_CARD_SPECS, SPONSOR_DEFAULT_HEADING));
			setMessage(`${cardLabel} image deleted.`);
		} catch (deleteError) {
			setErrorText(toErrorMessage(deleteError, `Failed to delete ${cardLabel.toLowerCase()} image`));
		} finally {
			setSponsorDeletingCardId(null);
		}
	};

	const saveDisabled =
		loading ||
		uploadingKey !== null ||
		deletingKey !== null ||
		promoUploadingCardId !== null ||
		promoDeletingCardId !== null ||
		exploreUploadingCardId !== null ||
		exploreDeletingCardId !== null ||
		wellnessUploadingCardId !== null ||
		wellnessDeletingCardId !== null ||
		sponsorUploadingCardId !== null ||
		sponsorDeletingCardId !== null ||
		(isHomePlacementsView ? saving : isPartnersPromotionsView ? promoSaving : exploreSaving);

	const showSaveButton = isHomePlacementsView || isPartnersPromotionsView || isExploreCardsView;

	return (
		<AdminShell title="Homepage Layout" subtitle="Manage homepage banners and category-linked cards.">
			<PageLayout
				title={activeItem?.label || "Header Banners"}
				subtitle={
					isPartnersPromotionsView
						? "Configure the dynamic promotional card section displayed below homepage categories."
						: isExploreCardsView
							? "Configure Explore tiles, Health & Wellness tall cards, and Brand Sponsor cards shown below recent vendors."
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

								if (isPartnersPromotionsView) {
									void handleSavePromoSection();
									return;
								}

								void handleSaveExploreSections();
							}}
							disabled={saveDisabled}
							className="rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isHomePlacementsView
								? saving
									? "Saving..."
									: "Save Header Banners"
								: isPartnersPromotionsView
									? promoSaving
										? "Saving..."
										: "Save Category Link Cards"
									: exploreSaving
										? "Saving..."
										: "Save Explore + Wellness + Sponsors"}
						</button>
					) : undefined
				}
			>
				{!isHomePlacementsView && !isPartnersPromotionsView && !isExploreCardsView ? (
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
											title: "",
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

												<label className="mt-2 block text-xs text-slate-600">
													Card title
													<input
														value={card.title}
														onChange={(event) => setPromoCardField(spec.cardId, { title: event.target.value })}
														disabled={loading || isUploadingCurrent || isDeletingCurrent}
														placeholder="Featured card title"
														className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
													/>
												</label>

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

						{isExploreCardsView ? (
							<section className="space-y-6 rounded-xl border border-(--border) bg-(--surface) p-4">
								<div>
									<h3 className="text-base font-semibold text-(--text-strong)">Explore, Health & Wellness, and Brand Sponsors</h3>
									<p className="mt-1 text-xs text-slate-500">
										These sections render below recent vendors. Mobile view uses card carousel behavior.
									</p>
								</div>

								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
									<h4 className="text-sm font-semibold text-slate-900">Explore (Rectangle Tiles)</h4>
									<label className="mt-2 block text-xs text-slate-600">
										Section heading
										<input
											value={exploreForm.heading}
											onChange={(event) => {
												setExploreForm((prev) => ({ ...prev, heading: event.target.value }));
												setMessage(null);
												setErrorText(null);
											}}
											placeholder="Explore"
											className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
										/>
									</label>

									<div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
										{EXPLORE_CARD_SPECS.map((spec) => {
											const card = exploreForm.cards.find((item) => item.cardId === spec.cardId) || {
												cardId: spec.cardId,
												categoryId: "",
												title: "",
												image: "",
											};
											const image = normalizeMedia(card.image);
											const hasImage = Boolean(image);
											const invalid = Boolean(image && !isValidMedia(image));
											const isUploadingCurrent = exploreUploadingCardId === spec.cardId;
											const isDeletingCurrent = exploreDeletingCardId === spec.cardId;
											const selectedCategory = promoCategories.find((item) => item.id === card.categoryId);

											return (
												<article key={`explore-${spec.cardId}`} className="rounded-lg border border-slate-200 bg-white p-3">
													<p className="text-sm font-semibold text-slate-900">{spec.title}</p>

													<div className={`${EXPLORE_CARD_HEIGHT_CLASS} mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}>
														{image ? (
															<img src={image} alt={`${spec.title} preview`} className="block h-full w-full object-cover" loading="lazy" />
														) : (
															<div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
																<span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-xl font-semibold leading-none text-white">^</span>
																<p className="text-xs font-semibold tracking-wide text-slate-800">
																	RECOMMENDED SIZE : {spec.width} X {spec.height}
																</p>
															</div>
														)}
													</div>

													<label className="mt-2 block text-xs text-slate-600">
														Link category
														<select
															value={card.categoryId}
															onChange={(event) => setExploreCardField(spec.cardId, { categoryId: event.target.value })}
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
																onChange={(event) => void handleExploreUpload(spec.cardId, event)}
															/>
														</label>
														<button
															type="button"
															onClick={() => void handleExploreDelete(spec.cardId)}
															disabled={!hasImage || loading || isUploadingCurrent || isDeletingCurrent}
															className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
														>
															{isDeletingCurrent ? "Deleting..." : "Delete"}
														</button>
													</div>

													{isUploadingCurrent ? (
														<p className="mt-2 text-xs text-cyan-700">Uploading and saving image...</p>
													) : null}

													{exploreUploadErrors[spec.cardId] ? (
														<p className="mt-2 text-xs text-rose-700">{exploreUploadErrors[spec.cardId]}</p>
													) : null}

													{invalid ? (
														<p className="mt-2 text-xs text-rose-700">Image must be a valid URL or uploaded image data.</p>
													) : null}
												</article>
											);
										})}
									</div>
								</div>

								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
									<h4 className="text-sm font-semibold text-slate-900">Health & Wellness (Tall Cards)</h4>
									<label className="mt-2 block text-xs text-slate-600">
										Section heading
										<input
											value={wellnessForm.heading}
											onChange={(event) => {
												setWellnessForm((prev) => ({ ...prev, heading: event.target.value }));
												setMessage(null);
												setErrorText(null);
											}}
											placeholder="Health & Wellness"
											className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
										/>
									</label>

									<div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
										{WELLNESS_CARD_SPECS.map((spec) => {
											const card = wellnessForm.cards.find((item) => item.cardId === spec.cardId) || {
												cardId: spec.cardId,
												categoryId: "",
												title: "",
												image: "",
											};
											const image = normalizeMedia(card.image);
											const hasImage = Boolean(image);
											const invalid = Boolean(image && !isValidMedia(image));
											const isUploadingCurrent = wellnessUploadingCardId === spec.cardId;
											const isDeletingCurrent = wellnessDeletingCardId === spec.cardId;
											const selectedCategory = promoCategories.find((item) => item.id === card.categoryId);

											return (
												<article key={`wellness-${spec.cardId}`} className="rounded-lg border border-slate-200 bg-white p-3">
													<p className="text-sm font-semibold text-slate-900">{spec.title}</p>

													<div className={`${WELLNESS_CARD_HEIGHT_CLASS} mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}>
														{image ? (
															<img src={image} alt={`${spec.title} preview`} className="block h-full w-full object-cover" loading="lazy" />
														) : (
															<div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
																<span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-2xl font-semibold leading-none text-white">^</span>
																<p className="text-xs font-semibold tracking-wide text-slate-800">
																	RECOMMENDED SIZE : {spec.width} X {spec.height}
																</p>
															</div>
														)}
													</div>

													<label className="mt-2 block text-xs text-slate-600">
														Card title
														<input
															value={card.title}
															onChange={(event) => setWellnessCardField(spec.cardId, { title: event.target.value })}
															disabled={loading || isUploadingCurrent || isDeletingCurrent}
															placeholder="Wellness card title"
															className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
														/>
													</label>

													<label className="mt-2 block text-xs text-slate-600">
														Link category
														<select
															value={card.categoryId}
															onChange={(event) => setWellnessCardField(spec.cardId, { categoryId: event.target.value })}
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
																onChange={(event) => void handleWellnessUpload(spec.cardId, event)}
															/>
														</label>
														<button
															type="button"
															onClick={() => void handleWellnessDelete(spec.cardId)}
															disabled={!hasImage || loading || isUploadingCurrent || isDeletingCurrent}
															className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
														>
															{isDeletingCurrent ? "Deleting..." : "Delete"}
														</button>
													</div>

													{isUploadingCurrent ? (
														<p className="mt-2 text-xs text-cyan-700">Uploading and saving image...</p>
													) : null}

													{wellnessUploadErrors[spec.cardId] ? (
														<p className="mt-2 text-xs text-rose-700">{wellnessUploadErrors[spec.cardId]}</p>
													) : null}

													{invalid ? (
														<p className="mt-2 text-xs text-rose-700">Image must be a valid URL or uploaded image data.</p>
													) : null}
												</article>
											);
										})}
									</div>
								</div>

								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
									<h4 className="text-sm font-semibold text-slate-900">Brand Sponsors (Link-Based Cards)</h4>
									<label className="mt-2 block text-xs text-slate-600">
										Section heading
										<input
											value={sponsorForm.heading}
											onChange={(event) => {
												setSponsorForm((prev) => ({ ...prev, heading: event.target.value }));
												setMessage(null);
												setErrorText(null);
											}}
											placeholder="Brand Partners"
											className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
										/>
									</label>

									<div className="mt-3 flex gap-3 overflow-x-auto pb-2">
										{SPONSOR_CARD_SPECS.map((spec) => {
											const card = sponsorForm.cards.find((item) => item.cardId === spec.cardId) || {
												cardId: spec.cardId,
												categoryId: "",
												title: "",
												image: "",
												link: "",
											};
											const image = normalizeMedia(card.image);
											const link = String(card.link || "").trim();
											const hasImage = Boolean(image);
											const invalid = Boolean(image && !isValidMedia(image));
											const invalidLink = Boolean(link && !isValidSponsorLink(link));
											const isUploadingCurrent = sponsorUploadingCardId === spec.cardId;
											const isDeletingCurrent = sponsorDeletingCardId === spec.cardId;

											return (
												<article key={`sponsor-${spec.cardId}`} className="w-[220px] shrink-0 rounded-lg border border-slate-200 bg-white p-3">
													<p className="text-sm font-semibold text-slate-900">{spec.title}</p>

													<div className="mt-2 flex items-center justify-center">
														{image ? (
															<div className="h-[118px] w-[118px] overflow-hidden rounded-full border border-slate-200 bg-slate-100">
																<img src={image} alt={`${spec.title} preview`} className="block h-full w-full object-cover" loading="lazy" />
															</div>
														) : (
															<div className="flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 text-center">
																<span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-lg font-semibold leading-none text-white">^</span>
																<p className="text-[10px] font-semibold tracking-wide text-slate-800">
																	{spec.width} X {spec.height}
																</p>
															</div>
														)}
													</div>

													<label className="mt-2 block text-xs text-slate-600">
														Sponsor name
														<input
															value={card.title}
															onChange={(event) => setSponsorCardField(spec.cardId, { title: event.target.value })}
															disabled={loading || isUploadingCurrent || isDeletingCurrent}
															placeholder="Sponsor name"
															className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
														/>
													</label>

													<label className="mt-2 block text-xs text-slate-600">
														Sponsor link
														<input
															value={card.link}
															onChange={(event) => setSponsorCardField(spec.cardId, { link: event.target.value })}
															disabled={loading || isUploadingCurrent || isDeletingCurrent}
															placeholder="https://example.com or /store"
															className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-(--accent)"
														/>
													</label>

													<div className="mt-2 flex flex-wrap items-center gap-2">
														<label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
															Upload
															<input
																type="file"
																accept="image/*"
																className="hidden"
																disabled={loading || isUploadingCurrent || isDeletingCurrent}
																onChange={(event) => void handleSponsorUpload(spec.cardId, event)}
															/>
														</label>
														<button
															type="button"
															onClick={() => void handleSponsorDelete(spec.cardId)}
															disabled={!hasImage || loading || isUploadingCurrent || isDeletingCurrent}
															className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
														>
															{isDeletingCurrent ? "Deleting..." : "Delete"}
														</button>
													</div>

													{isUploadingCurrent ? (
														<p className="mt-2 text-xs text-cyan-700">Uploading and saving image...</p>
													) : null}

													{sponsorUploadErrors[spec.cardId] ? (
														<p className="mt-2 text-xs text-rose-700">{sponsorUploadErrors[spec.cardId]}</p>
													) : null}

													{invalid ? (
														<p className="mt-2 text-xs text-rose-700">Image must be a valid URL or uploaded image data.</p>
													) : null}

													{invalidLink ? (
														<p className="mt-2 text-xs text-rose-700">Link must start with https://, http://, or /</p>
													) : null}
												</article>
											);
										})}
									</div>
								</div>
							</section>
						) : null}
					</>
				)}
			</PageLayout>
		</AdminShell>
	);
}
