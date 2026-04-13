"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe,
  Info,
  Layers3,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  PencilLine,
  Phone,
  Share2,
  Store,
  Star,
  Trash2,
} from "lucide-react";
import type { ListingProfile, StorePageData, StoreProduct } from "@/data/listingData";
import { buildProductSlug } from "@/data/productSlug";
import Footer from "@/components/Footer";
import RestaurantMarketplacePage from "@/components/RestaurantMarketplacePage";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import {
  deleteBusinessReview,
  fetchBusinessReviews,
  submitBusinessReview,
  updateBusinessReview,
  type BusinessReview,
  type BusinessReviewSummary,
} from "@/lib/reviewStore";
import { addToCart, makeStoreProduct } from "@/lib/shopStorage";
import { subscribeVendorStoreStatus, type VendorStoreStatusSocketPayload } from "@/lib/storeStatusRealtime";

const RESTAURANT_CATEGORY_REGEX =
  /(restaurant|food|cafe|dining|kitchen|bakery|meal|snack|snacks|biryani|pizza|burger|coffee|tea|lunch|dinner|breakfast|sweets|sweet|dessert|mithai|fast\s*food|street\s*food|juice|beverage)/i;

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

const toStoreProductsFromMenuItems = (profile: ListingProfile): StoreProduct[] => {
  if (!Array.isArray(profile.menuItems) || profile.menuItems.length === 0) {
    return [];
  }

  return profile.menuItems.map((item, index) => ({
    id: String(item.id || `${profile.id}-menu-${index + 1}`).trim(),
    name: String(item.name || `Menu Item ${index + 1}`).trim(),
    price: String(item.price || "₹0").trim(),
    category: String(item.category || "Food").trim(),
    categoryLabel: String(item.category || "Food").trim(),
    subcategoryName: String(item.category || "Food").trim(),
    imageUrl: String(item.imageUrl || profile.logoImage || profile.coverImage || "").trim(),
    badge: String(item.badge || "").trim() || undefined,
    sellerName: String(profile.name || "Vendor").trim() || "Vendor",
  }));
};

const toPriceForTwoLabel = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "₹300 for two";
  }

  if (/for\s*two/i.test(normalized)) {
    return normalized;
  }

  const rupeeMatch = normalized.match(/₹\s*[\d,]+/i);
  if (rupeeMatch?.[0]) {
    return `${rupeeMatch[0]} for two`;
  }

  return "₹300 for two";
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
    <path d="M13.601 2.326A7.854 7.854 0 0 0 8.023.0C3.651.0.091 3.559.091 7.932a7.9 7.9 0 0 0 1.147 4.063L0 16l4.136-1.215a7.9 7.9 0 0 0 3.887 1.017h.003c4.372.0 7.932-3.559 7.932-7.932a7.9 7.9 0 0 0-2.357-5.544zM8.026 14.53h-.002a6.6 6.6 0 0 1-3.347-.92l-.24-.144-2.455.721.655-2.39-.156-.245a6.6 6.6 0 0 1-1.02-3.52c0-3.661 2.977-6.637 6.64-6.637a6.6 6.6 0 0 1 4.713 1.953 6.6 6.6 0 0 1 1.942 4.715c-.001 3.661-2.977 6.637-6.638 6.637z" />
    <path d="M11.644 9.488c-.197-.099-1.17-.578-1.352-.644-.182-.066-.314-.099-.446.099-.132.197-.512.644-.628.776-.116.132-.231.149-.429.05-.197-.099-.832-.307-1.585-.98-.586-.522-.981-1.167-1.097-1.364-.116-.197-.012-.304.087-.403.09-.09.197-.231.296-.347.099-.116.132-.197.198-.33.066-.132.033-.248-.017-.347-.05-.099-.446-1.074-.611-1.47-.161-.387-.324-.334-.446-.34l-.38-.007a.73.73 0 0 0-.529.248c-.182.198-.694.678-.694 1.653s.71 1.917.81 2.049c.099.132 1.4 2.138 3.393 2.997.474.204.843.325 1.131.416.475.151.908.13 1.25.079.381-.057 1.17-.479 1.336-.942.165-.463.165-.859.116-.942-.05-.083-.182-.132-.38-.231z" />
  </svg>
);

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
      ? "text-[12px] font-medium md:text-sm md:font-semibold"
      : tone === "tertiary"
      ? "text-[11px] font-medium md:text-xs md:font-semibold"
      : "text-[12px] font-medium md:text-sm md:font-semibold";
  const className = `inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(239,246,255,0.68))] px-1.5 py-2 text-black shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-white/90 hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.1)] ${toneClass} md:min-h-11 md:rounded-[12px]`;

  if (disabled || !href) {
    return (
      <button type="button" disabled className={`${className} opacity-55`}>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/85 text-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          {icon}
        </span>
        <span>{label}</span>
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
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/85 text-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          {icon}
        </span>
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/85 text-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
};

export default function ListingProfilePage({
  profile,
  storeData,
}: {
  profile: ListingProfile;
  storeData?: StorePageData | null;
}) {
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
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});
  const [reviewOverflowIds, setReviewOverflowIds] = useState<Record<string, boolean>>({});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
  const reviewTextRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

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
      setReviewActionMessage(null);
      setEditingReviewId(null);
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

  useEffect(() => {
    return subscribeVendorStoreStatus(String(profile.id || ""), (payload) => {
      setLiveStoreStatus(payload);
    });
  }, [profile.id]);

  const fullAddress = useMemo(() => {
    const addressParts = [profile.address, profile.city, profile.state, profile.postalCode]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const uniqueAddressParts = addressParts.filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return uniqueAddressParts.join(", ");
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
  const mobilePhotoSlots = 4;
  const desktopPhotoSlots = 6;
  const mobilePhotoRow = photoItems.slice(0, Math.min(photoItems.length, mobilePhotoSlots));
  const desktopPhotoRow = photoItems.slice(0, Math.min(photoItems.length, desktopPhotoSlots));
  const mobileOverflowCount = Math.max(0, photoItems.length - mobilePhotoSlots);
  const desktopOverflowCount = Math.max(0, photoItems.length - desktopPhotoSlots);

  const openingSchedule = useMemo(() => toOpeningSchedule(profile), [profile]);

  const isVerified = useMemo(
    () =>
      Array.isArray(profile.badges) &&
      profile.badges.some((badge) => /verified|varified/i.test(String(badge || ""))),
    [profile.badges]
  );

  const liveStoreOpenState = useMemo<null | boolean>(() => {
    if (typeof liveStoreStatus?.isStoreOpen === "boolean") {
      return liveStoreStatus.isStoreOpen;
    }

    if (typeof profile.isStoreOpen === "boolean") {
      return profile.isStoreOpen;
    }

    if (typeof storeData?.isStoreOpen === "boolean") {
      return storeData.isStoreOpen;
    }

    return null;
  }, [liveStoreStatus?.isStoreOpen, profile.isStoreOpen, storeData?.isStoreOpen]);

  const roundedRating = Number.isFinite(Number(reviewSummary.rating))
    ? Number(reviewSummary.rating)
    : 0;
  const reviewCount = Math.max(0, Number(reviewSummary.reviews || 0));
  const ratingOutOfFive = Math.max(0, Math.min(5, Math.round(roundedRating || 0)));
  const ownReview = useMemo(() => {
    if (!currentUser?.id) return null;
    return reviews.find((review) => review.reviewerId === currentUser.id) || null;
  }, [currentUser?.id, reviews]);
  const reviewsToDisplay = useMemo(() => {
    const base = reviews.slice(0, 12);
    if (!ownReview) {
      return base;
    }

    if (base.some((item) => item.id === ownReview.id)) {
      return base;
    }

    return [ownReview, ...base.slice(0, 11)];
  }, [ownReview, reviews]);
  const hasAlreadyReviewed = useMemo(
    () => Boolean(currentUser?.id && (viewerHasReviewed || ownReview)),
    [currentUser?.id, ownReview, viewerHasReviewed]
  );

  useEffect(() => {
    const measureOverflow = () => {
      setReviewOverflowIds((previous) => {
        let changed = false;
        const next = { ...previous };

        for (const review of reviewsToDisplay) {
          if (expandedReviewIds[review.id]) {
            continue;
          }

          const node = reviewTextRefs.current[review.id];
          if (!node) {
            continue;
          }

          const hasOverflow = node.scrollHeight - node.clientHeight > 1;
          if (next[review.id] !== hasOverflow) {
            next[review.id] = hasOverflow;
            changed = true;
          }
        }

        return changed ? next : previous;
      });
    };

    const frame = window.requestAnimationFrame(measureOverflow);
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureOverflow);
    };
  }, [expandedReviewIds, reviewsToDisplay]);

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
    setReviewActionMessage(null);
    setIsSubmittingReview(false);
  };

  const toggleReviewExpanded = (reviewId: string) => {
    setExpandedReviewIds((previous) => ({
      ...previous,
      [reviewId]: !previous[reviewId],
    }));
  };

  const startEditReview = (review: BusinessReview) => {
    setReviewActionMessage(null);
    setEditingReviewId(review.id);
    setEditReviewText(String(review.comment || ""));
    setEditReviewRating(Math.max(1, Math.min(5, Number(review.rating || 5))));
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditReviewText("");
    setEditReviewRating(5);
  };

  const handleUpdateReview = async (review: BusinessReview) => {
    if (!currentUser?.id || review.reviewerId !== currentUser.id) {
      return;
    }

    const reviewEditCount = Math.max(0, Number(review.editCount || 0));
    if (reviewEditCount >= 2) {
      setReviewActionMessage("Edit limit reached (2/2). You can delete and post a new review.");
      return;
    }

    const comment = editReviewText.trim();
    if (!comment || comment.length < 5) {
      setReviewActionMessage("Please write your review.");
      return;
    }

    if (comment.length > 1200) {
      setReviewActionMessage("Review must be 1200 characters or fewer.");
      return;
    }

    const originalRating = Math.max(1, Math.min(5, Number(review.rating || 0)));
    const originalComment = String(review.comment || "").trim();
    if (originalRating === editReviewRating && originalComment === comment) {
      setReviewActionMessage("No changes to save.");
      return;
    }

    setIsUpdatingReview(true);
    setReviewActionMessage(null);

    const updateResult = await updateBusinessReview({
      reviewId: review.id,
      businessId: profile.id,
      aliasBusinessIds: [profile.id, profile.storeId || ""].filter(Boolean),
      rating: editReviewRating,
      comment,
    });

    if (!updateResult.ok) {
      setReviewActionMessage(updateResult.message);
      setIsUpdatingReview(false);
      return;
    }

    setReviews((previous) =>
      previous.map((item) => (item.id === updateResult.review.id ? updateResult.review : item))
    );
    setReviewSummary(updateResult.summary);
    setViewerHasReviewed(true);
    setReviewActionMessage("Review updated successfully.");
    setEditingReviewId(null);
    setIsUpdatingReview(false);
  };

  const handleDeleteReview = async (review: BusinessReview) => {
    if (!currentUser?.id || review.reviewerId !== currentUser.id) {
      return;
    }

    const confirmed = window.confirm("Delete your review?");
    if (!confirmed) {
      return;
    }

    setDeletingReviewId(review.id);
    setReviewActionMessage(null);

    const deleteResult = await deleteBusinessReview({
      reviewId: review.id,
      businessId: profile.id,
      aliasBusinessIds: [profile.id, profile.storeId || ""].filter(Boolean),
    });

    if (!deleteResult.ok) {
      setReviewActionMessage(deleteResult.message);
      setDeletingReviewId(null);
      return;
    }

    setReviews((previous) => previous.filter((item) => item.id !== deleteResult.reviewId));
    setReviewSummary(deleteResult.summary);
    setViewerHasReviewed(false);
    if (editingReviewId === review.id) {
      cancelEditReview();
    }
    setReviewFormMessage("Review deleted. You can add a new review.");
    setReviewActionMessage("Review deleted successfully.");
    setDeletingReviewId(null);
  };

  const coverImage = String(profile.coverImage || "").trim();
  const logoImage = String(profile.logoImage || "").trim();

  const isRestaurantProfile = useMemo(() => {
    if (storeData && typeof storeData.isRestaurantMarketplace === "boolean") {
      return storeData.isRestaurantMarketplace;
    }

    const candidates = [
      profile.category,
      ...(Array.isArray(profile.tags) ? profile.tags : []),
      ...(Array.isArray(profile.services) ? profile.services : []),
    ];

    return candidates.some((value) => RESTAURANT_CATEGORY_REGEX.test(String(value || "")));
  }, [profile.category, profile.services, profile.tags, storeData]);

  const buildProductHref = useCallback(
    (product: StoreProduct) => {
      const storeId = String(profile.storeId || profile.id || "").trim() || profile.id;
      return `/product/${encodeURIComponent(
        buildProductSlug({
          id: product.id,
          name: product.name,
          storeId,
          sellerName: profile.name,
        })
      )}`;
    },
    [profile.id, profile.name, profile.storeId]
  );

  const handleAddToCart = useCallback(
    (product: StoreProduct) => {
      const href = buildProductHref(product);
      const storeId = String(profile.storeId || profile.id || "").trim() || profile.id;

      const cartProduct = makeStoreProduct(
        {
          ...product,
          storeId,
          sellerName: product.sellerName || profile.name,
          image: product.imageUrl,
          oldPrice: product.oldPriceValue,
          categoryLabel: product.categoryLabel || product.category,
        },
        href
      );

      addToCart(cartProduct, 1);
    },
    [buildProductHref, profile.id, profile.name, profile.storeId]
  );

  const restaurantStoreData = useMemo<StorePageData | null>(() => {
    if (!isRestaurantProfile) {
      return null;
    }

    const fallbackProducts = toStoreProductsFromMenuItems(profile);
    const sourceProducts = Array.isArray(storeData?.products) && storeData.products.length > 0 ? storeData.products : fallbackProducts;
    const profileStoreId = String(profile.storeId || profile.id || "").trim() || profile.id;
    const categoriesFromProducts = uniqueStrings(
      sourceProducts.map((product) => String(product.categoryLabel || product.category || "").trim())
    );
    const quickFilterChips = uniqueStrings(
      sourceProducts
        .map((product) => String(product.subcategoryName || "").trim())
        .filter(Boolean)
    ).slice(0, 12);

    const explicitFeaturedIds = Array.isArray(storeData?.featured?.productIds)
      ? storeData.featured.productIds.filter(Boolean)
      : [];
    const featuredProductIds =
      explicitFeaturedIds.length > 0
        ? explicitFeaturedIds
        : sourceProducts.slice(0, 6).map((product) => product.id);
    const featuredSet = new Set(featuredProductIds);
    const explicitTrendingIds = Array.isArray(storeData?.trending?.productIds)
      ? storeData.trending.productIds.filter((id) => Boolean(id) && !featuredSet.has(id))
      : [];
    const trendingProductIds =
      explicitTrendingIds.length > 0
        ? explicitTrendingIds
        : sourceProducts
            .filter((product) => !featuredSet.has(product.id))
            .slice(0, 6)
            .map((product) => product.id);

    const cuisineFallback = uniqueStrings([
      ...(Array.isArray(profile.tags) ? profile.tags : []),
      ...(Array.isArray(profile.services) ? profile.services : []),
    ])
      .slice(0, 2)
      .join(" • ");

    const aboutFallback = String(profile.description || "").trim();
    const addressLabel = fullAddress || [profile.address, profile.city].filter(Boolean).join(", ");
    const sublocalityLabel =
      String(profile.sublocality || storeData?.sublocality || "").trim() ||
      String(fullAddress || profile.address || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)[0] ||
      "";

    return {
      id: String(storeData?.id || profileStoreId).trim() || profileStoreId,
      storeName: String(storeData?.storeName || profile.name || "Restaurant").trim() || "Restaurant",
      tagline: String(storeData?.tagline || "Delicious food delivered fresh").trim(),
      bannerImage: String(storeData?.bannerImage || coverImage || logoImage).trim(),
      logoImage: String(storeData?.logoImage || logoImage || coverImage).trim(),
      storeCategory: String(storeData?.storeCategory || profile.category || "Restaurant").trim() || "Restaurant",
      isRestaurantMarketplace: true,
      isStoreOpen:
        typeof profile.isStoreOpen === "boolean"
          ? profile.isStoreOpen
          : typeof storeData?.isStoreOpen === "boolean"
            ? storeData.isStoreOpen
            : null,
      contactPhone:
        String(storeData?.contactPhone || profile.businessAlternatePhone || profile.phone || "").trim() || undefined,
      whatsappPhone: String(storeData?.whatsappPhone || profile.whatsapp || profile.phone || "").trim() || undefined,
      deliveryTimeLabel: String(storeData?.deliveryTimeLabel || "20-45 min").trim(),
      priceForTwoLabel: toPriceForTwoLabel(String(storeData?.priceForTwoLabel || profile.priceRange || "")),
      deliveryFeeLabel: String(storeData?.deliveryFeeLabel || "FREE above ₹299").trim(),
      quickFilterChips,
      heroTitle: String(storeData?.heroTitle || "Super Delicious Food Menu").trim(),
      heroSubtitle:
        String(
          storeData?.heroSubtitle ||
            aboutFallback ||
            "Freshly cooked favourites delivered with reliable service."
        ).trim(),
      cuisineLabel:
        String(storeData?.cuisineLabel || cuisineFallback || profile.category || "Multi-cuisine").trim() ||
        "Multi-cuisine",
      rating: Number(storeData?.rating || profile.rating || 0),
      reviews: Number(storeData?.reviews || profile.reviews || 0),
      address: addressLabel || "Address unavailable",
      sublocality: sublocalityLabel || undefined,
      categories: categoriesFromProducts.length > 0 ? categoriesFromProducts : ["Food"],
      filters: Array.isArray(storeData?.filters) ? storeData.filters : [],
      products: sourceProducts,
      featured: {
        title: String(storeData?.featured?.title || "Featured Dishes").trim(),
        subtitle: String(storeData?.featured?.subtitle || "Chef specials and bestsellers").trim(),
        productIds: featuredProductIds,
      },
      trending: {
        title: String(storeData?.trending?.title || "Trending Now").trim(),
        subtitle: String(storeData?.trending?.subtitle || "Most ordered this week").trim(),
        productIds: trendingProductIds,
      },
      aboutTitle: String(storeData?.aboutTitle || "About Restaurant").trim(),
      aboutBody:
        String(
          aboutFallback ||
            storeData?.aboutBody ||
            "Explore a curated menu with quick delivery and trusted quality."
        ).trim(),
    };
  }, [coverImage, fullAddress, isRestaurantProfile, logoImage, profile, storeData]);

  if (restaurantStoreData) {
    return (
      <RestaurantMarketplacePage
        data={restaurantStoreData}
        onAddToCart={handleAddToCart}
        storeReviewStats={{
          rating: roundedRating,
          reviews: reviewCount,
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 pb-24 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pb-10 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 lg:max-w-[1240px]">
        <section className="rounded-[24px] border border-[#d9dde3] bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-hidden rounded-[18px] border border-[#d9dde2] bg-[#f2f3f5]">
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

          <div className="relative -mt-[46px] flex justify-center sm:-mt-[52px] md:hidden">
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

          <div className="mt-1 flex items-center justify-between gap-2 px-1 md:hidden">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                liveStoreOpenState === true
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : liveStoreOpenState === false
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveStoreOpenState === true
                    ? "bg-emerald-500"
                    : liveStoreOpenState === false
                      ? "bg-rose-500"
                      : "bg-slate-400"
                }`}
              />
              {liveStoreOpenState === true
                ? "Open Now"
                : liveStoreOpenState === false
                  ? "Closed"
                  : "Status Unknown"}
            </span>

            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                <CheckCircle2 size={14} className="text-[#2f9f57]" />
                Verified
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-center md:hidden">
            <h1
              className="mx-auto max-w-full truncate px-2 text-[22px] font-extrabold leading-snug text-[#4b4f53]"
              style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
            >
              {profile.name}
            </h1>
            <p className="mt-0.5 text-sm font-bold leading-tight text-gray-600">
              {profile.category}
            </p>

            {fullAddress ? (
              <p className="mx-auto mt-1 flex max-w-[900px] items-center justify-center gap-1.5 px-1 text-xs font-bold leading-tight text-gray-500">
                <MapPin size={14} className="shrink-0 text-[#d44040]" />
                <span className="min-w-0 truncate whitespace-nowrap">{`Address : ${fullAddress}`}</span>
              </p>
            ) : null}
          </div>

          <div className="hidden min-h-[182px] items-start justify-between gap-6 rounded-2xl border border-[#e2e5e9] bg-white px-4 pb-5 pt-6 shadow-[0_10px_22px_rgba(15,23,42,0.06)] md:flex lg:px-5">
            <div className="flex min-w-0 items-start gap-4 lg:gap-5">
              <div className="-mt-[64px] h-[116px] w-[116px] shrink-0 overflow-hidden rounded-full border-2 border-[#cc5c5c] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] lg:-mt-[72px] lg:h-[126px] lg:w-[126px]">
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

              <div className="min-w-0 -mt-1.5 lg:-mt-1">
                <div className="mb-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      liveStoreOpenState === true
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : liveStoreOpenState === false
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        liveStoreOpenState === true
                          ? "bg-emerald-500"
                          : liveStoreOpenState === false
                            ? "bg-rose-500"
                            : "bg-slate-400"
                      }`}
                    />
                    {liveStoreOpenState === true
                      ? "Open Now"
                      : liveStoreOpenState === false
                        ? "Closed"
                        : "Status Unknown"}
                  </span>
                </div>

                <h1
                  className="text-[2.05rem] font-black leading-[1.05] text-[#132945] lg:text-[2.45rem]"
                  style={{ fontFamily: "var(--font-poppins), var(--font-rajdhani), var(--font-inter), sans-serif", letterSpacing: "0.05px" }}
                >
                  {profile.name}
                </h1>
                <p
                  className="mt-0.5 text-[15px] font-extrabold leading-tight text-[#1f4f8d] lg:text-base"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                >
                  {profile.category}
                </p>

                {fullAddress ? (
                  <p className="mt-1 flex items-start gap-2 text-xs font-bold leading-snug text-[#5c6c7e] lg:text-[13px]">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-[#d44040]" />
                    <span className="min-w-0 break-words">{`Address : ${fullAddress}`}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {isVerified ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start text-base font-semibold text-[#1E40AF] lg:text-lg">
                <CheckCircle2 size={18} className="text-[#2563EB]" />
                Verified
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-white/70 bg-[#f8fbff]/70 p-2 backdrop-blur-sm shadow-[0_10px_20px_rgba(15,23,42,0.04)] md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <div className="grid grid-cols-4 gap-2.5">
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
                icon={<WhatsAppIcon className="h-4 w-4 text-[#22C55E]" />}
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
          </div>

          {shareMessage ? (
            <p className="mt-2.5 text-center text-xs font-medium text-gray-500">{shareMessage}</p>
          ) : null}

          <div className="mt-2.5 grid grid-cols-4 items-center gap-2.5 rounded-2xl border border-white/70 bg-[#f7fbff]/75 p-2 text-center backdrop-blur-sm shadow-[0_10px_20px_rgba(15,23,42,0.04)] md:mt-3 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {storeHref ? (
              <Link
                href={storeHref}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-1.5 py-2 text-[12px] font-medium text-white shadow-[0_10px_20px_rgba(37,99,235,0.28)] transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:from-[#1D4ED8] hover:to-[#2563EB] md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/20">
                  <Store size={13} />
                </span>
                Store
              </Link>
            ) : (
              <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-gradient-to-br from-[#5B8EF0] to-[#78A7F4] px-1.5 py-2 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/20">
                  <Store size={13} />
                </span>
                Store
              </span>
            )}

            {inquiryHref ? (
              <a
                href={inquiryHref}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#C8DCF8] bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(234,244,255,0.82))] px-1.5 py-2 text-[12px] font-medium text-black shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-white md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D5E5FB] bg-white/85 text-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <MessageCircle size={13} />
                </span>
                Inquiry
              </a>
            ) : (
              <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#C8DCF8] bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(234,244,255,0.82))] px-1.5 py-2 text-[12px] font-medium text-black opacity-55 shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-md md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D5E5FB] bg-white/85 text-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <MessageCircle size={13} />
                </span>
                Inquiry
              </span>
            )}

            <p className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#F6D8A9] bg-[linear-gradient(145deg,rgba(255,248,236,0.95),rgba(255,242,222,0.9))] px-1 text-[12px] font-medium text-[#B45309] shadow-[0_8px_18px_rgba(180,83,9,0.12)] md:min-h-11 md:rounded-[12px] md:text-xs md:font-semibold">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#FCD8A6] bg-white/85 text-[#D97706] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <Star size={13} className="fill-[#F59E0B] text-[#F59E0B]" />
              </span>
              <span className="md:hidden">{roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}</span>
              <span className="hidden md:inline">{`Rating ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}`}</span>
            </p>

            <p className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#BBF7D0] bg-[linear-gradient(145deg,rgba(240,253,244,0.95),rgba(220,252,231,0.9))] px-1 text-[12px] font-semibold text-emerald-700 shadow-[0_8px_18px_rgba(16,185,129,0.12)] md:min-h-11 md:rounded-[12px] md:text-xs md:font-bold">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#A7F3D0] bg-white/85 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <CheckCircle2 size={13} className="text-emerald-600" />
              </span>
              Trusted
            </p>
          </div>

          {photoItems.length > 0 ? (
            <section className="mt-5 rounded-2xl border border-[#d9dde2] bg-white p-3 sm:p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                <button
                  type="button"
                  onClick={() => setIsPhotosModalOpen(true)}
                  className="rounded-full border border-[#bfdbfe] bg-white/90 px-2.5 py-1 text-xs font-semibold text-blue-600 shadow-[0_6px_10px_rgba(59,130,246,0.12)]"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:hidden">
                {mobilePhotoRow.map((photo, index) => {
                  const showOverlay = mobileOverflowCount > 0 && index === mobilePhotoRow.length - 1;
                  if (showOverlay) {
                    return (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => setIsPhotosModalOpen(true)}
                        className="group relative overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
                        aria-label={`View ${mobileOverflowCount} more photos`}
                      >
                        <img
                          src={photo}
                          alt={`${profile.name} gallery ${index + 1}`}
                          className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 bg-[#0f172a]/50" />
                        <span className="absolute inset-0 grid place-items-center text-center text-lg font-extrabold leading-none text-white">
                          +{mobileOverflowCount}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`${photo}-${index}`}
                      className="overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
                    >
                      <img
                        src={photo}
                        alt={`${profile.name} gallery ${index + 1}`}
                        className="h-20 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="hidden grid-cols-6 gap-3 lg:grid">
                {desktopPhotoRow.map((photo, index) => {
                  const showOverlay = desktopOverflowCount > 0 && index === desktopPhotoRow.length - 1;
                  if (showOverlay) {
                    return (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => setIsPhotosModalOpen(true)}
                        className="group relative overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
                        aria-label={`View ${desktopOverflowCount} more photos`}
                      >
                        <img
                          src={photo}
                          alt={`${profile.name} gallery ${index + 1}`}
                          className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 bg-[#0f172a]/50" />
                        <span className="absolute inset-0 grid place-items-center text-center text-xl font-extrabold leading-none text-white">
                          +{desktopOverflowCount}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`${photo}-${index}`}
                      className="overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
                    >
                      <img
                        src={photo}
                        alt={`${profile.name} gallery ${index + 1}`}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="relative overflow-hidden rounded-[12px] border border-[#dde3ea] bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:px-5">
            <div className="pointer-events-none absolute -right-20 -top-16 h-32 w-32 rounded-full bg-[#dbeafe]/55 blur-2xl" />

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3
                  className="inline-flex items-center gap-2.5 text-xl font-bold text-black"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB]">
                    <BriefcaseBusiness size={15} />
                  </span>
                  <span>Services</span>
                </h3>

                <ul className="mt-3 space-y-2">
                  {serviceItems.map((service) => (
                    <li
                      key={service}
                      className="flex items-center gap-2.5 rounded-[10px] border border-[#e6ebf2] bg-[#f9fbfd] px-2.5 py-1.5 text-base font-semibold text-[#53606f] transition-all duration-200 hover:translate-x-[1px] hover:bg-white"
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#86efac] bg-[#ecfdf3] text-[#16a34a]">
                        <CheckCircle2 size={13} />
                      </span>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-l border-[#e5e9ef] pl-5">
                <h3
                  className="inline-flex items-center gap-2.5 text-xl font-bold text-black"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB]">
                    <Layers3 size={15} />
                  </span>
                  <span>Categories</span>
                </h3>

                <ul className="mt-3 space-y-2">
                  {categoryItems.map((category) => (
                    <li
                      key={category}
                      className="flex items-center gap-2.5 rounded-[10px] border border-[#e6ebf2] bg-[#f9fbfd] px-2.5 py-1.5 text-base font-semibold text-[#53606f] transition-all duration-200 hover:translate-x-[1px] hover:bg-white"
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#86efac] bg-[#ecfdf3] text-[#16a34a]">
                        <CheckCircle2 size={13} />
                      </span>
                      {category}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[12px] border border-[#dde3ea] bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:px-5">
            <div className="pointer-events-none absolute -left-16 -top-16 h-32 w-32 rounded-full bg-[#ffe7ca]/55 blur-2xl" />

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3
                  className="inline-flex items-center gap-2 text-[1.08rem] font-bold text-black"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#ffe4c5] bg-[#fff7ec] text-[#d97706]">
                    <CalendarDays size={15} />
                  </span>
                  Establishment Year
                </h3>
                {profile.establishmentYear ? (
                  <p className="mt-3 inline-flex items-center rounded-full border border-[#ffddb0] bg-[#fff6e8] px-3 py-1.5 text-sm font-bold text-[#b45309]">
                    {`Since ${profile.establishmentYear}`}
                  </p>
                ) : null}
              </div>

              <div className="border-l border-[#e5e9ef] pl-5">
                <h3
                  className="inline-flex items-center gap-2 text-[1.08rem] font-bold text-black"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#ffe4c5] bg-[#fff7ec] text-[#d97706]">
                    <Clock3 size={15} />
                  </span>
                  Opening Time :
                </h3>

                <ul className="mt-3 space-y-2">
                  {openingSchedule.map((item) => (
                    <li
                      key={`${item.day}-${item.time}`}
                      className="rounded-[10px] border border-[#e7ebf2] bg-[#f9fbfd] px-2.5 py-1.5 text-sm font-semibold leading-tight text-[#526071]"
                    >
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-bold text-[#6b7280]">
                        {item.day}
                      </span>
                      <span className="ml-1.5">{item.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {profile.description ? (
            <section className="relative overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-[linear-gradient(140deg,#fffefb_0%,#ffffff_58%,#f7fff9_100%)] px-4 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:px-5 lg:col-span-2">
              <div className="pointer-events-none absolute -right-16 -top-14 h-28 w-28 rounded-full bg-[#fde68a]/25 blur-2xl" />
              <h3
                className="relative inline-flex items-center gap-2 text-[1.03rem] font-bold text-[#1f2a44]"
                style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#e5d7b4] bg-[#fff7e7] text-[#b45309]">
                  <Info size={15} />
                </span>
                About Business :
              </h3>
              <p
                className="relative mt-3 text-[14px] font-medium leading-[1.72] text-[#3e4a5a]"
                style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
              >
                {profile.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-[12px] border border-[#e6dfd2] bg-[#fffcf7] px-3 py-3 lg:col-span-2 sm:px-4">
            <div className="flex items-center gap-3">
              <h3
                className="inline-flex items-center gap-2 text-[1.02rem] font-bold text-[#1f2a44]"
                style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#fde2ba] bg-[#fff3df] text-[#d97706]">
                  <MessageSquare size={15} />
                </span>
                Rating & Reviews
              </h3>
              <div className="flex items-center gap-1 rounded-full border border-[#fde2b0] bg-[#fff4df] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    className={
                      star <= ratingOutOfFive
                        ? "fill-[#f59e0b] text-[#f59e0b] drop-shadow-[0_1px_2px_rgba(245,158,11,0.45)]"
                        : "text-[#c9ced4]"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-3.5">
              {reviewsLoading ? (
                <p className="text-sm font-medium text-[#666b6f]">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                reviewsToDisplay.map((review) => {
                  const reviewScore = Math.max(0, Math.min(5, Math.round(Number(review.rating || 0))));
                  const sentiment = reviewScore <= 2 ? "low" : reviewScore === 3 ? "medium" : "high";
                  const isOwnReview = Boolean(currentUser?.id && review.reviewerId === currentUser.id);
                  const isEditingThisReview = editingReviewId === review.id;
                  const reviewEditCount = Math.max(0, Number(review.editCount || 0));
                  const editsRemaining = Math.max(0, 2 - reviewEditCount);
                  const reviewWasEdited = Boolean(review.isEdited || reviewEditCount > 0);
                  const isExpanded = Boolean(expandedReviewIds[review.id]);
                  const canToggleMore = Boolean(reviewOverflowIds[review.id]);
                  const toneClasses =
                    sentiment === "low"
                      ? {
                          card: "border-[#f4cccc] bg-[#fff6f6]",
                          comment: "text-[#9f2f2f]",
                          star: "fill-[#ef4444] text-[#ef4444] drop-shadow-[0_1px_2px_rgba(239,68,68,0.36)]",
                        }
                      : sentiment === "medium"
                        ? {
                            card: "border-[#f7dfb3] bg-[#fff9ef]",
                            comment: "text-[#9a580a]",
                            star: "fill-[#f59e0b] text-[#f59e0b] drop-shadow-[0_1px_2px_rgba(245,158,11,0.4)]",
                          }
                        : {
                            card: "border-[#c8edd8] bg-[#f3fff8]",
                            comment: "text-[#166534]",
                            star: "fill-[#22c55e] text-[#22c55e] drop-shadow-[0_1px_2px_rgba(34,197,94,0.35)]",
                          };

                  return (
                    <article
                      key={review.id}
                      className={`rounded-[10px] border px-3 py-2.5 shadow-[0_4px_10px_rgba(15,23,42,0.04)] ${
                        toneClasses.card
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <p
                            className="text-[11px] font-semibold text-[#6b7280]"
                            style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                          >
                            {review.author}
                          </p>
                          {reviewWasEdited ? (
                            <span className="rounded-full border border-[#d1d5db] bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#4b5563]">
                              Edited
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={`${review.id}-${star}`}
                              size={17}
                              className={
                                star <= reviewScore
                                  ? toneClasses.star
                                  : "text-[#d2d7dc]"
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {isEditingThisReview ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={`${review.id}-edit-${value}`}
                                type="button"
                                onClick={() => setEditReviewRating(value)}
                                disabled={isUpdatingReview}
                                className="rounded-full p-1 transition-colors duration-150 hover:bg-white/70 disabled:opacity-60"
                                aria-label={`Set rating ${value}`}
                              >
                                <Star
                                  size={18}
                                  className={
                                    value <= editReviewRating
                                      ? "fill-[#f59e0b] text-[#f59e0b]"
                                      : "text-[#c3c8cc]"
                                  }
                                />
                              </button>
                            ))}
                          </div>

                          <textarea
                            value={editReviewText}
                            onChange={(event) => setEditReviewText(event.target.value)}
                            disabled={isUpdatingReview}
                            className="min-h-[90px] w-full rounded-[10px] border border-[#d7dee6] bg-white px-3 py-2 text-sm font-medium text-[#334155] outline-none"
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleUpdateReview(review)}
                              disabled={isUpdatingReview}
                              className="inline-flex min-h-9 items-center justify-center rounded-[8px] bg-[#1d4ed8] px-3 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {isUpdatingReview ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditReview}
                              disabled={isUpdatingReview}
                              className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#475569]"
                            >
                              Cancel
                            </button>
                            <span className="text-[11px] font-medium text-[#6b7280]">
                              {`Edits left: ${editsRemaining}`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            ref={(node) => {
                              reviewTextRefs.current[review.id] = node;
                              if (!node || isExpanded) {
                                return;
                              }

                              const hasOverflow = node.scrollHeight - node.clientHeight > 1;
                              setReviewOverflowIds((previous) =>
                                previous[review.id] === hasOverflow
                                  ? previous
                                  : { ...previous, [review.id]: hasOverflow }
                              );
                            }}
                            className={`mt-1.5 text-[15px] font-semibold leading-[1.45] ${toneClasses.comment} ${
                              isExpanded ? "" : "line-clamp-2 md:line-clamp-5"
                            }`}
                            style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                          >
                            {review.comment}
                          </p>

                          {canToggleMore ? (
                            <button
                              type="button"
                              onClick={() => toggleReviewExpanded(review.id)}
                              className="mt-1 text-xs font-semibold text-[#1d4ed8] hover:underline"
                            >
                              {isExpanded ? "Less" : "More"}
                            </button>
                          ) : null}

                          <div className="mt-1.5 flex items-center justify-between gap-3">
                            {review.createdAt ? (
                              <p className="text-xs font-medium text-gray-500">
                                {formatReviewDate(String(review.createdAt || ""))}
                              </p>
                            ) : <span />}

                            {isOwnReview ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditReview(review)}
                                  disabled={reviewEditCount >= 2}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 text-[11px] font-semibold text-[#334155] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <Pencil size={12} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteReview(review)}
                                  disabled={deletingReviewId === review.id}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-[8px] border border-[#fecaca] bg-white px-2.5 text-[11px] font-semibold text-[#b91c1c] disabled:opacity-60"
                                >
                                  <Trash2 size={12} />
                                  {deletingReviewId === review.id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {isOwnReview && reviewEditCount >= 2 ? (
                            <p className="mt-1 text-[11px] font-medium text-[#b45309]">
                              Edit limit reached (2/2).
                            </p>
                          ) : null}
                        </>
                      )}
                    </article>
                  );
                })
              ) : (
                <p className="text-sm font-medium text-[#666b6f]">No reviews yet.</p>
              )}
            </div>

            {reviewActionMessage ? (
              <p className="mt-2 text-xs font-medium text-[#4b5563]">{reviewActionMessage}</p>
            ) : null}

            <p className="mt-2.5 text-xs font-medium text-gray-500">
              {`Overall ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"} from ${reviewCount} reviews`}
            </p>
          </section>

          <section className="relative overflow-hidden rounded-[12px] border border-[#e2e7ee] bg-[linear-gradient(135deg,#ffffff_0%,#f9fbff_62%,#f4fff8_100%)] px-4 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:px-5 lg:col-span-2">
            <div className="pointer-events-none absolute -right-20 -top-16 h-32 w-32 rounded-full bg-[#bfdbfe]/35 blur-2xl" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-[#bbf7d0]/25 blur-2xl" />

            <h3
              className="relative inline-flex items-center gap-2 text-[1.03rem] font-bold text-[#1f2a44]"
              style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563eb]">
                <PencilLine size={15} />
              </span>
              Write a Review
            </h3>

            {authLoading ? (
              <p className="mt-3.5 text-sm font-medium text-[#6b7280]">Checking login status...</p>
            ) : hasAlreadyReviewed ? (
              <div className="mt-3.5 rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#166534]">
                You already reviewed this shop. You can edit (up to 2 times) or delete your review above.
              </div>
            ) : (
              <form className="relative mt-3.5 space-y-3.5" onSubmit={handleSubmitReview}>
                <label className="block text-xs font-semibold text-[#4b5563]">
                  Name
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(event) => setReviewAuthor(event.target.value)}
                    disabled={!currentUser}
                    className="mt-1 min-h-10 w-full rounded-[10px] border border-[#d7dee6] bg-white px-3 text-sm font-medium text-[#374151] outline-none"
                    placeholder="Your name"
                  />
                </label>

                <div>
                  <p className="text-xs font-semibold text-[#4b5563]">Rating</p>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRatingInput(value)}
                        disabled={!currentUser}
                        className="rounded-full p-1 transition-colors duration-150 hover:bg-[#fff7e6] disabled:opacity-60"
                        aria-label={`Rate ${value}`}
                      >
                        <Star
                          size={21}
                          className={
                            value <= reviewRatingInput
                              ? "fill-[#f59e0b] text-[#f59e0b] drop-shadow-[0_1px_2px_rgba(245,158,11,0.4)]"
                              : "text-[#c3c8cc]"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-semibold text-[#4b5563]">
                  Review
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    disabled={!currentUser}
                    className="mt-1 min-h-[96px] w-full rounded-[10px] border border-[#d7dee6] bg-white px-3 py-2 text-sm font-medium text-[#374151] outline-none"
                    placeholder="Write your review"
                  />
                </label>

                {reviewFormMessage ? (
                  <p className="text-xs font-medium text-[#5f6569]">{reviewFormMessage}</p>
                ) : null}

                {!currentUser ? (
                  <Link
                    href="/auth"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-[#bae6fd] bg-[#e0f2fe] px-4 text-sm font-semibold text-[#0f4f68]"
                  >
                    Login to write a review
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#2b98c8] px-4 text-sm font-semibold text-white shadow-[0_6px_12px_rgba(43,152,200,0.28)] disabled:opacity-60"
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                )}
              </form>
            )}
          </section>
        </div>

        {isPhotosModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
            onClick={() => setIsPhotosModalOpen(false)}
          >
            <section
              className="w-full max-w-5xl rounded-2xl border border-[#d9dde2] bg-white p-4 shadow-xl"
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
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:grid-cols-6">
                  {photoItems.map((photo, index) => (
                    <div key={`${photo}-all-${index}`} className="overflow-hidden rounded-[10px] border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]">
                      <img
                        src={photo}
                        alt={`${profile.name} gallery full ${index + 1}`}
                        className="h-20 w-full object-cover sm:h-24 lg:h-28"
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
