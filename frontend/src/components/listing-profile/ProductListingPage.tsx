"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Globe,
  Heart,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Send,
  Store,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ListingProfile, StorePageData, StoreProduct } from "@/data/listingData";
import { buildProductSlug } from "@/data/productSlug";
import AuthModal from "@/components/AuthModal";
import Footer from "@/components/Footer";
import RestaurantMarketplacePage from "@/components/RestaurantMarketplacePage";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { submitVendorInquiry, DEFAULT_TILE_IMAGES } from "@/lib/catalogClient";
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

const DUMMY_REVIEWS: BusinessReview[] = [
  {
    id: "dummy-1",
    businessId: "dummy-shop",
    reviewerId: "dummy-reviewer-1",
    author: "Priya S.",
    rating: 5,
    comment: "The A18 Bionic chip is insanely fast. Camera is absolutely stunning — night shots are incredible. Battery easily gets me through a full day. USB-C is a welcome upgrade.",
    createdAt: "May 28",
    isEdited: false,
    editCount: 0,
  },
  {
    id: "dummy-2",
    businessId: "dummy-shop",
    reviewerId: "dummy-reviewer-2",
    author: "Rajesh K.",
    rating: 5,
    comment: "Build quality is exceptional. The Ceramic Shield feels very premium and solid. The Camera Control button is surprisingly handy once you get used to it.",
    createdAt: "May 20",
    isEdited: false,
    editCount: 0,
  },
  {
    id: "dummy-3",
    businessId: "dummy-shop",
    reviewerId: "dummy-reviewer-3",
    author: "Anjali P.",
    rating: 4,
    comment: "Love almost everything — display is gorgeous, Face ID is lightning fast, camera is excellent. Would've preferred a charger in the box but overall still the best iPhone yet.",
    createdAt: "May 15",
    isEdited: false,
    editCount: 0,
  },
  {
    id: "dummy-4",
    businessId: "dummy-shop",
    reviewerId: "dummy-reviewer-4",
    author: "Nitesh K.",
    rating: 5,
    comment: "Extremely happy with the overall consulting and delivery. Highly recommended to everyone looking for professional services!",
    createdAt: "May 10",
    isEdited: false,
    editCount: 0,
  }
];

// Add custom title property inside TypeScript type
(DUMMY_REVIEWS[0] as any).title = "Best iPhone ever — worth every rupee";
(DUMMY_REVIEWS[1] as any).title = "Premium in every sense";
(DUMMY_REVIEWS[2] as any).title = "Great phone, minor caveat on charger";
(DUMMY_REVIEWS[3] as any).title = "Excellent service and quality";

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
const INITIAL_REVIEW_LIMIT = 5;
const FULL_REVIEW_LIMIT = 40;

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

export default function ProductListingPage({
  profile,
  storeData,
}: {
  profile: ListingProfile;
  storeData?: StorePageData | null;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      
      // Instantly scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' as any });

      // Continuously reset scroll position for the first 500ms as elements/images load and layout
      let frameId: number;
      const startTime = Date.now();
      
      const forceScrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'instant' as any });
        if (Date.now() - startTime < 500) {
          frameId = requestAnimationFrame(forceScrollTop);
        }
      };
      
      frameId = requestAnimationFrame(forceScrollTop);

      return () => {
        cancelAnimationFrame(frameId);
      };
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [showAllServices, setShowAllServices] = useState(false);
  const [mobileDescExpanded, setMobileDescExpanded] = useState(false);
  const isServiceProvider = profile.businessType === "service";
  const [activeTab, setActiveTab] = useState("overview");
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary>({
    rating: Number(profile.rating || 0),
    reviews: Math.max(0, Number(profile.reviews || 0)),
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [hasLoadedFullReviewBatch, setHasLoadedFullReviewBatch] = useState(false);
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
      setShowAllReviews(false);
      setHasLoadedFullReviewBatch(false);
      const result = await fetchBusinessReviews(profile.id, INITIAL_REVIEW_LIMIT);
      if (!active) return;

      if (result.ok) {
        setReviews(result.reviews);
        setReviewSummary(result.summary);
        setViewerHasReviewed(result.viewerHasReviewed);
        setHasLoadedFullReviewBatch(result.reviews.length >= Math.min(FULL_REVIEW_LIMIT, Math.max(0, Number(result.summary.reviews || 0))));
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

  const headerAddress = useMemo(() => {
    return [profile.sublocality, profile.city]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ") || fullAddress;
  }, [profile.sublocality, profile.city, fullAddress]);

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
  const directionsHref = useMemo(() => {
    const address = String(fullAddress || "").trim();
    return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
  }, [fullAddress]);
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const handleLoadMoreReviews = useCallback(async () => {
    if (hasLoadedFullReviewBatch || isLoadingMoreReviews) {
      setShowAllReviews(true);
      return;
    }

    setIsLoadingMoreReviews(true);
    const result = await fetchBusinessReviews(profile.id, FULL_REVIEW_LIMIT);

    if (result.ok) {
      setReviews(result.reviews);
      setReviewSummary(result.summary);
      setViewerHasReviewed(result.viewerHasReviewed);
      setHasLoadedFullReviewBatch(true);
    }

    setShowAllReviews(true);
    setIsLoadingMoreReviews(false);
  }, [hasLoadedFullReviewBatch, isLoadingMoreReviews, profile.id]);
  const reviewsToDisplay = useMemo(() => {
    const combined = [...DUMMY_REVIEWS, ...reviews.filter(r => !DUMMY_REVIEWS.some(d => d.id === r.id))];
    if (!showAllReviews) {
      return combined.slice(0, 3);
    }
    return combined;
  }, [reviews, showAllReviews]);
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

  const renderInquiryForm = (formClassName = "space-y-3.5") => (
    <form className={formClassName} onSubmit={handleSubmitInquiry}>
      <input
        type="text"
        value={inquiryName}
        onChange={(event) => setInquiryName(event.target.value)}
        className="w-full rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:border-slate-200/80 px-4 py-3 text-[15px] text-slate-800 outline-none transition duration-155"
        placeholder="Your name"
        required
      />

      <input
        type="tel"
        value={inquiryPhone}
        onChange={(event) => setInquiryPhone(normalizeDigits(event.target.value).slice(0, 10))}
        className="w-full rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:border-slate-200/80 px-4 py-3 text-[15px] text-slate-800 outline-none transition duration-155"
        placeholder="Phone"
        inputMode="numeric"
        maxLength={10}
        required
      />

      <input
        type="email"
        value={inquiryEmail}
        onChange={(event) => setInquiryEmail(event.target.value)}
        className="w-full rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:border-slate-200/80 px-4 py-3 text-[15px] text-slate-800 outline-none transition duration-155"
        placeholder="Email (optional)"
      />

      <textarea
        value={inquiryMessage}
        onChange={(event) => setInquiryMessage(event.target.value)}
        className="min-h-[180px] w-full rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:border-slate-200/80 px-4 py-3 text-[15px] text-slate-800 outline-none resize-none transition duration-155"
        placeholder="Write your enquiry"
        required
      />

      {inquiryFormMessage ? (
        <p className="text-xs font-medium text-[#4b5563]">{inquiryFormMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmittingInquiry}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-100 cursor-pointer"
      >
        {isSubmittingInquiry ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );

  const renderBusinessContactDetails = (sectionId?: string) => (
    <section id={sectionId} className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-8">
      <div className="mb-5 flex items-center gap-2 text-slate-900">
        <MapPin size={20} className="text-blue-600" />
        <h3 className="text-base sm:text-lg xl:text-xl font-bold font-heading whitespace-nowrap">Address & Contact Details</h3>
      </div>

      <div className="space-y-4">
        {/* Address */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
            Address
          </span>
          <div className="space-y-0.5 text-[15px] font-semibold text-slate-700 leading-relaxed break-words">
            {profile.address && <p>{profile.address}</p>}
            {profile.city && <p>{profile.city}</p>}
            {profile.state && <p>{profile.state}</p>}
            {profile.postalCode && <p>{profile.postalCode}</p>}
            {!profile.address && !profile.city && !profile.state && !profile.postalCode && (
              <p className="text-slate-400 font-medium">Address unavailable</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Business Phone */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
            Business Phone
          </span>
          {businessPhoneDigits ? (
            <div className="space-y-1">
              <a
                href={`tel:${businessPhoneDigits}`}
                className="text-[15px] font-semibold text-blue-600 hover:underline block w-fit"
              >
                {businessPhoneLabel || businessPhoneDigits}
              </a>
              {/* Display fallback second phone number if different from alternate */}
              {profile.businessAlternatePhone && normalizeDigits(profile.businessAlternatePhone) !== businessPhoneDigits && (
                <a
                  href={`tel:${normalizeDigits(profile.businessAlternatePhone)}`}
                  className="text-[15px] font-semibold text-blue-600 hover:underline block w-fit"
                >
                  {profile.businessAlternatePhone}
                </a>
              )}
            </div>
          ) : (
            <p className="text-[15px] font-medium text-slate-400">Phone unavailable</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Business Email */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
            Business Email
          </span>
          {emailHref ? (
            <a
              href={emailHref}
              className="text-[15px] font-semibold text-blue-600 hover:underline block break-all w-fit"
            >
              {businessEmail}
            </a>
          ) : (
            <p className="text-[15px] font-medium text-slate-400">Email unavailable</p>
          )}
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 sm:bg-white px-0 pb-24 md:pb-10 lg:overflow-visible">
      <div className="mx-auto w-full space-y-0">
        <section className="bg-slate-50 sm:bg-white pb-4 pt-0 sm:pb-5 sm:pt-0">
          {/* Banner Section */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-white">
            <div className="relative h-48 sm:h-60 lg:h-[300px] w-full">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-[#cbd5e1]" />
              )}
            </div>
          </div>

          {/* Details Card Section */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white border-b border-slate-100">
            <div className="mx-auto w-full px-2 sm:px-12 md:px-16 lg:px-20 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              
              {/* Left Side: Logo & Vendor Info */}
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                {/* Logo Box */}
                <div className="h-16 w-16 sm:h-[76px] sm:w-[76px] shrink-0 overflow-hidden rounded-2xl border-[3px] border-white bg-white flex items-center justify-center shadow-md">
                  {logoImage ? (
                    <img
                      src={logoImage}
                      alt={`${profile.name} logo`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#1953c2] flex items-center justify-center text-white text-3xl font-extrabold">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'E'}
                    </div>
                  )}
                </div>

                {/* Details Text */}
                <div className="min-w-0">
                  {/* Name + Verified Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight truncate leading-tight font-heading">
                      {profile.name}
                    </h1>
                    {isVerified && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-200">
                        <BadgeCheck size={12} className="fill-blue-600 text-white" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Subtitle Details: Location, Status, Ratings */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:text-[15px] text-slate-500 font-medium leading-none">
                    {/* Location Pin */}
                    {fullAddress && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="sm:hidden truncate">{headerAddress}</span>
                        <span className="hidden sm:inline truncate">{fullAddress}</span>
                      </span>
                    )}

                    {/* Open Now Badge (Desktop only) */}
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#dcfce7] text-[#15803d]">
                      <Clock size={12} className="shrink-0" />
                      {liveStoreOpenState === true ? "Open Now" : liveStoreOpenState === false ? "Closed" : "Open Now"}
                    </span>

                    {/* Ratings Section */}
                    <span className="inline-flex items-center gap-1">
                      {/* 5 Gold Stars */}
                      <span className="flex items-center gap-0.5 text-[#eab308]">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`star-${index}`}
                            size={13}
                            className="fill-[#eab308] text-[#eab308]"
                          />
                        ))}
                      </span>
                      {/* Rating text */}
                      <span className="font-bold text-slate-800 ml-1">
                        {roundedRating > 0 ? roundedRating.toFixed(1) : "5.0"}
                      </span>
                      <span className="text-slate-400">
                        ({reviewCount > 0 ? reviewCount : 1} Reviews)
                      </span>
                    </span>
                  </div>

                  {/* Pills Row (Mobile only, placed below the reviews/ratings line) */}
                  <div className="flex sm:hidden items-center gap-2 mt-2">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-200">
                        <BadgeCheck size={12} className="fill-blue-600 text-white" />
                        Verified
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#dcfce7] text-[#15803d]">
                      <Clock size={12} className="shrink-0" />
                      {liveStoreOpenState === true ? "Open Now" : liveStoreOpenState === false ? "Closed" : "Open Now"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Follow Button */}
              <div className="hidden sm:flex items-center shrink-0 self-start md:self-center">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cbd5e1] hover:border-[#2563eb] bg-white px-5 py-2 text-[15px] font-semibold text-blue-600 hover:bg-blue-50 transition duration-150 cursor-pointer shadow-sm"
                >
                  <Heart size={14} className="text-blue-600" />
                  Follow
                </button>
              </div>

            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white border-b border-slate-100 py-3.5 mb-6">
            <div className="mx-auto w-full px-2 sm:px-12 md:px-16 lg:px-20">
              <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:overflow-x-auto sm:gap-3 pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 md:flex-wrap md:overflow-visible">
                
                {/* 1. My Store / Services Button */}
                {isServiceProvider ? (
                  storeHref ? (
                    <Link
                      href={storeHref}
                      className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-white transition duration-155 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                    >
                      <Store size={15} className="text-white" />
                      My Store
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full bg-blue-600/60 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-white/90 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                      <Store size={15} className="text-white/80" />
                      My Store
                    </span>
                  )
                ) : storeHref ? (
                  <Link
                    href={storeHref}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-white transition duration-155 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Store size={15} className="text-white" />
                    My Store
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full bg-blue-600/60 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-white/90 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Store size={15} className="text-white/80" />
                    My Store
                  </span>
                )}

                {/* 2. Call Button */}
                {phoneDigits ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Phone size={14} className="text-slate-500" />
                    Call
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Phone size={14} className="text-slate-300" />
                    Call
                  </span>
                )}

                {/* 3. WhatsApp Button */}
                {whatsappDigits ? (
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <MessageSquare size={14} className="text-slate-500" />
                    WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <MessageSquare size={14} className="text-slate-300" />
                    WhatsApp
                  </span>
                )}

                {/* 4. Email Button */}
                {emailHref ? (
                  <a
                    href={emailHref}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Mail size={14} className="text-slate-500" />
                    Email
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Mail size={14} className="text-slate-300" />
                    Email
                  </span>
                )}

                {/* 5. Website Button */}
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Globe size={14} className="text-slate-500" />
                    Website
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Globe size={14} className="text-slate-300" />
                    Website
                  </span>
                )}

                {/* 6. Inquiry Button */}
                {hasInquiryTarget ? (
                  <button
                    type="button"
                    onClick={openInquiryModal}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Send size={14} className="text-slate-500" />
                    Inquiry
                  </button>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Send size={14} className="text-slate-300" />
                    Inquiry
                  </span>
                )}

                {/* 7. Direction Button */}
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                  >
                    <Compass size={14} className="text-slate-500" />
                    Direction
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0">
                    <Compass size={14} className="text-slate-300" />
                    Direction
                  </span>
                )}

                {/* 8. Review Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("reviews");
                    scrollToSection("listing-reviews");
                  }}
                  className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-1 sm:px-4 text-[11px] sm:text-sm font-semibold text-slate-700 transition duration-150 shadow-sm gap-1 sm:gap-1.5 w-full sm:w-auto sm:shrink-0"
                >
                  <Pencil size={14} className="text-slate-500" />
                  Review
                </button>

              </div>
            </div>
          </div>

          {shareMessage ? (
            <p className="mt-2.5 text-center text-xs font-medium text-gray-500">{shareMessage}</p>
          ) : null}

          {/* Grid 1: Upper Content (Overview & Contact/Enquiry details) */}
          <div className="grid grid-cols-1 lg:grid-cols-[7.2fr_2.8fr] gap-6 items-start mt-6 w-full mx-auto px-2 sm:px-12 md:px-16 lg:px-20">
            
            {/* Left Column of Grid 1 */}
            <div className="space-y-6 min-w-0">
              
              {/* Main Content Card with Inline Tabs Header */}
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                {/* Tab Navigation Bar */}
                <div className="flex border-b border-slate-100 bg-white pl-4 sm:pl-8 pr-4 sm:pr-6 py-1 justify-between sm:justify-start">
                  {['Overview', 'Services', 'Photo', 'Address', 'Reviews'].map((tab) => {
                    const tabKey = tab.toLowerCase();
                    const isActive = activeTab === tabKey;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setActiveTab(tabKey);
                          if (tabKey === 'reviews') scrollToSection("listing-reviews");
                          else if (tabKey === 'photo') scrollToSection("listing-gallery");
                          else if (tabKey === 'address') scrollToSection("listing-contact-details");
                        }}
                        className={`px-2 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[15px] font-semibold border-b-2 -mb-[1px] transition-colors cursor-pointer font-heading ${
                          tabKey === 'reviews' ? 'hidden min-[360px]:inline-block' : 'inline-block'
                        } ${
                          isActive
                            ? "border-[#2563eb] text-blue-600"
                            : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Inner Content Card Body */}
                <div className="px-4 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 space-y-6">
                
                {/* 1. Gallery Section (only when NOT on services tab) */}
                {activeTab !== "services" && (
                  <section id="listing-gallery" className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">Gallery</h2>
                      <button
                        type="button"
                        onClick={openAllPhotosModal}
                        disabled={photoItems.length === 0}
                        className="text-[15px] font-semibold text-blue-600 hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                      >
                        View All
                      </button>
                    </div>

                    {photoItems.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {photoItems.slice(0, 3).map((photo, index) => (
                          <button
                            key={`${photo}-${index}`}
                            type="button"
                            onClick={() => openSinglePhotoModal(photo)}
                            className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 aspect-[4/3] w-full cursor-pointer hover:opacity-95 transition"
                            aria-label={`View photo ${index + 1}`}
                          >
                            <img
                              src={photo}
                              alt={`${profile.name} gallery ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {DEFAULT_TILE_IMAGES.slice(0, 3).map((imgUrl, index) => (
                          <div key={index} className="overflow-hidden rounded-2xl bg-slate-100 aspect-[4/3] w-full">
                            <img
                              src={imgUrl}
                              alt="Placeholder gallery"
                              className="h-full w-full object-cover opacity-60"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Divider (only for Overview / Default tab between Gallery and Business Details) */}
                {activeTab !== "services" && (
                  <div className="border-t border-slate-100" />
                )}

                {/* 2. Business Details Section (upward of services on default/main tab) */}
                {activeTab !== "services" && (
                  <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 font-heading">Business Details</h2>
                    
                    <div className="divide-y divide-slate-100 text-[15px]">
                      {/* Establishment Year */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Establishment Year</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                          {profile.establishmentYear ? `Since ${profile.establishmentYear}` : "Since 2000"}
                        </span>
                      </div>

                      {/* GSTIN */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">GSTIN</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700 font-mono">
                          {gstinValue || "07AABCE1234F1Z5"}
                        </span>
                      </div>

                      {/* Business Type */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Business Type</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                          {profile.businessType ? profile.businessType : "Real Estate Developer"}
                        </span>
                      </div>

                      {/* Service Area */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Service Area</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                          {profile.sublocality || profile.city || "Pan India"}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Divider (only for Overview / Default tab between Business Details and Services) */}
                {activeTab !== "services" && (
                  <div className="border-t border-slate-100" />
                )}

                {/* 3. Services Section (rendered in both default layout and services tab layout) */}
                {(() => {
                  const defaultServices = ["Estates", "Property", "Homes", "Flats", "Buildings"];
                  const displayServices = serviceItems.length > 0 ? serviceItems : defaultServices;
                  const servicesLimit = isMobile ? 5 : 10;
                  const visibleServices = showAllServices ? displayServices : displayServices.slice(0, servicesLimit);
                  const hasMoreServices = displayServices.length > servicesLimit;
                  return (
                    <section id="listing-services" className="space-y-3">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">Services</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-[15px]">
                        {visibleServices.map((service) => (
                          <div key={service} className="flex items-center justify-between py-2.5 border-b border-slate-100">
                            <span className="text-slate-700 font-semibold">{service}</span>
                            <span className="rounded-full bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-0.5 text-xs font-semibold text-[#16a34a]">
                              Available
                            </span>
                          </div>
                        ))}
                      </div>

                      {hasMoreServices && !showAllServices && (
                        <div className="pt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setShowAllServices(true)}
                            className="w-full md:w-fit border border-slate-200 bg-white py-2.5 px-6 text-[14px] font-bold text-slate-700 rounded-full hover:bg-slate-50 cursor-pointer flex items-center justify-center transition duration-155"
                          >
                            View More Services
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* Divider (only when switched to services tab, between Services and Business Details) */}
                {activeTab === "services" && (
                  <div className="border-t border-slate-100" />
                )}

                {/* 4. Business Details Section (rendered below services when switched to services tab) */}
                {activeTab === "services" && (
                  <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 font-heading">Business Details</h2>
                    
                    <div className="divide-y divide-slate-100 text-[15px]">
                      {/* Establishment Year */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Establishment Year</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                          {profile.establishmentYear ? `Since ${profile.establishmentYear}` : "Since 2000"}
                        </span>
                      </div>

                      {/* GSTIN */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">GSTIN</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700 font-mono">
                          {gstinValue || "07AABCE1234F1Z5"}
                        </span>
                      </div>

                      {/* Business Type */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Business Type</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                          {profile.businessType ? profile.businessType : "Real Estate Developer"}
                        </span>
                      </div>

                      {/* Service Area */}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500 font-medium">Service Area</span>
                        <span className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                          {profile.sublocality || profile.city || "Pan India"}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                </div>
              </div>
            </div>

            {/* Right Column of Grid 1 */}
            <div className="hidden lg:block space-y-6 min-w-0 lg:sticky lg:top-20 lg:self-start">
              {/* Enquiry Form Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4 font-heading">Enquiry Form</h3>
                {renderInquiryForm()}
              </div>

              {/* Address & Contact Details Card */}
              {renderBusinessContactDetails("listing-contact-details")}
            </div>
          </div>

          {/* Full-width Business Info Card (Spanning between Grid 1 and Grid 2) */}
          {profile.description ? (
            <div className="mx-auto w-full px-2 sm:px-12 md:px-16 lg:px-20 mt-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-6">
                {/* Desktop View (sm and up) */}
                <div className="hidden sm:flex items-start gap-4">
                  {/* Logo / DP Box */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    {logoImage ? (
                      <img
                        src={logoImage}
                        alt={`${profile.name} logo`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#1953c2] flex items-center justify-center text-white text-xl font-extrabold font-heading">
                        {profile.name ? profile.name.charAt(0).toUpperCase() : 'E'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-bold text-slate-900 font-heading">Business Info</h3>
                      <span className="text-slate-400 inline-flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full h-4 w-4 text-[10px] font-bold">i</span>
                    </div>
                    <p className="text-[16px] leading-relaxed text-slate-600">
                      {profile.description}
                    </p>
                    
                    {/* Stats Row */}
                    <div className="pt-3 flex flex-wrap gap-8">
                      <div>
                        <p className="text-[16px] font-bold text-slate-900 font-heading">
                          {profile.establishmentYear 
                            ? `${Math.max(1, new Date().getFullYear() - Number(profile.establishmentYear))}+ Years`
                            : "25+ Years"}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">of Experience</p>
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-slate-900 font-heading">50+ Projects</p>
                        <p className="text-xs text-slate-400 font-medium">Completed</p>
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-slate-900 font-heading">10,000+</p>
                        <p className="text-xs text-slate-400 font-medium">Happy Families</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile View (below sm) */}
                <div className="flex sm:hidden flex-col gap-4">
                  <div className="flex items-center gap-3">
                    {/* Logo / DP Box */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                      {logoImage ? (
                        <img
                          src={logoImage}
                          alt={`${profile.name} logo`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#1953c2] flex items-center justify-center text-white text-xl font-extrabold font-heading">
                          {profile.name ? profile.name.charAt(0).toUpperCase() : 'E'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-bold text-slate-900 font-heading">Business Info</h3>
                      <span className="text-slate-400 inline-flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full h-4 w-4 text-[10px] font-bold">i</span>
                    </div>
                  </div>

                  <div className="space-y-3 min-w-0">
                    <p className={`text-[15px] leading-relaxed text-slate-600 ${!mobileDescExpanded ? 'line-clamp-4' : ''}`}>
                      {profile.description}
                    </p>

                    {profile.description.length > 150 && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setMobileDescExpanded(!mobileDescExpanded)}
                          className="inline-flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100/80 px-4 py-1.5 text-xs font-bold text-blue-600 transition duration-155 cursor-pointer"
                        >
                          {mobileDescExpanded ? "Read Less" : "Read More"}
                        </button>
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="pt-3 flex flex-wrap gap-8">
                      <div>
                        <p className="text-[15px] font-bold text-slate-900 font-heading">
                          {profile.establishmentYear 
                            ? `${Math.max(1, new Date().getFullYear() - Number(profile.establishmentYear))}+ Years`
                            : "25+ Years"}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">of Experience</p>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900 font-heading">50+ Projects</p>
                        <p className="text-xs text-slate-400 font-medium">Completed</p>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900 font-heading">10,000+</p>
                        <p className="text-xs text-slate-400 font-medium">Happy Families</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Grid 2: Reviews & Ratings */}
          <div id="listing-reviews" className="grid grid-cols-1 lg:grid-cols-[7.2fr_2.8fr] gap-6 items-start mt-6 w-full mx-auto px-2 sm:px-12 md:px-16 lg:px-20">
            {/* Left Column of Grid 2 (Reviews Section) */}
            <div className="order-2 lg:order-1 space-y-4 w-full min-w-0">
              <h2 className="text-xl font-bold text-slate-900 font-heading">Reviews</h2>
              {reviewsLoading ? (
                <p className="text-sm font-medium text-slate-500">Loading reviews...</p>
              ) : reviewsToDisplay.length > 0 ? (
                reviewsToDisplay.map((review) => {
                  const reviewScore = Math.max(0, Math.min(5, Math.round(Number(review.rating || 0))));
                  const isOwnReview = Boolean(currentUser?.id && review.reviewerId === currentUser.id);
                  const isEditingThisReview = editingReviewId === review.id;
                  const reviewEditCount = Math.max(0, Number(review.editCount || 0));
                  const reviewWasEdited = Boolean(review.isEdited || reviewEditCount > 0);
                  const authorInitials = review.author ? review.author.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) : 'U';

                  return (
                    <div key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1953c2] text-sm font-bold text-white font-heading">
                            {authorInitials}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-bold text-slate-900 font-heading">{review.author}</p>
                              {reviewWasEdited && (
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, starIdx) => (
                                  <Star
                                    key={`${review.id}-star-${starIdx}`}
                                    size={12}
                                    className={
                                      starIdx < reviewScore
                                        ? "fill-[#eab308] text-[#eab308]"
                                        : "text-[#cbd5e1]"
                                    }
                                  />
                                ))}
                              </div>
                              {review.createdAt && (
                                <span className="text-[11px] font-medium text-slate-400">
                                  {review.id.startsWith("dummy") ? review.createdAt : formatReviewDate(String(review.createdAt))}
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-full bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
                                Verified
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isOwnReview && !isEditingThisReview && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditReview(review)}
                              disabled={reviewEditCount >= 2}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                            >
                              <Pencil size={11} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteReview(review)}
                              disabled={deletingReviewId === review.id}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#fecaca] bg-white px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 cursor-pointer"
                            >
                              <Trash2 size={11} />
                              {deletingReviewId === review.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingThisReview ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={`${review.id}-edit-${value}`}
                                type="button"
                                onClick={() => setEditReviewRating(value)}
                                className="rounded-full p-0.5"
                                aria-label={`Rate ${value}`}
                              >
                                <Star
                                  size={16}
                                  className={
                                    value <= editReviewRating
                                      ? "fill-[#eab308] text-[#eab308]"
                                      : "text-[#cbd5e1]"
                                  }
                                />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editReviewText}
                            onChange={(event) => setEditReviewText(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[15px] font-medium text-slate-800 outline-none min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleUpdateReview(review)}
                              disabled={isUpdatingReview}
                              className="inline-flex min-h-8 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                            >
                              {isUpdatingReview ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditReview}
                              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 pl-1">
                          <p className="text-[15px] font-bold text-slate-900 font-heading">
                            {review.id.startsWith("dummy") && (review as any).title 
                              ? (review as any).title 
                              : (review.rating >= 4 ? "Premium in every sense" : "Great service, minor caveat")}
                          </p>
                          <p className="text-[15px] leading-relaxed text-slate-600">
                            {review.comment}
                          </p>
                          <div className="flex items-center justify-end pt-1">
                            <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer">
                              <span className="text-[13px]">👍</span> Helpful
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-[15px] font-medium text-slate-500 font-heading">No reviews yet.</p>
              )}

              {!showAllReviews && (
                <button
                  type="button"
                  onClick={handleLoadMoreReviews}
                  disabled={isLoadingMoreReviews}
                  className="w-full border border-slate-200 bg-white py-3 px-6 text-[15px] font-semibold text-slate-700 rounded-full hover:bg-slate-50 cursor-pointer flex items-center justify-center transition duration-155 disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoadingMoreReviews ? "Loading Reviews..." : "Load More Reviews"}
                </button>
              )}
            </div>

            {/* Right Column (Ratings summary + Review form) */}
            <div className="order-1 lg:order-2 space-y-6 min-w-0 w-full lg:sticky lg:top-24">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 font-heading">Ratings</h2>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:p-6 text-center space-y-4">
                  <div>
                    <p className="text-5xl font-extrabold text-slate-950 font-heading leading-none">
                      {roundedRating > 0 ? roundedRating.toFixed(1) : "5.0"}
                    </p>
                    <div className="flex items-center justify-center gap-0.5 mt-2 text-[#eab308]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`ratings-star-${index}`}
                          size={16}
                          className="fill-[#eab308] text-[#eab308]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 text-left">
                    {[5, 4, 3, 2, 1].map((score) => {
                      const count = reviews.reduce((total, review) => {
                        const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
                        return total + (rating === score ? 1 : 0);
                      }, 0);
                      
                      const totalReviews = reviews.length || 1;
                      const percentage = Math.round((count / totalReviews) * 100);
                      const displayPercentage = reviews.length > 0 ? percentage : (score === 5 ? 100 : 0);

                      return (
                        <div key={score} className="flex items-center gap-3">
                          <span className="w-3 text-xs font-semibold text-slate-500">{score}</span>
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#eab308] transition-all duration-300"
                              style={{ width: `${displayPercentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-medium text-slate-400">{`${displayPercentage}%`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review Form Box */}
                <div className="rounded-2xl bg-slate-50/50 p-3 sm:p-6 flex flex-col items-center border border-slate-100">
                  {authLoading ? (
                    <p className="text-[15px] font-medium text-slate-500">Checking login status...</p>
                  ) : !currentUser ? (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Pencil size={18} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 font-heading text-center">Login to review</h4>
                        <p className="mt-1 text-xs text-slate-400 font-medium text-center">
                          Share your experience
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="inline-flex h-9 px-6 items-center justify-center rounded-full border border-[#2563eb] bg-white text-xs font-semibold text-blue-600 hover:bg-blue-50/50 transition duration-150"
                      >
                        Login
                      </button>
                    </div>
                  ) : hasAlreadyReviewed ? (
                    <div className="space-y-3 w-full text-center">
                      <div className="mx-auto h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-green-600">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 font-heading">Thanks for your review</h4>
                        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                          You already reviewed this business. You can edit or delete your review on the left.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form className="space-y-4 w-full text-left" onSubmit={handleSubmitReview}>
                      <h4 className="text-lg font-bold text-slate-900 font-heading text-center">Write a review</h4>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={reviewAuthor}
                          onChange={(event) => setReviewAuthor(event.target.value)}
                          disabled={!currentUser}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-800 outline-none"
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Rating</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={`write-rating-${value}`}
                              type="button"
                              onClick={() => setReviewRatingInput(value)}
                              className="rounded-full p-1"
                              aria-label={`Rate ${value}`}
                            >
                              <Star
                                size={18}
                                className={
                                  value <= reviewRatingInput
                                    ? "fill-[#eab308] text-[#eab308]"
                                    : "text-[#cbd5e1]"
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Review
                        </label>
                        <textarea
                          value={reviewText}
                          onChange={(event) => setReviewText(event.target.value)}
                          disabled={!currentUser}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[15px] font-medium text-slate-800 outline-none min-h-[100px]"
                          placeholder="Write your review here..."
                        />
                      </div>

                      {reviewFormMessage && (
                        <p className="text-xs font-semibold text-red-500 mt-1">{reviewFormMessage}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingReview || !currentUser}
                        className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md transition disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only Enquiry Form and Address & Contact Details Cards */}
          <div className="block lg:hidden mt-6 space-y-6 w-full mx-auto px-2 sm:px-12 md:px-16">
            {/* Enquiry Form Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4 font-heading">Enquiry Form</h3>
              {renderInquiryForm()}
            </div>

            {/* Address & Contact Details Card */}
            {renderBusinessContactDetails("listing-contact-details-mobile")}
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
                      className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[#cbd5e1] bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
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
                      className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[#cbd5e1] bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3"
            onClick={closeInquiryModal}
          >
            <section
              className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 relative shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Enquiry Form</h3>
                <button
                  type="button"
                  onClick={closeInquiryModal}
                  className="rounded-full bg-slate-50 hover:bg-slate-100 p-2 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {renderInquiryForm("space-y-4")}
            </section>
          </div>
        ) : null}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <div id="listing-footer" className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <Footer />
      </div>
    </main>
  );
}
