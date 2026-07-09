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
import { buildProductSlug } from "@/data/productSlug";
import {
  CART_UPDATED_EVENT,
  addToCart,
  makeStoreProduct,
  readCart,
  setCartItemQuantity,
} from "@/lib/shopStorage";
import { subscribeVendorStoreStatus, type VendorStoreStatusSocketPayload } from "@/lib/storeStatusRealtime";

type FoodStorePageProps = {
  data: StorePageData;
};

type SortMode = "featured" | "price-low" | "price-high" | "rating-high";

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

export default function FoodStorePage({ data }: FoodStorePageProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeChip, setActiveChip] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<StoreProduct | null>(null);
  const [quickViewImage, setQuickViewImage] = useState("");
  const [quickViewSaved, setQuickViewSaved] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const storeReviewStats = { rating: data.rating, reviews: data.reviews };

  const buildProductHref = useCallback(
    (product: StoreProduct) =>
      `/product/${encodeURIComponent(
        buildProductSlug({
          id: product.id,
          name: product.name,
          storeId: data.id,
          sellerName: data.storeName,
        })
      )}`,
    [data.id, data.storeName]
  );

  const handleAddToCart = useCallback(
    (product: StoreProduct) => {
      const alreadyInCart = readCart().some((item) => item.product.id === product.id);

      if (alreadyInCart) {
        return;
      }

      const href = buildProductHref(product);
      const storeProduct = makeStoreProduct(
        {
          ...product,
          storeId: data.id,
          sellerName: product.sellerName || data.storeName,
          image: product.imageUrl,
          oldPrice: product.oldPriceValue,
          categoryLabel: product.categoryLabel || product.category,
        },
        href
      );

      addToCart(storeProduct, 1);
    },
    [buildProductHref, data.id, data.storeName]
  );

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
      handleAddToCart(product);
    },
    [handleAddToCart]
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
    <main className="min-h-screen bg-[#f3f5f7]">
      <section className="relative z-0 h-[225px] w-full overflow-hidden md:h-[330px]">
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

      <div className="relative z-20 mx-auto mt-0 w-full max-w-[1120px] space-y-5 px-3 pb-[calc(86px+env(safe-area-inset-bottom))] sm:px-4 md:space-y-6 md:pb-14 lg:px-0">
        <section className="w-full overflow-visible rounded-[20px] bg-[#eceff3] p-4 md:px-6 md:pb-6 md:pt-5">
          <div className="flex min-w-0 items-start gap-3.5 md:items-start md:justify-between md:gap-6">
            <div className="flex min-w-0 items-start gap-3.5 md:gap-6">
              <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[24px] bg-white md:-mt-[86px] md:h-[160px] md:w-[160px] md:rounded-[34px]">
              <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" loading="lazy" />
            </div>

              <div className="min-w-0">
                <h2 className="truncate text-[22px] font-semibold leading-[1.12] text-[#1f2937] md:text-[45px] md:leading-[1.02]">
                  {data.storeName}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-500 md:mt-2 md:gap-2.5 md:text-[17px]">
                  <MapPin size={16} className="shrink-0 text-[#95a3b7]" />
                  <span className="truncate">{data.address || "Address unavailable"}</span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2.5 md:mt-4 md:gap-5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold md:min-h-[44px] md:px-6 md:text-[15px] ${openBadge.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full md:h-2 md:w-2 ${openBadge.dotClass}`} />
                    {openBadge.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 md:gap-1.5 md:text-[18px]">
                    <Star size={16} className="fill-amber-400 text-amber-400 md:h-[20px] md:w-[20px]" />
                    {formatRating(storeReviewStats.rating)}
                    <span className="font-medium text-slate-500">({formatReviewCount(storeReviewStats.reviews)})</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:block md:w-[120px]" />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <InfoTile icon={<Clock3 size={20} className="text-[#fb6a3d]" />} title={data.deliveryTimeLabel || "20-45 min"} subtitle="Delivery" />
          <InfoTile icon={<IndianRupee size={20} className="text-[#fb6a3d]" />} title={priceForTwo.primary} subtitle={priceForTwo.secondary} />
          <InfoTile icon={<Truck size={20} className="text-[#10b981]" />} title={deliveryFee.primary} subtitle={deliveryFee.secondary} />
        </section>

        <section className="grid grid-cols-3 gap-2.5 md:gap-3.5">
          <a
            href="#full-menu"
            className="inline-flex h-[50px] items-center justify-center gap-1.5 rounded-[12px] bg-[#fb6a3d] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,106,61,0.28)]"
          >
            <ShoppingCart size={15} />
            Browse Menu
          </a>

          {phoneDigits ? (
            <a
              href={`tel:${phoneDigits}`}
              className="inline-flex h-[50px] items-center justify-center gap-1 rounded-[12px] bg-[#ffbe0b] text-sm font-semibold text-black shadow-[0_8px_16px_rgba(255,190,11,0.22)]"
            >
              <PhoneCall size={16} />
              Call
            </a>
          ) : (
            <span className="inline-flex h-[50px] items-center justify-center gap-1 rounded-[12px] bg-[#ffbe0b]/60 text-sm font-semibold text-slate-700">
              <PhoneCall size={16} />
              Call
            </span>
          )}

          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[50px] items-center justify-center gap-1 rounded-[12px] bg-[#1b9c5a] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(27,156,90,0.24)]"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          ) : (
            <span className="inline-flex h-[50px] items-center justify-center gap-1 rounded-[12px] bg-[#1b9c5a]/60 text-sm font-semibold text-white">
              <MessageCircle size={16} />
              WhatsApp
            </span>
          )}
        </section>

        {shareMessage ? <p className="text-xs font-medium text-slate-500">{shareMessage}</p> : null}

        <section className="rounded-[18px] bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-xl font-semibold text-[#1f2937] md:text-2xl">
              <LayoutGrid size={20} className="text-[#ffbe0b]" />
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

        <section className="rounded-[18px] bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UtensilsCrossed size={16} className="text-[#fb6a3d]" />
            Quick Filters
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickFilterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveChip(chip)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeChip === chip
                    ? "bg-[#fff2ed] text-[#d14f25]"
                    : "bg-white text-slate-600"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section id="full-menu" className="rounded-[18px] bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#1f2937] md:text-2xl">Full Menu</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{menuItems.length} items</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Sort by:
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-9 rounded-xl border border-[#dce2ea] bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="featured">Featured</option>
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
                    className="flex h-full min-h-[300px] flex-col overflow-hidden rounded-[16px] bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => openQuickView(product)}
                      className="relative block h-40 w-full bg-[#f7f8fa] text-left"
                      aria-label={`Open ${product.name} details`}
                    >
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                      {product.badge ? (
                        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                          {product.badge}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex flex-1 flex-col p-3">
                      <button
                        type="button"
                        onClick={() => openQuickView(product)}
                        className="line-clamp-2 text-left text-base font-semibold leading-tight text-[#1f2937]"
                      >
                        {product.name}
                      </button>

                      <div className="mt-2 flex items-end gap-2">
                        <p className="text-xl font-bold leading-none text-[#fb6a3d] md:text-2xl">₹{Math.round(priceValue).toLocaleString("en-IN")}</p>
                        {hasDiscount ? (
                          <>
                            <p className="text-xs text-slate-400 line-through">₹{Math.round(oldPriceValue).toLocaleString("en-IN")}</p>
                            <p className="text-xs font-semibold text-emerald-600">{discountPercent}% off</p>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {product.categoryLabel || product.category || "Food"}
                        </span>
                        {Number(product.rating || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {formatRating(Number(product.rating || 0))}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-xs text-slate-500">{product.shippingLabel || data.deliveryFeeLabel || "Free delivery"}</p>

                      {productCartQuantity > 0 ? (
                        <div className="mt-auto inline-flex h-10 w-full items-stretch overflow-hidden rounded-xl border border-[#15803d] bg-[#15803d] text-white shadow-[0_8px_18px_rgba(21,128,61,0.22)]">
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
                          className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-[#15803d] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(21,128,61,0.28)] hover:bg-[#166534]"
                        >
                          <ShoppingCart size={14} />
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[20px] bg-[#f4f6f8] p-4 md:p-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Info size={18} />
            </span>
            <h3 className="text-[32px] font-bold leading-tight text-[#1f2937] md:text-[38px]">Restaurant Information</h3>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[1.85fr_1fr]">
            <article>
              <h4 className="text-2xl font-semibold text-[#1f2937]">About Us</h4>
              <p className="mt-3 text-[16px] leading-8 text-slate-600 md:text-[17px]">{aboutDescription}</p>
              <a
                href={contactHref}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#fb6a3d] px-6 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(251,106,61,0.3)]"
              >
                <PhoneCall size={16} />
                Contact Restaurant
              </a>
            </article>

            <aside className="rounded-2xl bg-[#edf1f5] p-5">
              <h4 className="text-xl font-semibold text-[#1f2937]">Quick Info</h4>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    Customer Rating
                  </p>
                  <p className="text-[18px] font-bold text-[#1f2937] md:text-[20px]">{formatRating(storeReviewStats.rating)} / 5</p>
                </div>

                <div className="space-y-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <MessageCircle size={14} className="text-sky-500" />
                    Total Reviews
                  </p>
                  <p className="text-[18px] font-bold text-[#1f2937] md:text-[20px]">{quickInfoReviews}</p>
                </div>

                <div className="space-y-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Clock3 size={14} className="text-emerald-500" />
                    Delivery Time
                  </p>
                  <p className="text-[18px] font-bold text-[#1f2937] md:text-[20px]">{data.deliveryTimeLabel || "20-45 min"}</p>
                </div>

                <div className="space-y-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <MapPin size={14} className="text-rose-500" />
                    Location
                  </p>
                  <p className="text-[18px] font-bold leading-tight text-[#1f2937] md:text-[20px]">{quickInfoLocation}</p>
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

          <article className="relative z-10 w-full md:max-w-[980px] max-h-[90vh] overflow-hidden rounded-[22px] bg-[#f8fafc] shadow-2xl flex flex-col md:h-[620px]">
            <button
              type="button"
              onClick={closeQuickView}
              className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow cursor-pointer"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="grid md:grid-cols-[1.05fr_1fr] flex-1 min-h-0 overflow-hidden bg-white">
              <div className="bg-[#f6f7f9] overflow-hidden flex flex-col justify-start shrink-0">
                <div className="p-4 sm:p-5">
                  <div className="overflow-hidden rounded-2xl bg-white">
                    <img
                      src={quickViewImage || quickViewGallery[0] || quickViewProduct.imageUrl || data.logoImage || data.bannerImage}
                      alt={quickViewProduct.name}
                      className="h-[250px] w-full object-cover sm:h-[300px] md:h-[340px]"
                    />
                  </div>

                  {quickViewGallery.length > 1 ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {quickViewGallery.slice(0, 5).map((image, index) => {
                        const isActive = quickViewImage === image;

                        return (
                          <button
                            key={`quick-view-thumb-${index}`}
                            type="button"
                            onClick={() => setQuickViewImage(image)}
                            className={`h-14 w-14 overflow-hidden rounded-xl transition ${
                              isActive ? "opacity-100 ring-2 ring-amber-500/20" : "opacity-80"
                            }`}
                            aria-label={`Show image ${index + 1}`}
                          >
                            <img src={image} alt={`${quickViewProduct.name} ${index + 1}`} className="h-full w-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col flex-1 p-4 sm:p-5 md:p-6 min-w-0 min-h-0 overflow-hidden bg-white">
                {/* Header */}
                <div className="mb-3 shrink-0">
                  <h3 className="pr-10 text-[24px] font-semibold leading-[1.15] text-[#1f2937] md:text-[30px] font-heading">{quickViewProduct.name}</h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    <Star size={14} className="fill-emerald-500 text-emerald-500" />
                    {formatRating(quickViewRating)}
                  </div>
                </div>

                {/* Scrollable Middle Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar pb-4">
                  <div>
                    <p className="text-[18px] font-semibold leading-tight text-[#1f2937] md:text-[22px]">Description</p>
                    <p className="mt-2 text-[16px] leading-snug text-slate-600 md:text-[18px]">{quickViewDescription}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 text-sm text-slate-600">
                    <p>
                      Category: <span className="font-semibold text-[#fb6a3d]">{quickViewCategory}</span>
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-medium text-slate-500">Share:</span>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 cursor-pointer">
                        <Instagram size={15} />
                      </button>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 cursor-pointer">
                        <MessageCircle size={15} />
                      </button>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 cursor-pointer">
                        <Twitter size={15} />
                      </button>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 cursor-pointer">
                        <Facebook size={15} />
                      </button>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 cursor-pointer">
                        <Mail size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fixed Sticky Footer */}
                <div className="mt-auto pt-4 border-t border-slate-100 shrink-0 bg-white">
                  <div className="flex flex-wrap items-end gap-2 mb-3">
                    {quickViewHasDiscount ? (
                      <p className="text-[18px] font-semibold leading-none text-slate-400 line-through md:text-[22px]">
                        ₹{Math.round(quickViewOldPrice).toLocaleString("en-IN")}
                      </p>
                    ) : null}
                    <p className="text-[34px] font-bold leading-none text-[#fb6a3d] md:text-[40px]">₹{Math.round(quickViewPrice).toLocaleString("en-IN")}</p>
                    {quickViewHasDiscount ? (
                      <span className="mb-1 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                        {quickViewDiscount}% OFF
                      </span>
                    ) : null}
                  </div>

                  {quickViewCartQuantity > 0 ? (
                    <div className="inline-flex h-12 w-full items-stretch overflow-hidden rounded-[14px] border border-[#15803d] bg-[#15803d] text-white shadow-[0_10px_22px_rgba(21,128,61,0.3)]">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(quickViewProduct.id, quickViewCartQuantity - 1)}
                        className="grid w-12 shrink-0 place-items-center text-2xl font-bold leading-none transition hover:bg-[#166534] cursor-pointer"
                        aria-label={`Decrease quantity for ${quickViewProduct.name}`}
                      >
                        -
                      </button>
                      <div className="grid min-w-0 flex-1 place-items-center bg-[#15803d] text-base font-extrabold text-white">
                        {quickViewCartQuantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(quickViewProduct.id, quickViewCartQuantity + 1)}
                        className="grid w-12 shrink-0 place-items-center text-2xl font-bold leading-none transition hover:bg-[#166534] cursor-pointer"
                        aria-label={`Increase quantity for ${quickViewProduct.name}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCartWithFeedback(quickViewProduct)}
                      className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-[14px] bg-[#15803d] text-base font-semibold text-white shadow-[0_10px_22px_rgba(21,128,61,0.35)] hover:bg-[#166534] cursor-pointer"
                    >
                      <ShoppingCart size={16} />
                      {`Add to Cart • ₹${Math.round(quickViewPrice).toLocaleString("en-IN")}`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setQuickViewSaved((previous) => !previous)}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-slate-300 bg-white text-base font-semibold text-slate-600 cursor-pointer"
                  >
                    <Heart size={16} className={quickViewSaved ? "fill-rose-500 text-rose-500" : ""} />
                    {quickViewSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>
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
    <article className="rounded-[14px] bg-[#eef2f6] px-3 py-4 text-center md:px-4 md:py-5">
      <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2e9]">{icon}</div>
      <p className="text-xl font-semibold text-[#1f2a3d] md:text-2xl">{title}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">{subtitle}</p>
    </article>
  );
}
