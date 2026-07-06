"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Star, Heart, ShoppingCart, UserRound, X, ChevronRight } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import type { ProductDetailModel, RelatedProductModel } from "@/lib/storeCatalog";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import {
  fetchBusinessReviews,
  type BusinessReview,
  type BusinessReviewSummary,
} from "@/lib/reviewStore";
import {
  addToCart,
  CART_UPDATED_EVENT,
  isWishlisted,
  makeStoreProduct,
  readCart,
  setCartItemQuantity,
  setBuyNowSelection,
  toggleWishlist,
} from "@/lib/shopStorage";
import ReviewModal from "@/components/ReviewModal";

type ProductVariant = {
  size?: string;
  color?: string;
  sellingPrice?: number;
  mrp?: number;
  stock?: number;
  image?: string;
  customFields?: Record<string, string>;
};

type DescriptionPoint = {
  heading?: string;
  content?: string;
};

type ExtendedProductDetail = ProductDetailModel & {
  variantData?: ProductVariant[];
  descriptionPoints?: DescriptionPoint[];
  sourceProductId?: string;
  sourceId?: string;
  vendorId?: string;
  vendorName?: string;
  brand?: string;
  shippingTimeline?: string;
};

type ProductDetailPageClientProps = {
  product: ExtendedProductDetail;
  relatedProducts?: RelatedProductModel[];
};

const normalizePairs = (items: Array<[string, string]> | undefined) =>
  (Array.isArray(items) ? items : [])
    .map((item) => [String(item?.[0] || "").trim(), String(item?.[1] || "").trim()] as [string, string])
    .filter(([label, value]) => label && value);

const getVariantImages = (v: any): string[] => {
  if (!v || !v.image) return [];
  const imgStr = String(v.image).trim();
  if (imgStr.startsWith("[") && imgStr.endsWith("]")) {
    try {
      const parsed = JSON.parse(imgStr);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => String(item || "").trim()).filter(Boolean);
        return Array.from(new Set(cleaned));
      }
    } catch {
      // Fallback
    }
  }
  return [imgStr];
};

export default function ProductDetailPageClient({
  product,
  relatedProducts = [],
}: ProductDetailPageClientProps) {
  const router = useRouter();

  const [activeImage, setActiveImage] = useState(product.image || "");
  const [cartQuantity, setCartQuantity] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState<any>(null);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);

  // Variant States
  const hasVariants = useMemo(() => {
    return Array.isArray(product.variantData) && product.variantData.length > 0;
  }, [product.variantData]);

  const variantColors = useMemo(() => {
    if (!hasVariants || !product.variantData) return [];
    const colors = Array.from(new Set(product.variantData.map((v) => String(v.color || "").trim()).filter(Boolean)));
    if (colors.length > 0) {
      colors.unshift("Base Variant");
    }
    return colors;
  }, [product.variantData, hasVariants]);

  const variantSizes = useMemo(() => {
    if (!hasVariants || !product.variantData) return [];
    return Array.from(new Set(product.variantData.map((v) => String(v.size || "").trim()).filter(Boolean)));
  }, [product.variantData, hasVariants]);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});

  const customFieldsKeys = useMemo(() => {
    if (!hasVariants || !product.variantData) return [];
    const keys = new Set<string>();
    product.variantData.forEach((v) => {
      if (v.customFields && typeof v.customFields === "object") {
        Object.keys(v.customFields).forEach((k) => {
          if (String(v.customFields?.[k] || "").trim()) {
            keys.add(k);
          }
        });
      }
    });
    return Array.from(keys);
  }, [product.variantData, hasVariants]);

  const customFieldsOptions = useMemo(() => {
    const optionsMap: Record<string, string[]> = {};
    customFieldsKeys.forEach((key) => {
      const vals = new Set<string>();
      product.variantData?.forEach((v) => {
        const val = String(v.customFields?.[key] || "").trim();
        if (val) {
          vals.add(val);
        }
      });
      optionsMap[key] = Array.from(vals);
    });
    return optionsMap;
  }, [product.variantData, customFieldsKeys]);

  useEffect(() => {
    if (customFieldsKeys.length > 0) {
      setSelectedCustomOptions((prev) => {
        const next = { ...prev };
        customFieldsKeys.forEach((key) => {
          if (!next[key]) {
            const options = customFieldsOptions[key] || [];
            if (options.length > 0) {
              next[key] = options[0];
            }
          }
        });
        return next;
      });
    }
  }, [customFieldsKeys, customFieldsOptions]);

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    if (colorName === "Base Variant") {
      setSelectedSize("");
      return;
    }
    const match = product.variantData?.find(
      (v) => String(v.color || "").trim() === colorName && String(v.size || "").trim() === selectedSize
    );
    if (!match && product.variantData) {
      const firstVariantForColor = product.variantData.find((v) => String(v.color || "").trim() === colorName);
      if (firstVariantForColor) {
        setSelectedSize(String(firstVariantForColor.size || "").trim());
      }
    }
  };

  const handleSizeSelect = (sizeName: string) => {
    const activeColor = selectedColor === "Base Variant"
      ? (variantColors.find((c) => c !== "Base Variant") || "")
      : selectedColor;
    
    if (selectedColor === "Base Variant") {
      setSelectedColor(activeColor);
    }

    const match = product.variantData?.find(
      (v) => String(v.size || "").trim() === sizeName && String(v.color || "").trim() === activeColor
    );
    setSelectedSize(sizeName);
    if (!match && product.variantData) {
      const firstVariantForSize = product.variantData.find((v) => String(v.size || "").trim() === sizeName);
      if (firstVariantForSize) {
        setSelectedColor(String(firstVariantForSize.color || "").trim());
      }
    }
  };

  const activeVariant = useMemo(() => {
    if (!hasVariants || !product.variantData) return null;
    if (selectedColor === "Base Variant") {
      return {
        size: "",
        color: "Base Variant",
        mrp: product.oldPrice || product.price,
        sellingPrice: product.price,
        stock: 99,
        image: product.image,
        customFields: {},
      } as any;
    }
    return (
      product.variantData.find((v) => {
        const matchColor = !variantColors.length || String(v.color || "").trim() === selectedColor;
        const matchSize = !variantSizes.length || String(v.size || "").trim() === selectedSize;
        const matchCustoms = Object.entries(selectedCustomOptions).every(([key, val]) => {
          return String(v.customFields?.[key] || "").trim() === val;
        });
        return matchColor && matchSize && matchCustoms;
      }) || product.variantData[0]
    );
  }, [product.variantData, hasVariants, selectedColor, selectedSize, selectedCustomOptions, variantColors, variantSizes, product.oldPrice, product.price, product.image]);

  const gallery = useMemo(() => {
    if (activeVariant && activeVariant.color !== "Base Variant") {
      const vImages = getVariantImages(activeVariant);
      if (vImages.length > 0) {
        return vImages;
      }
    }
    const baseImages = Array.from(
      new Set([product.image, ...(product.gallery || [])].filter(Boolean).map((img) => String(img || "").trim()))
    );
    return baseImages.length > 0 ? baseImages : [""];
  }, [product.gallery, product.image, activeVariant]);

  const productHref = `/product/${encodeURIComponent(buildProductSlug(product))}`;

  const storeProduct = useMemo(() => {
    if (activeVariant) {
      const customLabels = Object.values(selectedCustomOptions).filter(Boolean);
      const variantLabel = [selectedSize, selectedColor, ...customLabels].filter(Boolean).join(", ");
      const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;
      const vPrice = Number(activeVariant.sellingPrice) || product.price;
      const vOldPrice = Number(activeVariant.mrp) || product.oldPrice;

      const formattedVPrice = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(vPrice);

      const formattedVOldPrice = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(vOldPrice);

      return {
        id: `${product.id}-${selectedSize || ""}-${selectedColor || ""}-${customLabels.join("-")}`,
        storeId: product.storeId || "",
        name: displayName,
        image: activeVariant.image || product.image || "",
        price: vPrice,
        oldPrice: vOldPrice,
        priceText: formattedVPrice,
        oldPriceText: formattedVOldPrice,
        categoryLabel: product.categoryLabel || "",
        href: productHref,
        sellerName: product.sellerName || "",
        vendorId: String(product.vendorId || product.sourceId || "vendor-1001").trim() || "vendor-1001",
        vendorName: String(product.sellerName || product.vendorName || "Winkget Marketplace").trim() || "Winkget Marketplace",
      };
    }
    const fallback = makeStoreProduct(product, productHref);
    return {
      ...fallback,
      vendorId: String(product.vendorId || product.sourceId || "vendor-1001").trim() || "vendor-1001",
      vendorName: String(product.sellerName || product.vendorName || "Winkget Marketplace").trim() || "Winkget Marketplace",
    };
  }, [product, productHref, activeVariant, selectedSize, selectedColor, selectedCustomOptions]);

  const wishlisted = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const handleChange = () => onStoreChange();
      window.addEventListener("shop:wishlist-updated", handleChange as EventListener);
      window.addEventListener("storage", handleChange);
      return () => {
        window.removeEventListener("shop:wishlist-updated", handleChange as EventListener);
        window.removeEventListener("storage", handleChange);
      };
    },
    () => isWishlisted(storeProduct.id),
    () => false
  );

  useEffect(() => {
    const syncCartQuantity = () => {
      const matchingItem = readCart().find((item) => item.product.id === storeProduct.id);
      setCartQuantity(Math.max(0, Number(matchingItem?.quantity || 0)));
    };

    syncCartQuantity();
    window.addEventListener(CART_UPDATED_EVENT, syncCartQuantity as EventListener);
    window.addEventListener("storage", syncCartQuantity);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartQuantity as EventListener);
      window.removeEventListener("storage", syncCartQuantity);
    };
  }, [storeProduct.id]);

  const currentPrice = useMemo(() => {
    if (activeVariant && Number(activeVariant.sellingPrice) > 0) {
      return Number(activeVariant.sellingPrice);
    }
    return product.price;
  }, [product.price, activeVariant]);

  const currentOldPrice = useMemo(() => {
    if (activeVariant && Number(activeVariant.mrp) > 0) {
      return Number(activeVariant.mrp);
    }
    return product.oldPrice;
  }, [product.oldPrice, activeVariant]);

  const currentDiscount = useMemo(() => {
    if (activeVariant && Number(activeVariant.mrp) > 0 && Number(activeVariant.sellingPrice) > 0) {
      return Math.round(((Number(activeVariant.mrp) - Number(activeVariant.sellingPrice)) / Number(activeVariant.mrp)) * 100);
    }
    return product.discount;
  }, [product.discount, activeVariant]);

  const currentInStock = useMemo(() => {
    if (activeVariant) {
      return Number(activeVariant.stock) > 0;
    }
    return product.price > 0; // standard fallback
  }, [product.price, activeVariant]);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(currentPrice);
  }, [currentPrice]);

  const formattedOldPrice = useMemo(() => {
    if (currentOldPrice && currentOldPrice > currentPrice) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(currentOldPrice);
    }
    return null;
  }, [currentOldPrice, currentPrice]);

  const discountText = useMemo(() => {
    const discount = Number(currentDiscount) || 0;
    return discount > 0 ? `${discount}% OFF` : null;
  }, [currentDiscount]);

  const onSaveForLater = () => {
    toggleWishlist(storeProduct);
  };

  const handleAddToCart = () => {
    addToCart(storeProduct, 1);
  };

  const updateCartQuantity = (nextQuantity: number) => {
    setCartItemQuantity(storeProduct.id, nextQuantity);
  };

  const onBuyNow = () => {
    setBuyNowSelection(storeProduct, 1);
    router.push("/checkout?mode=buy-now");
  };

  const normalizedKeyAttrs = useMemo(() => {
    return normalizePairs(product.keyAttributes);
  }, [product.keyAttributes]);

  const normalizedSpecs = useMemo(() => {
    return normalizePairs(product.specifications);
  }, [product.specifications]);

  const colorAttr = useMemo(() => {
    return normalizedKeyAttrs.find(([label]) => /color/i.test(label)) ||
           normalizedSpecs.find(([label]) => /color/i.test(label));
  }, [normalizedKeyAttrs, normalizedSpecs]);

  const activeColor = colorAttr ? colorAttr[1] : null;

  const colorSwatches = useMemo(() => {
    if (!activeColor) return [];
    
    const colorsMap: Record<string, string> = {
      midnight: "#0f172a",
      starlight: "#f2eae0",
      "space gray": "#5e6166",
      "space grey": "#5e6166",
      silver: "#e3e4e6",
      white: "#ffffff",
      black: "#000000",
      blue: "#2563eb",
      red: "#dc2626",
      green: "#16a34a",
      gold: "#f59e0b",
      golden: "#d4af37",
      pink: "#ec4899",
      yellow: "#eab308",
      purple: "#a855f7",
      orange: "#f97316"
    };

    const parsedColors = activeColor.split(",").map(c => c.trim()).filter(Boolean);
    return parsedColors.map(colorName => {
      const lower = colorName.toLowerCase();
      return {
        name: colorName,
        hex: colorsMap[lower] || "#94a3b8"
      };
    });
  }, [activeColor]);

  const [selectedStorage, setSelectedStorage] = useState("");

  const storageAttr = useMemo(() => {
    return normalizedKeyAttrs.find(([label]) => /storage|ram/i.test(label)) ||
           normalizedSpecs.find(([label]) => /storage|ram/i.test(label));
  }, [normalizedKeyAttrs, normalizedSpecs]);

  const activeStorage = storageAttr ? storageAttr[1] : null;

  const storageOptions = useMemo(() => {
    if (!activeStorage) return [];
    return activeStorage.split(",").map(s => s.trim()).filter(Boolean);
  }, [activeStorage]);

  const gridAttributes = useMemo(() => {
    const attrs: Array<[string, string]> = [];
    
    // Country of Origin
    attrs.push(["Country of Origin", product.originCountry || "India"]);

    // Top 6 specifications
    const specsToAdd = normalizedSpecs
      .filter(([label]) => !/color|storage|ram/i.test(label))
      .slice(0, 6);

    attrs.push(...specsToAdd);

    return attrs;
  }, [product.originCountry, normalizedSpecs]);

  const badges = useMemo(() => {
    return [
      {
        show: product.showDeliveryBadge !== false,
        label: "Winkget Delivered",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        )
      },
      {
        show: product.showTopBrand === true,
        label: "Top Brand",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        )
      },
      {
        show: product.showSecureTransaction !== false,
        label: "Secure payment",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        )
      },
      {
        show: product.show7DaySupport !== false,
        label: "7-day returns",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
          </svg>
        )
      },
      {
        show: product.showAssured === true,
        label: "Winkget Assured",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        )
      },
      {
        show: product.showFreeDelivery !== false,
        label: "Free delivery",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
          </svg>
        )
      },
      {
        show: product.showCashOnDelivery === true,
        label: "Cash on Delivery",
        icon: (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        )
      }
    ].filter(b => b.show);
  }, [
    product.showDeliveryBadge,
    product.showTopBrand,
    product.showSecureTransaction,
    product.show7DaySupport,
    product.showAssured,
    product.showFreeDelivery,
    product.showCashOnDelivery,
  ]);

  useEffect(() => {
    if (hasVariants) {
      if (!selectedColor) {
        setSelectedColor("Base Variant");
        setSelectedSize("");
      }
    }
  }, [hasVariants, selectedColor]);

  useEffect(() => {
    if (!hasVariants && colorSwatches.length > 0) {
      setSelectedColor(colorSwatches[0].name);
    }
  }, [colorSwatches, hasVariants]);

  useEffect(() => {
    if (!hasVariants && storageOptions.length > 0) {
      setSelectedStorage(storageOptions[0]);
    }
  }, [storageOptions, hasVariants]);

  useEffect(() => {
    if (activeVariant && activeVariant.color !== "Base Variant") {
      const vImages = getVariantImages(activeVariant);
      if (vImages.length > 0) {
        setActiveImage(vImages[0]);
        return;
      }
    }
    if (product.image) {
      setActiveImage(product.image);
    }
  }, [activeVariant, product.image]);

  // Sync auth state
  useEffect(() => {
    let active = true;
    const syncUser = async () => {
      setAuthLoading(true);
      const user = await fetchCurrentUser();
      if (!active) return;
      setCurrentUser(user);
      setAuthLoading(false);
    };
    void syncUser();
    return () => {
      active = false;
    };
  }, []);

  // Fetch reviews logic
  useEffect(() => {
    let active = true;
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const normalizedProductId = String(product.id || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 96);
        const productReviewBusinessId = `product:${normalizedProductId || "unknown"}`;
        const res = await fetchBusinessReviews(productReviewBusinessId, 40);
        if (!active) return;
        if (res.ok) {
          setProductReviews(res.reviews || []);
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    if (product?.id) {
      void fetchReviews();
    }
    return () => {
      active = false;
    };
  }, [product.id]);

  // Check if current user has a delivered order for this product
  useEffect(() => {
    const checkUserOrders = async () => {
      if (!currentUser) {
        setHasDeliveredOrder(false);
        setMatchedOrder(null);
        return;
      }
      try {
        const base = String(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
        const res = await fetch(`${base}/api/orders`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const orders = Array.isArray(data.orders) ? data.orders : [];
          const match = orders.find((order: any) => {
            const isDelivered = String(order.status || "").toLowerCase() === "delivered";
            const hasProduct = order.items?.some((item: any) => String(item.productId) === String(product.id));
            return isDelivered && hasProduct;
          });
          if (match) {
            setHasDeliveredOrder(true);
            setMatchedOrder(match);
          } else {
            setHasDeliveredOrder(false);
            setMatchedOrder(null);
          }
        }
      } catch (err) {
        console.error("Error checking user orders:", err);
        setHasDeliveredOrder(false);
        setMatchedOrder(null);
      }
    };
    void checkUserOrders();
  }, [currentUser, product.id]);

  const handleWriteReviewClick = () => {
    if (hasDeliveredOrder && matchedOrder) {
      setIsReviewModalOpen(true);
    }
  };

  // Additional states for mobile/tablet responsive layout
  const [mobileActiveTab, setMobileActiveTab] = useState("details");
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isDetailDescOpen, setIsDetailDescOpen] = useState(false);
  const [isShortDescExpanded, setIsShortDescExpanded] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(true);

  const displayRating = useMemo(() => {
    if (productReviews.length > 0) {
      return (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1);
    }
    if (product.rating != null && String(product.rating) !== "") {
      return Number(product.rating).toFixed(1);
    }
    return "0.0";
  }, [product.rating, productReviews]);

  const displayReviewsCount = useMemo(() => {
    if (productReviews.length > 0) {
      return productReviews.length;
    }
    if (product.reviews != null && String(product.reviews) !== "") {
      return Number(product.reviews);
    }
    return 0;
  }, [product.reviews, productReviews]);

  const activeImageIndex = useMemo(() => {
    const idx = gallery.indexOf(activeImage);
    return idx !== -1 ? idx : 0;
  }, [gallery, activeImage]);

  // Carousels Mapping
  const subcategoryProducts = useMemo(() => relatedProducts.slice(0, 6), [relatedProducts]);
  const categoryProducts = useMemo(() => relatedProducts.slice(6, 12), [relatedProducts]);

  return (
    <div className="min-h-screen pt-0 pb-12 px-0 md:px-8 font-sans bg-[#F5F7FA] lg:bg-white">
      {/* ========================================================================= */}
      {/* DESKTOP VIEW                                                              */}
      {/* ========================================================================= */}
      <div className="hidden lg:block mx-auto w-full max-w-[1380px]">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-700">Home</Link>
          <span className="text-slate-400">&gt;</span>
          {product.categoryLabel && (
            <>
              <Link href={`/category/${encodeURIComponent(product.categorySlug || "")}`} className="text-slate-500 hover:text-slate-700">
                {product.categoryLabel}
              </Link>
              <span className="text-slate-400">&gt;</span>
            </>
          )}
          {product.brand && (
            <>
              <Link href={`/brand/${encodeURIComponent(product.brand.toLowerCase())}`} className="text-slate-500 hover:text-slate-700">
                {product.brand}
              </Link>
              <span className="text-slate-400">&gt;</span>
            </>
          )}
          <span className="text-slate-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main Grid Layout */}
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[74.8%_24.2%] justify-between gap-[24px] items-start w-full relative">
          
          {/* Left Column: Gallery, Specs, and Tabs */}
          <div className="w-full flex flex-col gap-12">
            
            {/* Gallery + Details row */}
            <div className="grid grid-cols-1 lg:grid-cols-[51.5%_46%] justify-between gap-[24px] items-start w-full">
              {/* Gallery Panel */}
              <div className="w-full flex flex-col items-start gap-[17.5px]">
                {/* Main Image Box */}
                <div className="h-[320px] w-full flex items-center justify-center relative bg-white border border-slate-100 rounded-2xl">
                  {discountText && (
                    <span className="absolute top-4 left-4 text-white text-[15px] font-bold bg-[#EF4444] rounded-[6px] px-2 py-1 z-10">
                      {discountText}
                    </span>
                  )}
                  <img 
                    src={activeImage} 
                    alt={product.name} 
                    className="max-h-full max-w-full object-contain rounded-[20px]" 
                  />
                </div>
      
                {/* Thumbnails */}
                <div className="flex gap-[16px] overflow-x-auto w-full py-3 px-1 no-scrollbar">
                  {gallery.map((image, index) => (
                    <button
                      key={`${product.id}-thumb-${index}`}
                      onClick={() => setActiveImage(image)}
                      className={`w-[76px] h-[76px] border bg-[#FFFFFF] flex items-center justify-center p-1.5 transition shrink-0 rounded-xl ${
                        activeImage === image ? "border-[#2563EB] ring-2 ring-[#2563EB]/10 scale-105" : "border-[#E5E7EB] hover:border-slate-300"
                      }`}
                    >
                      <img 
                        src={image} 
                        alt={`thumb-${index}`} 
                        className="max-h-full max-w-full object-contain rounded-[8px]" 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Info Specs Panel */}
              <div className="w-full flex flex-col gap-6 p-2">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h1 className="text-[25px] font-bold leading-[34.375px] text-[#2E3A54]">{product.name}</h1>
                    {product.shortDescription && (
                      <p className="text-[17.5px] text-[#6B7280] leading-[28.437px] mt-2">
                        {product.shortDescription}
                      </p>
                    )}
                  </div>
        
                  {/* Rating summary details */}
                  <div className="flex items-center gap-2 text-[17.5px]">
                    <div className="flex text-[#F59E0B]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className={`w-[18px] h-[18px] ${s <= Math.round(Number(displayRating)) ? "fill-current" : "text-[#E5E7EB]"}`} viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      ))}
                    </div>
                    <span className="font-semibold text-[#374151]">{displayRating}</span>
                    <span className="text-[#9CA3AF]">
                      · {displayReviewsCount.toLocaleString()} ratings
                    </span>
                  </div>
                </div>

                {/* Variant Swatches */}
                {((hasVariants && (variantColors.length > 0 || variantSizes.length > 0 || customFieldsKeys.length > 0)) || storageOptions.length > 0) && (
                  <div className="space-y-4 pt-2">
                    {/* Variant Colors */}
                    {hasVariants && variantColors.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-slate-800">
                          Selected Color: <span className="font-semibold text-slate-500">{selectedColor}</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 items-center">
                          {variantColors.map((colorName) => {
                            const isSelected = selectedColor === colorName;
                            const colorsMap: Record<string, string> = {
                              midnight: "#0f172a",
                              starlight: "#f2eae0",
                              "space gray": "#5e6166",
                              "space grey": "#5e6166",
                              silver: "#e3e4e6",
                              white: "#ffffff",
                              black: "#000000",
                              blue: "#2563eb",
                              red: "#dc2626",
                              green: "#16a34a",
                              gold: "#f59e0b",
                              golden: "#d4af37",
                              pink: "#ec4899",
                              yellow: "#eab308",
                              purple: "#a855f7",
                              orange: "#f97316"
                            };
                            const hex = colorsMap[colorName.toLowerCase()] || "#cccccc";
                            const isBaseOption = colorName === "Base Variant";
                            const isMatch = isBaseOption || !!product.variantData?.some(v => 
                              String(v.color || "").trim() === colorName && 
                              (!selectedSize || String(v.size || "").trim() === selectedSize)
                            );
                            
                            const variantForColor = product.variantData?.find(v => 
                              String(v.color || "").trim() === colorName && v.image
                            );
                            const vImages = variantForColor ? getVariantImages(variantForColor) : [];
                            const imageUrl = isBaseOption ? product.image : vImages[0];

                            if (isBaseOption || imageUrl) {
                              const displayImgUrl = isBaseOption ? (product.image || "/placeholder.jpg") : imageUrl;
                              return (
                                <button
                                  key={colorName}
                                  type="button"
                                  onClick={() => handleColorSelect(colorName)}
                                  className={`w-14 h-14 rounded-2xl border-2 transition overflow-hidden flex items-center justify-center p-1.5 bg-white ${
                                    isSelected ? "border-slate-900 scale-105" : "border-[#E5E7EB] hover:border-slate-400"
                                  } ${!isMatch && !isSelected ? "opacity-40" : ""}`}
                                  title={colorName}
                                >
                                  <img src={displayImgUrl} alt={colorName} className="w-full h-full object-contain rounded-xl" />
                                </button>
                              );
                            }

                            return (
                              <button
                                key={colorName}
                                type="button"
                                onClick={() => handleColorSelect(colorName)}
                                className={`w-9 h-9 rounded-full border transition flex items-center justify-center ${
                                  isSelected ? "border-[#2563EB] ring-2 ring-offset-2 ring-[#2563EB] scale-105 shadow-sm" : "border-slate-200"
                                } ${!isMatch && !isSelected ? "opacity-40" : ""}`}
                                style={{ backgroundColor: hex }}
                                title={colorName}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
      
                    {/* Variant Sizes */}
                    {hasVariants && variantSizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-slate-800">
                          Variant: <span className="font-semibold text-slate-500">{selectedSize}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {variantSizes.map((sizeName) => {
                            const isSelected = selectedSize === sizeName;
                            const matchingVariant = product.variantData?.find(v => 
                              String(v.size || "").trim() === sizeName && 
                              (!selectedColor || String(v.color || "").trim() === selectedColor)
                            ) || product.variantData?.find(v => 
                              String(v.size || "").trim() === sizeName
                            );
                            const isMatch = product.variantData?.some(v => 
                              String(v.size || "").trim() === sizeName && 
                              (!selectedColor || String(v.color || "").trim() === selectedColor)
                            );
                            if (!isMatch) return null;

                            const mrpValue = Number(matchingVariant?.mrp || 0);
                            const sellingPriceValue = Number(matchingVariant?.sellingPrice || 0);
                            const discountPercent = mrpValue > sellingPriceValue ? Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100) : 0;
                            const stockValue = matchingVariant?.stock;

                            return (
                              <button
                                key={sizeName}
                                type="button"
                                onClick={() => handleSizeSelect(sizeName)}
                                className={`p-3 border-[1.5px] rounded-2xl bg-white min-w-[125px] text-left flex flex-col justify-between transition cursor-pointer shadow-sm ${
                                  isSelected
                                    ? "border-slate-900 bg-slate-50/50"
                                    : "border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">
                                    {sizeName}
                                  </div>
                                  {mrpValue > sellingPriceValue && (
                                    <div className="text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                                      <span className="text-[#16A34A] font-bold">↓{discountPercent}%</span>
                                      <span className="line-through text-slate-400">₹{mrpValue.toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <div className="font-bold text-slate-800 text-sm">
                                    ₹{sellingPriceValue.toLocaleString("en-IN")}
                                  </div>
                                  {typeof stockValue === "number" && stockValue > 0 && stockValue <= 5 && (
                                    <div className="text-[#EA580C] text-[10px] font-bold mt-0.5">
                                      {stockValue} left
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
      

      
                    {/* Custom Variant Fields dropdowns */}
                    {customFieldsKeys.map((fieldName) => {
                      const options = customFieldsOptions[fieldName] || [];
                      if (options.length === 0) return null;
                      return (
                        <div key={fieldName} className="space-y-2">
                          <div className="text-sm font-bold text-slate-800">
                            {fieldName}: <span className="font-semibold text-slate-500">{selectedCustomOptions[fieldName]}</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {options.map((opt) => {
                              const isSelected = selectedCustomOptions[fieldName] === opt;
                              const matchingVariant = product.variantData?.find(v => 
                                String(v.customFields?.[fieldName] || "").trim() === opt &&
                                (!selectedColor || String(v.color || "").trim() === selectedColor) &&
                                (!selectedSize || String(v.size || "").trim() === selectedSize)
                              ) || product.variantData?.find(v => 
                                String(v.customFields?.[fieldName] || "").trim() === opt
                              );
                              const isMatch = product.variantData?.some(v => 
                                (!variantColors.length || String(v.color || "").trim() === selectedColor) &&
                                (!variantSizes.length || String(v.size || "").trim() === selectedSize) &&
                                String(v.customFields?.[fieldName] || "").trim() === opt
                              );
                              if (!isMatch) return null;

                              const mrpValue = Number(matchingVariant?.mrp || 0);
                              const sellingPriceValue = Number(matchingVariant?.sellingPrice || 0);
                              const discountPercent = mrpValue > sellingPriceValue ? Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100) : 0;
                              const stockValue = matchingVariant?.stock;

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setSelectedCustomOptions(prev => ({ ...prev, [fieldName]: opt }))}
                                  className={`p-3 border-[1.5px] rounded-2xl bg-white min-w-[125px] text-left flex flex-col justify-between transition cursor-pointer shadow-sm ${
                                    isSelected
                                      ? "border-slate-900 bg-slate-50/50"
                                      : "border-slate-200 hover:border-slate-400"
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 text-sm">
                                      {opt}
                                    </div>
                                    {mrpValue > sellingPriceValue && (
                                      <div className="text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                                        <span className="text-[#16A34A] font-bold">↓{discountPercent}%</span>
                                        <span className="line-through text-slate-400">₹{mrpValue.toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <div className="font-bold text-slate-800 text-sm">
                                      ₹{sellingPriceValue.toLocaleString("en-IN")}
                                    </div>
                                    {typeof stockValue === "number" && stockValue > 0 && stockValue <= 5 && (
                                      <div className="text-[#EA580C] text-[10px] font-bold mt-0.5">
                                        {stockValue} left
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
        
                {/* Key Attributes Grid inside Info Panel */}
                <div className="mt-4 space-y-4 w-full">
                  {gridAttributes.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="text-[17.5px] font-semibold text-[#111827]">Key Attributes</h3>
                       <div className="flex flex-col items-start rounded-[17.5px] border border-[#E5E7EB] bg-white divide-y divide-[#E5E7EB] text-[14px] w-full">
                        {gridAttributes.map(([label, value], idx) => (
                          <div key={`${label}-${idx}`} className="grid grid-cols-3 p-3 w-full">
                            <span className="col-span-1 font-medium text-slate-400">{label}</span>
                            <span className="col-span-2 font-medium text-[#2E3A54] text-[15px]">{value}</span>
                          </div>
                        ))}
                       </div>
                    </div>
                  )}
        
                  {/* Stock status details */}
                  <div className="flex items-center gap-2 text-sm pt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentInStock ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                    <span className="font-medium text-slate-700">
                      {currentInStock ? (
                        <>
                          In Stock — Fulfilled by{" "}
                          <span className="text-[#272727] text-[17.5px] font-semibold ml-1.5">
                            {product.sellerName || product.vendorName || "Winkget Store"}
                          </span>
                        </>
                      ) : "Out of Stock"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Description / Specs / Details Tabs */}
            {(() => {
              const [activeTab, setActiveTab] = useState("description");
              return (
                <div className="w-full lg:w-[calc(100%-30px)] space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex border-b border-[#E5E7EB] gap-8 pb-3">
                    {[
                      { id: "description", label: "Description" },
                      { id: "specifications", label: "Specifications" },
                      { id: "detailedDescription", label: "Detailed Description" },
                      { id: "reviews", label: "Reviews" }
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            if (tab.id === "reviews") {
                              document.getElementById("product-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                            } else {
                              setActiveTab(tab.id);
                            }
                          }}
                          className={`pb-2 transition-all text-[16px] font-semibold ${
                            isActive ? "text-[#2E3A54] underline underline-offset-8 decoration-2" : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
     
                  {/* Tab Panels */}
                  <div className="pt-4 min-h-[260px]">
                    {activeTab === "description" && (
                      <div className="space-y-6">
                        {product.descriptionPoints && product.descriptionPoints.length > 0 ? (
                          <div className="space-y-5">
                            {product.descriptionPoints.map((point, i) => (
                              <div key={i} className="flex flex-col gap-1 border-b border-[#E5E7EB] pb-4 last:border-b-0 last:pb-0">
                                {point.heading && (
                                  <h4 className="text-[17.5px] font-bold text-[#2E3A54] leading-[25px]">
                                    {point.heading}
                                  </h4>
                                )}
                                {point.content && (
                                  <p className="text-[17.5px] text-slate-500 leading-[28.437px] whitespace-pre-line">
                                    {point.content}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : product.description ? (
                          <p className="text-[17.5px] text-slate-500 leading-[28.437px] whitespace-pre-line">
                            {product.description}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">No description provided.</p>
                        )}
      
                        {product.highlights && product.highlights.length > 0 && (
                          <div className="space-y-3 pt-4">
                            <h4 className="text-[17.5px] font-bold text-[#2E3A54] leading-[25px]">Key Highlights</h4>
                            <ul className="list-disc pl-5 space-y-2 text-[17.5px] text-slate-500 leading-[28.437px]">
                              {product.highlights.map((highlight, i) => (
                                 <li key={i}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
  
                    {activeTab === "specifications" && (
                      <div className="space-y-6">
                        {normalizedSpecs.length > 0 ? (
                          <div className="flex flex-col items-start rounded-[17.5px] border border-[#E5E7EB] bg-white divide-y divide-[#E5E7EB] text-[14px] w-full">
                            {normalizedSpecs.map(([label, value], idx) => (
                              <div key={`${label}-${idx}`} className="grid grid-cols-3 p-3 w-full bg-white">
                                <span className="col-span-1 font-medium text-slate-400">{label}</span>
                                <span className="col-span-2 font-medium text-[#2E3A54] text-[15px]">{value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-sm font-medium">
                            No specifications listed.
                          </div>
                        )}
                      </div>
                    )}
      
                    {activeTab === "detailedDescription" && (
                      <div className="space-y-6">
                        {product.detailedDescriptionBlocks && product.detailedDescriptionBlocks.length > 0 ? (
                          <div className="space-y-12">
                            {product.detailedDescriptionBlocks.map((block, i) => {
                              const isEven = i % 2 === 0;
                              return (
                                <div 
                                  key={i} 
                                  className={`flex flex-col md:flex-row gap-8 items-center ${
                                    isEven ? "" : "md:flex-row-reverse"
                                  }`}
                                >
                                  {block.image && (
                                    <div className="w-full md:w-1/2">
                                      <img 
                                        src={block.image} 
                                        alt={block.headline || "Detailed section image"} 
                                        className="w-full h-auto max-h-[450px] object-contain rounded-[12px] border border-[#E5E7EB]"
                                      />
                                    </div>
                                  )}
                                  <div className="w-full md:w-1/2 space-y-3">
                                    {block.headline && (
                                      <h4 className="text-[20px] font-bold text-slate-800 leading-[26px]">
                                        {block.headline}
                                      </h4>
                                    )}
                                    {block.text && (
                                      <p className="text-[16px] text-slate-500 leading-[24px] whitespace-pre-line">
                                        {block.text}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : product.detailedDescription ? (
                          <p className="text-[16px] text-slate-500 leading-[24px] whitespace-pre-line">
                            {product.detailedDescription}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">No detailed description provided.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Right Column: Sticky Pricing & Checkout (Desktop) */}
          <div className="w-full flex flex-col gap-6 p-[40px_26px] rounded-[20px] border border-[#E5E7EB] bg-[#F9FBFF] sticky top-[100px] z-10">
            <div className="space-y-1 w-full text-left">
              <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                <span className="text-[30px] font-bold text-slate-900 leading-[40px]">
                  {formattedPrice}
                </span>
                {formattedOldPrice && (
                  <span className="text-[18px] text-slate-400 line-through font-normal leading-[27px]">
                    {formattedOldPrice}
                  </span>
                )}
              </div>
              <div className="flex flex-col text-xs text-slate-500 font-medium pt-0.5">
                <span>Free delivery • 1-yr warranty</span>
              </div>
            </div>
  
            {/* Purchase buttons */}
            <div className="space-y-3 pt-1 w-full">
              {cartQuantity === 0 ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full hover:opacity-95 transition flex h-[60px] justify-center items-center rounded-[17.5px] bg-[#0071E3] text-white text-center font-medium text-[15px] whitespace-nowrap"
                >
                  Add to Cart
                </button>
              ) : (
                <div
                  className="w-full flex h-[60px] justify-between items-center rounded-[17.5px] bg-[#0071E3] text-white px-6 font-medium text-[15px] select-none"
                >
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(cartQuantity - 1)}
                    className="text-white hover:opacity-85 font-extrabold text-xl w-8 h-8 flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span>{cartQuantity}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(cartQuantity + 1)}
                    className="text-white hover:opacity-85 font-extrabold text-xl w-8 h-8 flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onBuyNow}
                className="w-full hover:bg-slate-200 transition flex h-[60px] justify-center items-center rounded-[17.5px] bg-[#F5F5F7] text-[#1D1D1F] text-center font-medium text-[15px] whitespace-nowrap"
              >
                Buy Now
              </button>
  
              {/* Save for later button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onSaveForLater}
                  className="w-full flex h-10 items-center justify-center gap-1.5 rounded-[999px] border border-[#E5E7EB] bg-transparent text-[#86868B] text-center font-medium text-[14px] hover:bg-slate-50 transition"
                >
                  <Heart
                    size={16}
                    className={wishlisted ? "fill-rose-500 text-rose-500" : "text-slate-400"}
                  />
                  <span>{wishlisted ? "Saved" : "Save for later"}</span>
                </button>
              </div>
            </div>
  
            {/* Trust Badges & Vendor Profile */}
            <div className="mt-auto space-y-4 w-full">
              {/* Trust Badges */}
              {badges.length > 0 && (
                <div className="grid grid-cols-2 gap-3 py-4 border-t border-[#E5E7EB] w-full">
                  {badges.map((badge, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-[#F9FAFB] hover:bg-emerald-50/60 border border-[#E5E7EB] hover:border-emerald-100 rounded-[12px] transition-all duration-200 hover:scale-[1.03] group cursor-default">
                      <div className="p-1 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
                        {badge.icon}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold leading-tight group-hover:text-slate-800 transition-colors duration-200">
                        {badge.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Seller details */}
              {(product.sellerName || storeProduct.vendorName) && (
                <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EB] w-full text-left">
                  <div>
                    <div className="text-[14.5px] font-semibold text-slate-800">
                      {product.sellerName || storeProduct.vendorName}
                    </div>
                    <div className="text-[12px] font-semibold text-slate-400">
                      Verified
                    </div>
                  </div>
                  <Link 
                    href={`/search?query=${encodeURIComponent(product.sellerName || storeProduct.vendorName)}`}
                    className="text-[#0071E3] hover:underline font-semibold text-[14px]"
                  >
                    View store
                  </Link>
                </div>
              )}
            </div>
          </div>
  
        </div>

        {/* Desktop Recommend Carousel */}
        {subcategoryProducts.length > 0 && (
          <div className="max-w-[1380px] mx-auto mt-8 px-4 md:px-0 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <h3 className="text-[20px] font-bold text-[#111827] leading-[30px]">
                Recommend
              </h3>
              <Link href="/search" className="text-sm font-semibold text-[#2563EB] hover:underline">
                View all
              </Link>
            </div>
            <div className="flex gap-6 overflow-x-auto py-2 no-scrollbar">
              {subcategoryProducts.map((item) => {
                const price = Number(item.price) || 0;
                const oldPrice = Number(item.oldPrice) || 0;
                const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                const formattedPriceVal = price.toLocaleString("en-IN");
                const formattedOldPriceVal = oldPrice.toLocaleString("en-IN");
    
                return (
                  <Link key={item.id} href={item.href} className="group w-[180px] flex-shrink-0 flex flex-col space-y-3">
                    <div className="relative w-[180px] h-[180px] rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-4 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-md">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105" 
                      />
                      {discount > 0 && (
                        <span className="absolute left-2 top-2 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#EF4444]">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 text-left">
                      <h4 className="text-[14.4px] font-bold text-[#2E3A54] leading-tight group-hover:text-[#2563EB] transition-colors min-h-[40px] line-clamp-2">
                        {item.name}
                      </h4>
                      <span className="text-[12px] text-slate-400 mt-0.5 truncate block h-[18px]">
                        {item.sellerName || "Winkget Store"}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-2 h-[22px]">
                        <span className="text-[16.8px] font-bold text-[#2563EB]">
                          ₹{formattedPriceVal}
                        </span>
                        {oldPrice > price && (
                          <span className="text-[12px] text-slate-400 line-through">
                            ₹{formattedOldPriceVal}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
  
        {/* Desktop You May Also Like Carousel */}
        {categoryProducts.length > 0 && (
          <div className="max-w-[1380px] mx-auto mt-8 px-4 md:px-0 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <h3 className="text-[20px] font-bold text-[#111827] leading-[30px]">
                You May Also Like
              </h3>
              <Link href="/search" className="text-sm font-semibold text-[#2563EB] hover:underline">
                View all
              </Link>
            </div>
            <div className="flex gap-6 overflow-x-auto py-2 no-scrollbar">
              {categoryProducts.map((item) => {
                const price = Number(item.price) || 0;
                const oldPrice = Number(item.oldPrice) || 0;
                const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                const formattedPriceVal = price.toLocaleString("en-IN");
                const formattedOldPriceVal = oldPrice.toLocaleString("en-IN");
    
                return (
                  <Link key={item.id} href={item.href} className="group w-[180px] flex-shrink-0 flex flex-col space-y-3">
                    <div className="relative w-[180px] h-[180px] rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-4 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-md">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105" 
                      />
                      {discount > 0 && (
                        <span className="absolute left-2 top-2 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#EF4444]">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 text-left">
                      <h4 className="text-[14.4px] font-bold text-[#2E3A54] leading-tight group-hover:text-[#2563EB] transition-colors min-h-[40px] line-clamp-2">
                        {item.name}
                      </h4>
                      <span className="text-[12px] text-slate-400 mt-0.5 truncate block h-[18px]">
                        {item.sellerName || "Winkget Store"}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-2 h-[22px]">
                        <span className="text-[16.8px] font-bold text-[#2563EB]">
                          ₹{formattedPriceVal}
                        </span>
                        {oldPrice > price && (
                          <span className="text-[12px] text-slate-400 line-through">
                            ₹{formattedOldPriceVal}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
   
        {/* Desktop Reviews breakdown section */}
        <div id="product-reviews-section" className="max-w-[1380px] mx-auto mt-16 mb-20 px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Customer Reviews list */}
            <div className="lg:col-span-2 space-y-6 text-left">
              <h3 className="text-[27.2px] font-bold text-[#2E3A54] leading-[40.8px]">
                Reviews
              </h3>
              
              {loadingReviews ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-28 bg-slate-100 rounded-3xl" />
                  <div className="h-28 bg-slate-100 rounded-3xl" />
                </div>
              ) : productReviews.length > 0 ? (
                <div className="space-y-4">
                  {productReviews.map((review, idx) => (
                    <div key={review.id || idx} className="border border-[#E5E7EB] rounded-[16px] p-6 space-y-4 bg-[#F8FAFC] shadow-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-sm text-white font-extrabold uppercase shrink-0">
                            {review.userName?.slice(0, 1) || "U"}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{review.userName || "Customer"}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex text-[#F59E0B] text-xs">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                                ))}
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(review.createdAt || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              {review.isVerifiedPurchase !== false && (
                                <span className="text-xs font-semibold text-[#22C55E]">
                                  · Verified Purchase
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        {review.title && (
                          <h5 className="text-[16px] font-bold text-[#111827]">{review.title}</h5>
                        )}
                        <p className="text-[16px] text-slate-600 leading-[24px] whitespace-pre-line">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-[#E5E7EB] rounded-[16px] text-slate-400 text-sm font-medium">
                  No reviews yet for this product. Be the first to purchase and review!
                </div>
              )}
            </div>
   
            {/* Ratings breakdown */}
            <div className="space-y-6 text-left">
              <h3 className="text-[27.2px] font-bold text-[#2E3A54] leading-[40.8px]">
                Ratings
              </h3>
              
              <div className="flex flex-col items-center gap-[28.5px] p-[19px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] box-border min-h-[324px]">
                {/* Overall Rating Score */}
                <div className="flex flex-col items-center justify-center text-center space-y-1.5 pb-6 border-b border-[#E5E7EB] w-full">
                  <span className="text-[57px] font-extrabold text-slate-800 leading-[57px]">
                    {displayRating}
                  </span>
                  <div className="flex text-[#F59E0B] text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>
                        {i < Math.round(Number(displayRating)) ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
   
                {/* Breakdown Bars */}
                <div className="space-y-2.5 w-full">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    let percentage = 0;
                    if (productReviews.length > 0) {
                      const count = productReviews.filter(r => Math.round(r.rating) === stars).length;
                      percentage = Math.round((count / productReviews.length) * 100);
                    }
                    
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                        <span className="w-3 text-right">{stars}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="h-full bg-[#F59E0B] rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-bold text-slate-400">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
  
              {/* Trigger write review card */}
              {hasDeliveredOrder && (
                <div className="border border-[#E5E7EB] rounded-[16px] p-6 bg-[#F9FAFB] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Share your experience
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tell others about this product
                    </p>
                  </div>
  
                  <button
                    type="button"
                    onClick={handleWriteReviewClick}
                    className="h-10 px-6 border border-[#2563EB] text-[#2563EB] font-semibold text-sm rounded-full hover:bg-blue-50/40 transition"
                  >
                    Write Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE & TABLET VIEW                                                      */}
      {/* ========================================================================= */}
      <div className="block lg:hidden w-full max-w-[768px] mx-auto pb-0 px-3 pt-3 select-none space-y-2.5">
        {/* Card 1: Gallery & Product Info */}
        <div className="bg-white p-4 rounded-none shadow-none space-y-4 text-left">
          {/* Mobile swipeable image gallery */}
          <div className="w-full max-w-[402px] px-2 flex flex-col items-center mx-auto">
            <div 
              className="relative w-full max-w-[354px] aspect-square flex flex-col items-center justify-center overflow-hidden mx-auto touch-pan-y"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                e.currentTarget.dataset.startX = String(touch.clientX);
              }}
              onTouchEnd={(e) => {
                const startX = parseFloat(e.currentTarget.dataset.startX || "0");
                if (!startX) return;
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                const swipeThreshold = 50;
                
                if (Math.abs(diff) > swipeThreshold) {
                  if (diff > 0) {
                    const nextIndex = (activeImageIndex + 1) % gallery.length;
                    setActiveImage(gallery[nextIndex]);
                  } else {
                    const prevIndex = (activeImageIndex - 1 + gallery.length) % gallery.length;
                    setActiveImage(gallery[prevIndex]);
                  }
                }
                e.currentTarget.dataset.startX = "";
              }}
            >
              <img 
                src={activeImage} 
                alt={product.name} 
                className="w-full h-full object-contain pointer-events-none" 
              />
            </div>
            
            {/* Dots */}
            <div className="mt-3 flex items-center justify-center gap-1.5 w-full">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(gallery[idx])}
                  className={`transition-all duration-300 rounded-full ${
                    activeImageIndex === idx ? "w-6 h-2 bg-[#2563EB]" : "w-2 h-2 bg-[#D1D5DB]"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Product Header details */}
          <div className="space-y-3">
            <h1 className="text-[25px] font-bold leading-[34.3px] text-[#2E3A54] tracking-tight">
              {product.name}
            </h1>

            {/* Ratings row */}
            {Number(displayRating) > 0 && (
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMobileActiveTab("review");
                  setTimeout(() => {
                    document.getElementById("mobile-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                <div className="flex items-center gap-0.5 bg-[#00B57A] text-white px-2 py-0.5 rounded-[6px] font-bold text-xs">
                  <span>{displayRating}</span>
                  <span>★</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {displayReviewsCount.toLocaleString()} ratings
                </span>
              </div>
            )}

            {/* Mobile pricing */}
            <div className="flex items-baseline flex-wrap gap-2 pt-1">
              <span className="text-2xl font-bold text-[#111827]">{formattedPrice}</span>
              {formattedOldPrice && (
                <span className="text-sm text-[#9CA3AF] line-through font-medium">{formattedOldPrice}</span>
              )}
              {discountText && (
                <span className="text-xs font-bold text-[#EF4444] bg-[#FEE2E2] px-2 py-0.5 rounded-md">
                  {discountText}
                </span>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-sm text-[#6B7280] leading-[20.1px] mt-2">
                {product.shortDescription.length > 120 && !isShortDescExpanded ? (
                  <>
                    {product.shortDescription.slice(0, 120)}...{" "}
                    <button 
                      type="button"
                      onClick={() => setIsShortDescExpanded(true)} 
                      className="text-[#2563EB] font-bold ml-1 hover:underline inline-block"
                    >
                      View more
                    </button>
                  </>
                ) : (
                  <>
                    {product.shortDescription}{" "}
                    {product.shortDescription.length > 120 && (
                      <button 
                        type="button"
                        onClick={() => setIsShortDescExpanded(false)} 
                        className="text-[#2563EB] font-bold ml-1 hover:underline inline-block"
                      >
                        View less
                      </button>
                    )}
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Color and Size swatches (Mobile) */}
        {((hasVariants && (variantColors.length > 0 || variantSizes.length > 0 || customFieldsKeys.length > 0)) || (colorSwatches.length > 0) || (storageOptions.length > 0)) && (
          <div className="bg-white p-4 rounded-none shadow-none space-y-4 text-left">
            {/* Colors */}
            {((hasVariants && variantColors.length > 0) || (colorSwatches.length > 0)) && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  Selected Color: <span className="font-semibold text-slate-500">{selectedColor}</span>
                </div>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {hasVariants && variantColors.length > 0 ? (
                    variantColors.map((colorName) => {
                      const isSelected = selectedColor === colorName;
                      const colorsMap: Record<string, string> = {
                        midnight: "#0f172a",
                        starlight: "#f2eae0",
                        "space gray": "#5e6166",
                        "space grey": "#5e6166",
                        silver: "#e3e4e6",
                        white: "#ffffff",
                        black: "#000000",
                        blue: "#2563eb",
                        red: "#dc2626",
                        green: "#16a34a",
                        gold: "#f59e0b",
                        golden: "#d4af37",
                        pink: "#ec4899",
                        yellow: "#eab308",
                        purple: "#a855f7",
                        orange: "#f97316"
                      };
                      const hex = colorsMap[colorName.toLowerCase()] || "#cccccc";
                      const isBaseOption = colorName === "Base Variant";
                      const isMatch = isBaseOption || !!product.variantData?.some(v => 
                        String(v.color || "").trim() === colorName && 
                        (!selectedSize || String(v.size || "").trim() === selectedSize)
                      );
                      
                      const variantForColor = product.variantData?.find(v => 
                        String(v.color || "").trim() === colorName && v.image
                      );
                      const vImages = variantForColor ? getVariantImages(variantForColor) : [];
                      const imageUrl = isBaseOption ? product.image : vImages[0];

                      if (isBaseOption || imageUrl) {
                        const displayImgUrl = isBaseOption ? (product.image || "/placeholder.jpg") : imageUrl;
                        return (
                          <button
                            key={colorName}
                            type="button"
                            onClick={() => handleColorSelect(colorName)}
                            className={`w-12 h-12 rounded-2xl border-2 transition overflow-hidden flex items-center justify-center p-1.5 bg-white ${
                              isSelected ? "border-slate-900 scale-105" : "border-[#E5E7EB] hover:border-slate-400"
                            } ${!isMatch && !isSelected ? "opacity-40" : ""}`}
                            title={colorName}
                          >
                            <img src={displayImgUrl} alt={colorName} className="w-full h-full object-contain rounded-xl" />
                          </button>
                        );
                      }

                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => handleColorSelect(colorName)}
                          className={`w-9 h-9 rounded-full border transition flex items-center justify-center ${
                            isSelected ? "border-[#2563EB] ring-2 ring-offset-2 ring-[#2563EB] scale-105 shadow-sm" : "border-slate-200"
                          } ${!isMatch && !isSelected ? "opacity-40" : ""}`}
                          style={{ backgroundColor: hex }}
                          title={colorName}
                        />
                      );
                    })
                  ) : (
                    colorSwatches.map((color) => {
                      const isSelected = selectedColor === color.name;
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => handleColorSelect(color.name)}
                          className={`w-9 h-9 rounded-full border transition flex items-center justify-center ${
                            isSelected ? "border-[#2563EB] ring-2 ring-offset-2 ring-[#2563EB] scale-105 shadow-sm" : "border-slate-200"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Sizes */}
            {hasVariants && variantSizes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  Variant: <span className="font-semibold text-slate-500">{selectedSize}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {variantSizes.map((sizeName) => {
                    const isSelected = selectedSize === sizeName;
                    const matchingVariant = product.variantData?.find(v => 
                      String(v.size || "").trim() === sizeName && 
                      (!selectedColor || String(v.color || "").trim() === selectedColor)
                    ) || product.variantData?.find(v => 
                      String(v.size || "").trim() === sizeName
                    );
                    const isMatch = product.variantData?.some(v => 
                      String(v.size || "").trim() === sizeName && 
                      (!selectedColor || String(v.color || "").trim() === selectedColor)
                    );
                    if (!isMatch) return null;

                    const mrpValue = Number(matchingVariant?.mrp || 0);
                    const sellingPriceValue = Number(matchingVariant?.sellingPrice || 0);
                    const discountPercent = mrpValue > sellingPriceValue ? Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100) : 0;
                    const stockValue = matchingVariant?.stock;

                    return (
                      <button
                        key={sizeName}
                        type="button"
                        onClick={() => handleSizeSelect(sizeName)}
                        className={`p-2.5 border-[1.5px] rounded-xl bg-white min-w-[110px] text-left flex flex-col justify-between transition cursor-pointer shadow-sm ${
                          isSelected
                            ? "border-slate-900 bg-slate-50/50"
                            : "border-slate-200"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-800 text-xs">
                            {sizeName}
                          </div>
                          {mrpValue > sellingPriceValue && (
                            <div className="text-[9px] flex items-center gap-1 mt-0.5">
                              <span className="text-[#16A34A] font-bold">↓{discountPercent}%</span>
                              <span className="line-through text-slate-400">₹{mrpValue.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <div className="font-bold text-slate-800 text-xs">
                            ₹{sellingPriceValue.toLocaleString("en-IN")}
                          </div>
                          {typeof stockValue === "number" && stockValue > 0 && stockValue <= 5 && (
                            <div className="text-[#EA580C] text-[9px] font-bold mt-0.5">
                              {stockValue} left
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom variant inputs (Mobile) */}
            {hasVariants && customFieldsKeys.map((fieldName) => {
              const options = customFieldsOptions[fieldName] || [];
              if (options.length === 0) return null;
              return (
                <div key={fieldName} className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    {fieldName}: <span className="font-semibold text-slate-500">{selectedCustomOptions[fieldName]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {options.map((opt) => {
                      const isSelected = selectedCustomOptions[fieldName] === opt;
                      const matchingVariant = product.variantData?.find(v => 
                        String(v.customFields?.[fieldName] || "").trim() === opt &&
                        (!selectedColor || String(v.color || "").trim() === selectedColor) &&
                        (!selectedSize || String(v.size || "").trim() === selectedSize)
                      ) || product.variantData?.find(v => 
                        String(v.customFields?.[fieldName] || "").trim() === opt
                      );
                      const isMatch = product.variantData?.some(v => 
                        (!variantColors.length || String(v.color || "").trim() === selectedColor) &&
                        (!variantSizes.length || String(v.size || "").trim() === selectedSize) &&
                        String(v.customFields?.[fieldName] || "").trim() === opt
                      );
                      if (!isMatch) return null;

                      const mrpValue = Number(matchingVariant?.mrp || 0);
                      const sellingPriceValue = Number(matchingVariant?.sellingPrice || 0);
                      const discountPercent = mrpValue > sellingPriceValue ? Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100) : 0;
                      const stockValue = matchingVariant?.stock;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedCustomOptions(prev => ({ ...prev, [fieldName]: opt }))}
                          className={`p-2.5 border-[1.5px] rounded-xl bg-white min-w-[110px] text-left flex flex-col justify-between transition cursor-pointer shadow-sm ${
                            isSelected
                              ? "border-slate-900 bg-slate-50/50"
                              : "border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {opt}
                            </div>
                            {mrpValue > sellingPriceValue && (
                              <div className="text-[9px] flex items-center gap-1 mt-0.5">
                                <span className="text-[#16A34A] font-bold">↓{discountPercent}%</span>
                                <span className="line-through text-slate-400">₹{mrpValue.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <div className="font-bold text-slate-800 text-xs">
                              ₹{sellingPriceValue.toLocaleString("en-IN")}
                            </div>
                            {typeof stockValue === "number" && stockValue > 0 && stockValue <= 5 && (
                              <div className="text-[#EA580C] text-[9px] font-bold mt-0.5">
                                {stockValue} left
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card 3: Trust Badges (Horizontal scroll on mobile) */}
        {badges.length > 0 && (
          <div className="bg-white p-4 rounded-none shadow-none text-left">
            <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
              {badges.map((badge, idx) => (
                <div key={idx} className="flex flex-col items-center text-center gap-1.5 min-w-[76px] shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#2563EB] border border-[#E5E7EB] shadow-sm">
                    {badge.icon}
                  </div>
                  <span className="text-[10px] text-[#4B5563] font-semibold leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 4: Key Attributes & Stock status */}
        {gridAttributes.length > 0 && (
          <div className="bg-white p-4 rounded-none shadow-none space-y-3 text-left">
            <h3 className="text-sm font-bold text-[#111827]">Key Attributes</h3>
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden divide-y divide-[#E5E7EB]">
              {gridAttributes.map(([label, value], idx) => (
                <div key={idx} className="grid grid-cols-2 p-3 text-xs bg-white">
                  <span className="text-[#6B7280] font-semibold">{label}</span>
                  <span className="text-[#2E3A54] font-medium text-[15px]">{value}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${currentInStock ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
              <span className="text-[#374151] font-semibold">
                {currentInStock ? (
                  <>
                    In Stock — Fulfilled by{" "}
                    <span className="text-[#272727] font-semibold text-[17.5px] ml-1.5">
                      {product.sellerName || product.vendorName || "Winkget Store"}
                    </span>
                  </>
                ) : "Out of stock"}
              </span>
            </div>
          </div>
        )}

        {/* Card 5: Mobile tabs & accordions */}
        <div className="bg-white rounded-none shadow-none border-t border-b border-[#E5E7EB] divide-y divide-[#E5E7EB] text-left">
          <div className="px-4">
            <div className="flex gap-8 text-sm font-semibold select-none">
              {["details", "explore"].map((tab) => {
                const isActive = mobileActiveTab === tab;
                const label = tab === "details" ? "Details" : "Explore";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMobileActiveTab(tab)}
                    className="py-3.5 transition-all"
                    style={{
                      color: isActive ? "#2E3A54" : "#9CA3AF",
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      textDecorationLine: isActive ? "underline" : "none",
                      textDecorationStyle: "solid",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Details accordions */}
          {mobileActiveTab === "details" && (
            <div className="divide-y divide-[#E5E7EB]">
              {/* Description Accordion */}
              <div className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsDescOpen(!isDescOpen)}
                  className="w-full flex min-h-[53px] p-4 items-center justify-between bg-transparent text-xs font-bold text-[#111827]"
                >
                  <span className="text-[15.5px] font-bold text-[#2E3A54]">Description</span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDescOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {isDescOpen && (
                  <div className="p-4 bg-white space-y-4">
                    <div>
                      {product.descriptionPoints && product.descriptionPoints.length > 0 ? (
                        <div className="space-y-3">
                          {product.descriptionPoints.map((point, i) => (
                            <div key={i} className="space-y-1">
                              {point.heading && (
                                <h5 className="text-[17.5px] font-bold text-[#2E3A54] leading-[25px]">
                                  {point.heading}
                                </h5>
                              )}
                              {point.content && (
                                <p className="text-[17.5px] text-slate-500 leading-[28.4px] whitespace-pre-line">
                                  {point.content}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : product.description ? (
                        <p className="text-[17.5px] text-slate-500 leading-[28.4px] whitespace-pre-line">
                          {product.description}
                        </p>
                      ) : (
                        <p className="text-xs text-[#9CA3AF]">No description provided.</p>
                      )}
                    </div>

                    {product.highlights && product.highlights.length > 0 && (
                      <div className="pt-2 border-t border-[#F3F4F6]">
                        <h4 className="text-[17.5px] font-bold text-[#2E3A54] leading-[25px] mb-2">
                          Key Highlights
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-[17.5px] text-slate-500 leading-[28.4px]">
                          {product.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Specs Accordion */}
              <div className="overflow-hidden bg-[#FBFDFE]">
                <button
                  type="button"
                  onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                  className="w-full flex min-h-[53px] p-4 items-center justify-between bg-transparent text-xs font-bold text-[#111827]"
                >
                  <span className="text-[15.5px] font-bold text-[#2E3A54]">Specification</span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSpecsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {isSpecsOpen && (
                  <div className="p-4 bg-white">
                    {normalizedSpecs.length > 0 ? (
                      <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden divide-y divide-[#E5E7EB]">
                        {normalizedSpecs.map(([label, value], idx) => (
                          <div key={idx} className="grid grid-cols-2 p-3 text-xs bg-white">
                            <span className="text-[#6B7280] font-semibold">{label}</span>
                            <span className="text-[#2E3A54] font-medium text-[15px]">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs bg-[#FBFDFE] rounded-2xl border border-dashed border-[#E5E7EB]">
                        No specifications listed.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Description Accordion */}
              {(product.detailedDescription || (product.detailedDescriptionBlocks && product.detailedDescriptionBlocks.length > 0)) && (
                <div className="overflow-hidden bg-[#FBFDFE]">
                  <button
                    type="button"
                    onClick={() => setIsDetailDescOpen(!isDetailDescOpen)}
                    className="w-full flex min-h-[53px] p-4 items-center justify-between bg-transparent text-xs font-bold text-[#111827]"
                  >
                    <span className="text-[15.5px] font-bold text-[#2E3A54]">Detailed Description</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDetailDescOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  {isDetailDescOpen && (
                    <div className="border-t border-[#E5E7EB] p-4 bg-white space-y-4">
                      {product.detailedDescriptionBlocks && product.detailedDescriptionBlocks.length > 0 ? (
                        <div className="space-y-4">
                          {product.detailedDescriptionBlocks.map((block, i) => (
                            <div key={i} className="flex flex-col gap-2 max-w-full overflow-hidden text-left">
                              {block.image && (
                                <img 
                                  src={block.image} 
                                  alt={block.headline} 
                                  className="w-full h-auto object-contain border border-[#E5E7EB]" 
                                />
                              )}
                              {block.headline && (
                                <h5 className="text-sm font-semibold text-slate-800">
                                  {block.headline}
                                </h5>
                              )}
                              {block.text && (
                                <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-line">
                                  {block.text}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-line">
                          {product.detailedDescription}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mobileActiveTab === "explore" && (
            <div className="p-8 text-center text-xs font-bold text-[#4B5563] bg-white">
              Explore option will be provided shortly
            </div>
          )}
        </div>

        {/* Mobile Recommend Carousel */}
        {subcategoryProducts.length > 0 && (
          <div className="bg-white p-4 rounded-none shadow-none space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">Recommend</h3>
              <Link href="/search" className="text-xs font-bold text-[#2563EB]">View all</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar">
              {subcategoryProducts.map((item) => {
                const price = Number(item.price) || 0;
                const oldPrice = Number(item.oldPrice) || 0;
                const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                const formattedPriceVal = price.toLocaleString("en-IN");
                const formattedOldPriceVal = oldPrice.toLocaleString("en-IN");
                
                return (
                  <Link key={item.id} href={item.href} className="w-[150px] flex-shrink-0 flex flex-col space-y-2">
                    <div className="relative w-[150px] h-[146px] flex items-center justify-center bg-white border border-slate-100 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                      {discount > 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-[#EF4444] px-1 py-0.5 text-[8px] font-bold text-white">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col text-xs space-y-0.5">
                      <h4 className="text-[14.4px] font-bold text-[#2E3A54] leading-tight line-clamp-2 h-[40px]">
                        {item.name}
                      </h4>
                      <div className="flex items-baseline gap-1 mt-1 h-[22px]">
                        <span className="text-[16.8px] font-bold text-[#2563EB]">
                          ₹{formattedPriceVal}
                        </span>
                        {oldPrice > price && (
                          <span className="text-[10px] text-[#9CA3AF] line-through font-normal">₹{formattedOldPriceVal}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile You May Also Like Carousel */}
        {categoryProducts.length > 0 && (
          <div className="bg-white p-4 rounded-none shadow-none space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">You May Also Like</h3>
              <Link href="/search" className="text-xs font-bold text-[#2563EB]">View all</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar">
              {categoryProducts.map((item) => {
                const price = Number(item.price) || 0;
                const oldPrice = Number(item.oldPrice) || 0;
                const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                const formattedPriceVal = price.toLocaleString("en-IN");
                const formattedOldPriceVal = oldPrice.toLocaleString("en-IN");
                
                return (
                  <Link key={item.id} href={item.href} className="w-[150px] flex-shrink-0 flex flex-col space-y-2">
                    <div className="relative w-[150px] h-[146px] flex items-center justify-center bg-white border border-slate-100 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                      {discount > 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-[#EF4444] px-1 py-0.5 text-[8px] font-bold text-white">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col text-xs space-y-0.5">
                      <h4 className="text-[14.4px] font-bold text-[#2E3A54] leading-tight line-clamp-2 h-[40px]">
                        {item.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 truncate block h-[16px]">
                        {item.sellerName || "Winkget Store"}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1 h-[22px]">
                        <span className="text-[16.8px] font-bold text-[#2563EB]">
                          ₹{formattedPriceVal}
                        </span>
                        {oldPrice > price && (
                          <span className="text-[10px] text-[#9CA3AF] line-through font-normal">₹{formattedOldPriceVal}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile Seller Card Details */}
        {product.sellerName && (
          <div className="w-full bg-white border border-[#E5E7EB] shadow-sm flex flex-col my-4 text-left">
            <div className="bg-[#F8FAFC] p-4 flex items-center justify-between border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-xs text-white font-extrabold uppercase shrink-0">
                  {(product.sellerName || storeProduct.vendorName)?.slice(0, 2) || "SE"}
                </div>
                <div>
                  <h4 className="text-[17.5px] font-bold text-[#272727] leading-[25px]">{product.sellerName || storeProduct.vendorName}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#10B981] font-semibold leading-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <path d="M6 1L1.5 3V6C1.5 8.78 3.42 10.42 6 11C8.58 10.42 10.5 8.78 10.5 6V3L6 1Z" fill="#10B981" />
                      <path d="M4.5 6L5.5 7L7.5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Verified Seller</span>
                  </div>
                </div>
              </div>
              <Link 
                href={`/search?query=${encodeURIComponent(product.sellerName || storeProduct.vendorName || "")}`}
                className="flex items-center justify-center px-2 py-1.5 border border-slate-200 bg-[#2563EB] text-white font-bold text-[10px] rounded-lg shrink-0"
              >
                Visit Store
              </Link>
            </div>

            <div className="p-4 bg-white border-b border-[#E5E7EB] text-xs font-semibold text-[#2E3A54]">
              Raibareli Road, Sector 2, Vrindavan Colony
            </div>

            <div className="p-4 bg-white border-b border-[#E5E7EB] text-xs font-semibold text-[#2E3A54]">
              {product.deliveryByText || product.shippingTimeline || "EXPRESS Delivery by Tomorrow"}
            </div>

            <div className="p-4 bg-white text-xs text-slate-500 font-semibold">
              <div>
                Fulfilled by <span className="text-[#2E3A54] ml-1">{product.sellerName || "Winkget Store"}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                8 years with Winkget
              </div>
            </div>
          </div>
        )}

        {/* Mobile Reviews summary and breakdown */}
        {(() => {
          const totalReviews = productReviews.length;
          const ratingsCount = [0, 0, 0, 0, 0];
          productReviews.forEach(r => {
            const ratingIdx = Math.round(Number(r.rating || 5)) - 1;
            if (ratingIdx >= 0 && ratingIdx < 5) {
              ratingsCount[ratingIdx]++;
            }
          });

          if (totalReviews === 0) {
            ratingsCount[4] = 1;
          }

          const getPercent = (starsNum: number) => {
            const count = ratingsCount[starsNum - 1];
            const total = totalReviews || 1;
            return Math.round((count / total) * 100);
          };

          return (
            <div id="mobile-reviews-section" className="bg-white p-4 rounded-none shadow-none space-y-5 text-left">
              <h3 className="text-[14.4px] font-bold text-[#111827]">Customer Rating</h3>
              
              <div className="flex flex-row items-center justify-between gap-4 pb-2">
                <div className="flex-1 flex items-center gap-[13.8px] p-[9.2px] bg-[#F8FAFC] border border-slate-200 rounded-[8px] min-h-[99px]">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[27.7px] font-bold text-[#2E3A54]">{displayRating}</span>
                    <div className="flex text-[#F59E0B] text-[10px] mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < Math.round(Number(displayRating)) ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const percent = getPercent(stars);
                      return (
                        <div key={stars} className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#6B7280] w-2 font-semibold">{stars}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              style={{ width: `${percent}%` }} 
                              className="h-full bg-[#F59E0B] rounded-full"
                            />
                          </div>
                          <span className="text-slate-400 w-8 text-right font-medium">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-l border-[#E5E7EB] pl-6 shrink-0 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-[#111827] mt-2">
                    {hasDeliveredOrder ? "Share experience" : "Login to review"}
                  </h4>
                  <button
                    type="button"
                    onClick={handleWriteReviewClick}
                    className="mt-2.5 px-4 py-1.5 border border-[#2563EB] text-[#2563EB] text-[10px] font-bold rounded-lg hover:bg-blue-50/40 transition"
                  >
                    {hasDeliveredOrder ? "Write Review" : "Login"}
                  </button>
                </div>
              </div>

              {/* Mobile reviews feed */}
              <div className="space-y-3 pt-1">
                <h3 className="text-[14.4px] font-bold text-[#111827]">Customer Reviews</h3>
                {productReviews.length > 0 ? (
                  <div className="flex flex-col gap-3 py-2 w-full">
                    {productReviews.map((review, idx) => (
                      <div key={review.id || idx} className="w-full border border-[#E5E7EB] rounded-2xl p-4 space-y-3 bg-[#FFFFFF] shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-xs text-white font-extrabold uppercase shrink-0">
                            {review.userName?.slice(0, 1) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-[#111827]">{review.userName || "Customer"}</h4>
                              {review.isVerifiedPurchase !== false && (
                                <span className="text-[9px] bg-[#E6F4EA] text-[#137333] px-1.5 py-0.5 rounded font-bold">Verified</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[#F59E0B] text-[10px]">
                              <span>{Array.from({ length: 5 }).map((_, i) => (i < review.rating ? "★" : "☆"))}</span>
                              <span className="text-slate-400 font-medium">· {new Date(review.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                          </div>
                        </div>
                        {review.title && <h5 className="text-xs font-bold text-[#111827] line-clamp-1">{review.title}</h5>}
                        <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3 whitespace-pre-line">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E5E7EB]">
                    No customer reviews yet. Be the first to buy and review!
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Mobile Sticky Bottom Bar spacing box */}
        <div className="h-20" />

        {/* Mobile Sticky Bottom purchase Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-3 flex items-center justify-between z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3 w-full">
            {cartQuantity === 0 ? (
              <button
                type="button"
                onClick={handleAddToCart}
                style={{
                  display: "flex",
                  flex: 1,
                  minHeight: "49.477px",
                  padding: "12px 0",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "14.431px",
                  background: "#E9E9F2",
                  color: "#2E3A59",
                  textAlign: "center",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                  lineHeight: "normal"
                }}
              >
                Add to Cart
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minHeight: "49.477px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: "14.431px",
                  background: "#E9E9F2",
                  color: "#2E3A59",
                  padding: "0 20px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
                className="select-none"
              >
                <button
                  type="button"
                  onClick={() => updateCartQuantity(cartQuantity - 1)}
                  className="text-[#2E3A59] hover:opacity-80 font-extrabold text-lg w-6 h-6 flex items-center justify-center transition"
                >
                  -
                </button>
                <span>{cartQuantity}</span>
                <button
                  type="button"
                  onClick={() => updateCartQuantity(cartQuantity + 1)}
                  className="text-[#2E3A59] hover:opacity-80 font-extrabold text-lg w-6 h-6 flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onBuyNow}
              style={{
                display: "flex",
                flex: 1,
                minHeight: "49.477px",
                padding: "0 16px",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: "14.431px",
                background: "#0071E3",
                color: "#FFF",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-[12px] sm:text-[13px] font-bold leading-none tracking-wide">
                  {formattedPrice}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-white/90 uppercase leading-none mt-1">TOTAL</span>
              </div>
              <span className="text-[15.5px] font-bold leading-[20.6px] mr-3">Buy Now</span>
            </button>
          </div>
        </div>

      </div>

      {matchedOrder && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setMatchedOrder(null);
          }}
          order={matchedOrder}
          product={{ productId: product.sourceProductId || product.id, name: product.name, image: product.image }}
          onSuccess={(newReview) => {
            setProductReviews(prev => [newReview, ...prev]);
          }}
        />
      )}
    </div>
  );
}
