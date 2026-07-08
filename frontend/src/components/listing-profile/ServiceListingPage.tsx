"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { submitVendorInquiry, DEFAULT_TILE_IMAGES } from "@/lib/catalogClient";
import {
  deleteBusinessReview,
  fetchBusinessReviews,
  submitBusinessReview,
  updateBusinessReview,
  type BusinessReview,
  type BusinessReviewSummary, getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";
import {
  addToCart,
  makeStoreProduct,
  CART_UPDATED_EVENT,
  readCart,
  readWishlist,
  setCartItemQuantity,
  toggleWishlist,
  setBuyNowSelection,
} from "@/lib/shopStorage";
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

const toPriceValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatIndianCurrency = (value: number): string => {
  const amount = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
};

const ratingLabel = (rating: number) => rating.toFixed(1);

const toProductReviewBusinessKey = (productId: string) => {
  const normalizedProductId = String(productId || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .slice(0, 96);

  return `product:dots`;
};

export default function ServiceListingPage({
  profile,
  storeData,
}: {
  profile: ListingProfile;
  storeData?: StorePageData | null;
}) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);
  const [, setReviewUpdateVersion] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(() => new Set());
  const [selectedService, setSelectedService] = useState<StoreProduct | null>(null);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<StoreProduct | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => setIsReviewHydrated(true), 0);
    const unsubscribe = subscribeReviewUpdates(() => {
      setReviewUpdateVersion((prev) => prev + 1);
    });

    return () => {
      window.clearTimeout(hydrationTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncCartState = () => {
      const next: Record<string, number> = {};
      readCart().forEach((item) => {
        const productId = String(item?.product?.id || "").trim();
        if (productId) {
          next[productId] = Math.max(1, Number(item.quantity || 1));
        }
      });

      setCartQuantities(next);
    };

    syncCartState();
    window.addEventListener(CART_UPDATED_EVENT, syncCartState as EventListener);
    window.addEventListener("storage", syncCartState);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartState as EventListener);
      window.removeEventListener("storage", syncCartState);
    };
  }, []);

  useEffect(() => {
    const syncWishlistState = () => {
      setWishlistProductIds(new Set(readWishlist().map((item) => item.id)));
    };

    syncWishlistState();
    window.addEventListener("shop:wishlist-updated", syncWishlistState as EventListener);
    window.addEventListener("storage", syncWishlistState);

    return () => {
      window.removeEventListener("shop:wishlist-updated", syncWishlistState as EventListener);
      window.removeEventListener("storage", syncWishlistState);
    };
  }, []);

  useEffect(() => {
    if (selectedService || isPaymentModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedService, isPaymentModalOpen]);

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
          <div className="text-[15px] font-semibold text-slate-700 leading-relaxed break-words">
            {/* Mobile View: single line */}
            <p className="block sm:hidden">
              {[profile.address, profile.city, profile.state, profile.postalCode]
                .filter(Boolean)
                .join(", ")}
              {!profile.address && !profile.city && !profile.state && !profile.postalCode && "Address unavailable"}
            </p>
            
            {/* Desktop View: multi-line */}
            <div className="hidden sm:block space-y-0.5">
              {profile.address && <p>{profile.address}</p>}
              {profile.city && <p>{profile.city}</p>}
              {profile.state && <p>{profile.state}</p>}
              {profile.postalCode && <p>{profile.postalCode}</p>}
            </div>
            
            {!profile.address && !profile.city && !profile.state && !profile.postalCode && (
              <p className="hidden sm:block text-slate-400 font-medium">Address unavailable</p>
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

  const services = useMemo(() => storeData?.products || [], [storeData?.products]);

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
      const alreadyInCart = readCart().some((item) => item.product.id === product.id);
      if (alreadyInCart) {
        return;
      }

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

  const handleToggleWishlist = useCallback(
    (product: StoreProduct) => {
      const href = buildProductHref(product);
      const storeId = String(profile.storeId || profile.id || "").trim() || profile.id;
      const storeProduct = makeStoreProduct(
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

      toggleWishlist(storeProduct);
    },
    [buildProductHref, profile.id, profile.name, profile.storeId]
  );

  const handleBookNow = useCallback(
    (product: StoreProduct) => {
      setSelectedServiceForPayment(product);
      setIsPaymentModalOpen(true);
    },
    []
  );

  const updateServiceCartQuantity = useCallback((productId: string, nextQuantity: number) => {
    setCartItemQuantity(productId, nextQuantity);
  }, []);

  const handleCardClick = useCallback((e: React.MouseEvent, service: StoreProduct) => {
    e.preventDefault();
    setSelectedService(service);
  }, []);

  const renderServiceCard = (service: StoreProduct) => {
    const serviceHref = buildProductHref(service);
    const serviceCartQuantity = Math.max(0, Number(cartQuantities[service.id] || 0));
    const reviewSummaryForProduct = isReviewHydrated
      ? getBusinessReviewAggregate(
          toProductReviewBusinessKey(service.id),
          Number(service.rating || 0),
          Math.max(0, Number(service.reviews || 0))
        )
      : {
          rating: Number(service.rating || 0),
          reviews: Math.max(0, Number(service.reviews || 0)),
        };
    const ratingValue = Number(reviewSummaryForProduct.rating || 0);
    const reviewCountValue = Math.max(0, Math.round(Number(reviewSummaryForProduct.reviews || 0)));
    const currentPriceValue = toPriceValue(service.price);
    const oldPriceValue = Number(service.oldPriceValue || 0);
    const hasComparablePrice = Number.isFinite(oldPriceValue) && oldPriceValue > currentPriceValue && currentPriceValue > 0;
    const discountPercent = hasComparablePrice
      ? Math.round(((oldPriceValue - currentPriceValue) / oldPriceValue) * 100)
      : 0;
    const currentPriceLabel =
      currentPriceValue > 0
        ? formatIndianCurrency(currentPriceValue)
        : String(service.price || "").trim() || "Price unavailable";
    const imageUrl = String(service.imageUrl || profile.logoImage || "").trim();

    return (
      <article
        key={service.id}
        onClick={(e) => handleCardClick(e, service)}
        className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white border border-slate-100 shadow-sm transition hover:-translate-y-0.5 cursor-pointer"
      >
        <div 
          className="relative block aspect-video w-full overflow-hidden bg-slate-100 font-heading"
        >
          {service.badge && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#10b981] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm uppercase tracking-wider">
              {service.badge}
            </span>
          )}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={service.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
              Service
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleWishlist(service); }}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-400 transition hover:text-rose-500 shadow-sm cursor-pointer"
          aria-label={`${wishlistProductIds.has(service.id) ? "Remove from" : "Add to"} wishlist`}
        >
          <Heart
            size={18}
            className={wishlistProductIds.has(service.id) ? "fill-rose-500 text-rose-500" : ""}
            strokeWidth={1.8}
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-5 text-slate-900 group-hover:text-blue-700 font-heading">
            {service.name}
          </h3>

          <p className="mt-1 truncate text-sm font-medium text-slate-500">
            {service.sellerName || profile.name}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className="font-extrabold text-amber-600">{ratingLabel(ratingValue)}</span>
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={13}
                  className={index < Math.round(ratingValue) ? "fill-amber-500 text-amber-500" : "text-slate-300"}
                />
              ))}
            </div>
            <span className="text-slate-400">({reviewCountValue})</span>
          </div>

          {service.highlights && service.highlights.length > 0 ? (
            <ul className="mt-3.5 space-y-1 text-xs font-semibold text-slate-600">
              {service.highlights.slice(0, 4).map((highlight, index) => (
                <li key={index} className="flex items-center gap-1.5 truncate">
                  <span className="text-emerald-500 font-extrabold">✓</span>
                  <span className="font-semibold text-slate-600">{highlight.replace(/^✓\s*/, '')}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-extrabold text-slate-950">{currentPriceLabel}</span>
            {hasComparablePrice ? (
              <>
                <span className="text-sm text-slate-400 line-through">
                  {formatIndianCurrency(oldPriceValue)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-xs font-bold text-[#10b981]">
                    {discountPercent}% OFF
                  </span>
                )}
              </>
            ) : null}
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleBookNow(service); }}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
            >
              Book Now
            </button>
          </div>
        </div>
      </article>
    );
  };

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
            <div className="relative h-36 sm:h-60 lg:h-[300px] w-full">
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
              <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
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
                    <h1 className="text-2xl sm:text-[26px] font-semibold text-slate-800 sm:font-bold sm:text-slate-900 tracking-tight truncate leading-tight font-heading">
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
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white border-b border-slate-100 py-3.5 mb-0 sm:mb-6">
            <div className="mx-auto w-full px-2 sm:px-12 md:px-16 lg:px-20">
              <div className="flex flex-nowrap items-center overflow-x-auto gap-2 pb-2 -mx-2 px-2 no-scrollbar sm:flex sm:flex-nowrap sm:items-center sm:overflow-x-auto sm:gap-3 sm:pb-1 sm:mx-0 sm:px-0 md:flex-wrap md:overflow-visible">
                


                {/* 2. Call Button */}
                {phoneDigits ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <Phone size={14} className="text-slate-500" />
                    Call
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
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
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <MessageSquare size={14} className="text-slate-500" />
                    WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
                    <MessageSquare size={14} className="text-slate-300" />
                    WhatsApp
                  </span>
                )}

                {/* 4. Email Button */}
                {emailHref ? (
                  <a
                    href={emailHref}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <Mail size={14} className="text-slate-500" />
                    Email
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
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
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <Globe size={14} className="text-slate-500" />
                    Website
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
                    <Globe size={14} className="text-slate-300" />
                    Website
                  </span>
                )}

                {/* 6. Inquiry Button */}
                {hasInquiryTarget ? (
                  <button
                    type="button"
                    onClick={openInquiryModal}
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <Send size={14} className="text-slate-500" />
                    Inquiry
                  </button>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
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
                    className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
                  >
                    <Compass size={14} className="text-slate-500" />
                    Direction
                  </a>
                ) : (
                  <span className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 bg-slate-50/50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-400 opacity-60 gap-1 sm:gap-1.5 shrink-0">
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
                  className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border border-slate-100 sm:border-slate-200 bg-white hover:bg-slate-50 px-3.5 sm:px-4 text-[12px] sm:text-sm font-semibold text-slate-700 transition duration-150 sm:shadow-sm gap-1 sm:gap-1.5 shrink-0"
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
          <div className="grid grid-cols-1 lg:grid-cols-[7.2fr_2.8fr] gap-6 items-start mt-0 sm:mt-6 w-full mx-auto px-2 sm:px-12 md:px-16 lg:px-20">
            
            {/* Left Column of Grid 1 */}
            <div className="space-y-6 min-w-0">
              
              {/* Main Content Card with Inline Tabs Header */}
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                {/* Tab Navigation Bar */}
                <div className="flex overflow-x-auto whitespace-nowrap no-scrollbar border-b border-slate-100 bg-white pl-4 sm:pl-8 pr-4 sm:pr-6 py-1 justify-start">
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
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[15px] font-semibold border-b-2 -mb-[1px] transition-colors cursor-pointer font-heading shrink-0 inline-block ${
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
                
                {/* 1. Gallery or Services Section depending on activeTab */}
                {activeTab === "photo" ? (
                  <section id="listing-gallery" className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">
                        <span className="sm:hidden">Photos</span>
                        <span className="hidden sm:inline">Gallery</span>
                      </h2>
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
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {photoItems.slice(0, 3).map((photo, index) => (
                          <button
                            key={`${photo}-${index}`}
                            type="button"
                            onClick={() => openSinglePhotoModal(photo)}
                            className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 aspect-[4/3.5] sm:aspect-[4/3] w-full cursor-pointer hover:opacity-95 transition"
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
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {DEFAULT_TILE_IMAGES.slice(0, 3).map((imgUrl, index) => (
                          <div key={index} className="overflow-hidden rounded-2xl bg-slate-100 aspect-[4/3.5] sm:aspect-[4/3] w-full">
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
                ) : activeTab === "services" ? (
                  <section id="listing-services-vertical" className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">Services</h2>
                      <span className="text-sm font-semibold text-slate-500">
                        {services.length} {services.length === 1 ? "service" : "services"} available
                      </span>
                    </div>

                    {services.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {services.map((service) => renderServiceCard(service))}
                      </div>
                    ) : (
                      <p className="px-5 py-10 text-center text-sm font-semibold text-slate-600 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        No services available yet.
                      </p>
                    )}

                    {/* Mobile-only Enquiry Button */}
                    <div className="block sm:hidden pt-4">
                      <button
                        type="button"
                        onClick={openInquiryModal}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-155"
                      >
                        <Send size={16} />
                        Enquire Now
                      </button>
                    </div>
                  </section>
                ) : (
                  <section id="listing-services-horizontal" className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">Services</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("services");
                          const el = document.getElementById("listing-services-vertical");
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        disabled={services.length === 0}
                        className="text-[15px] font-semibold text-blue-600 hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                      >
                        View All
                      </button>
                    </div>

                    {services.length > 0 ? (
                      <div 
                        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {services.map((service) => (
                          <div key={service.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                            {renderServiceCard(service)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-5 py-10 text-center text-sm font-semibold text-slate-600 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        No services available yet.
                      </p>
                    )}

                    {/* Mobile-only Enquiry Button */}
                    <div className="block sm:hidden pt-4">
                      <button
                        type="button"
                        onClick={openInquiryModal}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-155"
                      >
                        <Send size={16} />
                        Enquire Now
                      </button>
                    </div>
                  </section>
                )}

                {/* Divider between Business Details and Services */}
                <div className="border-t border-slate-100" />

                {/* 2. Business Details Section */}
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

                {/* Divider (only for Overview / Default tab between Business Details and Services) */}
                {activeTab !== "services" && (
                  <div className="border-t border-slate-100" />
                )}

                {/* 3. Services Section (rendered in both default layout and services tab layout) */}
                {(() => {
                  const defaultServices = ["Estates", "Property", "Homes", "Flats", "Buildings"];
                  const displayServices = serviceItems.length > 0 ? serviceItems : defaultServices;
                  const servicesLimit = isMobile ? 6 : 10;
                  const visibleServices = showAllServices ? displayServices : displayServices.slice(0, servicesLimit);
                  const hasMoreServices = displayServices.length > servicesLimit;
                  return (
                    <section id="listing-services" className="space-y-3">
                      <h2 className="text-xl font-bold text-slate-900 font-heading">Services</h2>
                      
                      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1 text-[15px]">
                        {visibleServices.map((service) => (
                          <div key={service} className="flex items-center justify-between py-2.5 border-b border-slate-100">
                            <span className="text-slate-700 font-semibold">{service}</span>
                            <span className="hidden sm:inline-block rounded-full bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-0.5 text-xs font-semibold text-[#16a34a]">
                              Available
                            </span>
                          </div>
                        ))}
                      </div>

                      {hasMoreServices && (
                        <div className="pt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setShowAllServices(!showAllServices)}
                            className="w-full md:w-fit border border-slate-200 bg-white py-2.5 px-6 text-[14px] font-bold text-slate-700 rounded-full hover:bg-slate-50 cursor-pointer flex items-center justify-center transition duration-155"
                          >
                            {showAllServices ? "View Less" : "View More Services"}
                          </button>
                        </div>
                      )}

                      {/* Mobile-only Enquiry Button */}
                      <div className="block sm:hidden pt-4">
                        <button
                          type="button"
                          onClick={openInquiryModal}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-155"
                        >
                          <Send size={16} />
                          Enquire Now
                        </button>
                      </div>
                    </section>
                  );
                })()}



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

          {/* Mobile-only Address & Contact Details Card */}
          <div className="block lg:hidden mt-6 mx-auto w-full px-2 sm:px-12 md:px-16">
            {renderBusinessContactDetails("listing-contact-details-mobile")}
          </div>

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
                
                <div className="flex flex-row lg:flex-col gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:p-6 text-center space-y-4 flex-1 min-w-0">
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
                <div className="rounded-2xl bg-slate-50/50 p-3 sm:p-6 flex flex-col items-center border border-slate-100 flex-1 min-w-0">
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
          </div>



        </section>

        {isPhotosModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
            onClick={closePhotosModal}
          >
            <section
              className="w-[92vw] sm:w-[85vw] md:w-[75vw] lg:w-[60vw] max-w-4xl h-[62vh] sm:h-[75vh] flex flex-col justify-between rounded-2xl bg-white p-4"
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
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-[12px] bg-[#f3f4f6]">
                    <img
                      src={selectedPhotoUrl}
                      alt={`${profile.name} photo preview`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 shrink-0">
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
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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

        {/* Manual Payment Modal Popup */}
        {isPaymentModalOpen && selectedServiceForPayment && (() => {
          const service = selectedServiceForPayment;
          const price = toPriceValue(service.price);
          
          // QR code image URL: if paymentQrCode exists, use it. Otherwise, null.
          const qrCodeUrl = profile.paymentQrCode || null;

          // Pre-filled WhatsApp message text
          const whatsappText = `Hi ${profile.name}, I am booking the service "${service.name}" for Rs. ${price}. Here is my payment transaction proof.`;
          const whatsappLink = `https://wa.me/${profile.phone}?text=${encodeURIComponent(whatsappText)}`;

          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-visible flex flex-col animate-scale-in">
                {/* Header */}
                <div className="bg-white p-5 pr-12 border-b border-slate-100 shrink-0">
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Complete Manual Payment</h3>
                  <p className="text-xs text-slate-500 mt-1">Scan the QR code below to transfer funds directly to the vendor.</p>
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="absolute top-5 right-4 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 p-1.5 transition cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body (Scrollable Content) */}
                <div className="px-6 pt-0 pb-6 space-y-4">
                  {/* Service Summary Card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-4 items-center">
                    {service.imageUrl ? (
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200 p-1 flex items-center justify-center">
                        <img src={service.imageUrl} alt={service.name} className="max-h-full max-w-full object-contain mx-auto" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Store size={28} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">{service.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Provider: {service.sellerName || profile.name}</p>
                      <p className="text-lg font-extrabold text-slate-900 mt-1">Rs. {price.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6 items-stretch">
                    {/* QR Code Column */}
                    <div className="flex h-full flex-col items-center justify-center p-6 md:p-8 border border-slate-200/80 rounded-xl bg-white shadow-sm space-y-4 overflow-hidden">
                      {qrCodeUrl ? (
                        <>
                          <p className="text-xs font-bold text-slate-800 tracking-wide uppercase text-center">Scan to Pay via UPI</p>
                          <div className="flex h-[215px] w-full max-w-[240px] items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-inner md:h-[245px] md:max-w-[260px]">
                            <img src={qrCodeUrl} alt="Payment QR Code" className="block h-full w-full object-contain" />
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium font-sans text-center pt-1">GPay, PhonePe, Paytm, BHIM, or any UPI App</p>
                        </>
                      ) : (
                        <div className="w-full flex-1 flex items-center justify-center text-center py-6 px-4 space-y-2">
                          <div>
                            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <p className="text-xs font-bold text-slate-800">QR Code Not Available</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                              This service provider has not uploaded their payment QR code yet. Please tap <strong>"WhatsApp Receipt"</strong> below to connect with them directly and request payment details.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instructions Column */}
                    <div className="flex h-full flex-col justify-between gap-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">Payment Instructions</h4>
                        <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4">
                          {qrCodeUrl ? (
                            <>
                              <li>
                                <strong>Scan the QR code:</strong> Open any UPI application on your smartphone and scan the QR code above.
                              </li>
                              <li>
                                <strong>Send exactly Rs. {price.toLocaleString()}:</strong> Complete the payment transaction of the specified service amount.
                              </li>
                            </>
                          ) : (
                            <>
                              <li>
                                <strong>Request payment details:</strong> Tap the WhatsApp button below to request the provider's payment details (UPI ID or QR).
                              </li>
                              <li>
                                <strong>Send exactly Rs. {price.toLocaleString()}:</strong> Send the specified service amount using their provided details.
                              </li>
                            </>
                          )}
                          <li>
                            <strong>WhatsApp the Transaction ID:</strong> Take a screenshot of the successful transaction receipt and send it along with the Transaction ID/Reference Number to the vendor via WhatsApp below.
                          </li>
                        </ol>
                      </div>

                      {/* Precaution Box */}
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 text-rose-800">
                        <div className="shrink-0 mt-0.5 text-rose-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold leading-tight font-heading">Precautionary Disclaimer</h4>
                          <p className="text-[11px] leading-relaxed text-rose-700 font-sans">
                            This is a direct peer-to-peer manual payment method. The platform does not process, hold, or handle this payment. Winkget will not be responsible for any scams, unfulfilled bookings, or disputes. Always verify the service provider details before sending funds.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 h-11 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 inline-flex items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition cursor-pointer gap-2"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.022-.079-.116-.16-.307-.256-.19-.096-1.129-.557-1.303-.619-.174-.062-.3-.092-.43.096-.128.189-.5.626-.612.753-.113.128-.227.144-.417.048-.19-.096-.8-.294-1.523-.938-.563-.5-1.01-1.117-1.121-1.305-.113-.192-.012-.295.083-.39.085-.085.19-.22.285-.33.095-.108.127-.184.19-.307.064-.124.032-.232-.016-.328-.048-.096-.43-1.037-.588-1.424-.155-.375-.312-.325-.43-.331-.109-.006-.234-.007-.36-.007a.69.69 0 00-.5.234c-.174.19-.664.648-.664 1.58 0 .933.678 1.834.773 1.962.095.128 1.332 2.036 3.228 2.853.45.195.802.312 1.076.4.453.143.865.123 1.192.074.364-.055 1.129-.462 1.288-.908.16-.446.16-.828.112-.908-.048-.08-.184-.128-.374-.224zM12 2C6.48 2 2 6.48 2 12c0 2.17.7 4.19 1.89 5.84L2.1 22l4.31-1.13C8.01 21.5 10.02 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1.4 16.25c-1.17.65-2.52.88-3.83.66-2.12-.36-3.84-2.08-4.2-4.2-.22-1.31.01-2.66.66-3.83L5.4 7.6l3.29.63c1.17-.65 2.52-.88 3.83-.66 2.12.36 3.84 2.08 4.2 4.2.22 1.31-.01 2.66-.66 3.83l.63 3.29-3.29-.63z" />
                    </svg>
                    WhatsApp Receipt
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Service Details Modal Popup */}
        {selectedService && (() => {
          const service = selectedService;
          const serviceCartQuantity = Math.max(0, Number(cartQuantities[service.id] || 0));
          const reviewSummaryForProduct = isReviewHydrated
            ? getBusinessReviewAggregate(
                toProductReviewBusinessKey(service.id),
                Number(service.rating || 0),
                Math.max(0, Number(service.reviews || 0))
              )
            : {
                rating: Number(service.rating || 0),
                reviews: Math.max(0, Number(service.reviews || 0)),
              };
          const ratingValue = Number(reviewSummaryForProduct.rating || 0);
          const reviewCountValue = Math.max(0, Math.round(Number(reviewSummaryForProduct.reviews || 0)));
          const currentPriceValue = toPriceValue(service.price);
          const oldPriceValue = Number(service.oldPriceValue || 0);
          const hasComparablePrice = Number.isFinite(oldPriceValue) && oldPriceValue > currentPriceValue && currentPriceValue > 0;
          const discountPercent = hasComparablePrice
            ? Math.round(((oldPriceValue - currentPriceValue) / oldPriceValue) * 100)
            : 0;
          const currentPriceLabel =
            currentPriceValue > 0
              ? formatIndianCurrency(currentPriceValue)
              : String(service.price || "").trim() || "Price unavailable";
          const imageUrl = String(service.imageUrl || profile.logoImage || "").trim();

          return (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
              onClick={() => setSelectedService(null)}
            >
              <div 
                className="relative w-full md:w-[80vw] md:max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all md:flex md:h-[620px] max-h-[90vh] cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>

                {/* Image Column */}
                <div className="relative h-48 md:h-full md:w-1/2 bg-slate-100 shrink-0">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={service.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                      Service
                    </div>
                  )}
                  {service.badge && (
                    <span className="absolute left-4 top-4 z-10 rounded-full bg-[#10b981] px-3 py-1.5 text-xs font-bold text-white shadow-md uppercase tracking-wider">
                      {service.badge}
                    </span>
                  )}
                </div>

                {/* Details Column */}
                <div className="flex flex-col flex-1 p-6 md:p-8 min-w-0 h-full overflow-hidden">
                  {/* Fixed Header */}
                  <div className="mb-4 shrink-0">
                    <div className="mb-2">
                      <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                        {service.categoryLabel || service.category || "Service"}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold leading-7 text-slate-950 font-heading mb-2">
                      {service.name}
                    </h2>

                    <p className="text-sm font-semibold text-slate-500">
                      {service.sellerName || profile.name}
                    </p>
                  </div>

                  {/* Scrollable Middle Content Area */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-extrabold text-amber-600">{ratingLabel(ratingValue)}</span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={index < Math.round(ratingValue) ? "fill-amber-500 text-amber-500" : "text-slate-300"}
                          />
                        ))}
                      </div>
                      <span className="text-slate-400">({reviewCountValue} ratings)</span>
                    </div>

                    {/* 1. Highlights Section */}
                    {service.highlights && service.highlights.length > 0 && (
                      <div className="pb-4 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">What's Included:</h4>
                        <ul className="space-y-1.5 text-sm text-slate-600">
                          {service.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-emerald-500 font-extrabold">✓</span>
                              <span className="font-semibold text-slate-600">{highlight.replace(/^✓\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 3. Detailed Description Section */}
                    <div className="space-y-3">
                      {service.descriptionPoints && service.descriptionPoints.length > 0 ? (
                        <div className="space-y-3.5">
                          {service.descriptionPoints.map((point, index) => (
                            <div key={index} className="space-y-1">
                              {point.heading ? (
                                <h4 className="text-sm font-bold text-slate-900">{point.heading}</h4>
                              ) : null}
                              {point.content ? (
                                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{point.content}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : service.description ? (
                        <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                          {service.description}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No description available.</p>
                      )}
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-400">Price</span>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-extrabold text-slate-950">{currentPriceLabel}</span>
                        {hasComparablePrice && (
                          <>
                            <span className="text-sm text-slate-400 line-through">
                              {formatIndianCurrency(oldPriceValue)}
                            </span>
                            {discountPercent > 0 && (
                              <span className="text-sm font-bold text-[#10b981]">
                                {discountPercent}% OFF
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="w-40 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBookNow(service)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition cursor-pointer"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
