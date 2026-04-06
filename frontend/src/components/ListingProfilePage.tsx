"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Clock3,
  CalendarDays,
  Building2,
  Globe,
  Star,
  Zap,
} from "lucide-react";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import type { ListingProfile } from "@/data/listingData";
import Footer from "@/components/Footer";
import ActionButtonsBottom from "@/components/listing-profile/ActionButtonsBottom";
import ActionButtonsTop from "@/components/listing-profile/ActionButtonsTop";
import { submitVendorInquiry } from "@/lib/catalogClient";
import {
  fetchBusinessReviews,
  getBusinessReviewAggregate,
  submitBusinessReview,
  subscribeReviewUpdates,
  type BusinessReview,
  type BusinessReviewSummary,
} from "@/lib/reviewStore";

const tabList = ["Overview", "Reviews", "Photos"] as const;
type ProfileTab = (typeof tabList)[number];

const formatRating = (rating: number) => Number(rating || 0).toFixed(1);

const normalizeDigits = (value: string) =>
  String(value || "").replace(/\D/g, "");

const normalizeInquiryPhone = (value: string) => {
  const digits = normalizeDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());

const normalizeAddressToken = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const joinAddress = (parts: Array<string | undefined>) =>
  parts
    .flatMap((part) => String(part || "").split(","))
    .map((part) => String(part).trim())
    .filter(Boolean)
    .filter((part, index, list) => {
      const normalizedPart = normalizeAddressToken(part);
      if (!normalizedPart) return false;

      return (
        list.findIndex(
          (candidate) => normalizeAddressToken(candidate) === normalizedPart
        ) === index
      );
    })
    .join(", ");

const toMinutes = (timeValue?: string) => {
  const normalized = String(timeValue || "").trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const toDisplayTime = (timeValue?: string) => {
  const normalized = String(timeValue || "").trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) return "";

  const hour24 = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatReviewDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const SIDEBAR_PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=60",
];

export default function ListingProfilePage({ profile }: { profile: ListingProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldOpenInquiryFromQuery = searchParams.get("inquiry") === "true";

  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [animateHeroMeta, setAnimateHeroMeta] = useState(true);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewFormMessage, setReviewFormMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  const [businessReviews, setBusinessReviews] = useState<BusinessReview[]>([]);
  const [serverSummary, setServerSummary] = useState<BusinessReviewSummary>({
    rating: Number(profile.rating || 0),
    reviews: Math.max(0, Number(profile.reviews || 0)),
  });
  const [viewerHasReviewed, setViewerHasReviewed] = useState(false);
  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquirySubject, setInquirySubject] = useState(`Enquiry for ${profile.name}`);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryFormMessage, setInquiryFormMessage] = useState<string | null>(null);
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnimateHeroMeta(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const syncCurrentUser = async () => {
      setIsAuthLoading(true);
      const user = await fetchCurrentUser();
      if (isActive) {
        setCurrentUser(user);
        setIsAuthLoading(false);
      }
    };

    void syncCurrentUser();

    const onAuthChanged = () => {
      void syncCurrentUser();
    };

    window.addEventListener("auth:changed", onAuthChanged);

    return () => {
      isActive = false;
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    setServerSummary({
      rating: Number(profile.rating || 0),
      reviews: Math.max(0, Number(profile.reviews || 0)),
    });
  }, [profile.rating, profile.reviews]);

  useEffect(() => {
    let isActive = true;

    const loadBusinessReviews = async () => {
      setIsReviewsLoading(true);
      setBusinessReviews([]);
      setViewerHasReviewed(false);
      const result = await fetchBusinessReviews(profile.id, 80);
      if (!isActive) return;

      if (result.ok) {
        setBusinessReviews(result.reviews);
        setServerSummary(result.summary);
        setViewerHasReviewed(result.viewerHasReviewed);
      }

      setIsReviewsLoading(false);
    };

    void loadBusinessReviews();

    return () => {
      isActive = false;
    };
  }, [currentUser?.id, profile.id]);

  useEffect(() => {
    return subscribeReviewUpdates(() => {
      setReviewUpdateVersion((previous) => previous + 1);
    });
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setReviewAuthor((previous) => previous || currentUser.name || "");
    }
  }, [currentUser?.name]);

  useEffect(() => {
    setInquirySubject(`Enquiry for ${profile.name}`);
  }, [profile.name]);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.name) {
      setInquiryName((previous) => previous || currentUser.name || "");
    }

    if (currentUser.email) {
      setInquiryEmail((previous) => previous || currentUser.email || "");
    }

    const preferredPhone = String(
      currentUser.phone || currentUser.businessPhone || currentUser.businessAlternatePhone || ""
    ).trim();

    if (preferredPhone) {
      setInquiryPhone((previous) => previous || preferredPhone);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!shouldOpenInquiryFromQuery) return;

    setIsInquiryModalOpen(true);
    setInquiryMessage((previous) =>
      previous ||
      `Hi ${profile.name}, I am interested in your services. Please share details.`
    );
    setInquiryFormMessage(null);
  }, [profile.name, shouldOpenInquiryFromQuery]);

  const extendedProfile = profile as ListingProfile & {
    vendorStatus?: string;
    marketingOptIn?: boolean;
  };

  const fullAddress = useMemo(
    () =>
      joinAddress([
        profile.address,
        profile.city,
        profile.state,
        profile.postalCode,
      ]),
    [profile.address, profile.city, profile.state, profile.postalCode]
  );

  const shortLocation = useMemo(
    () => joinAddress([profile.city, profile.state]),
    [profile.city, profile.state]
  );
  const localAddress = useMemo(
    () => {
      const raw = String(profile.address || "").trim();
      if (!raw) return "";
      return raw.split(",")[0]?.trim() || raw;
    },
    [profile.address]
  );

  const dialPhone = useMemo(() => normalizeDigits(profile.phone), [profile.phone]);
  const whatsappPhone = useMemo(
    () => normalizeDigits(profile.whatsapp || profile.phone),
    [profile.whatsapp, profile.phone]
  );
  const mapQuery = useMemo(
    () => encodeURIComponent(fullAddress || `${profile.name} ${profile.city}`),
    [fullAddress, profile.name, profile.city]
  );
  const mapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const storefrontId = useMemo(() => {
    const profileId = String(profile.id || "").trim();
    const rawStoreId = String(profile.storeId || "").trim();

    if (!rawStoreId) {
      return profileId;
    }

    if (
      profileId &&
      rawStoreId.toLowerCase() !== profileId.toLowerCase() &&
      rawStoreId.toLowerCase() === "diyaratech"
    ) {
      return profileId;
    }

    return rawStoreId;
  }, [profile.id, profile.storeId]);
  const storeUrl = storefrontId ? `/store/${storefrontId}` : "#";
  const hasStorefront = Boolean(storefrontId);
  const vendorInquiryId = useMemo(() => {
    const candidates = [profile.id, profile.storeId]
      .map((candidate) => String(candidate || "").trim())
      .filter(Boolean);

    return candidates.find((candidate) => isObjectId(candidate)) || "";
  }, [profile.id, profile.storeId]);
  const emailUrl =
    profile.email && profile.email !== "Not provided"
      ? `mailto:${profile.email}`
      : "#";
  const enquiryLabel = useMemo(() => {
    const rawLabel = String(profile.ctaLabel || "").trim();
    return /enquir|inquir/i.test(rawLabel) ? rawLabel : "Send Enquiry";
  }, [profile.ctaLabel]);
  const enquiryHref = useMemo(() => {
    const email = String(profile.email || "").trim();
    const subject = encodeURIComponent(`Enquiry for ${profile.name}`);
    const message = encodeURIComponent(
      `Hi ${profile.name}, I found your listing on Winkget and would like to know more about your services.`
    );

    if (email && email !== "Not provided") {
      return `mailto:${email}?subject=${subject}&body=${message}`;
    }

    if (whatsappPhone) {
      return `https://wa.me/${whatsappPhone}?text=${message}`;
    }

    if (dialPhone) {
      return `tel:${dialPhone}`;
    }

    return "#";
  }, [dialPhone, profile.email, profile.name, whatsappPhone]);
  const servicePoints = useMemo(
    () => profile.services.filter(Boolean),
    [profile.services]
  );
  const visibleServicePoints = useMemo(
    () => (servicesExpanded ? servicePoints : servicePoints.slice(0, 5)),
    [servicePoints, servicesExpanded]
  );
  const hiddenServicesCount = Math.max(servicePoints.length - 5, 0);
  const sidebarPhotoTiles = useMemo(() => {
    const available = profile.gallery.filter(Boolean).slice(0, 4);
    if (available.length === 0) {
      return SIDEBAR_PLACEHOLDER_PHOTOS;
    }

    if (available.length >= 4) {
      return available;
    }

    return [...available, ...SIDEBAR_PLACEHOLDER_PHOTOS.slice(0, 4 - available.length)];
  }, [profile.gallery]);
  const mapEmbedUrl = useMemo(
    () => `https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`,
    [mapQuery]
  );
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  const shortAddress = localAddress || fullAddress || "Address not provided";
  const baseReviewCount = profile.reviews > 0 ? profile.reviews : profile.reviewsList.length;
  const profileFallbackSummary = useMemo(
    () => ({
      rating: Number(profile.rating || 0),
      reviews: Math.max(0, Number(baseReviewCount || 0)),
    }),
    [baseReviewCount, profile.rating]
  );
  const preferredBaseSummary = serverSummary.reviews > 0 ? serverSummary : profileFallbackSummary;

  const reviewStats = useMemo(() => {
    const aggregate = getBusinessReviewAggregate(
      profile.id,
      preferredBaseSummary.rating,
      preferredBaseSummary.reviews
    );

    return {
      totalCount: aggregate.reviews,
      average: aggregate.rating,
    };
  }, [preferredBaseSummary.rating, preferredBaseSummary.reviews, profile.id, reviewUpdateVersion]);

  const visibleReviews = useMemo<BusinessReview[]>(() => {
    if (businessReviews.length > 0) {
      return businessReviews;
    }

    return profile.reviewsList.map((review) => ({
      id: review.id,
      businessId: profile.id,
      reviewerId: "",
      author: review.author,
      rating: Number(review.rating || 0),
      comment: review.comment,
      createdAt: review.date,
    }));
  }, [businessReviews, profile.id, profile.reviewsList]);

  const reviewCardRating =
    reviewStats.totalCount > 0 ? formatRating(reviewStats.average) : "4.5";
  const reviewCardCount =
    reviewStats.totalCount > 0 ? `${reviewStats.totalCount} reviews` : "No ratings yet";
  const reviewPreviewLines = useMemo(() => {
    return visibleReviews
      .map((review) => String(review.comment || "").trim())
      .filter(Boolean)
      .slice(0, 2);
  }, [visibleReviews]);

  const hasAlreadyReviewed = useMemo(
    () =>
      Boolean(
        currentUser?.id &&
          (viewerHasReviewed ||
            businessReviews.some((review) => review.reviewerId === currentUser.id))
      ),
    [businessReviews, currentUser?.id, viewerHasReviewed]
  );

  const isReviewLocked = isAuthLoading || !currentUser || hasAlreadyReviewed;

  const isVerified = useMemo(
    () =>
      extendedProfile.vendorStatus === "approved" ||
      profile.badges.some((badge) => /verified/i.test(badge)),
    [extendedProfile.vendorStatus, profile.badges]
  );

  const openStatus = useMemo(() => {
    const openingMinutes = toMinutes(profile.shopOpeningTime);
    const closingMinutes = toMinutes(profile.shopClosingTime);

    if (openingMinutes === null || closingMinutes === null) {
      return {
        isOpen: null,
        badgeText: "Hours unavailable",
        openingText: "Opens at --",
        closingText: "Closes at --",
      };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const wrapsMidnight = openingMinutes > closingMinutes;
    const isOpen = wrapsMidnight
      ? currentMinutes >= openingMinutes || currentMinutes <= closingMinutes
      : currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;

    return {
      isOpen,
      badgeText: isOpen ? "Open now" : "Closed",
      openingText: `Opens at ${toDisplayTime(profile.shopOpeningTime)}`,
      closingText: `Closes at ${toDisplayTime(profile.shopClosingTime)}`,
    };
  }, [profile.shopClosingTime, profile.shopOpeningTime]);

  const tagline = useMemo(
    () => String(profile.description || "").replace(/\s+/g, " ").trim(),
    [profile.description]
  );

  const handleShareProfile = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!currentUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.name,
          text: `Check out ${profile.name} on Winkget`,
          url: currentUrl,
        });
        return;
      } catch {
        // Fall back to clipboard if share is cancelled/unsupported.
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareMessage("Profile link copied to clipboard");
    } catch {
      setShareMessage("Unable to copy profile link");
    }
  };

  const closeInquiryModal = useCallback(() => {
    setIsInquiryModalOpen(false);

    if (searchParams.get("inquiry") !== "true") {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("inquiry");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleInquirySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = inquiryName.trim();
    const phone = normalizeInquiryPhone(inquiryPhone);
    const email = inquiryEmail.trim();
    const message = inquiryMessage.trim();
    const subject = inquirySubject.trim() || `Enquiry for ${profile.name}`;

    if (!vendorInquiryId) {
      setInquiryFormMessage("Enquiry is not available for this listing right now.");
      return;
    }

    if (!name) {
      setInquiryFormMessage("Please enter your name.");
      return;
    }

    if (phone.length !== 10) {
      setInquiryFormMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!message || message.length < 8) {
      setInquiryFormMessage("Please write a short enquiry message.");
      return;
    }

    setIsInquirySubmitting(true);
    setInquiryFormMessage(null);

    try {
      await submitVendorInquiry({
        vendorId: vendorInquiryId,
        name,
        phone,
        email: email || undefined,
        message,
        subject,
      });

      setInquiryFormMessage("Enquiry sent successfully. The business will contact you soon.");
    } catch (error) {
      setInquiryFormMessage(
        error instanceof Error ? error.message : "Failed to send enquiry. Please try again."
      );
    } finally {
      setIsInquirySubmitting(false);
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAuthLoading) {
      setReviewFormMessage("Checking your login status. Please wait.");
      return;
    }

    if (!currentUser?.id) {
      setReviewFormMessage("Please login to submit your review.");
      return;
    }

    if (hasAlreadyReviewed) {
      setReviewFormMessage("You have already reviewed this business.");
      return;
    }

    const nextAuthor = reviewAuthor.trim();
    const nextReviewText = reviewText.trim();

    if (!nextAuthor || !nextReviewText) {
      setReviewFormMessage("Please add your name and review.");
      return;
    }

    const submitResult = await submitBusinessReview({
      businessId: profile.id,
      aliasBusinessIds: [profile.storeId || "", profile.id || ""].filter(Boolean),
      rating: reviewRating,
      comment: nextReviewText,
      authorName: nextAuthor,
    });

    if (!submitResult.ok) {
      setReviewFormMessage(submitResult.message);
      return;
    }

    setBusinessReviews((previous) => [
      submitResult.review,
      ...previous.filter((review) => review.id !== submitResult.review.id),
    ]);
    setServerSummary(submitResult.summary);
    setViewerHasReviewed(true);
    setReviewAuthor(currentUser.name || "");
    setReviewText("");
    setReviewRating(5);
    setReviewFormMessage("Thanks for sharing your review.");
  };

  return (
    <main className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-10 pb-28 md:pb-12">
      <div className="w-full space-y-8">
        <section className="rounded-3xl overflow-hidden bg-white/80 border border-white/80 shadow-xl">
          <div className="relative h-52 sm:h-60 lg:h-64">
            <img
              src={profile.coverImage}
              alt={profile.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/35 to-transparent" />
            <div className="absolute bottom-6 left-5 sm:left-8 flex items-end gap-4">
              <div className="h-20 w-20 rounded-2xl border-4 border-white/90 overflow-hidden shadow-lg bg-white">
                <img
                  src={profile.logoImage}
                  alt={`${profile.name} logo`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="text-white">
                <p className="text-xs uppercase tracking-[0.12em] text-white/80">
                  {profile.category}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {profile.name}
                </h1>
                <p className="text-sm text-white/80 mt-1">
                  {fullAddress || "Address not available"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 ${
                      openStatus.isOpen === null
                        ? "border-white/30 bg-slate-900/55 text-white"
                        : openStatus.isOpen
                        ? "border-emerald-200/80 bg-emerald-500/30 text-emerald-50 motion-safe:animate-[pulse_2.8s_ease-in-out_infinite]"
                        : "border-rose-200/80 bg-rose-500/30 text-rose-50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        animateHeroMeta ? "motion-safe:animate-pulse" : ""
                      } ${
                        openStatus.isOpen === null
                          ? "bg-white/80"
                          : openStatus.isOpen
                          ? "bg-emerald-200"
                          : "bg-rose-200"
                      }`}
                    />
                    {openStatus.openingText}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-50 backdrop-blur-sm">
                    <Star size={12} className="fill-amber-200 text-amber-200" />
                    {reviewStats.totalCount > 0
                      ? `${formatRating(reviewStats.average)} (${reviewStats.totalCount})`
                      : "No ratings yet"}
                  </span>

                  {profile.establishmentYear ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-50 backdrop-blur-sm">
                      <CalendarDays
                        size={12}
                        className={animateHeroMeta ? "motion-safe:animate-pulse" : ""}
                      />
                      Since {profile.establishmentYear}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-5 bg-white border-t border-slate-100">
            <ActionButtonsTop
              callHref={dialPhone ? `tel:${dialPhone}` : undefined}
              enquiryHref={enquiryHref !== "#" ? enquiryHref : undefined}
              enquiryLabel={enquiryLabel}
              whatsappHref={whatsappPhone ? `https://wa.me/${whatsappPhone}` : undefined}
              directionsHref={directionsUrl}
              emailHref={emailUrl !== "#" ? emailUrl : undefined}
              onShare={handleShareProfile}
              storeHref={hasStorefront ? storeUrl : undefined}
            />
            {shareMessage ? (
              <p className="mt-2 text-xs font-medium text-slate-600">{shareMessage}</p>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.75fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      <CheckCircle2 size={13} />
                      Listed
                    </span>
                  )}
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    openStatus.isOpen === null
                      ? "bg-slate-100 text-slate-700"
                      : openStatus.isOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      openStatus.isOpen === null
                        ? "bg-slate-500"
                        : openStatus.isOpen
                        ? "bg-emerald-600"
                        : "bg-rose-600"
                    }`}
                  />
                  {openStatus.badgeText}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <Clock3 size={14} />
                <span className="font-semibold text-slate-900">{openStatus.closingText}</span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <p className="inline-flex min-w-0 items-center gap-2 text-slate-600">
                  <MapPin size={14} />
                  <span className="truncate font-semibold text-slate-900">{localAddress || shortLocation || profile.city || "Location unavailable"}</span>
                </p>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                >
                  <Navigation size={13} />
                  Get Directions
                </a>
              </div>

              <div className="mt-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Building2 size={14} />
                  {profile.category || "Business"}
                </p>
                {tagline ? <p className="mt-1 truncate text-sm font-medium text-slate-700">{tagline}</p> : null}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <p className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <CalendarDays size={13} />
                  {profile.establishmentYear ? `Since ${profile.establishmentYear}` : "Since -"}
                </p>

                {extendedProfile.marketingOptIn ? (
                  <p className="inline-flex items-center gap-1.5 text-emerald-700">
                    <Zap size={13} />
                    Responds quickly
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl bg-white/85 border border-white/80 shadow-lg p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {tabList.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all btn-hover ${
                      activeTab === tab
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Overview" ? (
                <div className="mt-6 grid gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Category
                      </div>
                      <div className="font-semibold text-slate-900 mt-1">
                        {profile.category}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Business Email
                      </div>
                      <div className="font-semibold text-slate-900 mt-1 break-all">
                        {profile.email || "Not provided"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Website
                      </div>
                      {profile.website ? (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-700 mt-1 inline-flex items-center gap-2"
                        >
                          <Globe size={14} />
                          {profile.website}
                        </a>
                      ) : (
                        <div className="font-semibold text-slate-900 mt-1">
                          Not provided
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Business Timing
                      </div>
                      <div className="font-semibold text-slate-900 mt-1">
                        {profile.shopOpeningTime && profile.shopClosingTime
                          ? `${profile.shopOpeningTime} - ${profile.shopClosingTime}`
                          : "Not provided"}
                      </div>
                    </div>
                  </div>

                  {profile.highlights.length > 0 ? (
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Highlights
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {profile.highlights.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                </div>
              ) : null}

              {activeTab === "Reviews" ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {reviewStats.totalCount > 0
                      ? `This shop has ${reviewStats.totalCount} reviews with ${formatRating(
                          reviewStats.average
                        )} average rating.`
                      : "No verified reviews available yet."}
                  </div>

                  {isReviewsLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Loading reviews...
                    </div>
                  ) : visibleReviews.length > 0 ? (
                    <div className="space-y-3">
                      {visibleReviews.slice(0, 12).map((review) => (
                        <article
                          key={review.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {review.author || "Verified User"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatReviewDate(String(review.createdAt || ""))}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((starValue) => (
                              <Star
                                key={`${review.id}-${starValue}`}
                                className={`h-3.5 w-3.5 ${
                                  starValue <= Math.round(Number(review.rating || 0))
                                    ? "fill-amber-400 text-amber-500"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>

                          <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No reviews yet. Be the first to review this business.
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "Photos" ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.gallery.length > 0 ? (
                    profile.gallery.map((photo) => (
                      <div
                        key={photo}
                        className="rounded-2xl overflow-hidden border border-slate-200 bg-white"
                      >
                        <img
                          src={photo}
                          alt={`${profile.name} photo`}
                          className="h-44 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      Photos not available.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Write a Review</h2>

              <form className="space-y-3" onSubmit={handleReviewSubmit}>
                <label className="block text-sm font-medium text-black">Name</label>
                <input
                  type="text"
                  value={reviewAuthor}
                  onChange={(event) => setReviewAuthor(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm text-black placeholder:text-gray-400 outline-none focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={isReviewLocked}
                />

                <div>
                  <p className="mb-1 text-sm font-medium text-black">Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((ratingValue) => (
                      <button
                        key={ratingValue}
                        type="button"
                        onClick={() => setReviewRating(ratingValue)}
                        className="rounded p-1 disabled:cursor-not-allowed"
                        aria-label={`Rate ${ratingValue} stars`}
                        disabled={isReviewLocked}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            reviewRating >= ratingValue
                              ? "fill-amber-400 text-amber-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-medium text-black">Review</label>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Write your review"
                  className="min-h-[80px] w-full rounded-lg border border-gray-200 p-2 text-sm text-black placeholder:text-gray-400 outline-none focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={isReviewLocked}
                />

                {isAuthLoading ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    Review Locked: Checking login status
                  </button>
                ) : !currentUser ? (
                  <Link
                    href="/auth"
                    className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                  >
                    Please login to write a review
                  </Link>
                ) : hasAlreadyReviewed ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800"
                  >
                    You have already reviewed this business
                  </button>
                ) : null}

                {reviewFormMessage ? (
                  <p className="text-xs text-gray-600">{reviewFormMessage}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isReviewLocked}
                  className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Submit Review
                </button>
              </form>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Services</h2>

              {servicePoints.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {visibleServicePoints.map((service) => (
                      <span
                        key={service}
                        className="cursor-pointer rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  {hiddenServicesCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setServicesExpanded((previous) => !previous)}
                      className="mt-3 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {servicesExpanded ? "Show less" : `+${hiddenServicesCount} more`}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-gray-500">Services not available.</p>
              )}
            </section>

            <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Business Info</h2>

              <div className="flex flex-col gap-2 text-sm text-gray-600">
                {isVerified ? (
                  <p className="font-semibold text-emerald-700">
                    Verified Business
                  </p>
                ) : null}

                {profile.establishmentYear ? (
                  <p>
                    Since {profile.establishmentYear}
                  </p>
                ) : null}

                <p>
                  Serving {shortLocation || profile.city || "your area"}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Photos</h2>

              <div className="grid grid-cols-2 gap-2">
                {sidebarPhotoTiles.map((photo, index) => (
                  <img
                    key={`${photo}-${index}`}
                    src={photo}
                    alt={`${profile.name} gallery ${index + 1}`}
                    className="h-20 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("Photos")}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                View all photos →
              </button>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Location</h2>

              <div className="h-32 w-full overflow-hidden rounded-lg border border-gray-100">
                <iframe
                  title={`Map of ${profile.name}`}
                  src={mapEmbedUrl}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <p className="mt-2 truncate text-sm text-gray-600">{shortAddress}</p>

              <div className="mt-2 flex justify-between text-sm text-blue-600">
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="hover:text-blue-700">
                  Get Directions
                </a>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="hover:text-blue-700">
                  View on Maps
                </a>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Reviews</h2>

              <div className="flex items-end gap-2">
                <p className="text-lg font-semibold text-gray-900">{reviewCardRating}</p>
                <Star className="mb-0.5 h-4 w-4 fill-amber-400 text-amber-500" />
                <p className="pb-0.5 text-xs text-gray-500">{reviewCardCount}</p>
              </div>

              {reviewPreviewLines.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {reviewPreviewLines.map((line, index) => (
                    <p key={`${line}-${index}`} className="text-sm text-gray-600">
                      "{line}"
                    </p>
                  ))}
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500">No reviews yet.</p>
                  <p className="text-sm text-gray-500">Be the first to review this business.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("Reviews")}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                View all reviews →
              </button>
            </section>
          </aside>
        </section>
      </div>

      {isInquiryModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center"
          onClick={closeInquiryModal}
        >
          <section
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Send Inquiry</h2>
                <p className="text-xs text-slate-500">Quickly connect with {profile.name}</p>
              </div>

              <button
                type="button"
                onClick={closeInquiryModal}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleInquirySubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Name
                  <input
                    type="text"
                    value={inquiryName}
                    onChange={(event) => setInquiryName(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-300"
                    placeholder="Your name"
                    required
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Phone
                  <input
                    type="tel"
                    value={inquiryPhone}
                    onChange={(event) => setInquiryPhone(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-300"
                    placeholder="10-digit number"
                    required
                  />
                </label>
              </div>

              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Email (optional)
                <input
                  type="email"
                  value={inquiryEmail}
                  onChange={(event) => setInquiryEmail(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="you@example.com"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Subject
                <input
                  type="text"
                  value={inquirySubject}
                  onChange={(event) => setInquirySubject(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="Enquiry subject"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Message
                <textarea
                  value={inquiryMessage}
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  className="min-h-[100px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="Tell the business what you need"
                  required
                />
              </label>

              {!vendorInquiryId ? (
                <p className="text-xs font-medium text-amber-700">
                  Inquiry submission is available only for live verified vendor listings.
                </p>
              ) : null}

              {inquiryFormMessage ? (
                <p
                  className={`text-xs font-medium ${
                    /successfully/i.test(inquiryFormMessage)
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {inquiryFormMessage}
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isInquirySubmitting || !vendorInquiryId}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isInquirySubmitting ? "Sending..." : "Send Inquiry"}
                </button>

                <button
                  type="button"
                  onClick={closeInquiryModal}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <ActionButtonsBottom
          callHref={dialPhone ? `tel:${dialPhone}` : undefined}
          enquiryHref={enquiryHref !== "#" ? enquiryHref : undefined}
          enquiryLabel={enquiryLabel}
        />
      </div>

      <Footer />
    </main>
  );
}
