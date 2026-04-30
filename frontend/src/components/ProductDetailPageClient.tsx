"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { buildProductSlug } from "@/data/productSlug";
import type { ProductDetailModel, RelatedProductModel } from "@/lib/storeCatalog";
import {
  addToCart,
  CART_UPDATED_EVENT,
  isWishlisted,
  makeStoreProduct,
  readCart,
  setCartItemQuantity,
  toggleWishlist,
} from "@/lib/shopStorage";

type ProductDetailPageClientProps = {
  product: ProductDetailModel;
  relatedProducts?: RelatedProductModel[];
};

const KEY_ATTRIBUTE_PREVIEW_COUNT = 6;

const normalizePairs = (items: Array<[string, string]> | undefined) =>
  (Array.isArray(items) ? items : [])
    .map((item) => [String(item?.[0] || "").trim(), String(item?.[1] || "").trim()] as [string, string])
    .filter(([label, value]) => label && value);

const DESCRIPTION_TAB_COLLAPSED_LINES = 3;

const renderHighlightIcon = (label: string) => {
  const safeLabel = String(label || "").trim().toLowerCase();

  if (safeLabel.includes("cancel")) {
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-9-9" />
      </svg>
    );
  }

  if (safeLabel.includes("return")) {
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7H5m0 0V3m0 4l4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7a8 8 0 101.9-5.2" />
      </svg>
    );
  }

  if (safeLabel.includes("cash")) {
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 9v6" />
      </svg>
    );
  }

  if (safeLabel.includes("fast") || safeLabel.includes("delivery")) {
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h10V6H3v7zm10 0h3l2 2h3v-4l-2-3h-6v5z" />
        <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (safeLabel.includes("warranty")) {
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.2-2.5 7.5-7 9-4.5-1.5-7-4.8-7-9V6l7-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l1.5 1.5 3.5-4" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.4 4.8 5.3.8-3.8 3.7.9 5.2L12 15l-4.8 2.5.9-5.2-3.8-3.7 5.3-.8L12 3z" />
    </svg>
  );
};

export default function ProductDetailPageClient({
  product,
  relatedProducts = [],
}: ProductDetailPageClientProps) {
  const router = useRouter();
  const galleryImages = useMemo(() => {
    const images = Array.from(new Set([...(product.gallery || []), product.image].filter(Boolean)));
    return images.length > 0 ? images : [""];
  }, [product.gallery, product.image]);

  const [activeImage, setActiveImage] = useState(galleryImages[0] || product.image || "");
  const [showFullTabDescription, setShowFullTabDescription] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState("product-details");
  const [cartQuantity, setCartQuantity] = useState(0);
  const quantity = 1;

  const productHref = `/product/${encodeURIComponent(buildProductSlug(product))}`;
  const storeProduct = useMemo(() => makeStoreProduct(product, productHref), [product, productHref]);
  const wishlisted = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handleChange = () => onStoreChange();
      window.addEventListener("shop:wishlist-updated", handleChange as EventListener);
      window.addEventListener("storage", handleChange);

      return () => {
        window.removeEventListener("shop:wishlist-updated", handleChange as EventListener);
        window.removeEventListener("storage", handleChange);
      };
    },
    () => isWishlisted(product?.id),
    () => false
  );

  const discountText = useMemo(() => {
    const discount = Number(product.discount) || 0;
    return discount > 0 ? `${discount}% OFF` : "Best Price";
  }, [product.discount]);

  const shortDescription = useMemo(() => String(product.shortDescription || "").trim(), [product.shortDescription]);

  const detailedDescriptionBlocks = useMemo(() => {
    if (!Array.isArray(product.detailedDescriptionBlocks)) {
      return [];
    }

    return product.detailedDescriptionBlocks
      .map((item) => ({
        image: String(item?.image || "").trim(),
        headline: String(item?.headline || "").trim(),
        text: String(item?.text || "").trim(),
      }))
      .filter((item) => item.image || item.headline || item.text);
  }, [product.detailedDescriptionBlocks]);

  const currentPrice = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || currentPrice;
  const totalPrice = currentPrice * quantity;
  const recommendationProducts = relatedProducts.slice(0, 6);
  const youMayAlsoLikeProducts = relatedProducts.slice(6, 12);
  const safeSellerName = String(product.sellerName || "").trim();
  const descriptionText = useMemo(() => String(product.description || "").trim(), [product.description]);
  const descriptionParagraphs = useMemo(
    () => descriptionText.split(/\n+/).map((item) => item.trim()).filter(Boolean),
    [descriptionText]
  );
  const collapsedDescriptionText = useMemo(() => descriptionParagraphs.join(" "), [descriptionParagraphs]);
  const hasExpandableDescription =
    collapsedDescriptionText.length > 260 || descriptionParagraphs.length > DESCRIPTION_TAB_COLLAPSED_LINES;

  const isHiddenInfoLabel = (label: string) => /category|subcategory/i.test(String(label || ""));

  const specificationRows = useMemo(() => {
    const specPairs = normalizePairs(product.specifications);

    return specPairs.filter(([label]) => {
      const safeLabel = String(label || "").trim();
      if (!safeLabel || isHiddenInfoLabel(safeLabel)) {
        return false;
      }

      return !/purchase\s*price|discount\s*\(%\)|discount|trust\s*badge/i.test(safeLabel);
    });
  }, [product.specifications]);

  const resolvedKeyAttributes = useMemo(() => {
    const seedPairs = normalizePairs(product.keyAttributes);
    const specPairs = normalizePairs(product.specifications);
    const deduped = new Map<string, [string, string]>();

    [...seedPairs, ...specPairs].forEach(([label, value]) => {
      const key = String(label).toLowerCase();
      if (!deduped.has(key) && value) {
        deduped.set(key, [label, value]);
      }
    });

    return [...deduped.values()];
  }, [product.keyAttributes, product.specifications]);

  const infoTabs = useMemo(() => {
    const tabs = [
      {
        id: "product-details",
        label: "Description",
        enabled: Boolean(descriptionText),
      },
      {
        id: "specification",
        label: "Specification",
        enabled: specificationRows.length > 0,
      },
      {
        id: "detailed-description",
        label: "Detailed Description",
        enabled: detailedDescriptionBlocks.length > 0,
      },
      {
        id: "reviews",
        label: "Reviews",
        enabled: true,
      },
    ];

    const enabledTabs = tabs.filter((tab) => tab.enabled);
    return enabledTabs.length ? enabledTabs : [{ id: "product-details", label: "Product Details", enabled: true }];
  }, [
    detailedDescriptionBlocks.length,
    descriptionText,
    specificationRows.length,
  ]);
  const visibleInfoTab = infoTabs.some((tab) => tab.id === activeInfoTab)
    ? activeInfoTab
    : infoTabs[0]?.id || "product-details";

  const onSaveForLater = () => {
    toggleWishlist(storeProduct);
  };

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

  const onAddToCart = () => {
    addToCart(storeProduct, 1);
  };

  const updateCartQuantity = (nextQuantity: number) => {
    setCartItemQuantity(storeProduct.id, nextQuantity);
  };

  const onBuyNow = () => {
    addToCart(storeProduct, quantity);
    router.push("/checkout");
  };

  const breadcrumbCategoryLabel = String(product.categoryLabel || "").trim() || "Category";
  const breadcrumbVendorLabel = String(product.sellerName || product.vendorSource || "").trim() || "Vendor";
  const breadcrumbStoreLabel = "My Store";
  const breadcrumbProductLabel = String(product.name || "").trim() || "Product";
  const storeHref = product.storeId ? `/store/${encodeURIComponent(product.storeId)}` : "";

  return (
    <div className="space-y-0.5">
      <nav className="-mx-2 border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 sm:-mx-3">
        <Link href="/" className="hover:text-blue-700">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link href={`/category/${encodeURIComponent(product.categorySlug || "")}`} className="hover:text-blue-700">
          {breadcrumbCategoryLabel}
        </Link>
        <span className="px-2">/</span>
        <span className="text-slate-700">{breadcrumbVendorLabel}</span>
        <span className="px-2">/</span>
        {storeHref ? (
          <Link href={storeHref} className="hover:text-blue-700">
            {breadcrumbStoreLabel}
          </Link>
        ) : (
          <span className="text-slate-700">{breadcrumbStoreLabel}</span>
        )}
        <span className="px-2">/</span>
        <span className="text-slate-800">{breadcrumbProductLabel}</span>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="order-1">
            <div className="grid gap-4 xl:grid-cols-[minmax(340px,520px)_minmax(0,1fr)]">
              <div className="space-y-3 xl:flex xl:h-full xl:flex-col xl:space-y-0 xl:gap-5">
                <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="h-[400px] w-full">
                    <img src={activeImage} alt={product.name} className="h-full w-full object-contain" />
                  </div>
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    {discountText}
                  </span>
                  <div className="absolute right-3 top-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onSaveForLater}
                      className={`grid h-9 w-9 place-items-center rounded-full border shadow-sm ${
                        wishlisted
                          ? "border-[#d41158]/30 bg-[#f2ece4] text-[#d41158]"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                        <path d="M12.001 4.529a5.998 5.998 0 0 1 8.484 8.485l-7.778 7.778a1 1 0 0 1-1.414 0l-7.778-7.778a6 6 0 0 1 8.486-8.485Zm0 2.122-1.415-1.414a4 4 0 1 0-5.656 5.656l7.071 7.071 7.071-7.071a4 4 0 1 0-5.656-5.656l-1.415 1.414Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          void navigator.clipboard?.writeText(window.location.href);
                        }
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
                    >
                      ↗
                    </button>
                  </div>
                </div>

                <div className="mx-auto mt-3 w-full max-w-[520px] xl:mt-0">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map((image, index) => (
                      <button
                        key={`${product.id}-thumb-${index}`}
                        type="button"
                        onClick={() => setActiveImage(image)}
                        className={`shrink-0 overflow-hidden rounded-lg border bg-white p-0 ${
                          activeImage === image ? "border-blue-600 ring-1 ring-blue-200" : "border-slate-200"
                        }`}
                      >
                        <img src={image} alt={`${product.name} ${index + 1}`} className="h-[64px] w-[64px] object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {safeSellerName ? (
                  <p className="text-sm text-blue-700 underline-offset-2 hover:underline">Visit the {safeSellerName} Store</p>
                ) : null}
                <h1 className="text-3xl font-bold leading-tight text-slate-900">{product.name}</h1>
                {shortDescription ? <div className="text-[17px] leading-8 text-slate-700">{shortDescription}</div> : null}

                {resolvedKeyAttributes.length ? (
                  <div className="rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900">
                      Key Attributes
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-2 px-3 py-3 text-[15px]">
                      {resolvedKeyAttributes.slice(0, KEY_ATTRIBUTE_PREVIEW_COUNT).map(([label, value]) => (
                        <div key={label} className="contents">
                          <p className="font-semibold text-slate-700">{label}</p>
                          <p className="text-slate-700">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="order-2">
            <div className="sticky top-24 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-bold leading-none text-slate-900">{product.priceText}</p>
                {oldPrice > currentPrice ? (
                  <p className="pb-0.5 text-base text-slate-400 line-through">{product.oldPriceText}</p>
                ) : null}
                <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {discountText}
                </span>
                {product.shippingLabel ? (
                  <span className="text-xs font-medium text-emerald-700">{product.shippingLabel}</span>
                ) : null}
              </div>
              {product.deliveryByText ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-800">
                  Delivery by <span className="font-semibold">{product.deliveryByText}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-[minmax(0,1.12fr)_minmax(0,1.28fr)] gap-2">
                <button
                  type="button"
                  onClick={onSaveForLater}
                  className="min-w-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2 py-2 text-[11px] font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {wishlisted ? "WISHLISTED" : "SAVE FOR LATER"}
                </button>
                <div className="min-w-0 rounded-2xl border border-slate-300 bg-slate-50 p-1.5">
                  {cartQuantity > 0 ? (
                    <div className="inline-flex h-10 w-full min-w-0 items-stretch overflow-hidden rounded-xl border border-[#2f9e44] bg-[#2f9e44] text-white shadow-[0_8px_18px_rgba(47,158,68,0.22)]">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(cartQuantity - 1)}
                        className="grid w-10 shrink-0 place-items-center text-xl font-bold leading-none transition hover:bg-[#27873a]"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <div className="grid min-w-0 flex-1 place-items-center bg-[#2f9e44] text-sm font-extrabold text-white">
                        {cartQuantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(cartQuantity + 1)}
                        className="grid w-10 shrink-0 place-items-center text-xl font-bold leading-none transition hover:bg-[#27873a]"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onAddToCart}
                      className="inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-xl bg-orange-500 px-3 text-sm font-extrabold leading-none tracking-wide text-white transition hover:bg-orange-600"
                    >
                      ADD TO CART
                    </button>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onBuyNow}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-5 py-3 text-center text-base font-extrabold tracking-wide text-white ring-1 ring-cyan-300/70 shadow-[0_8px_18px_rgba(37,99,235,0.35)] transition hover:scale-[1.01] hover:from-blue-800 hover:via-blue-700 hover:to-cyan-600"
                >
                  BUY NOW
                </button>
              </div>

              {(safeSellerName || Number(product.reviews || 0) > 0) ? (
                <div className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700">
                  {safeSellerName ? (
                    <p>
                      Sold By: <span className="font-semibold text-[#d41158]">{safeSellerName}</span>
                    </p>
                  ) : null}
                   <p className="mt-3 text-xs text-slate-600">
                    Total: <span className="font-semibold text-slate-900">Rs. {totalPrice.toLocaleString("en-IN")}</span>
                  </p>
                  {Number(product.reviews || 0) > 0 ? (
                    <p className="mt-0.5 text-amber-500">
                      {Number(product.rating || 0).toFixed(1)} / 5 ({Number(product.reviews || 0)} reviews)
                    </p>
                  ) : null}
                </div>
              ) : null}

              {Array.isArray(product.highlights) && product.highlights.length > 0 ? (
                <div className="border-t border-slate-200 pt-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    {product.highlights.map((item) => (
                      <div
                        key={`${product.id}-highlight-${item}`}
                        className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-blue-600 shadow-sm ring-1 ring-slate-200">
                          {renderHighlightIcon(item)}
                        </span>
                        <span className="text-[11px] font-semibold leading-4 text-slate-700">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(product.showDeliveryBadge ||
                product.showTopBrand ||
                product.showFreeDelivery ||
                product.showSecureTransaction ||
                product.showCashOnDelivery ||
                product.show7DaySupport ||
                product.showAssured) ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3 md:grid-cols-4">
                    {product.showDeliveryBadge ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                          <path d="M20 8H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14l4-4V10c0-1.1-.9-2-2-2z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Delivered</span>
                      </div>
                    ) : null}
                    {product.showTopBrand ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Top Brand</span>
                      </div>
                    ) : null}
                    {product.showFreeDelivery ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Free Delivery</span>
                      </div>
                    ) : null}
                    {product.showSecureTransaction ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Secure</span>
                      </div>
                    ) : null}
                    {product.showCashOnDelivery ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                          <path d="M13 7h-2v5h2V7zm0 8h-2v2h2v-2z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">COD</span>
                      </div>
                    ) : null}
                    {product.show7DaySupport ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">7-Day</span>
                      </div>
                    ) : null}
                    {product.showAssured ? (
                      <div className="flex flex-col items-center gap-1">
                        <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Assured</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-3 py-2 sm:px-4">
          {infoTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInfoTab(tab.id)}
              className={`-mb-px border-b-2 px-2 py-2 text-sm font-semibold transition ${
                visibleInfoTab === tab.id
                  ? "border-[#d41158] text-[#d41158]"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {visibleInfoTab === "product-details" ? (
            <div className="space-y-4">
              {descriptionText ? (
                <>
                  {showFullTabDescription ? (
                    <div className="space-y-3">
                      {descriptionParagraphs.map((paragraph, index) => (
                        <p key={`${product.id}-description-${index}`} className="text-sm leading-7 text-slate-700">
                          {paragraph}
                        </p>
                      ))}
                      {hasExpandableDescription ? (
                        <button
                          type="button"
                          onClick={() => setShowFullTabDescription((previous) => !previous)}
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          View Less
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative text-sm leading-7 text-slate-700">
                      <p
                        className="overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: DESCRIPTION_TAB_COLLAPSED_LINES,
                        }}
                      >
                        {collapsedDescriptionText}
                      </p>
                      {hasExpandableDescription ? (
                        <div className="pointer-events-none absolute bottom-0 right-0 flex items-end bg-gradient-to-l from-white via-white to-transparent pl-12">
                          <button
                            type="button"
                            onClick={() => setShowFullTabDescription((previous) => !previous)}
                            className="pointer-events-auto bg-white text-sm font-semibold text-blue-700 hover:underline"
                          >
                            View More
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
              null
            )}
            </div>
          ) : null}

          {visibleInfoTab === "specification" ? (
            specificationRows.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-300">
                {specificationRows.map(([label, value]) => (
                  <div key={`${product.id}-spec-${label}`} className="grid grid-cols-2 border-b border-slate-200 last:border-b-0">
                    <p className="bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{label}</p>
                    <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Specifications are not available for this item.
              </p>
            )
          ) : null}

          {visibleInfoTab === "detailed-description" ? (
            detailedDescriptionBlocks.length ? (
              <div className="space-y-4 text-sm leading-6 text-slate-700">
                {detailedDescriptionBlocks.map((block, index) => (
                  <article key={`${product.id}-detail-block-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div
                      className={`grid gap-0 ${
                        block.image && (block.headline || block.text)
                          ? "md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]"
                          : ""
                      }`}
                    >
                      {block.image ? (
                        <div
                          className={`bg-slate-50 p-2 ${
                            block.headline || block.text ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""
                          }`}
                        >
                          <img
                            src={block.image}
                            alt={block.headline || `Detailed description ${index + 1}`}
                            className="mx-auto max-h-[360px] w-auto max-w-full object-contain"
                          />
                        </div>
                      ) : null}

                      {block.headline || block.text ? (
                        <div className="space-y-2 p-3 sm:p-4">
                          {block.headline ? <h3 className="text-base font-semibold text-slate-900">{block.headline}</h3> : null}
                          {block.text
                            ? block.text
                                .split(/\n+/)
                                .filter(Boolean)
                                .map((paragraph, paragraphIndex) => (
                                  <p key={`${product.id}-detail-block-${index}-text-${paragraphIndex}`}>{paragraph}</p>
                                ))
                            : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              null
            )
          ) : null}

          {visibleInfoTab === "reviews" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">Overall Rating</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-900">{Number(product.rating || 0).toFixed(1)}</p>
                  <p className="pb-1 text-sm text-slate-600">/ 5</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{Number(product.reviews || 0)} verified ratings</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-700">
                  {Number(product.reviews || 0) > 0
                    ? "Customer reviews will be listed here."
                    : "No review yet. Be the first customer to review this product."}
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                >
                  Write a Review
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Recommend</h2>
          {product.categorySlug ? (
            <Link href={`/category/${encodeURIComponent(product.categorySlug)}`} className="text-sm font-semibold text-blue-700 hover:underline">
              View all
            </Link>
          ) : null}
        </div>

        {recommendationProducts.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {recommendationProducts.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <Link href={item.href} className="block overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <img src={item.image} alt={item.name} className="h-36 w-full object-contain bg-white p-1" />
                </Link>
                <Link href={item.href} className="mt-2 block line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-700">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{item.sellerName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.priceText}</p>
                  {Number(item.oldPrice) > Number(item.price) ? (
                    <p className="text-xs text-slate-400 line-through">{item.oldPriceText}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Recommended products will appear here.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">You May Also Like</h2>
          {product.categorySlug ? (
            <Link href={`/category/${encodeURIComponent(product.categorySlug)}`} className="text-sm font-semibold text-blue-700 hover:underline">
              View all
            </Link>
          ) : null}
        </div>

        {youMayAlsoLikeProducts.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {youMayAlsoLikeProducts.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <Link href={item.href} className="block overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <img src={item.image} alt={item.name} className="h-36 w-full object-contain bg-white p-1" />
                </Link>
                <Link href={item.href} className="mt-2 block line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-700">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{item.sellerName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.priceText}</p>
                  {Number(item.oldPrice) > Number(item.price) ? (
                    <p className="text-xs text-slate-400 line-through">{item.oldPriceText}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            More products will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
