"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Globe,
  Layers3,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Pencil,
  PencilLine,
  Phone,
  Share2,
  Store,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ListingProfile, StorePageData, StoreProduct } from "@/data/listingData";
import { buildProductSlug } from "@/data/productSlug";
import Footer from "@/components/Footer";
import RestaurantMarketplacePage from "@/components/RestaurantMarketplacePage";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { submitVendorInquiry } from "@/lib/catalogClient";
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

const isRestaurantCategoryLabel = (value: string) => String(value || "").trim().toLowerCase() === "restaurant";

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

const INQUIRY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INQUIRY_PHONE_REGEX = /^[0-9]{10}$/;

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
  const [isBusinessInfoExpanded, setIsBusinessInfoExpanded] = useState(false);
  const [isBusinessInfoOverflowing, setIsBusinessInfoOverflowing] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});
  const [reviewOverflowIds, setReviewOverflowIds] = useState<Record<string, boolean>>({});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquirySubject, setInquirySubject] = useState(`Inquiry for ${profile.name}`);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryFormMessage, setInquiryFormMessage] = useState<string | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [contactCardMessage, setContactCardMessage] = useState<string | null>(null);
  const [isHeroScrollBarVisible, setIsHeroScrollBarVisible] = useState(false);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const businessInfoTextRef = useRef<HTMLParagraphElement | null>(null);
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
    setInquirySubject(`Inquiry for ${profile.name}`);
    setInquiryFormMessage(null);
  }, [profile.id, profile.name]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const name = String(currentUser.name || "").trim();
    const email = String(currentUser.email || "").trim();
    const phone = normalizeDigits(String(currentUser.phone || "")).slice(0, 10);

    if (name) {
      setInquiryName((previous) => previous || name);
    }

    if (email) {
      setInquiryEmail((previous) => previous || email);
    }

    if (phone) {
      setInquiryPhone((previous) => previous || phone);
    }
  }, [currentUser]);

  useEffect(() => {
    return subscribeVendorStoreStatus(String(profile.id || ""), (payload) => {
      setLiveStoreStatus(payload);
    });
  }, [profile.id]);

  useEffect(() => {
    const updateHeroScrollBarVisibility = () => {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        setIsHeroScrollBarVisible(false);
        return;
      }

      const heroRect = heroSectionRef.current?.getBoundingClientRect();
      if (!heroRect) {
        setIsHeroScrollBarVisible(false);
        return;
      }

      setIsHeroScrollBarVisible(heroRect.bottom <= 72);
    };

    updateHeroScrollBarVisibility();
    window.addEventListener("scroll", updateHeroScrollBarVisibility, { passive: true });
    window.addEventListener("resize", updateHeroScrollBarVisibility);

    return () => {
      window.removeEventListener("scroll", updateHeroScrollBarVisibility);
      window.removeEventListener("resize", updateHeroScrollBarVisibility);
    };
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
  const emailHref = useMemo(() => {
    const email = String(profile.email || "").trim();
    if (!email) {
      return "";
    }

    return `mailto:${email}?subject=${encodeURIComponent(`Inquiry for ${profile.name}`)}`;
  }, [profile.email, profile.name]);
  const directionsHref = useMemo(() => {
    const query = fullAddress || [profile.name, profile.city].map((item) => String(item || "").trim()).filter(Boolean).join(", ");
    if (!query) {
      return "";
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [fullAddress, profile.city, profile.name]);
  const storeHref = useMemo(() => {
    const storeId = String(profile.storeId || profile.id || "").trim();
    return storeId ? `/store/${storeId}` : "";
  }, [profile.id, profile.storeId]);
  const hasInquiryTarget = useMemo(
    () => Boolean(String(profile.id || profile.storeId || "").trim()),
    [profile.id, profile.storeId]
  );

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
  const photoGridColumns = 4;
  const photoGridRows = 4;
  const mobilePhotoSlots = photoGridColumns * photoGridRows;
  const desktopPhotoSlots = photoGridColumns * photoGridRows;
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
    setIsBusinessInfoExpanded(false);
    setIsBusinessInfoOverflowing(false);
  }, [profile.description, profile.id]);

  useEffect(() => {
    const measureBusinessInfoOverflow = () => {
      const node = businessInfoTextRef.current;
      if (!node || isBusinessInfoExpanded) {
        return;
      }

      setIsBusinessInfoOverflowing(node.scrollHeight - node.clientHeight > 1);
    };

    const frame = window.requestAnimationFrame(measureBusinessInfoOverflow);
    window.addEventListener("resize", measureBusinessInfoOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureBusinessInfoOverflow);
    };
  }, [isBusinessInfoExpanded, profile.description]);

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

  const closePhotosModal = () => {
    setIsPhotosModalOpen(false);
    setSelectedPhotoUrl(null);
  };

  const openAllPhotosModal = () => {
    setSelectedPhotoUrl(null);
    setIsPhotosModalOpen(true);
  };

  const openSinglePhotoModal = (photoUrl: string) => {
    if (!photoUrl) {
      return;
    }

    setSelectedPhotoUrl(photoUrl);
    setIsPhotosModalOpen(true);
  };

  const openInquiryModal = () => {
    setInquiryFormMessage(null);
    setIsInquiryModalOpen(true);
  };

  const closeInquiryModal = () => {
    setIsInquiryModalOpen(false);
  };

  const handleCopyAddress = async () => {
    if (!fullAddress) {
      setContactCardMessage("Address is unavailable.");
      return;
    }

    try {
      await navigator.clipboard.writeText(fullAddress);
      setContactCardMessage("Address copied.");
    } catch {
      setContactCardMessage("Unable to copy address.");
    }
  };

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

  const handleSubmitInquiry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInquiryFormMessage(null);

    const vendorId = String(profile.id || profile.storeId || "").trim();
    if (!vendorId) {
      setInquiryFormMessage("Vendor information is unavailable right now.");
      return;
    }

    const name = inquiryName.trim();
    const phone = normalizeDigits(inquiryPhone).slice(0, 10);
    const email = inquiryEmail.trim();
    const subject = inquirySubject.trim() || `Inquiry for ${profile.name}`;
    const message = inquiryMessage.trim();

    if (!name) {
      setInquiryFormMessage("Please enter your name.");
      return;
    }

    if (!INQUIRY_PHONE_REGEX.test(phone)) {
      setInquiryFormMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    if (email && !INQUIRY_EMAIL_REGEX.test(email)) {
      setInquiryFormMessage("Please enter a valid email address.");
      return;
    }

    if (message.length < 8) {
      setInquiryFormMessage("Please enter a detailed enquiry.");
      return;
    }

    setIsSubmittingInquiry(true);
    try {
      await submitVendorInquiry({
        vendorId,
        name,
        phone,
        email: email || undefined,
        subject,
        message,
        channel: "Web",
      });

      setInquiryMessage("");
      setInquiryFormMessage("Enquiry sent successfully.");
    } catch (submitError) {
      setInquiryFormMessage(
        submitError instanceof Error ? submitError.message : "Unable to send enquiry right now."
      );
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const renderInquiryForm = (formClassName = "space-y-2.5") => (
    <form className={formClassName} onSubmit={handleSubmitInquiry}>
      <input
        type="text"
        value={inquiryName}
        onChange={(event) => setInquiryName(event.target.value)}
        className="w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
        placeholder="Your name"
        required
      />

      <div className="grid grid-cols-2 gap-2.5">
        <input
          type="tel"
          value={inquiryPhone}
          onChange={(event) => setInquiryPhone(normalizeDigits(event.target.value).slice(0, 10))}
          className="w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
          placeholder="Phone"
          inputMode="numeric"
          maxLength={10}
          required
        />

        <input
          type="email"
          value={inquiryEmail}
          onChange={(event) => setInquiryEmail(event.target.value)}
          className="w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
          placeholder="Email (optional)"
        />
      </div>

      <input
        type="text"
        value={inquirySubject}
        onChange={(event) => setInquirySubject(event.target.value)}
        className="w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
        placeholder="Subject"
      />

      <textarea
        value={inquiryMessage}
        onChange={(event) => setInquiryMessage(event.target.value)}
        className="min-h-[92px] w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
        placeholder="Write your enquiry"
        required
      />

      {inquiryFormMessage ? (
        <p className="text-xs font-medium text-[#4b5563]">{inquiryFormMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmittingInquiry}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#2563eb] text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1d4ed8] disabled:opacity-60"
      >
        {isSubmittingInquiry ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );

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

    return isRestaurantCategoryLabel(profile.category);
  }, [profile.category, storeData]);

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
    <main className="min-h-screen px-3 pb-24 sm:px-4 md:px-6 md:pb-10 lg:px-8 lg:pb-28">
      <div className="mx-auto w-full max-w-[1120px] space-y-0 lg:max-w-[1240px]">
        {isHeroScrollBarVisible ? (
          <>
            <section className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-[#d7dde6] bg-white/95 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] backdrop-blur lg:block">
              <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#d7dee6] bg-white">
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

                  <div className="min-w-0">
                    <h2 className="truncate text-[25px] font-semibold leading-tight text-[#111827]">{profile.name}</h2>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#118c2a] px-2 py-0.5 text-[13px] font-bold text-white">
                        {roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}
                        <Star size={14} className="fill-white text-white" />
                      </span>

                      <span className="text-[13px] font-medium text-[#374151]">{`${reviewCount} Ratings`}</span>

                      <span className="inline-flex rounded-[7px] bg-[#f9dd67] px-2 py-0.5 text-[13px] font-semibold text-[#7c5800]">
                        Trust
                      </span>

                      <span className="text-[15px] font-semibold text-[#2964b8]">Verified</span>

                      <span className="text-[15px] font-semibold text-[#111827]">Claimed</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {phoneDigits ? (
                    <a
                      href={`tel:${phoneDigits}`}
                      className="inline-flex min-h-14 items-center gap-2 rounded-[10px] bg-[#0e9f2f] px-5 text-sm font-semibold text-white"
                    >
                      <Phone size={18} />
                      <span>{profile.phone}</span>
                    </a>
                  ) : (
                    <span className="inline-flex min-h-14 items-center gap-2 rounded-[10px] bg-[#9ca3af] px-5 text-sm font-semibold text-white opacity-70">
                      <Phone size={18} />
                      Call
                    </span>
                  )}

                  {hasInquiryTarget ? (
                    <button
                      type="button"
                      onClick={openInquiryModal}
                      className="inline-flex min-h-14 items-center gap-2 rounded-[10px] bg-[#1778d0] px-5 text-sm font-semibold text-white"
                    >
                      <MessageCircle size={18} />
                      Enquire Now
                    </button>
                  ) : (
                    <span className="inline-flex min-h-14 items-center gap-2 rounded-[10px] bg-[#93c5fd] px-5 text-sm font-semibold text-white opacity-70">
                      <MessageCircle size={18} />
                      Enquire Now
                    </span>
                  )}

                  {whatsappDigits ? (
                    <a
                      href={`https://wa.me/${whatsappDigits}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-14 items-center gap-2 rounded-[10px] border border-[#1f8d29] bg-white px-5 text-sm font-semibold text-[#0f172a]"
                    >
                      <WhatsAppIcon className="h-5 w-5 text-[#16a34a]" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="inline-flex min-h-14 items-center gap-2 rounded-[10px] border border-[#cbd5e1] bg-white px-5 text-sm font-semibold text-slate-500 opacity-70">
                      <WhatsAppIcon className="h-5 w-5 text-[#94a3b8]" />
                      WhatsApp
                    </span>
                  )}

                  {storeHref ? (
                    <Link
                      href={storeHref}
                      className="inline-flex min-h-14 items-center gap-2 rounded-[10px] border border-[#c7d2fe] bg-[#4338ca] px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#e0e7ff]"
                    >
                      <Store size={18} />
                      My Store
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-14 items-center gap-2 rounded-[10px] border border-[#cbd5e1] bg-[#4338ca] px-5 text-sm font-semibold text-white opacity-70">
                      <Store size={18} />
                      My Store
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-[10px] border border-[#d1d5db] bg-white text-[#374151]"
                    aria-label="Share profile"
                  >
                    <Share2 size={20} />
                  </button>

                  <a
                    href={websiteHref || "#"}
                    target={websiteHref ? "_blank" : undefined}
                    rel={websiteHref ? "noreferrer" : undefined}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-[10px] border border-[#d1d5db] bg-white text-[#374151] ${websiteHref ? "" : "pointer-events-none opacity-55"}`}
                    aria-label="Open website"
                  >
                    <Globe size={20} />
                  </a>
                </div>
              </div>
              </div>
            </section>
          </>
        ) : null}

        <section className="rounded-[24px] bg-white px-4 pb-4 pt-0 sm:px-5 sm:pb-5 sm:pt-0">
          <div ref={heroSectionRef}>
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#f2f3f5]">
            {coverImage ? (
              <img
                src={coverImage}
                alt={profile.name}
                className="h-50 w-full object-cover sm:h-56 lg:h-78"
                loading="lazy"
              />
            ) : (
              <div className="h-48 w-full bg-[#d4d8db] sm:h-56 lg:h-64" />
            )}
          </div>

          <div className="relative z-20 -mt-[56px] flex justify-center sm:-mt-[62px] md:hidden">
            <div className="h-[95px] w-[95px] overflow-hidden rounded-full border-2 border-[#cc5c5c] bg-white sm:h-[104px] sm:w-[104px]">
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

          <div className="-mt-8 flex items-center justify-between gap-2 -px-1 md:hidden">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                liveStoreOpenState === true
                  ? "bg-emerald-50 text-emerald-700 motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]"
                  : liveStoreOpenState === false
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-50 text-slate-600"
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

          <div className="mt-2 text-center md:hidden">
            <h1
              className="mx-auto max-w-full truncate px-2 text-[20px] font-extrabold leading-snug text-[#4b4f53]"
              style={{ fontFamily: "Fahkwang" }}
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

          <div className="hidden min-h-[182px] items-start justify-between gap-6 px-4 pb-5 pt-6 md:flex lg:min-h-[128px] lg:px-5 lg:pb-2 lg:pt-4">
            <div className="flex min-w-0 items-start gap-4 lg:gap-5">
              <div className="relative z-20 -mt-[68px] h-[116px] w-[116px] shrink-0 overflow-hidden rounded-full border-2 border-[#cc5c5c] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] lg:-mt-[73px] lg:h-[126px] lg:w-[126px]">
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

              <div className="min-w-0 -mt-3 lg:-mt-2.5">

                <h1
                  className="text-[0.875rem] font-black leading-[1.05] text-[#132945] lg:text-[2rem]"
                  style={{ fontFamily: "Fahkwang", letterSpacing: "0.05px" }}
                >
                  {profile.name}
                </h1>
                <p
                  className="mt-2 text-[15px] font-extrabold leading-tight text-[#1f4f8d] lg:text-base"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                >
                  {profile.category}
                </p>

                {fullAddress ? (
                  <p className="mt-2.5 flex items-start gap-2 text-xs font-bold leading-snug text-[#5c6c7e] lg:text-[13px]">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-[#d44040]" />
                    <span className="min-w-0 break-words">{`Address : ${fullAddress}`}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-bold lg:text-base ${
                liveStoreOpenState === true
                  ? "bg-emerald-50 text-emerald-700 motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]"
                  : liveStoreOpenState === false
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-50 text-slate-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
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

          <div className="mt-4 rounded-2xl border border-white/70 bg-[#f8fbff]/75 p-2 backdrop-blur-sm shadow-[0_10px_20px_rgba(15,23,42,0.04)] md:border-0 md:bg-transparent md:p-0 md:shadow-none lg:hidden">
            <div className="grid grid-cols-3 gap-2.5">
              {storeHref ? (
                <Link
                  href={storeHref}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[#6366F1] px-1.5 py-2 text-[12px] font-medium text-white transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:from-[#1D4ED8] hover:to-[#2563EB] md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/20">
                    <Store size={13} />
                  </span>
                  My Store
                </Link>
              ) : (
                <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-gradient-to-br from-[#5B8EF0] to-[#78A7F4] px-1.5 py-2 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/20">
                    <Store size={13} />
                  </span>
                  Store
                </span>
              )}

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
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {hasInquiryTarget ? (
                <button
                  type="button"
                  onClick={openInquiryModal}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#C8DCF8] bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(234,244,255,0.82))] px-1.5 py-2 text-[12px] font-medium text-black shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-white md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D5E5FB] bg-white/85 text-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <MessageCircle size={13} />
                  </span>
                  Inquiry
                </button>
              ) : (
                <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-[#C8DCF8] bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(234,244,255,0.82))] px-1.5 py-2 text-[12px] font-medium text-black opacity-55 shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-md md:min-h-11 md:rounded-[12px] md:text-sm md:font-semibold">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D5E5FB] bg-white/85 text-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <MessageCircle size={13} />
                  </span>
                  Inquiry
                </span>
              )}

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
          </div>

          {photoItems.length > 0 ? (
            <section className="mt-5 bg-white p-3 sm:p-4 lg:hidden">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                <button
                  type="button"
                  onClick={openAllPhotosModal}
                  className="rounded-full border border-[#bfdbfe] bg-white/90 px-2.5 py-1 text-xs font-semibold text-blue-600 shadow-[0_6px_10px_rgba(59,130,246,0.12)]"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {mobilePhotoRow.map((photo, index) => {
                  const showOverlay = mobileOverflowCount > 0 && index === mobilePhotoRow.length - 1;
                  if (showOverlay) {
                    return (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={openAllPhotosModal}
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
                    <button
                      key={`${photo}-${index}`}
                      type="button"
                      onClick={() => openSinglePhotoModal(photo)}
                      className="overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6] shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
                      aria-label={`View photo ${index + 1}`}
                    >
                      <img
                        src={photo}
                        alt={`${profile.name} gallery ${index + 1}`}
                        className="h-20 w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>

            </section>
          ) : null}

          <div className="mt-2 hidden lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="space-y-5">
              <section className="bg-white p-5 [&_.desktop-elevate]:!shadow-sm [&_.desktop-outline]:!border [&_.desktop-outline]:!border-slate-300 [&_.desktop-card:hover]:!shadow-md">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {storeHref ? (
                      <Link
                        href={storeHref}
                        className="desktop-elevate inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#4F46E5]"
                      >
                        <Store size={16} />
                        My Store
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A5B4FC] px-3 text-sm font-semibold text-white opacity-60">
                        <Store size={16} />
                        Store
                      </span>
                    )}

                    {phoneDigits ? (
                      <a
                        href={`tel:${phoneDigits}`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-3 text-sm font-semibold text-slate-800 transition-colors duration-200 hover:bg-[#E5E7EB]"
                      >
                        <Phone size={15} />
                        Call
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-3 text-sm font-semibold text-slate-500 opacity-60">
                        <Phone size={15} />
                        Call
                      </span>
                    )}

                    {whatsappDigits ? (
                      <a
                        href={`https://wa.me/${whatsappDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-3 text-sm font-semibold text-slate-800 transition-colors duration-200 hover:bg-[#E5E7EB]"
                      >
                        <WhatsAppIcon className="h-4 w-4 text-[#22C55E]" />
                        Whatsapp
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-3 text-sm font-semibold text-slate-500 opacity-60">
                        <WhatsAppIcon className="h-4 w-4 text-[#9CA3AF]" />
                        Whatsapp
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {hasInquiryTarget ? (
                      <button
                        type="button"
                        onClick={openInquiryModal}
                        className=" inline-flex min-h-11 items-center justify-center gap-2 rounded-xl  px-3 text-sm text-slate-800 transition-colors duration-200 hover:bg-[#E5E7EB]"
                      >
                        <MessageCircle size={15} />
                        Inquiry
                      </button>
                    ) : (
                      <span className=" inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-500 opacity-60">
                        <MessageCircle size={15} />
                        Inquiry
                      </span>
                    )}

                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className=" inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                      >
                        <Globe size={14} />
                        Website
                      </a>
                    ) : (
                      <span className=" inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-500 opacity-60">
                        <Globe size={14} />
                        Website
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className=" inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm  text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2 text-center">
                    <p className="inline-flex min-h-7 items-center justify-center gap-1 text-sm  text-[#B45309]">
                      <Star size={13} className="fill-[#F59E0B] text-[#F59E0B]" />
                      {`Rating ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}`}
                    </p>

                    <p className="inline-flex min-h-7 items-center justify-center gap-1 text-sm  text-emerald-700">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      Trusted
                    </p>

                    <p
                      className={`inline-flex min-h-7 items-center justify-center gap-1 text-sm ${
                        isVerified ? "text-[#2563EB]" : "text-[#64748b]"
                      }`}
                    >
                      <CheckCircle2 size={13} className={isVerified ? "text-[#2563EB]" : "text-[#94a3b8]"} />
                      {isVerified ? "Verified" : "Not Verified"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="relative overflow-hidden rounded-[12px] px-4 py-5 sm:px-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <h3
                      className="inline-flex items-center gap-2 text-s font-bold text-black md:gap-2.5 md:text-xl"
                      style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB] md:h-7 md:w-7 md:rounded-[9px]">
                        <BriefcaseBusiness size={13} className="md:hidden" />
                        <BriefcaseBusiness size={15} className="hidden md:block" />
                      </span>
                      <span>Services</span>
                    </h3>

                    <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-black md:space-y-2">
                      {serviceItems.map((service) => (
                        <li
                          key={service}
                          className="text-[15px] text-black md:text-base"
                        >
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-l border-[#e5e9ef] pl-5">
                    <h3
                      className="inline-flex items-center gap-2 text-s font-bold text-black md:gap-2.5 md:text-xl"
                      style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB] md:h-7 md:w-7 md:rounded-[9px]">
                        <Layers3 size={13} className="md:hidden" />
                        <Layers3 size={15} className="hidden md:block" />
                      </span>
                      <span>Categories</span>
                    </h3>

                    <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-black md:space-y-2">
                      {categoryItems.map((category) => (
                        <li
                          key={category}
                          className="text-[15px] text-black md:text-base"
                        >
                          {category}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="rounded-[12px] bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[1.1rem] font-semibold text-[#0f172a]">Contact</h3>
                    {phoneDigits ? (
                      <a
                        href={`tel:${phoneDigits}`}
                        className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-[#2563eb]"
                      >
                        <Phone size={16} />
                        <span>{profile.phone}</span>
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-[#64748b]">Phone unavailable</p>
                    )}
                    {profile.businessAlternatePhone ? (
                      <p className="mt-1 text-sm font-medium text-[#475569]">{`Alt: ${profile.businessAlternatePhone}`}</p>
                    ) : null}
                  </div>

                  <div className="border-t border-[#e7edf4] pt-3">
                    <h3 className="text-[1.1rem] font-semibold text-[#0f172a]">Address</h3>
                    {fullAddress ? (
                      <p className="mt-2 text-[15px] leading-[1.55] text-[#1f2937]">{fullAddress}</p>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-[#64748b]">Address unavailable</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {directionsHref ? (
                        <a
                          href={directionsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded-[8px] bg-[#eff6ff] px-3 text-sm font-semibold text-[#2563eb]"
                        >
                          <Navigation size={15} />
                          Get Directions
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleCopyAddress()}
                        className="inline-flex min-h-9 items-center gap-2 rounded-[8px] bg-[#f1f5f9] px-3 text-sm font-semibold text-[#334155]"
                      >
                        <Copy size={15} />
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#e7edf4] border-t border-[#e7edf4] pt-1">
                    {emailHref ? (
                      <a
                        href={emailHref}
                        className="flex min-h-11 items-center gap-2 text-[1.03rem] font-medium text-[#0f172a]"
                      >
                        <Mail size={17} className="text-[#2563eb]" />
                        <span>Send Enquiry by Email</span>
                      </a>
                    ) : null}

                    {whatsappDigits ? (
                      <a
                        href={`https://wa.me/${whatsappDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center gap-2 text-[1.03rem] font-medium text-[#0f172a]"
                      >
                        <MessageCircle size={17} className="text-[#2563eb]" />
                        <span>Get info via WhatsApp</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className="flex min-h-11 w-full items-center gap-2 text-left text-[1.03rem] font-medium text-[#0f172a]"
                    >
                      <Share2 size={17} className="text-[#2563eb]" />
                      <span>Share</span>
                    </button>

                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center gap-2 text-[1.03rem] font-medium text-[#0f172a]"
                      >
                        <Globe size={17} className="text-[#2563eb]" />
                        <span>Website</span>
                      </a>
                    ) : null}
                  </div>

                  {contactCardMessage ? (
                    <p className="text-xs font-medium text-[#4b5563]">{contactCardMessage}</p>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              {photoItems.length > 0 ? (
                <section className="bg-white p-5 lg:-mt-16">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#4f5357]">Photos</h2>
                    <button
                      type="button"
                      onClick={openAllPhotosModal}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-indigo-600 transition-colors duration-200 hover:bg-indigo-50"
                    >
                      View All
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {desktopPhotoRow.map((photo, index) => {
                      const showOverlay = desktopOverflowCount > 0 && index === desktopPhotoRow.length - 1;
                      if (showOverlay) {
                        return (
                          <button
                            key={`${photo}-${index}`}
                            type="button"
                            onClick={openAllPhotosModal}
                            className="desktop-card group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3f4f6] transition-shadow duration-200 hover:shadow-md"
                            aria-label={`View ${desktopOverflowCount} more photos`}
                          >
                            <img
                              src={photo}
                              alt={`${profile.name} gallery ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                            />
                            <span className="absolute inset-0 bg-slate-900/45 transition-colors duration-200" />
                            <span className="absolute inset-0 grid place-items-center text-center text-white">
                              <span className="text-2xl font-extrabold leading-none">+{desktopOverflowCount}</span>
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={`${photo}-${index}`}
                          type="button"
                          onClick={() => openSinglePhotoModal(photo)}
                          className="desktop-card group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3f4f6] transition-shadow duration-200 hover:shadow-md"
                          aria-label={`View photo ${index + 1}`}
                        >
                          <img
                            src={photo}
                            alt={`${profile.name} gallery ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                          />
                          <span className="absolute inset-0 bg-slate-900/0 transition-colors duration-200 group-hover:bg-slate-900/35" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="bg-white p-5 lg:-mt-3">
                  <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                  <p className="mt-2 text-sm text-[#6b7280]">No photos available.</p>
                </section>
              )}

              <section className="rounded-[12px] border border-[#e8edf5] bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
                  <MessageSquare size={16} className="text-[#2563eb]" />
                  <h3 className="text-sm font-semibold">Enquiry Form</h3>
                </div>

                {renderInquiryForm()}
              </section>

              <section className="hidden h-fit self-start overflow-hidden rounded-[12px] bg-white px-2 py-3 sm:px-5 md:py-4 lg:block">
                <div className="grid grid-cols-2 gap-3 md:gap-5">
                  <div>
                    <h3
                      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-black md:gap-2 md:text-[1.08rem]"
                      style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-[#d9e1eb] bg-[#f6f8fb] text-[#475569] md:h-7 md:w-7 md:rounded-[9px]">
                        <CalendarDays size={11} className="md:hidden" />
                        <CalendarDays size={15} className="hidden md:block" />
                      </span>
                      Establishment Year
                    </h3>
                    {profile.establishmentYear ? (
                      <p className="mt-2 inline-flex items-center whitespace-nowrap rounded-full border border-[#d9e1eb] bg-[#f6f8fb] px-2 py-1 text-[13px] font-bold text-[#334155] md:mt-3 md:px-3 md:py-1.5 md:text-sm">
                        {`Since ${profile.establishmentYear}`}
                      </p>
                    ) : null}
                  </div>

                  <div className="pl-3 md:pl-5">
                    <h3
                      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-black md:gap-2 md:text-[1.08rem]"
                      style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-[#d9e1eb] bg-[#f6f8fb] text-[#475569] md:h-7 md:w-7 md:rounded-[9px]">
                        <Clock3 size={11} className="md:hidden" />
                        <Clock3 size={15} className="hidden md:block" />
                      </span>
                      Opening Time :
                    </h3>

                    <ul className="mt-2 space-y-2 md:mt-3">
                      {openingSchedule.map((item) => (
                        <li
                          key={`${item.day}-${item.time}`}
                          className="rounded-[10px] border border-[#e7ebf2] bg-[#f9fbfd] px-2 py-1 text-[12px] font-semibold leading-tight text-[#526071] md:px-2.5 md:py-1.5 md:text-sm"
                        >
                          <span className="hidden rounded-md bg-white px-1.5 py-0.5 text-xs font-bold text-[#6b7280] md:inline">
                            {item.day}
                          </span>
                          <span className="hidden md:inline md:ml-1.5">{item.time}</span>
                          <span className="block whitespace-nowrap md:hidden">
                            {`${String(item.day || "").replace(/\s*-\s*/g, "-")} ${String(item.time || "").replace(/\s*-\s*/g, "-")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        <div className="-mx-7 mt-5 grid gap-5 md:mx-0 lg:grid-cols-2">
          <section className="relative overflow-hidden rounded-[12px] px-4 py-5 sm:px-5 lg:hidden">

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3
                  className="inline-flex items-center gap-2 text-s font-bold text-black md:gap-2.5 md:text-xl"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB] md:h-7 md:w-7 md:rounded-[9px]">
                    <BriefcaseBusiness size={13} className="md:hidden" />
                    <BriefcaseBusiness size={15} className="hidden md:block" />
                  </span>
                  <span>Services</span>
                </h3>

                <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-black md:space-y-2">
                  {serviceItems.map((service) => (
                    <li
                      key={service}
                      className="text-[15px] text-black md:text-base"
                    >
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-l border-[#e5e9ef] pl-5">
                <h3
                  className="inline-flex items-center gap-2 text-s font-bold text-black md:gap-2.5 md:text-xl"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.2px" }}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#dbe7fb] bg-[#f3f8ff] text-[#2563EB] md:h-7 md:w-7 md:rounded-[9px]">
                    <Layers3 size={13} className="md:hidden" />
                    <Layers3 size={15} className="hidden md:block" />
                  </span>
                  <span>Categories</span>
                </h3>

                <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-black md:space-y-2">
                  {categoryItems.map((category) => (
                    <li
                      key={category}
                      className="text-[15px] text-black md:text-base"
                    >
                      {category}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="relative h-fit self-start overflow-hidden rounded-[12px] bg-white px-2 py-3 sm:px-5 md:py-4 lg:hidden">

            <div className="grid grid-cols-2 gap-3 md:gap-5">
              <div>
                <h3
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-black md:gap-2 md:text-[1.08rem]"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-[#d9e1eb] bg-[#f6f8fb] text-[#475569] md:h-7 md:w-7 md:rounded-[9px]">
                    <CalendarDays size={11} className="md:hidden" />
                    <CalendarDays size={15} className="hidden md:block" />
                  </span>
                  Establishment Year
                </h3>
                {profile.establishmentYear ? (
                  <p className="mt-2 inline-flex items-center whitespace-nowrap rounded-full border border-[#d9e1eb] bg-[#f6f8fb] px-2 py-1 text-[13px] font-bold text-[#334155] md:mt-3 md:px-3 md:py-1.5 md:text-sm">
                    {`Since ${profile.establishmentYear}`}
                  </p>
                ) : null}
              </div>

              <div className="pl-3 md:pl-5">
                <h3
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-black md:gap-2 md:text-[1.08rem]"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif", letterSpacing: "0.15px" }}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-[#d9e1eb] bg-[#f6f8fb] text-[#475569] md:h-7 md:w-7 md:rounded-[9px]">
                    <Clock3 size={11} className="md:hidden" />
                    <Clock3 size={15} className="hidden md:block" />
                  </span>
                  Opening Time :
                </h3>

                <ul className="mt-2 space-y-2 md:mt-3">
                  {openingSchedule.map((item) => (
                    <li
                      key={`${item.day}-${item.time}`}
                      className="rounded-[10px] border border-[#e7ebf2] bg-[#f9fbfd] px-2 py-1 text-[12px] font-semibold leading-tight text-[#526071] md:px-2.5 md:py-1.5 md:text-sm"
                    >
                      <span className="hidden rounded-md bg-white px-1.5 py-0.5 text-xs font-bold text-[#6b7280] md:inline">
                        {item.day}
                      </span>
                      <span className="hidden md:inline md:ml-1.5">{item.time}</span>
                      <span className="block whitespace-nowrap md:hidden">
                        {`${String(item.day || "").replace(/\s*-\s*/g, "-")} ${String(item.time || "").replace(/\s*-\s*/g, "-")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {profile.description ? (
            <section className="overflow-hidden rounded-[12px] bg-white px-4 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:px-5 lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#d7dee6] bg-white sm:h-24 sm:w-24">
                  {logoImage ? (
                    <img
                      src={logoImage}
                      alt={`${profile.name} logo`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#eef2f6]" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3
                    className="text-[0.98rem] font-bold text-[#1f2937] md:text-[1.03rem]"
                    style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                  >
                    Business Info
                  </h3>
                  <div className="relative mt-2">
                    <p
                      ref={businessInfoTextRef}
                      className={`text-[13px] font-medium leading-[1.68] text-[#334155] md:text-[14px] md:leading-[1.72] ${
                        isBusinessInfoExpanded
                          ? ""
                          : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]"
                      }`}
                      style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                    >
                      {profile.description}
                    </p>
                    {isBusinessInfoOverflowing || isBusinessInfoExpanded ? (
                      isBusinessInfoExpanded ? (
                        <button
                          type="button"
                          onClick={() => setIsBusinessInfoExpanded((previous) => !previous)}
                          className="mt-2 inline-flex items-center text-xs font-semibold text-[#2563eb] md:text-[13px]"
                        >
                          Less
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsBusinessInfoExpanded((previous) => !previous)}
                          className="absolute bottom-0 right-0 inline-flex items-center bg-white pl-0.5 text-xs font-semibold text-[#2563eb] md:text-[13px]"
                        >
                            ... More
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[12px] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:col-span-2 sm:px-5 sm:py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_minmax(0,430px)] lg:items-start">
              <article className="rounded-[8px] bg-[#f5f5f6] px-4 py-7 text-center">
                <p className="text-[15px] font-semibold text-[#1f2937]">Rating</p>
                <p
                  className="mt-2 text-[46px] font-bold leading-none text-[#f38a5d]"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                >
                  {roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"}
                </p>
                <p className="mt-2 text-[13px] font-medium text-[#5b6572]">{`(${reviewCount} Reviews)`}</p>
              </article>

              <article>
                <h3
                  className="text-[1.05rem] font-bold text-[#1f2937]"
                  style={{ fontFamily: "var(--font-poppins), var(--font-inter), sans-serif" }}
                >
                  {`Based on ${reviewCount} Reviews`}
                </h3>

                <div className="mt-2 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = reviews.reduce((total, review) => {
                      const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
                      return total + (rating === score ? 1 : 0);
                    }, 0);

                    return (
                      <div key={score} className="flex items-center gap-2">
                        <span className="w-[54px] text-[13px] font-semibold text-[#4b5563]">{`${score} Star`}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={`${score}-${star}`}
                              size={18}
                              className={
                                star <= score
                                  ? "fill-[#f5b014] text-[#f5b014]"
                                  : "text-[#c8cfd8]"
                              }
                            />
                          ))}
                        </div>
                        <span className="text-[13px] font-semibold text-[#475569]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[14px] border border-[#efefef] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                {authLoading ? (
                  <p className="text-sm font-medium text-[#6b7280]">Checking login status...</p>
                ) : !currentUser ? (
                  <>
                    <h4 className="text-[2rem] font-semibold leading-tight text-[#333333]">Login to review</h4>
                    <p className="mt-3 text-[1rem] font-medium text-[#4b5563]">
                      For seamless experience you must login/signup
                    </p>
                    <Link
                      href="/auth"
                      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[7px] bg-[#f58b5c] text-xl font-semibold text-white"
                    >
                      Login
                    </Link>

                    <div className="pointer-events-none relative mt-4 overflow-hidden rounded-[10px] border border-white/70 bg-white/45 p-3 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                      <div className="space-y-2 blur-[1.6px]">
                        <div>
                          <div className="mb-1 h-3 w-14 rounded bg-[#d9dfe8]" />
                          <div className="h-9 w-full rounded-[8px] border border-[#d7dee6] bg-white/80" />
                        </div>
                        <div>
                          <div className="mb-1 h-3 w-16 rounded bg-[#d9dfe8]" />
                          <div className="h-6 w-32 rounded bg-white/80" />
                        </div>
                        <div>
                          <div className="mb-1 h-3 w-16 rounded bg-[#d9dfe8]" />
                          <div className="h-20 w-full rounded-[8px] border border-[#d7dee6] bg-white/80" />
                        </div>
                        <div className="h-10 w-full rounded-[8px] bg-[#f9c3ab]" />
                      </div>
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.45))]" />
                    </div>
                  </>
                ) : hasAlreadyReviewed ? (
                  <>
                    <h4 className="text-[1.6rem] font-semibold leading-tight text-[#333333]">Thanks for your review</h4>
                    <p className="mt-3 text-sm font-medium text-[#4b5563]">
                      You already reviewed this shop. You can edit or delete your review below.
                    </p>
                    {reviewActionMessage ? (
                      <p className="mt-3 text-xs font-medium text-[#4b5563]">{reviewActionMessage}</p>
                    ) : null}
                  </>
                ) : (
                  <form className="space-y-3" onSubmit={handleSubmitReview}>
                    <h4 className="text-[1.6rem] font-semibold leading-tight text-[#333333]">Write a review</h4>

                    <label className="block text-xs font-semibold text-[#4b5563]">
                      Name
                      <input
                        type="text"
                        value={reviewAuthor}
                        onChange={(event) => setReviewAuthor(event.target.value)}
                        disabled={!currentUser}
                        className="mt-1 min-h-10 w-full rounded-[8px] border border-[#d7dee6] bg-white px-3 text-sm font-medium text-[#374151] outline-none"
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
                            className="rounded-full p-1"
                            aria-label={`Rate ${value}`}
                          >
                            <Star
                              size={20}
                              className={
                                value <= reviewRatingInput
                                  ? "fill-[#f5b014] text-[#f5b014]"
                                  : "text-[#c8cfd8]"
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
                        className="mt-1 min-h-[96px] w-full rounded-[8px] border border-[#d7dee6] bg-white px-3 py-2 text-sm font-medium text-[#374151] outline-none"
                        placeholder="Write your review"
                      />
                    </label>

                    {reviewFormMessage ? (
                      <p className="text-xs font-medium text-[#5f6569]">{reviewFormMessage}</p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#f58b5c] text-base font-semibold text-white disabled:opacity-60"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </article>
            </div>

            <div className="mt-7 space-y-4">
              {reviewsLoading ? (
                <p className="text-sm font-medium text-[#666b6f]">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                reviewsToDisplay.map((review) => {
                  const reviewScore = Math.max(0, Math.min(5, Math.round(Number(review.rating || 0))));
                  const isOwnReview = Boolean(currentUser?.id && review.reviewerId === currentUser.id);
                  const isEditingThisReview = editingReviewId === review.id;
                  const reviewEditCount = Math.max(0, Number(review.editCount || 0));
                  const editsRemaining = Math.max(0, 2 - reviewEditCount);
                  const reviewWasEdited = Boolean(review.isEdited || reviewEditCount > 0);

                  return (
                    <article key={review.id} className="rounded-[10px] border border-[#eceff3] bg-white px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6f83df] text-lg font-bold text-white">
                          <UserRound size={22} strokeWidth={2.2} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-[#1f2937]">{review.author}</p>
                            {reviewWasEdited ? (
                              <span className="rounded-full border border-[#d1d5db] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#4b5563]">
                                Edited
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={`${review.id}-${star}`}
                                size={18}
                                className={
                                  star <= reviewScore
                                    ? "fill-[#f5b014] text-[#f5b014]"
                                    : "text-[#c8cfd8]"
                                }
                              />
                            ))}
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
                                    className="rounded-full p-1 disabled:opacity-60"
                                    aria-label={`Set rating ${value}`}
                                  >
                                    <Star
                                      size={18}
                                      className={
                                        value <= editReviewRating
                                          ? "fill-[#f5b014] text-[#f5b014]"
                                          : "text-[#c8cfd8]"
                                      }
                                    />
                                  </button>
                                ))}
                              </div>

                              <textarea
                                value={editReviewText}
                                onChange={(event) => setEditReviewText(event.target.value)}
                                disabled={isUpdatingReview}
                                className="min-h-[90px] w-full rounded-[8px] border border-[#d7dee6] bg-white px-3 py-2 text-sm font-medium text-[#334155] outline-none"
                              />

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleUpdateReview(review)}
                                  disabled={isUpdatingReview}
                                  className="inline-flex min-h-9 items-center justify-center rounded-[8px] bg-[#f58b5c] px-3 text-xs font-semibold text-white disabled:opacity-60"
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
                              <div className="relative mt-3">
                                <p
                                  ref={(node) => {
                                    reviewTextRefs.current[review.id] = node;
                                  }}
                                  className={`text-[13px] font-medium leading-[1.55] text-[#475569] md:text-[14px] md:leading-[1.5] ${
                                    expandedReviewIds[review.id]
                                      ? ""
                                      : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:[-webkit-line-clamp:5]"
                                  }`}
                                >
                                  {review.comment}
                                </p>

                                {reviewOverflowIds[review.id] || expandedReviewIds[review.id] ? (
                                  expandedReviewIds[review.id] ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleReviewExpanded(review.id)}
                                      className="mt-1 inline-flex items-center text-[11px] font-semibold text-[#2563eb] md:text-xs"
                                    >
                                      Less
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleReviewExpanded(review.id)}
                                      className="absolute bottom-0 right-0 inline-flex items-center bg-white pl-0.5 text-[11px] font-semibold text-[#2563eb] md:text-xs"
                                    >
                                      ...... More
                                    </button>
                                  )
                                ) : null}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="text-sm font-medium text-[#666b6f]">No reviews yet.</p>
              )}
            </div>

            {reviewActionMessage ? (
              <p className="mt-3 text-xs font-medium text-[#4b5563]">{reviewActionMessage}</p>
            ) : null}

            <p className="mt-2.5 text-xs font-medium text-gray-500">
              {`Overall ${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"} from ${reviewCount} reviews`}
            </p>
          </section>
        </div>
        </section>

        {isPhotosModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
            onClick={closePhotosModal}
          >
            <section
              className="w-full max-w-5xl rounded-2xl bg-white p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#5b6064]">
                  {selectedPhotoUrl ? "Photo Preview" : "All Photos"}
                </h3>
                <button
                  type="button"
                  onClick={closePhotosModal}
                  className="rounded-[10px] bg-[#d4f2ef] px-3 py-1.5 text-[13px] font-semibold text-[#5f6569]"
                >
                  Close
                </button>
              </div>

              {selectedPhotoUrl ? (
                <div className="flex max-h-[78vh] items-center justify-center overflow-hidden rounded-[12px] bg-[#f3f4f6]">
                  <img
                    src={selectedPhotoUrl}
                    alt={`${profile.name} photo preview`}
                    className="max-h-[78vh] w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:grid-cols-6">
                    {photoItems.map((photo, index) => (
                      <button
                        key={`${photo}-all-${index}`}
                        type="button"
                        onClick={() => openSinglePhotoModal(photo)}
                        className="overflow-hidden rounded-[10px] bg-[#f3f4f6]"
                        aria-label={`View photo ${index + 1}`}
                      >
                        <img
                          src={photo}
                          alt={`${profile.name} gallery full ${index + 1}`}
                          className="h-20 w-full object-cover sm:h-24 lg:h-28"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {isInquiryModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
            onClick={closeInquiryModal}
          >
            <section
              className="w-full max-w-lg rounded-2xl bg-white p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#5b6064]">Enquiry Form</h3>
                <button
                  type="button"
                  onClick={closeInquiryModal}
                  className="rounded-[10px] bg-[#d4f2ef] px-3 py-1.5 text-[13px] font-semibold text-[#5f6569]"
                >
                  Close
                </button>
              </div>

              {renderInquiryForm("space-y-2.5")}
            </section>
          </div>
        ) : null}

        <Footer />
      </div>
    </main>
  );
}
