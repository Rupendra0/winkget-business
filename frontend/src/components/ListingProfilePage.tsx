"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
} from "lucide-react";
import type { ListingProfile } from "@/data/listingData";
import Footer from "@/components/Footer";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import {
  fetchBusinessReviews,
  submitBusinessReview,
  type BusinessReview,
  type BusinessReviewSummary,
} from "@/lib/reviewStore";

const normalizeDigits = (value: string) => String(value || "").replace(/\D/g, "");

const sanitizeWebsite = (value?: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const toDisplayTime = (timeValue?: string) => {
  const normalized = String(timeValue || "").trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) {
    return normalized;
  }

  const hour24 = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}: ${String(minutes).padStart(2, "0")} ${suffix}`;
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const normalizeAddressToken = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripCityStateFromAddress = (address: string, city?: string, state?: string) => {
  const cityToken = normalizeAddressToken(String(city || ""));
  const stateToken = normalizeAddressToken(String(state || ""));

  const parts = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const token = normalizeAddressToken(part);
      if (!token) return false;
      if (cityToken && token === cityToken) return false;
      if (stateToken && token === stateToken) return false;
      return true;
    });

  return parts.join(", ");
};

const formatReviewDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type OpeningScheduleItem = {
  day: string;
  time: string;
};

const toOpeningSchedule = (profile: ListingProfile): OpeningScheduleItem[] => {
  if (Array.isArray(profile.hours) && profile.hours.length > 0) {
    return profile.hours
      .map((item) => ({
        day: String(item.day || "").trim(),
        time: String(item.time || "").trim(),
      }))
      .filter((item) => item.day && item.time);
  }

  const opening = toDisplayTime(profile.shopOpeningTime);
  const closing = toDisplayTime(profile.shopClosingTime);
  if (!opening || !closing) {
    return [];
  }

  return [{ day: "Mon - Sun", time: `${opening} - ${closing}` }];
};

const ActionButton = ({
  href,
  label,
  icon,
  disabled,
  external,
  tone,
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  external?: boolean;
  tone?: "primary" | "secondary" | "tertiary";
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) => {
  const toneClass =
    tone === "primary"
      ? "text-sm font-medium text-[#4f5558]"
      : tone === "tertiary"
      ? "text-xs font-medium text-[#6a7074]"
      : "text-sm font-normal text-[#61686b]";
  const className = `inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-[12px] bg-[#d4f2ef] px-2 py-2 ${toneClass} sm:min-h-11`;

  if (disabled || !href) {
    return (
      <button type="button" disabled className={`${className} opacity-55`}>
        {icon}
        {label}
      </button>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {icon}
        {label}
      </a>
    );
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {icon}
      {label}
    </a>
  );
};

export default function ListingProfilePage({ profile }: { profile: ListingProfile }) {
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary>({
    rating: Number(profile.rating || 0),
    reviews: Math.max(0, Number(profile.reviews || 0)),
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewerHasReviewed, setViewerHasReviewed] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRatingInput, setReviewRatingInput] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewFormMessage, setReviewFormMessage] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const syncCurrentUser = async () => {
      setAuthLoading(true);
      const user = await fetchCurrentUser();
      if (!active) return;

      setCurrentUser(user);
      if (user?.name) {
        setReviewAuthor((previous) => previous || user.name || "");
      }
      setAuthLoading(false);
    };

    void syncCurrentUser();

    const authChangedHandler = () => {
      void syncCurrentUser();
    };

    window.addEventListener("auth:changed", authChangedHandler);
    return () => {
      active = false;
      window.removeEventListener("auth:changed", authChangedHandler);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setReviewsLoading(true);
      setViewerHasReviewed(false);
      const result = await fetchBusinessReviews(profile.id, 40);
      if (!active) return;

      if (result.ok) {
        setReviews(result.reviews);
        setReviewSummary(result.summary);
        setViewerHasReviewed(result.viewerHasReviewed);
      }

      setReviewsLoading(false);
    };

    void loadReviews();

    return () => {
      active = false;
    };
  }, [profile.id]);

  const fullAddress = useMemo(() => {
    const trimmedAddress = stripCityStateFromAddress(profile.address || "", profile.city, profile.state);
    return [trimmedAddress, profile.postalCode]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
  }, [profile.address, profile.city, profile.postalCode, profile.state]);

  const phoneDigits = useMemo(() => normalizeDigits(profile.phone), [profile.phone]);
  const whatsappDigits = useMemo(
    () => normalizeDigits(profile.whatsapp || profile.phone),
    [profile.phone, profile.whatsapp]
  );
  const websiteHref = useMemo(() => sanitizeWebsite(profile.website), [profile.website]);
  const storeHref = useMemo(() => {
    const storeId = String(profile.storeId || profile.id || "").trim();
    return storeId ? `/store/${storeId}` : "";
  }, [profile.id, profile.storeId]);
  const inquiryHref = useMemo(() => {
    const email = String(profile.email || "").trim();
    const subject = encodeURIComponent(`Inquiry for ${profile.name}`);

    if (email) {
      return `mailto:${email}?subject=${subject}`;
    }

    if (whatsappDigits) {
      return `https://wa.me/${whatsappDigits}`;
    }

    if (phoneDigits) {
      return `tel:${phoneDigits}`;
    }

    return "";
  }, [phoneDigits, profile.email, profile.name, whatsappDigits]);

  const categoryItems = useMemo(
    () => uniqueStrings([profile.category, ...(Array.isArray(profile.tags) ? profile.tags : [])]),
    [profile.category, profile.tags]
  );

  const serviceItems = useMemo(
    () => uniqueStrings(Array.isArray(profile.services) ? profile.services : []),
    [profile.services]
  );

  const photoItems = useMemo(
    () => uniqueStrings(Array.isArray(profile.gallery) ? profile.gallery : []),
    [profile.gallery]
  );

  const openingSchedule = useMemo(() => toOpeningSchedule(profile), [profile]);

  const isVerified = useMemo(
    () =>
      Array.isArray(profile.badges) &&
      profile.badges.some((badge) => /verified|varified/i.test(String(badge || ""))),
    [profile.badges]
  );

  const roundedRating = Number.isFinite(Number(reviewSummary.rating))
    ? Number(reviewSummary.rating)
    : 0;
  const reviewCount = Math.max(0, Number(reviewSummary.reviews || 0));
  const ratingOutOfFive = Math.max(0, Math.min(5, Math.round(roundedRating || 0)));
  const hasAlreadyReviewed = useMemo(
    () =>
      Boolean(
        currentUser?.id &&
          (viewerHasReviewed || reviews.some((review) => review.reviewerId === currentUser.id))
      ),
    [currentUser?.id, reviews, viewerHasReviewed]
  );

  const handleShare = async () => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!pageUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.name,
          text: profile.name,
          url: pageUrl,
        });
        setShareMessage(null);
        return;
      } catch {
        // Continue to clipboard fallback.
      }
    }

    try {
      await navigator.clipboard.writeText(pageUrl);
      setShareMessage("Profile link copied");
    } catch {
      setShareMessage("Unable to share right now");
    }
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authLoading) {
      setReviewFormMessage("Checking login status...");
      return;
    }

    if (!currentUser) {
      setReviewFormMessage("Please login to submit your review.");
      return;
    }

    if (hasAlreadyReviewed) {
      setReviewFormMessage("You have already reviewed this shop.");
      return;
    }

    const comment = reviewText.trim();
    const author = reviewAuthor.trim() || currentUser.name || "User";
    if (!comment) {
      setReviewFormMessage("Please write your review.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewFormMessage(null);

    const submitResult = await submitBusinessReview({
      businessId: profile.id,
      aliasBusinessIds: [profile.id, profile.storeId || ""].filter(Boolean),
      rating: reviewRatingInput,
      comment,
      authorName: author,
    });

    if (!submitResult.ok) {
      setReviewFormMessage(submitResult.message);
      setIsSubmittingReview(false);
      return;
    }

    setReviews((previous) => [
      submitResult.review,
      ...previous.filter((review) => review.id !== submitResult.review.id),
    ]);
    setReviewSummary(submitResult.summary);
    setViewerHasReviewed(true);
    setReviewText("");
    setReviewRatingInput(5);
    setReviewFormMessage("Review submitted successfully.");
    setIsSubmittingReview(false);
  };

  const coverImage = String(profile.coverImage || "").trim();
  const logoImage = String(profile.logoImage || "").trim();

  return (
    <main className="min-h-screen bg-[#edeff1] px-3 pb-24 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pb-10 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-5">
        <section className="rounded-[24px] border border-[#d5d8db] bg-[#f1f3f4] p-4 sm:p-5">
          <div className="overflow-hidden rounded-[18px] border border-[#d9dddf] bg-[#dbddde]">
            {coverImage ? (
              <img
                src={coverImage}
                alt={profile.name}
                className="h-44 w-full object-cover sm:h-52 lg:h-60"
                loading="lazy"
              />
            ) : (
              <div className="h-44 w-full bg-[#d4d8db] sm:h-52 lg:h-60" />
            )}
          </div>

          <div className="relative -mt-9 flex justify-center sm:-mt-10">
            <div className="h-[92px] w-[92px] overflow-hidden rounded-full border-2 border-[#cc5c5c] bg-white sm:h-[104px] sm:w-[104px]">
              {logoImage ? (
                <img
                  src={logoImage}
                  alt={`${profile.name} logo`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-[#e6e8ea]" />
              )}
            </div>
          </div>

          <div className="mt-1 flex justify-end pr-1">
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                <CheckCircle2 size={14} className="text-[#2f9f57]" />
                Verified
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-center">
            <h1
              className="mx-auto max-w-full truncate px-2 text-xl font-semibold leading-snug text-[#4b4f53]"
              style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
            >
              {profile.name}
            </h1>
            <p className="mt-0.5 text-sm font-medium leading-tight text-gray-600">
              {profile.category}
            </p>

            {fullAddress ? (
              <p className="mx-auto mt-1 flex max-w-[900px] items-center justify-center gap-1.5 px-1 text-xs font-normal leading-tight text-gray-500">
                <MapPin size={14} className="shrink-0 text-[#d44040]" />
                <span className="min-w-0 truncate whitespace-nowrap">{`Address : ${fullAddress}`}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2.5">
            <ActionButton
              href={phoneDigits ? `tel:${phoneDigits}` : undefined}
              label="Call"
              icon={<Phone size={14} />}
              disabled={!phoneDigits}
              tone="primary"
            />
            <ActionButton
              href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
              label="Whatsapp"
              icon={<MessageCircle size={14} />}
              disabled={!whatsappDigits}
              external
              tone="secondary"
            />
            <ActionButton
              href={websiteHref || undefined}
              label="Website"
              icon={<Globe size={14} />}
              disabled={!websiteHref}
              external
              tone="tertiary"
            />
            <ActionButton
              href="#"
              label="Share"
              icon={<Share2 size={14} />}
              tone="tertiary"
              onClick={(event) => {
                event.preventDefault();
                void handleShare();
              }}
            />
          </div>

          {shareMessage ? (
            <p className="mt-2.5 text-center text-xs font-medium text-gray-500">{shareMessage}</p>
          ) : null}

          <div className="mt-3 grid grid-cols-4 items-center gap-2.5 text-center">
            {storeHref ? (
              <Link
                href={storeHref}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#2b98c8] px-1.5 py-2 text-sm font-medium text-white sm:min-h-11"
              >
                My Store
              </Link>
            ) : (
              <span className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#2b98c8]/60 px-1.5 py-2 text-sm font-medium text-white sm:min-h-11">
                My Store
              </span>
            )}

            {inquiryHref ? (
              <a
                href={inquiryHref}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#d4f2ef] px-1.5 py-2 text-sm font-medium text-[#666d70] sm:min-h-11"
              >
                Inquiry
              </a>
            ) : (
              <span className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#d4f2ef] px-1.5 py-2 text-sm font-medium text-[#666d70] opacity-55 sm:min-h-11">
                Inquiry
              </span>
            )}

            <p className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-transparent px-1 text-xs font-medium text-gray-500 sm:min-h-11">
              {`Rating ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}`}
            </p>

            <p className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-[12px] bg-transparent px-1 text-xs font-medium text-[#656a6d] sm:min-h-11">
              <CheckCircle2 size={15} className="text-[#2f9f57]" />
              Trusted
            </p>
          </div>

          {photoItems.length > 0 ? (
            <section className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                <button
                  type="button"
                  onClick={() => setIsPhotosModalOpen(true)}
                  className="text-xs font-medium text-blue-600"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                {photoItems.slice(0, 3).map((photo, index) => (
                    <div key={`${photo}-${index}`} className="overflow-hidden rounded-lg border border-gray-100 bg-[#dbe0e3]">
                    <img
                      src={photo}
                      alt={`${profile.name} gallery ${index + 1}`}
                      className="h-28 w-full object-cover sm:h-36 lg:h-40"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[8px] bg-[#edf4f3] px-4 py-5 sm:px-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3 className="text-base font-semibold text-[#6a6f72]">Services</h3>
                <ul className="mt-2.5 space-y-2.5">
                  {serviceItems.map((service) => (
                    <li key={service} className="flex items-center gap-2 text-sm font-medium text-[#62676a]">
                      <CheckCircle2 size={16} className="shrink-0 text-[#2f9f57]" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#6a6f72]">Categories</h3>
                <ul className="mt-2.5 space-y-2.5">
                  {categoryItems.map((category) => (
                    <li key={category} className="flex items-center gap-2 text-sm font-medium text-[#62676a]">
                      <CheckCircle2 size={16} className="shrink-0 text-[#2f9f57]" />
                      {category}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-[8px] bg-[#edf4f3] px-4 py-5 sm:px-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3 className="text-base font-semibold text-[#6a6f72]">Establishment Year</h3>
                {profile.establishmentYear ? (
                  <p className="mt-2.5 text-sm font-medium text-[#5a5f63]">{`Since ${profile.establishmentYear}`}</p>
                ) : null}
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#6a6f72]">Opening Time :</h3>
                <ul className="mt-2.5 space-y-2">
                  {openingSchedule.map((item) => (
                    <li key={`${item.day}-${item.time}`} className="text-sm font-medium leading-tight text-[#61666a]">
                      {`${item.day} : ${item.time}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {profile.description ? (
            <section className="rounded-[8px] bg-[#edf4f3] px-4 py-5 sm:px-5 lg:col-span-2">
              <h3 className="text-base font-semibold text-[#6a6f72]">About Business :</h3>
              <p className="mt-2.5 text-sm font-medium leading-[1.6] text-[#5f6468]">
                {profile.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-[8px] bg-transparent px-1 py-1.5 lg:col-span-2">
            <div className="flex items-center gap-4">
              <h3 className="text-base font-semibold text-[#6a6f72]">Rating & Reviews</h3>
              <div className="flex items-center gap-1 rounded-[8px] bg-[#e8ecef] px-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={
                      star <= ratingOutOfFive
                        ? "fill-[#f3b400] text-[#f3b400]"
                        : "text-[#c3c8cc]"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="mt-2.5 space-y-5">
              {reviewsLoading ? (
                <p className="text-sm font-medium text-[#666b6f]">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                reviews.slice(0, 12).map((review) => (
                  <article key={review.id} className="border-b border-[#d8dcdf] pb-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[#5d6266]">{review.author}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={`${review.id}-${star}`}
                            size={16}
                            className={
                              star <= Math.round(Number(review.rating || 0))
                                ? "fill-[#f3b400] text-[#f3b400]"
                                : "text-[#c8cdd1]"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <p className="mt-1.5 text-sm font-medium leading-[1.45] text-[#5f6468]">
                      {review.comment}
                    </p>

                    {review.createdAt ? (
                      <p className="mt-1.5 text-xs font-medium text-gray-500">
                        {formatReviewDate(String(review.createdAt || ""))}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm font-medium text-[#666b6f]">No reviews yet.</p>
              )}
            </div>

            <p className="mt-2.5 text-xs font-medium text-gray-500">
              {`Overall ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"} from ${reviewCount} reviews`}
            </p>
          </section>

          <section className="rounded-[8px] bg-[#edf4f3] px-4 py-5 sm:px-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-[#6a6f72]">Write a Review</h3>

            <form className="mt-3.5 space-y-3.5" onSubmit={handleSubmitReview}>
              <label className="block text-xs font-medium text-gray-600">
                Name
                <input
                  type="text"
                  value={reviewAuthor}
                  onChange={(event) => setReviewAuthor(event.target.value)}
                  disabled={authLoading || !currentUser || hasAlreadyReviewed}
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-[#d4dadd] bg-white px-3 text-sm font-medium text-[#4f5357] outline-none"
                  placeholder="Your name"
                />
              </label>

              <div>
                <p className="text-xs font-medium text-gray-600">Rating</p>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRatingInput(value)}
                      disabled={authLoading || !currentUser || hasAlreadyReviewed}
                      className="rounded p-1 disabled:opacity-60"
                      aria-label={`Rate ${value}`}
                    >
                      <Star
                        size={20}
                        className={
                          value <= reviewRatingInput
                            ? "fill-[#f3b400] text-[#f3b400]"
                            : "text-[#c3c8cc]"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-medium text-gray-600">
                Review
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  disabled={authLoading || !currentUser || hasAlreadyReviewed}
                  className="mt-1 min-h-[96px] w-full rounded-[10px] border border-[#d4dadd] bg-white px-3 py-2 text-sm font-medium text-[#4f5357] outline-none"
                  placeholder="Write your review"
                />
              </label>

              {authLoading ? (
                <p className="text-xs font-medium text-gray-500">Checking login status...</p>
              ) : !currentUser ? (
                <Link href="/auth" className="inline-flex rounded-[10px] bg-[#d4f2ef] px-3 py-2 text-xs font-medium text-[#5f6569]">
                  Login to write a review
                </Link>
              ) : hasAlreadyReviewed ? (
                <p className="text-xs font-medium text-[#2f9f57]">You have already reviewed this shop.</p>
              ) : null}

              {reviewFormMessage ? (
                <p className="text-xs font-medium text-[#5f6569]">{reviewFormMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={authLoading || !currentUser || hasAlreadyReviewed || isSubmittingReview}
                className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#2b98c8] px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </section>
        </div>

        {isPhotosModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center"
            onClick={() => setIsPhotosModalOpen(false)}
          >
            <section
              className="w-full max-w-3xl rounded-2xl border border-[#d7dce0] bg-[#f1f3f4] p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#5b6064]">All Photos</h3>
                <button
                  type="button"
                  onClick={() => setIsPhotosModalOpen(false)}
                  className="rounded-[10px] bg-[#d4f2ef] px-3 py-1.5 text-[13px] font-semibold text-[#5f6569]"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photoItems.map((photo, index) => (
                    <div key={`${photo}-all-${index}`} className="overflow-hidden rounded-[10px] bg-[#dbe0e3]">
                      <img
                        src={photo}
                        alt={`${profile.name} gallery full ${index + 1}`}
                        className="h-32 w-full object-cover sm:h-40"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        <Footer />
      </div>
    </main>
  );
}
