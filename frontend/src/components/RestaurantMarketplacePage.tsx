"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Facebook,
  Heart,
  Info,
  Instagram,
  IndianRupee,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
  Share2,
  ShoppingCart,
  Star,
  Twitter,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Footer from "@/components/Footer";
import type { StorePageData, StoreProduct } from "@/data/listingData";
import { CART_UPDATED_EVENT, readCart, setCartItemQuantity } from "@/lib/shopStorage";
import { subscribeVendorStoreStatus, type VendorStoreStatusSocketPayload } from "@/lib/storeStatusRealtime";

type RestaurantMarketplacePageProps = {
  data: StorePageData;
  onAddToCart: (product: StoreProduct) => void;
  storeReviewStats: {
    rating: number;
    reviews: number;
  };
};

type SortMode = "recommended" | "price-low" | "price-high" | "rating-high";

const normalizeDigits = (value: string | undefined) => String(value || "").replace(/\D/g, "");

const toPriceNumber = (value: string | number | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(parsed)) {
    return Math.max(0, parsed);
  }

  return 0;
};

const uniqueStrings = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  items.forEach((item) => {
    const normalized = String(item || "").trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      return;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  });

  return result;
};

const tokenMatch = (values: Array<string | undefined>, token: string) => {
  const normalizedToken = String(token || "").trim().toLowerCase();
  if (!normalizedToken || normalizedToken === "all") {
    return true;
  }

  return values.some((value) => String(value || "").toLowerCase().includes(normalizedToken));
};

const formatRating = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.0";
  }

  return value.toFixed(1);
};

const formatReviewCount = (value: number) => {
  const safeValue = Math.max(0, Math.round(Number(value || 0)));
  if (safeValue >= 1000) {
    const compact = safeValue % 1000 === 0 ? `${Math.round(safeValue / 1000)}k` : `${(safeValue / 1000).toFixed(1)}k`;
    return `${compact} reviews`;
  }

  return `${safeValue} reviews`;
};

const splitPriceForTwo = (label?: string) => {
  const raw = String(label || "").trim();
  if (!raw) {
    return { primary: "₹300", secondary: "For two" };
  }

  const rupeePart = raw.match(/₹\s*[\d,]+/i)?.[0] || "₹300";
  const secondaryRaw = raw.replace(rupeePart, "").trim();
  const secondary = secondaryRaw ? secondaryRaw.replace(/^for\s*/i, "For ") : "For two";

  return { primary: rupeePart, secondary };
};

const splitDeliveryFee = (label?: string) => {
  const raw = String(label || "").trim();
  if (!raw) {
    return { primary: "FREE", secondary: "Above ₹299" };
  }

  const aboveMatch = raw.match(/above\s*₹?\s*[\d,]+/i)?.[0] || "Above ₹299";
  const hasFree = /free/i.test(raw);

  return {
    primary: hasFree ? "FREE" : String(raw.split(/\s+/)[0] || "FREE").toUpperCase(),
    secondary: aboveMatch.replace(/^above/i, "Above"),
  };
};

export default function RestaurantMarketplacePage({
  data,
  onAddToCart,
  storeReviewStats,
}: RestaurantMarketplacePageProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeChip, setActiveChip] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<StoreProduct | null>(null);
  const [quickViewImage, setQuickViewImage] = useState("");
  const [quickViewSaved, setQuickViewSaved] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});

  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const photoItems = useMemo(() => {
    return Array.isArray(data.gallery) ? data.gallery.filter(Boolean) : [];
  }, [data.gallery]);

  const selectedPhotoIndex = useMemo(() => {
    if (!selectedPhotoUrl) return -1;
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
    if (!photoUrl) return;
    setSelectedPhotoUrl(photoUrl);
    setIsPhotosModalOpen(true);
  };

  const showPreviousPhoto = () => {
    if (selectedPhotoIndex <= 0) return;
    setSelectedPhotoUrl(photoItems[selectedPhotoIndex - 1] || null);
  };

  const showNextPhoto = () => {
    if (selectedPhotoIndex < 0 || selectedPhotoIndex >= photoItems.length - 1) return;
    setSelectedPhotoUrl(photoItems[selectedPhotoIndex + 1] || null);
  };

  useEffect(() => {
    return subscribeVendorStoreStatus(String(data.id || ""), (payload) => {
      setLiveStoreStatus(payload);
    });
  }, [data.id]);

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

  const categoryBubbles = useMemo(() => {
    const fallbackImage = String(data.logoImage || data.bannerImage || "").trim();
    const mappedProductImages = new Map<string, string>();

    data.products.forEach((product) => {
      const label = String(product.subcategoryName || "").trim();
      if (!label || mappedProductImages.has(label.toLowerCase())) {
        return;
      }

      const imageUrl = String(product.imageUrl || fallbackImage).trim();
      if (!imageUrl) {
        return;
      }

      mappedProductImages.set(label.toLowerCase(), imageUrl);
    });

    const adminCategoryBubbles = Array.isArray(data.categoryBarItems)
      ? data.categoryBarItems
          .map((item) => {
            const id = String(item.id || "").trim();
            const label = String(item.label || "").trim();
            if (!id || !label) {
              return null;
            }

            const iconImage = String(item.iconImage || "").trim();
            const productImage = mappedProductImages.get(label.toLowerCase());

            return {
              id,
              label,
              imageUrl: iconImage || productImage || fallbackImage,
            };
          })
          .filter((item): item is { id: string; label: string; imageUrl: string } => Boolean(item && item.imageUrl))
      : [];

    if (adminCategoryBubbles.length > 0) {
      return [{ id: "all", label: "All", imageUrl: fallbackImage }, ...adminCategoryBubbles];
    }

    const fallbackBubbles = Array.from(mappedProductImages.entries()).map(([normalizedLabel, imageUrl]) => ({
      id: normalizedLabel,
      label: normalizedLabel
        .split(" ")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
        .join(" "),
      imageUrl,
    }));

    return [{ id: "all", label: "All", imageUrl: fallbackImage }, ...fallbackBubbles];
  }, [data.bannerImage, data.categoryBarItems, data.logoImage, data.products]);

  const quickFilterChips = useMemo(() => {
    const fromProductHierarchy = data.products
      .map((product) => product.subcategoryName)
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return ["All", ...uniqueStrings(fromProductHierarchy).slice(0, 12)];
  }, [data.products]);

  const menuItems = useMemo(() => {
    const filtered = data.products.filter((product) => {
      const passesCategory =
        activeCategory === "All" ||
        tokenMatch([product.subcategoryName, product.categoryLabel, product.category], activeCategory);
      const passesChip =
        activeChip === "All" ||
        tokenMatch(
          [
            product.name,
            product.subcategoryName,
          ],
          activeChip
        );

      return passesCategory && passesChip;
    });

    if (sortMode === "price-low") {
      filtered.sort((left, right) => toPriceNumber(left.price) - toPriceNumber(right.price));
    } else if (sortMode === "price-high") {
      filtered.sort((left, right) => toPriceNumber(right.price) - toPriceNumber(left.price));
    } else if (sortMode === "rating-high") {
      filtered.sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0));
    }

    return filtered;
  }, [activeCategory, activeChip, data.products, sortMode]);

  const phoneDigits = normalizeDigits(data.contactPhone);
  const whatsappDigits = normalizeDigits(data.whatsappPhone || data.contactPhone);
  const bannerImage = String(data.bannerImage || "").trim();
  const priceForTwo = splitPriceForTwo(data.priceForTwoLabel);
  const deliveryFee = splitDeliveryFee(data.deliveryFeeLabel);

  const effectiveIsStoreOpen =
    typeof liveStoreStatus?.isStoreOpen === "boolean"
      ? liveStoreStatus.isStoreOpen
      : typeof data.isStoreOpen === "boolean"
      ? data.isStoreOpen
      : null;

  const openBadge =
    effectiveIsStoreOpen === true
      ? { label: "OPEN NOW", className: "bg-emerald-100 text-emerald-700", dotClass: "bg-emerald-500" }
      : effectiveIsStoreOpen === false
      ? { label: "CLOSED", className: "bg-rose-100 text-rose-700", dotClass: "bg-rose-500" }
      : { label: "CHECK TIMINGS", className: "bg-amber-100 text-amber-700", dotClass: "bg-amber-500" };

  const quickInfoReviews = useMemo(() => {
    const totalReviews = Math.max(0, Math.round(Number(storeReviewStats.reviews || 0)));
    if (totalReviews === 0) {
      return "0";
    }

    return `${totalReviews.toLocaleString("en-IN")}+`;
  }, [storeReviewStats.reviews]);

  const quickInfoLocation = useMemo(() => {
    const sublocalityLabel = String(data.sublocality || "").trim();
    if (sublocalityLabel) {
      return sublocalityLabel;
    }

    const rawAddress = String(data.address || "").trim();
    if (!rawAddress) {
      return "Location unavailable";
    }

    const parts = rawAddress
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return "Location unavailable";
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const lastPart = parts[parts.length - 1] || "";
    const lastPartDigits = lastPart.replace(/\D/g, "");
    if (lastPartDigits.length >= 5) {
      return parts[parts.length - 2] || parts[0];
    }

    return lastPart;
  }, [data.address, data.sublocality]);

  const contactHref = phoneDigits ? `tel:${phoneDigits}` : "#full-menu";
  const aboutDescription =
    String(data.aboutBody || data.heroSubtitle || "").trim() ||
    "It all started with a passion for exceptional taste and quality service. Our team crafts every dish with care, using fresh ingredients and proven recipes to deliver a memorable dining experience every single day.";

  const quickViewGallery = useMemo(() => {
    if (!quickViewProduct) {
      return [];
    }

    return Array.from(
      new Set([
        String(quickViewProduct.imageUrl || "").trim(),
        ...(Array.isArray(quickViewProduct.gallery)
          ? quickViewProduct.gallery.map((item) => String(item || "").trim())
          : []),
      ].filter(Boolean))
    );
  }, [quickViewProduct]);

  const quickViewPrice = quickViewProduct ? toPriceNumber(quickViewProduct.price) : 0;
  const quickViewOldPrice = quickViewProduct ? Number(quickViewProduct.oldPriceValue || 0) : 0;
  const quickViewHasDiscount = quickViewOldPrice > quickViewPrice;
  const quickViewDiscount = quickViewHasDiscount
    ? Math.round(((quickViewOldPrice - quickViewPrice) / quickViewOldPrice) * 100)
    : 0;
  const quickViewRating = Number(quickViewProduct?.rating || storeReviewStats.rating || data.rating || 0);
  const quickViewDescription =
    String(quickViewProduct?.description || quickViewProduct?.shortDescription || "").trim() ||
    "Freshly prepared menu item with quality ingredients and quick delivery support.";
  const quickViewCategory =
    String(
      quickViewProduct?.categoryLabel ||
        quickViewProduct?.category ||
        quickViewProduct?.subcategoryName ||
        "Food & Beverages"
    ).trim() || "Food & Beverages";
  const quickViewCartQuantity = quickViewProduct ? Math.max(0, Number(cartQuantities[quickViewProduct.id] || 0)) : 0;

  const openQuickView = (product: StoreProduct) => {
    const primaryImage =
      String(product.imageUrl || "").trim() ||
      String(product.gallery?.[0] || "").trim() ||
      String(data.logoImage || data.bannerImage || "").trim();

    setQuickViewProduct(product);
    setQuickViewImage(primaryImage);
    setQuickViewSaved(false);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setQuickViewImage("");
  };

  const handleAddToCartWithFeedback = useCallback(
    (product: StoreProduct) => {
      onAddToCart(product);
    },
    [onAddToCart]
  );

  const updateCartQuantity = useCallback((productId: string, nextQuantity: number) => {
    setCartItemQuantity(productId, nextQuantity);
  }, []);

  useEffect(() => {
    if (!quickViewProduct || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeQuickView();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [quickViewProduct]);

  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!currentUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: data.storeName,
          text: data.storeName,
          url: currentUrl,
        });
        setShareMessage(null);
        return;
      } catch {
        // Fall back to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareMessage("Store link copied.");
    } catch {
      setShareMessage("Unable to share right now.");
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="relative z-0 h-[180px] w-full overflow-hidden md:h-[250px]">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={data.storeName}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(125deg,#ffcf33_0%,#ffb703_52%,#fb8500_100%)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-black/8" />

        <button
          type="button"
          onClick={() => {
            if (typeof window === "undefined") return;
            if (window.history.length > 1) {
              window.history.back();
              return;
            }
            window.location.href = "/";
          }}
          className="absolute left-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleShare();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
            aria-label="Share store"
          >
            <Share2 size={17} />
          </button>

          <button
            type="button"
            onClick={() => setIsWishlisted((previous) => !previous)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
            aria-label="Toggle wishlist"
          >
            <Heart size={17} className={isWishlisted ? "fill-rose-500 text-rose-500" : ""} />
          </button>
        </div>
      </section>

      {/* Details Card Section */}
      <div className="w-full bg-white border-b border-slate-100 relative z-20">
        <div className="mx-auto w-full max-w-full lg:max-w-[95%] xl:max-w-[1400px] px-3 sm:px-4 lg:px-8 py-5">
          <div className="flex min-w-0 items-start gap-3.5 md:items-start md:justify-between md:gap-6">
            <div className="flex min-w-0 items-start gap-3.5 md:gap-6">
              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px] bg-white md:-mt-[45px] md:h-[110px] md:w-[110px] md:rounded-[24px] border-2 border-white shadow-md">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" loading="lazy" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold leading-tight text-[#1f2937] sm:text-[26px] sm:font-bold tracking-tight">
                  {data.storeName}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-500 md:mt-2 md:gap-2 md:text-[15px]">
                  <MapPin size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{data.address || "Address unavailable"}</span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-3 md:gap-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${openBadge.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${openBadge.dotClass}`} />
                    {openBadge.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 md:text-[15px]">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-800">{formatRating(storeReviewStats.rating)}</span>
                    <span className="text-slate-400">({formatReviewCount(storeReviewStats.reviews)})</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:block md:w-[120px]" />
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-0 w-full max-w-[1600px] space-y-5 px-4 sm:px-6 md:px-8 lg:px-10 pb-[calc(86px+env(safe-area-inset-bottom))] pt-5">
        <div className={`grid grid-cols-1 ${photoItems.length > 0 ? "lg:grid-cols-[7.2fr_2.8fr]" : "lg:grid-cols-1"} gap-6 items-start`}>
          {/* Left Column */}
          <div className="space-y-5 md:space-y-6">

        <section className="flex gap-1 pb-1 lg:pb-0 lg:grid lg:grid-cols-4 lg:gap-4 w-full">
          <InfoTile icon={<Clock3 size={20} className="text-[#fb6a3d]" />} title={data.deliveryTimeLabel || "20-45 min"} subtitle="Delivery" />
          <InfoTile icon={<IndianRupee size={20} className="text-[#fb6a3d]" />} title={priceForTwo.primary} subtitle={priceForTwo.secondary} />
          <InfoTile icon={<Truck size={20} className="text-[#10b981]" />} title={deliveryFee.primary} subtitle={deliveryFee.secondary} />
          <InfoTile icon={<UtensilsCrossed size={20} className="text-[#ffbe0b]" />} title={data.cuisineLabel || "Veg & Non-Veg"} subtitle="Cuisine" />
        </section>

        <section className="flex overflow-x-auto no-scrollbar gap-2 pb-1.5 md:grid md:grid-cols-6 md:gap-3.5 w-full">
          <a
            href="#full-menu"
            className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[12px] bg-[#fb6a3d] text-xs sm:text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,106,61,0.28)] transition hover:opacity-92 shrink-0 px-4 md:px-0"
          >
            <ShoppingCart size={15} />
            Browse Menu
          </a>

          {phoneDigits ? (
            <a
              href={`tel:${phoneDigits}`}
              className="inline-flex h-[46px] items-center justify-center gap-1 rounded-[12px] bg-[#ffbe0b] text-xs sm:text-sm font-semibold text-black shadow-[0_8px_16px_rgba(255,190,11,0.22)] transition hover:opacity-92 shrink-0 px-4 md:px-0"
            >
              <PhoneCall size={16} />
              Call
            </a>
          ) : (
            <span className="inline-flex h-[46px] items-center justify-center gap-1 rounded-[12px] bg-[#ffbe0b]/60 text-xs sm:text-sm font-semibold text-slate-700 shrink-0 px-4 md:px-0">
              <PhoneCall size={16} />
              Call
            </span>
          )}

          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[46px] items-center justify-center gap-1 rounded-[12px] bg-[#1b9c5a] text-xs sm:text-sm font-semibold text-white shadow-[0_8px_16px_rgba(27,156,90,0.24)] transition hover:opacity-92 shrink-0 px-4 md:px-0"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          ) : (
            <span className="inline-flex h-[46px] items-center justify-center gap-1 rounded-[12px] bg-[#1b9c5a]/60 text-xs sm:text-sm font-semibold text-white shrink-0 px-4 md:px-0">
              <MessageCircle size={16} />
              WhatsApp
            </span>
          )}

          {/* Book Table */}
          <button
            type="button"
            className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[12px] bg-[#8b5cf6] text-xs sm:text-sm font-semibold text-white shadow-[0_8px_16px_rgba(139,92,246,0.22)] transition hover:bg-[#7c3aed] cursor-pointer shrink-0 px-4 md:px-0"
          >
            <UtensilsCrossed size={16} />
            Book Table
          </button>

          {/* Directions */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address || "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[12px] bg-[#3b82f6] text-xs sm:text-sm font-semibold text-white shadow-[0_8px_16px_rgba(59,130,246,0.22)] transition hover:bg-[#2563eb] shrink-0 px-4 md:px-0"
          >
            <MapPin size={16} />
            Directions
          </a>

          {/* Reviews */}
          <a
            href="#reviews"
            className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[12px] bg-[#64748b] text-xs sm:text-sm font-semibold text-white shadow-[0_8px_16px_rgba(100,116,139,0.22)] transition hover:bg-[#475569] shrink-0 px-4 md:px-0"
          >
            <Star size={16} className="fill-white" />
            Reviews
          </a>
        </section>

        {shareMessage ? <p className="text-xs font-medium text-slate-500">{shareMessage}</p> : null}

        <section className="rounded-[18px] bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-lg font-bold text-[#1f2937]">
              <LayoutGrid size={18} className="text-[#ffbe0b]" />
              Browse Categories
            </h3>
            <p className="hidden text-xs text-slate-500 sm:block">Swipe to explore</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
            {categoryBubbles.map((category) => {
              const isActive = activeCategory === category.label;

              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setActiveCategory(category.label)}
                  className="group shrink-0"
                >
                  <div
                    className={`grid h-[90px] w-[90px] place-items-center overflow-hidden rounded-full bg-[#f8fafc] transition ${
                      isActive ? "bg-[#fff2ed]" : ""
                    }`}
                  >
                    <img src={category.imageUrl} alt={category.label} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <p className="mt-2 max-w-[90px] truncate text-center text-xs font-medium text-slate-700">{category.label}</p>
                </button>
              );
            })}
          </div>
        </section>


        <section id="full-menu" className="rounded-[18px] bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#1f2937]">Full Menu</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{menuItems.length} items</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Sort by:
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-9 rounded-xl border border-[#dce2ea] bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating-high">Top Rated</option>
              </select>
            </label>
          </div>

          {menuItems.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-slate-600">
              No menu items match your filters yet.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {menuItems.map((product) => {
                const priceValue = toPriceNumber(product.price);
                const oldPriceValue = Number(product.oldPriceValue || 0);
                const hasDiscount = oldPriceValue > priceValue;
                const discountPercent = hasDiscount ? Math.round(((oldPriceValue - priceValue) / oldPriceValue) * 100) : 0;
                const productCartQuantity = Math.max(0, Number(cartQuantities[product.id] || 0));

                return (
                  <article
                    key={product.id}
                    className="flex h-full min-h-[350px] flex-col overflow-hidden rounded-[16px] bg-white border border-slate-100/60 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => openQuickView(product)}
                      className="relative block h-48 w-full bg-[#f7f8fa] text-left"
                      aria-label={`Open ${product.name} details`}
                    >
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                      {product.badge ? (
                        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                          {product.badge}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex flex-1 flex-col p-4">
                      <button
                        type="button"
                        onClick={() => openQuickView(product)}
                        className="line-clamp-2 text-left text-base font-semibold leading-tight text-[#1f2937]"
                      >
                        {product.name}
                      </button>

                      <div className="mt-3.5 flex items-end gap-2">
                        <p className="text-base font-bold leading-none text-[#fb6a3d] md:text-lg">₹{Math.round(priceValue).toLocaleString("en-IN")}</p>
                        {hasDiscount ? (
                          <>
                            <p className="text-xs text-slate-400 line-through">₹{Math.round(oldPriceValue).toLocaleString("en-IN")}</p>
                            <p className="text-xs font-semibold text-emerald-600">{discountPercent}% off</p>
                          </>
                        ) : null}
                      </div>

                      {Number(product.rating || 0) > 0 ? (
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {formatRating(Number(product.rating || 0))}
                        </div>
                      ) : null}

                      <p className="mt-3 mb-3.5 text-xs text-slate-500">{product.shippingLabel || data.deliveryFeeLabel || "Free delivery"}</p>

                      {productCartQuantity > 0 ? (
                        <div className="mt-auto mt-3 inline-flex h-10 w-full items-stretch overflow-hidden rounded-xl border border-[#15803d] bg-[#15803d] text-white shadow-[0_8px_18px_rgba(21,128,61,0.22)]">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, productCartQuantity - 1)}
                            className="grid w-10 shrink-0 place-items-center text-xl font-bold leading-none transition hover:bg-[#166534]"
                            aria-label={`Decrease quantity for ${product.name}`}
                          >
                            -
                          </button>
                          <div className="grid min-w-0 flex-1 place-items-center bg-[#15803d] text-sm font-extrabold text-white">
                            {productCartQuantity}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, productCartQuantity + 1)}
                            className="grid w-10 shrink-0 place-items-center text-xl font-bold leading-none transition hover:bg-[#166534]"
                            aria-label={`Increase quantity for ${product.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCartWithFeedback(product)}
                          className="mt-auto mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#f0fdf4] text-xs font-semibold text-[#15803d] transition hover:bg-[#15803d] hover:text-white cursor-pointer"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
          </div>

          {/* Right Column: Floating Gallery Card */}
          {photoItems.length > 0 ? (
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[20px] border border-slate-100 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#1f2937] font-heading">Photo Gallery</h3>
                  <button
                    type="button"
                    onClick={openAllPhotosModal}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photoItems.slice(0, 12).map((imageUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openSinglePhotoModal(imageUrl)}
                      className="group relative aspect-square overflow-hidden rounded-[12px] bg-slate-50 border border-slate-100 cursor-pointer text-left"
                    >
                      <img
                        src={imageUrl}
                        alt="Gallery food item"
                        className="h-full w-full object-cover transition-transform duration-350 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-350" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Restaurant Information Section (Full Width) */}
        <section className="rounded-[20px] bg-slate-50 border border-slate-100/70 p-4 md:p-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-150 text-sky-600">
              <Info size={15} />
            </span>
            <h3 className="text-lg font-bold text-[#1f2937] font-heading">Restaurant Information</h3>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[1.85fr_1fr]">
            <article className="flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About Us</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-[15px]">{aboutDescription}</p>
              </div>
              <div>
                <a
                  href={contactHref}
                  className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#fb6a3d] px-4 text-xs font-semibold text-white hover:opacity-92 transition cursor-pointer"
                >
                  <PhoneCall size={14} />
                  Contact Restaurant
                </a>
              </div>
            </article>

            <aside className="rounded-[14px] bg-white border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Info</h4>
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    Customer Rating
                  </p>
                  <p className="text-[15px] font-bold text-[#1f2937]">{formatRating(storeReviewStats.rating)} / 5</p>
                </div>

                <div className="space-y-0.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <MessageCircle size={13} className="text-sky-500" />
                    Total Reviews
                  </p>
                  <p className="text-[15px] font-bold text-[#1f2937]">{quickInfoReviews}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Clock3 size={13} className="text-emerald-500" />
                    Delivery Time
                  </p>
                  <p className="text-[15px] font-bold text-[#1f2937]">{data.deliveryTimeLabel || "20-45 min"}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <MapPin size={13} className="text-rose-500" />
                    Location
                  </p>
                  <p className="text-[15px] font-bold leading-tight text-[#1f2937]">{quickInfoLocation}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {quickViewProduct ? (
        <section className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-3 sm:p-5" aria-label="Menu item quick view">
          <button
            type="button"
            onClick={closeQuickView}
            className="absolute inset-0"
            aria-label="Close menu item quick view"
          />

          <div 
            className="relative w-full md:w-[80vw] md:max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all md:flex md:h-[580px] max-h-[90vh] cursor-default"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeQuickView}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Image Column (Edge to Edge) */}
            <div className="relative h-48 md:h-full md:w-1/2 bg-slate-50 shrink-0">
              <img
                src={quickViewImage || quickViewGallery[0] || quickViewProduct.imageUrl || data.logoImage || data.bannerImage}
                alt={quickViewProduct.name}
                className="h-full w-full object-contain bg-slate-50"
                loading="lazy"
              />
              {quickViewProduct.badge && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-[#10b981] px-3 py-1.5 text-xs font-bold text-white shadow-md uppercase tracking-wider">
                  {quickViewProduct.badge}
                </span>
              )}

              {/* Gallery Thumbnails Overlay */}
              {quickViewGallery.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4">
                  {quickViewGallery.slice(0, 5).map((image, index) => {
                    const isActive = quickViewImage === image;
                    return (
                      <button
                        key={`quick-view-thumb-${index}`}
                        type="button"
                        onClick={() => setQuickViewImage(image)}
                        className={`h-11 w-11 overflow-hidden rounded-lg transition border border-white/40 shadow-sm ${
                          isActive ? "opacity-100 ring-2 ring-blue-500" : "opacity-80"
                        }`}
                        aria-label={`Show image ${index + 1}`}
                      >
                        <img src={image} alt={`${quickViewProduct.name} ${index + 1}`} className="h-full w-full object-contain bg-slate-50" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="flex flex-col flex-1 p-6 md:p-8 min-w-0 h-full overflow-hidden">
              {/* Header */}
              <div className="mb-4 shrink-0">
                <div className="mb-2">
                  <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                    {quickViewCategory || "Food"}
                  </span>
                </div>

                <h2 className="text-xl font-bold leading-7 text-slate-950 font-heading mb-2">
                  {quickViewProduct.name}
                </h2>

                <p className="text-sm font-semibold text-slate-500">
                  {quickViewProduct.sellerName || data.storeName}
                </p>
              </div>

              {/* Scrollable Middle Content Area */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-extrabold text-amber-600">{formatRating(quickViewRating)}</span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={14}
                        className={index < Math.round(quickViewRating) ? "fill-amber-500 text-amber-500" : "text-slate-300"}
                      />
                    ))}
                  </div>
                  <span className="text-slate-400">(0 ratings)</span>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    {quickViewDescription || "No description available."}
                  </p>
                </div>

                {/* Highlights */}
                {Array.isArray(quickViewProduct?.highlights) && quickViewProduct.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">What's Special</h4>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {quickViewProduct.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span className="font-semibold text-slate-600">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description Points (Heading & Content) */}
                {Array.isArray(quickViewProduct?.descriptionPoints) && quickViewProduct.descriptionPoints.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    {quickViewProduct.descriptionPoints.map((point, index) => {
                      const heading = String(point?.heading || "").trim();
                      const content = String(point?.content || "").trim();
                      if (!heading && !content) return null;
                      return (
                        <div key={index} className="space-y-1">
                          {heading ? (
                            <h5 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{heading}</h5>
                          ) : null}
                          {content ? (
                            <p className="text-sm leading-relaxed text-slate-500 whitespace-pre-line">{content}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-400">Price</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-extrabold text-[#fb6a3d]">
                      ₹{Math.round(quickViewPrice).toLocaleString("en-IN")}
                    </span>
                    {quickViewHasDiscount && (
                      <>
                        <span className="text-sm text-slate-400 line-through">
                          ₹{Math.round(quickViewOldPrice).toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          {quickViewDiscount}% OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-44 shrink-0 flex flex-col gap-2">
                  {quickViewCartQuantity > 0 ? (
                    <div className="inline-flex h-10 w-full items-stretch overflow-hidden rounded-lg border border-[#15803d] bg-[#15803d] text-white">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(quickViewProduct.id, quickViewCartQuantity - 1)}
                        className="grid w-11 shrink-0 place-items-center text-lg font-bold leading-none transition hover:bg-[#166534]"
                      >
                        -
                      </button>
                      <div className="grid min-w-0 flex-1 place-items-center bg-[#15803d] text-sm font-bold text-white">
                        {quickViewCartQuantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(quickViewProduct.id, quickViewCartQuantity + 1)}
                        className="grid w-11 shrink-0 place-items-center text-lg font-bold leading-none transition hover:bg-[#166534]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCartWithFeedback(quickViewProduct)}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#15803d] text-sm font-bold text-white hover:bg-[#166534] transition cursor-pointer"
                    >
                      <ShoppingCart size={14} />
                      Add to Cart
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setQuickViewSaved((prev) => !prev)}
                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Heart size={13} className={quickViewSaved ? "fill-rose-500 text-rose-500" : ""} />
                    {quickViewSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isPhotosModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-white"
          onClick={(event) => event.stopPropagation()}
        >
          <section className="w-full h-full flex flex-col justify-between bg-white p-4 sm:p-6 md:p-8">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                {selectedPhotoUrl ? "Photo Preview" : "All Photos"}
              </h3>
              <button
                type="button"
                onClick={closePhotosModal}
                className="rounded-[10px] bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>

            {selectedPhotoUrl ? (
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-[16px] bg-[#f8fafc] border border-slate-100">
                  <img
                    src={selectedPhotoUrl}
                    alt={`${data.storeName} photo preview`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={showPreviousPhoto}
                    disabled={selectedPhotoIndex <= 0}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#1b9c5a] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55 hover:opacity-92 transition cursor-pointer"
                  >
                    Previous
                  </button>

                  <p className="text-sm font-bold text-slate-500">
                    {selectedPhotoIndex >= 0 ? `${selectedPhotoIndex + 1} / ${photoItems.length}` : `0 / ${photoItems.length}`}
                  </p>

                  <button
                    type="button"
                    onClick={showNextPhoto}
                    disabled={selectedPhotoIndex < 0 || selectedPhotoIndex >= photoItems.length - 1}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#1b9c5a] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55 hover:opacity-92 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {photoItems.map((photo, index) => (
                    <button
                      key={`${photo}-all-${index}`}
                      type="button"
                      onClick={() => openSinglePhotoModal(photo)}
                      className="overflow-hidden rounded-[14px] bg-[#f3f4f6] aspect-square relative hover:scale-[1.02] transition duration-300 border border-slate-100 cursor-pointer"
                      aria-label={`View photo ${index + 1}`}
                    >
                      <img
                        src={photo}
                        alt={`${data.storeName} gallery ${index + 1}`}
                        className="h-full w-full object-cover"
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

      <Footer />
    </main>
  );
}

function InfoTile({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-[10px] sm:rounded-[14px] bg-white border border-slate-100 px-1 py-2 sm:px-2 sm:py-3 text-center md:px-4 md:py-5 min-w-0 flex-1 shrink-0">
      <div className="mx-auto mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#fff2e9] shrink-0 sm:h-8 sm:w-8">{icon}</div>
      <p className="text-[10px] font-bold text-[#1f2a3d] sm:text-xs md:text-base truncate">{title}</p>
      <p className="mt-0.5 text-[9px] font-medium text-slate-500 sm:text-[10px] md:text-xs truncate">{subtitle}</p>
    </article>
  );
}
