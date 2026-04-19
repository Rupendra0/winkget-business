"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
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
  const [reviewRatingInput, setReviewRatingInput] = useState(0);
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
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryFormMessage, setInquiryFormMessage] = useState<string | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
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
    setInquiryFormMessage(null);
  }, [profile.id]);

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
  const businessPhoneLabel = useMemo(
    () => String(storeData?.contactPhone || profile.businessAlternatePhone || profile.phone || "").trim(),
    [profile.businessAlternatePhone, profile.phone, storeData?.contactPhone]
  );
  const businessPhoneDigits = useMemo(() => normalizeDigits(businessPhoneLabel), [businessPhoneLabel]);
  const whatsappDigits = useMemo(
    () => normalizeDigits(profile.whatsapp || profile.phone),
    [profile.phone, profile.whatsapp]
  );
  const businessEmail = useMemo(() => String(profile.email || "").trim(), [profile.email]);
  const websiteHref = useMemo(() => sanitizeWebsite(profile.website), [profile.website]);
  const emailHref = useMemo(() => {
    const email = String(profile.email || "").trim();
    return email ? `mailto:${email}` : "";
  }, [profile.email]);
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
  const serviceColumns = useMemo(() => {
    const chunkSize = 5;
    return serviceItems.reduce<string[][]>((columns, service, index) => {
      if (index % chunkSize === 0) {
        columns.push([]);
      }
      columns[columns.length - 1].push(service);
      return columns;
    }, []);
  }, [serviceItems]);

  const photoItems = useMemo(
    () => uniqueStrings(Array.isArray(profile.gallery) ? profile.gallery : []),
    [profile.gallery]
  );
  const photoGridColumns = 4;
  const photoGridRows = 4;
  const desktopPhotoGridRows = Math.max(1, photoGridRows - 1);
  const mobilePhotoSlots = photoGridColumns * photoGridRows;
  const desktopPhotoSlots = photoGridColumns * desktopPhotoGridRows;
  const mobilePhotoRow = photoItems.slice(0, Math.min(photoItems.length, mobilePhotoSlots));
  const desktopPhotoRow = photoItems.slice(0, Math.min(photoItems.length, desktopPhotoSlots));
  const galleryPreviewItems = photoItems.slice(0, 3);
  const mobileOverflowCount = Math.max(0, photoItems.length - mobilePhotoSlots);
  const desktopOverflowCount = Math.max(0, photoItems.length - desktopPhotoSlots);

  const gstinValue = useMemo(() => {
    const sources: Array<Record<string, unknown>> = [profile as unknown as Record<string, unknown>];
    if (storeData && typeof storeData === "object") {
      sources.push(storeData as unknown as Record<string, unknown>);
    }

    const gstKeys = ["gstin", "gstNumber", "gstNo", "gstinNumber", "gst", "taxId", "taxNumber"] as const;

    for (const source of sources) {
      for (const key of gstKeys) {
        const candidate = String(source[key] || "").trim();
        if (candidate) {
          return candidate;
        }
      }
    }

    return "";
  }, [profile, storeData]);

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

  const selectedPhotoIndex = useMemo(() => {
    if (!selectedPhotoUrl) {
      return -1;
    }

    return photoItems.findIndex((photo) => photo === selectedPhotoUrl);
  }, [photoItems, selectedPhotoUrl]);

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

  const showPreviousPhoto = () => {
    if (selectedPhotoIndex <= 0) {
      return;
    }

    setSelectedPhotoUrl(photoItems[selectedPhotoIndex - 1] || null);
  };

  const showNextPhoto = () => {
    if (selectedPhotoIndex < 0 || selectedPhotoIndex >= photoItems.length - 1) {
      return;
    }

    setSelectedPhotoUrl(photoItems[selectedPhotoIndex + 1] || null);
  };

  const openInquiryModal = () => {
    setInquiryFormMessage(null);
    setIsInquiryModalOpen(true);
  };

  const closeInquiryModal = () => {
    setIsInquiryModalOpen(false);
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

  const scrollToSection = useCallback((sectionId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Keep section headers visible below the fixed top navigation.
    const topOffset = 110;
    const targetTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

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
    const subject = `Inquiry for ${profile.name}`;
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

  const renderInquiryForm = (formClassName = "space-y-2") => (
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

      <textarea
        value={inquiryMessage}
        onChange={(event) => setInquiryMessage(event.target.value)}
        className="min-h-[74px] w-full rounded-lg border border-[#d8e0ea] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus:border-[#94a3b8]"
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

  const renderBusinessContactDetails = (sectionId?: string) => (
    <section id={sectionId} className="rounded-[12px] border border-[#e8edf5] bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
        <MapPin size={16} className="text-[#2563eb]" />
        <h3 className="text-sm font-semibold">Address & Contact Details</h3>
      </div>

      <div className="space-y-2.5 text-sm text-[#1f2937]">
        <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Address</p>
          <p className="mt-1 break-words text-[13px] font-medium text-[#334155]">
            {fullAddress || "Address unavailable"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              <Phone size={12} className="text-[#2563eb]" />
              Business Phone
            </p>

            {businessPhoneDigits ? (
              <a
                href={`tel:${businessPhoneDigits}`}
                className="mt-1 block break-all text-[13px] font-semibold text-[#1e3a8a] underline-offset-2 hover:underline"
              >
                {businessPhoneLabel || businessPhoneDigits}
              </a>
            ) : (
              <p className="mt-1 text-[13px] font-medium text-[#64748b]">Phone unavailable</p>
            )}
          </div>

          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              <Mail size={12} className="text-[#2563eb]" />
              Business Email
            </p>

            {emailHref ? (
              <a
                href={emailHref}
                className="mt-1 block break-all text-[13px] font-semibold text-[#1e3a8a] underline-offset-2 hover:underline"
              >
                {businessEmail}
              </a>
            ) : (
              <p className="mt-1 text-[13px] font-medium text-[#64748b]">Email unavailable</p>
            )}
          </div>
        </div>
      </div>
    </section>
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
      ? storeData.trending.productIds.filter(Boolean)
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
    <main className="min-h-screen overflow-x-hidden bg-[#f2f3f5] px-3 pb-24 sm:px-4 md:px-6 md:pb-10 lg:overflow-visible lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-0 lg:max-w-[1240px]">
        <section className="rounded-[24px] bg-[#f2f3f5] px-4 pb-4 pt-0 sm:px-5 sm:pb-5 sm:pt-0">
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
            <div className="h-[108px] w-[108px] overflow-hidden rounded-[28px] border-4 border-white bg-white sm:h-[116px] sm:w-[116px]">
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

          <div className="mt-2 text-center md:hidden">
            <h1
              className="mx-auto max-w-full truncate px-2 text-[22px] font-semibold leading-snug text-[#101114]"
              style={{ fontFamily: "Fahkwang" }}
            >
              {profile.name}
            </h1>

            <div className="mx-auto mt-1.5 flex max-w-[900px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-[14px] font-semibold leading-tight text-[#48474d]">
              {fullAddress ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin size={15} className="shrink-0 text-[#ef4444]" />
                  <span className="min-w-0 truncate whitespace-nowrap">{fullAddress}</span>
                </span>
              ) : null}

              {fullAddress ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a8c59f]" />
                  <span>{profile.category}</span>
                </span>
              ) : (
                <span>{profile.category}</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              <span
                className={`inline-flex min-h-8 items-center rounded-full px-5 text-[12px] font-semibold ${
                  liveStoreOpenState === true
                    ? "bg-[#79c65a] text-[#f2ffe6]"
                    : liveStoreOpenState === false
                      ? "bg-[#ef4444] text-white"
                      : "bg-[#94a3b8] text-white"
                }`}
              >
                {liveStoreOpenState === true
                  ? "Open Now"
                  : liveStoreOpenState === false
                    ? "Closed"
                    : "Status Unknown"}
              </span>

              <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#434248]">
                <Star size={17} className="fill-[#f0b100] text-[#f0b100]" />
                <span>{`${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"} ( ${reviewCount} Reviews )`}</span>
              </span>
            </div>
          </div>

          <div className="hidden min-h-[182px] items-start justify-between gap-6 px-4 pb-5 pt-6 md:flex lg:min-h-[128px] lg:px-5 lg:pb-2 lg:pt-4">
            <div className="flex min-w-0 items-start gap-4 lg:gap-5">
              <div className="relative z-20 -mt-[76px] h-[144px] w-[144px] shrink-0 overflow-hidden rounded-[34px] border-4 border-white bg-white lg:-mt-[82px] lg:h-[158px] lg:w-[158px]">
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
                  className="text-[1.55rem] font-semibold leading-[1.08] text-[#101114] lg:text-[2.35rem]"
                  style={{ fontFamily: "poppins", letterSpacing: "0.05px" }}
                >
                  {profile.name}
                </h1>

                <div id="listing-address" className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-semibold leading-tight text-[#48474d] lg:text-[16px]">
                  {fullAddress ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MapPin size={20} className="shrink-0 text-[#ef4444]" />
                      <span className="min-w-0 break-words">{fullAddress}</span>
                    </span>
                  ) : null}

                  {fullAddress ? (
                    <span className="inline-flex items-center gap-2.5">
                      <span className="h-4 w-4 shrink-0 rounded-full bg-[#a8c59f]" />
                      <span>{profile.category}</span>
                    </span>
                  ) : (
                    <span>{profile.category}</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <span
                    className={`inline-flex min-h-[36px] items-center rounded-full px-5 text-[0.82rem] font-semibold ${
                      liveStoreOpenState === true
                        ? "bg-[#79c65a] text-[#f2ffe6]"
                        : liveStoreOpenState === false
                          ? "bg-[#ef4444] text-white"
                          : "bg-[#94a3b8] text-white"
                    }`}
                  >
                    {liveStoreOpenState === true
                      ? "Open Now"
                      : liveStoreOpenState === false
                        ? "Closed"
                        : "Status Unknown"}
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-[1.03rem] font-semibold text-[#434248] lg:text-[1.1rem]">
                    <Star size={18} className="fill-[#f0b100] text-[#f0b100]" />
                    <span>{`${roundedRating > 0 ? roundedRating.toFixed(1) : "0.0"} ( ${reviewCount} Reviews )`}</span>
                  </span>
                </div>
              </div>
            </div>

            {isVerified ? (
              <span className="inline-flex shrink-0 items-center gap-2 self-start pt-2 text-[1.1rem] font-semibold text-[#4b4b50] lg:text-[1.2rem]">
                <BadgeCheck size={26} className="fill-[#3d92e6] text-white" />
                Verified
              </span>
            ) : null}
          </div>

          <div className="mt-4 -mx-7 rounded-[12px] border border-[#e8edf5] bg-white p-2 md:mx-0 lg:hidden">
            <div className="grid grid-cols-4 gap-2.5">
              {storeHref ? (
                <Link
                  href={storeHref}
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#4c88de] px-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#427ccf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  My Store
                </Link>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#4c88de] px-2 text-[13px] font-semibold text-white opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  My Store
                </span>
              )}

              {phoneDigits ? (
                <a
                  href={`tel:${phoneDigits}`}
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Call
                </a>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Call
                </span>
              )}

              {whatsappDigits ? (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  WhatsApp
                </a>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  WhatsApp
                </span>
              )}

              {emailHref ? (
                <a
                  href={emailHref}
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Email
                </a>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Email
                </span>
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Website
                </a>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Website
                </span>
              )}

              {hasInquiryTarget ? (
                <button
                  type="button"
                  onClick={openInquiryModal}
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Inquiry
                </button>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Inquiry
                </span>
              )}

              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Website
                </a>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Website
                </span>
              )}

              {hasInquiryTarget ? (
                <button
                  type="button"
                  onClick={openInquiryModal}
                  className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf] md:min-h-11 md:rounded-[10px] md:text-sm"
                >
                  Enquiry
                </button>
              ) : (
                <span className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-[8px] bg-[#e8e8ea] px-2 text-[13px] font-semibold text-[#3f3f40] opacity-60 md:min-h-11 md:rounded-[10px] md:text-sm">
                  Enquiry
                </span>
              )}
            </div>
          </div>

          {shareMessage ? (
            <p className="mt-2.5 text-center text-xs font-medium text-gray-500">{shareMessage}</p>
          ) : null}

          {photoItems.length > 0 ? (
            <section id="listing-gallery-mobile" className="mt-5 -mx-7 rounded-[12px] border border-[#e8edf5] bg-white p-3 md:mx-0 sm:p-4 lg:hidden">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                <button
                  type="button"
                  onClick={openAllPhotosModal}
                  className="rounded-full border border-[#bfdbfe] bg-white px-2.5 py-1 text-xs font-semibold text-blue-600"
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
                        className="group relative overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6]"
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
                      className="overflow-hidden rounded-lg border border-[#d8dce1] bg-[#f3f4f6]"
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

          <div className="-mx-7 mt-5 grid gap-5 md:mx-0 lg:relative lg:left-1/2 lg:mt-8 lg:w-[calc(100vw-3rem)] lg:max-w-none lg:-translate-x-1/2 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start lg:gap-6 xl:w-[calc(100vw-4rem)]">
            <div className="lg:col-start-1 lg:space-y-5">
              <div className="hidden lg:block lg:space-y-5">
              <section className="rounded-[12px] border border-[#e8edf5] bg-white p-5 [&_.desktop-outline]:!border [&_.desktop-outline]:!border-slate-300">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {storeHref ? (
                      <Link
                        href={storeHref}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#4c88de] px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#427ccf]"
                      >
                        My Store
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#4c88de] px-3 text-sm font-semibold text-white opacity-60">
                        My Store
                      </span>
                    )}

                    {phoneDigits ? (
                      <a
                        href={`tel:${phoneDigits}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Call
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Call
                      </span>
                    )}

                    {whatsappDigits ? (
                      <a
                        href={`https://wa.me/${whatsappDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        WhatsApp
                      </span>
                    )}

                    {emailHref ? (
                      <a
                        href={emailHref}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Email
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Email
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Website
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Website
                      </span>
                    )}

                    {hasInquiryTarget ? (
                      <button
                        type="button"
                        onClick={openInquiryModal}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Inquiry
                      </button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Inquiry
                      </span>
                    )}

                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Website
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Website
                      </span>
                    )}

                    {hasInquiryTarget ? (
                      <button
                        type="button"
                        onClick={openInquiryModal}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] transition-colors duration-150 hover:bg-[#dddddf]"
                      >
                        Enquiry
                      </button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#e8e8ea] px-3 text-sm font-semibold text-[#3f3f40] opacity-60">
                        Enquiry
                      </span>
                    )}
                  </div>

                </div>
              </section>

              <section id="listing-gallery" className="rounded-[12px] bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[1.02rem] font-semibold text-[#4a4a50]">Gallery</h3>
                  <button
                    type="button"
                    onClick={openAllPhotosModal}
                    disabled={photoItems.length === 0}
                    className="text-[0.96rem] font-semibold text-[#4a4a50] disabled:opacity-50"
                  >
                    View All
                  </button>
                </div>

                {photoItems.length > 0 ? (
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                    {photoItems.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => openSinglePhotoModal(photo)}
                        className="shrink-0 overflow-hidden rounded-xl border border-[#e4e7ec] bg-[#f3f4f6] lg:w-[31%]"
                        aria-label={`View gallery photo ${index + 1}`}
                      >
                        <img
                          src={photo}
                          alt={`${profile.name} gallery preview ${index + 1}`}
                          className="h-[14rem] w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-[#6b7280]">No gallery images available.</p>
                )}
              </section>

              <section className="rounded-[12px] bg-white p-4">
                <div className="flex items-center gap-7 border-b border-[#d8dadd] pb-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-services")}
                    className="text-[1.02rem] font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-gallery")}
                    className="text-[1.02rem] font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-footer")}
                    className="text-[1.02rem] font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Address
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-reviews")}
                    className="text-[1.02rem] font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Reviews
                  </button>
                </div>

                {serviceItems.length > 0 ? (
                  <div id="listing-services" className="mt-4 flex flex-wrap items-start gap-x-12 gap-y-2.5">
                    {serviceColumns.map((column, columnIndex) => (
                      <ul key={`service-column-${columnIndex}`} className="min-w-[220px] space-y-2.5">
                        {column.map((service) => (
                          <li key={service} className="flex items-start gap-2 text-[1.01rem] font-[600] text-[#3d3f44]">
                            <span className="mt-1.5 inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-[#a8de95]" />
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-[#6b7280]">No services listed.</p>
                )}
              </section>

              <section className="h-fit self-start overflow-hidden rounded-[12px] bg-white px-2 py-3 sm:px-5 md:py-4">
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
                      <p className="mt-2 flex w-fit items-center rounded-full border border-[#d9e1eb] bg-[#f6f8fb] px-2 py-1 text-[13px] font-bold text-[#334155] md:mt-3 md:px-3 md:py-1.5 md:text-sm">
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
                        <Store size={11} className="md:hidden" />
                        <Store size={15} className="hidden md:block" />
                      </span>
                      GSTIN :
                    </h3>

                    {gstinValue ? (
                      <p className="mt-2 flex w-fit max-w-full items-center break-all rounded-[10px] border border-[#e7ebf2] bg-[#f9fbfd] px-2 py-1 text-[12px] font-semibold leading-tight text-[#526071] md:mt-3 md:px-2.5 md:py-1.5 md:text-sm">
                        {gstinValue}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] font-semibold text-[#64748b] md:mt-3 md:text-sm">GSTIN unavailable</p>
                    )}
                  </div>
                </div>
              </section>

              </div>

              <section className="w-full rounded-[12px] border border-[#e8edf5] bg-white p-4 lg:hidden">
                <div className="flex items-center gap-4 overflow-x-auto border-b border-[#d8dadd] pb-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-services-mobile")}
                    className="whitespace-nowrap text-sm font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-gallery-mobile")}
                    className="whitespace-nowrap text-sm font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-contact-details-mobile")}
                    className="whitespace-nowrap text-sm font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Address
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("listing-reviews")}
                    className="whitespace-nowrap text-sm font-semibold text-[#4a4a50] underline underline-offset-4"
                  >
                    Reviews
                  </button>
                </div>

                {serviceItems.length > 0 ? (
                  <div id="listing-services-mobile" className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-2.5">
                    {serviceColumns.map((column, columnIndex) => (
                      <ul key={`mobile-service-column-${columnIndex}`} className="min-w-[130px] space-y-2.5">
                        {column.map((service) => (
                          <li key={service} className="flex items-start gap-2 text-[0.98rem] font-[600] text-[#3d3f44]">
                            <span className="mt-1.5 inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-[#a8de95]" />
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-[#6b7280]">No services listed.</p>
                )}
              </section>

              <section className="relative w-full h-fit self-start overflow-hidden rounded-[12px] border border-[#e8edf5] bg-white px-2 py-3 sm:px-5 md:py-4 lg:hidden">
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
                      <p className="mt-2 flex w-fit items-center rounded-full border border-[#d9e1eb] bg-[#f6f8fb] px-2 py-1 text-[13px] font-bold text-[#334155] md:mt-3 md:px-3 md:py-1.5 md:text-sm">
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
                        <Store size={11} className="md:hidden" />
                        <Store size={15} className="hidden md:block" />
                      </span>
                      GSTIN :
                    </h3>

                    {gstinValue ? (
                      <p className="mt-2 flex w-fit max-w-full items-center break-all rounded-[10px] border border-[#e7ebf2] bg-[#f9fbfd] px-2 py-1 text-[12px] font-semibold leading-tight text-[#526071] md:mt-3 md:px-2.5 md:py-1.5 md:text-sm">
                        {gstinValue}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] font-semibold text-[#64748b] md:mt-3 md:text-sm">GSTIN unavailable</p>
                    )}
                  </div>
                </div>
              </section>

              {profile.description ? (
                <section className="overflow-hidden rounded-[12px] bg-white px-4 py-5 sm:px-5">
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

          <section id="listing-reviews" className="rounded-[12px] bg-white px-4 py-4 lg:col-start-1 sm:px-5 sm:py-5">
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

              <article className="rounded-[14px] border border-[#efefef] bg-white p-5">
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
                            className="rounded-full p-1 group"
                            aria-label={`Rate ${value}`}
                          >
                            <Star
                              size={20}
                              className={
                                value <= reviewRatingInput
                                  ? "fill-[#f5b014] text-[#f5b014]"
                                  : "text-[#c8cfd8] stroke-[#f5b014] fill-none"
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

            <div className={`${currentUser ? "mt-7" : "mt-4"} space-y-4`}>
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

              <div className="mt-5 lg:hidden">
                {renderBusinessContactDetails("listing-contact-details-mobile")}
              </div>
            </div>

          <div className="hidden lg:col-start-2 lg:row-start-1 lg:block lg:space-y-4 lg:self-start lg:sticky lg:top-24">
            {photoItems.length > 0 ? (
              <section id="listing-photos" className="rounded-[12px] border border-[#e8edf5] bg-white p-5">
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
                          className="desktop-card group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3f4f6] duration-200"
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
                        className="desktop-card group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3f4f6] duration-200"
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
              <section id="listing-photos" className="rounded-[12px] border border-[#e8edf5] bg-white p-5">
                <h2 className="text-base font-semibold text-[#4f5357]">Photo</h2>
                <p className="mt-2 text-sm text-[#6b7280]">No photos available.</p>
              </section>
            )}

            <section className="rounded-[12px] border border-[#e8edf5] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
                <MessageSquare size={16} className="text-[#2563eb]" />
                <h3 className="text-sm font-semibold">Enquiry Form</h3>
              </div>

              {renderInquiryForm()}
            </section>

            {renderBusinessContactDetails("listing-contact-details")}
          </div>
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
                <div className="space-y-3">
                  <div className="flex max-h-[78vh] items-center justify-center overflow-hidden rounded-[12px] bg-[#f3f4f6]">
                    <img
                      src={selectedPhotoUrl}
                      alt={`${profile.name} photo preview`}
                      className="max-h-[78vh] w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={showPreviousPhoto}
                      disabled={selectedPhotoIndex <= 0}
                      className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[#cbd5e1] bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Previous
                    </button>

                    <p className="text-xs font-semibold text-[#64748b]">
                      {selectedPhotoIndex >= 0 ? `${selectedPhotoIndex + 1} / ${photoItems.length}` : `0 / ${photoItems.length}`}
                    </p>

                    <button
                      type="button"
                      onClick={showNextPhoto}
                      disabled={selectedPhotoIndex < 0 || selectedPhotoIndex >= photoItems.length - 1}
                      className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[#cbd5e1] bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Next
                    </button>
                  </div>
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
                  className="rounded-[10px] bg-[#FF6967] px-3 py-1.5 text-[13px] font-semibold text-[#5f6569]"
                >
                  Close
                </button>
              </div>

              {renderInquiryForm("mt-3 space-y-2.5")}
            </section>
          </div>
        ) : null}
      </div>

      <div id="listing-footer" className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <Footer />
      </div>
    </main>
  );
}
