"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  VendorCatalogCategory,
  VendorCatalogSubcategory,
  VendorProductRecord,
  VendorProductUpsertInput,
} from "@/lib/vendorApi";
import { uploadToCloudinary } from "@/lib/cloudinaryHelper";

type VendorAddProductFormProps = {
  categories: VendorCatalogCategory[];
  lockedCategory?: {
    categorySlug: string;
    categoryLabel: string;
    subcategorySlug: string;
    subcategoryLabel: string;
  } | null;
  sellerName: string;
  mode?: "create" | "edit";
  initialProduct?: VendorProductRecord | null;
  saving: boolean;
  actionMessage: string | null;
  actionError: string | null;
  onSubmitProduct: (payload: VendorProductUpsertInput) => Promise<void>;
  onClose: () => void;
};

type VariantDraft = {
  id: string;
  variantSize: string;
  variantColor: string;
  variantMrp: string;
  variantSellingPrice: string;
  variantStock: string;
  variantBarcode: string;
  isVariantMapped?: boolean;
  variantMainImage: File | null;
  variantExistingMainImage: string;
  variantImages: File[];
  variantExistingImages: string[];
  customFields?: Record<string, string>;
};

type DescriptionBlock = {
  id: string;
  image: File | string | null;
  headline: string;
  text: string;
};

type SpecificationPair = {
  label: string;
  value: string;
};

type DescriptionPoint = {
  heading: string;
  content: string;
};

type FieldValues = {
  productName: string;
  barcode: string;
  shortDescription: string;
  mrp: string;
  sellingPrice: string;
  stock: string;
  purchasePrice: string;
  discount: string;
  badge: string;
  brand: string;
  tagsText: string;
  mainImage: File | null;
  images: File[];
  storePlacement: "none" | "featured" | "trending";
  originCountry: string;
  sellerName: string;
};

type CategorySelection = {
  categorySlug: string;
  subcategorySlug: string;
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
  source: "existing" | "new";
};

const MAX_PRODUCT_NAME_WORDS = 10;
const MAX_SHORT_DESCRIPTION_WORDS = 50;

const HIGHLIGHT_OPTIONS = [
  { key: "isCancellable", label: "Cancellable" },
  { key: "isReturnable", label: "Returnable" },
  { key: "cashOnDelivery", label: "Cash on Delivery" },
  { key: "fastDelivery", label: "Fast Delivery" },
  { key: "warrantyIncluded", label: "Warranty Included" },
  { key: "featuredQuality", label: "Featured Quality" },
  { key: "showDeliveryBadge", label: "Delivery Badge" },
  { key: "showTopBrand", label: "Top Brand" },
  { key: "showFreeDelivery", label: "Free Delivery" },
  { key: "showSecureTransaction", label: "Secure Transaction" },
  { key: "show7DaySupport", label: "7 Day Support" },
  { key: "showAssured", label: "Assured" },
] as const;

function VariantImageItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const previewUrl = URL.createObjectURL(file);
    setUrl(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [file]);

  if (!url) return null;

  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#e6dbcc] bg-white p-1 shadow-sm">
      <img src={url} alt="Variant preview" className="h-full w-full object-contain" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm hover:bg-rose-600 transition-colors"
        title="Remove image"
      >
        &times;
      </button>
    </div>
  );
}

const createVariant = (): VariantDraft => ({
  id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  variantSize: "",
  variantColor: "",
  variantMrp: "",
  variantSellingPrice: "",
  variantStock: "",
  variantBarcode: "",
  isVariantMapped: false,
  variantMainImage: null,
  variantExistingMainImage: "",
  variantImages: [],
  variantExistingImages: [],
  customFields: {},
});

const createDescriptionBlock = (): DescriptionBlock => ({
  id: `desc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  image: null,
  headline: "",
  text: "",
});

const countWords = (value: string) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const trimToWordLimit = (value: string, maxWords: number) => {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= maxWords) {
    return value;
  }

  return words.slice(0, maxWords).join(" ");
};

const normalizePlacement = (value: unknown): FieldValues["storePlacement"] => {
  if (value === "featured" || value === "trending") {
    return value;
  }

  return "none";
};

const parseSpecificationsInput = (value: unknown): SpecificationPair[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: String(item?.label || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.label || item.value);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((row) => {
      const separatorIndex = row.indexOf(":");
      if (separatorIndex === -1) {
        return { label: row.trim(), value: "" };
      }

      return {
        label: row.slice(0, separatorIndex).trim(),
        value: row.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((item) => item.label || item.value);
};

const serializeSpecificationsInput = (pairs: SpecificationPair[]) =>
  (Array.isArray(pairs) ? pairs : [])
    .map((pair) => ({
      label: String(pair.label || "").trim(),
      value: String(pair.value || "").trim(),
    }))
    .filter((item) => item.label || item.value)
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");

const readAttributeValue = (attributes: VendorProductRecord["keyAttributes"] | undefined, targetLabel: string) => {
  const normalizedTarget = String(targetLabel || "").trim().toLowerCase();
  const match = (Array.isArray(attributes) ? attributes : []).find(
    (item) => String(item?.label || "").trim().toLowerCase() === normalizedTarget
  );
  return String(match?.value || "").trim();
};

const createDefaultFieldValues = (initialProduct?: VendorProductRecord | null): FieldValues => ({
  productName: String(initialProduct?.productName || "").trim(),
  barcode: String(initialProduct?.barcode || "").trim(),
  shortDescription: String(initialProduct?.shortDescription || "").trim(),
  mrp: Number.isFinite(Number(initialProduct?.oldPrice)) ? String(initialProduct?.oldPrice || "") : "",
  sellingPrice: Number.isFinite(Number(initialProduct?.price)) ? String(initialProduct?.price || "") : "",
  stock: Number.isFinite(Number(initialProduct?.inventory)) ? String(initialProduct?.inventory || "") : "",
  purchasePrice: readAttributeValue(initialProduct?.keyAttributes, "Purchase Price"),
  discount: readAttributeValue(initialProduct?.keyAttributes, "Discount (%)"),
  badge: String(initialProduct?.badge || "").trim(),
  brand: String(initialProduct?.brand || "").trim(),
  tagsText: Array.isArray(initialProduct?.tags) ? initialProduct.tags.join(", ") : "",
  mainImage: null,
  images: [],
  storePlacement: normalizePlacement(initialProduct?.storePlacement),
  originCountry: String(initialProduct?.originCountry || "India").trim(),
  sellerName: String(initialProduct?.sellerName || "").trim(),
});

const createInitialVariants = (initialProduct?: VendorProductRecord | null): VariantDraft[] => {
  if (!Array.isArray(initialProduct?.variantData) || initialProduct.variantData.length === 0) {
    return [createVariant()];
  }

  return initialProduct.variantData.map((variant, index) => {
    let existing: string[] = [];
    const rawImage = String(variant.image || "").trim();
    if (rawImage) {
      if (rawImage.startsWith("[") && rawImage.endsWith("]")) {
        try {
          existing = JSON.parse(rawImage);
        } catch {
          existing = [rawImage];
        }
      } else {
        existing = [rawImage];
      }
    }
    const gallery = (variant as any).gallery || (variant as any).images;
    if (Array.isArray(gallery)) {
      existing = Array.from(new Set([...existing, ...gallery.map(String).filter(Boolean)]));
    }

    const mainImage = existing[0] || "";
    const galleryImages = existing.slice(1);

    return {
      id: `variant-existing-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      variantSize: String(variant.size || "").trim(),
      variantColor: String(variant.color || "").trim(),
      variantMrp: Number.isFinite(Number(variant.mrp)) ? String(variant.mrp || "") : "",
      variantSellingPrice: Number.isFinite(Number(variant.sellingPrice)) ? String(variant.sellingPrice || "") : "",
      variantStock: Number.isFinite(Number(variant.stock)) ? String(variant.stock || "") : "",
      variantBarcode: String((variant as any).barcode || "").trim(),
      isVariantMapped: !!(variant as any).barcode,
      variantMainImage: null,
      variantExistingMainImage: mainImage,
      variantImages: [],
      variantExistingImages: galleryImages,
      customFields: (variant as any).customFields || {},
    };
  });
};

const createInitialDescriptionBlocks = (initialProduct?: VendorProductRecord | null): DescriptionBlock[] => {
  if (Array.isArray(initialProduct?.detailedDescriptionBlocks) && initialProduct.detailedDescriptionBlocks.length > 0) {
    return initialProduct.detailedDescriptionBlocks.map((block) => ({
      id: `desc-existing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      image: String(block.image || "").trim(),
      headline: String(block.headline || "").trim(),
      text: String(block.text || "").trim(),
    }));
  }

  return [createDescriptionBlock()];
};

const createInitialDescriptionPoints = (initialProduct?: VendorProductRecord | null): DescriptionPoint[] => {
  if (Array.isArray((initialProduct as any)?.descriptionPoints) && (initialProduct as any).descriptionPoints.length > 0) {
    return (initialProduct as any).descriptionPoints.map((p: any) => ({
      heading: String(p?.heading || "").trim(),
      content: String(p?.content || "").trim(),
    }));
  }
  return [{ heading: "", content: "" }];
};

const createInitialHighlightValues = (initialProduct?: VendorProductRecord | null): Record<string, boolean> => {
  const highlightLabels = new Set(
    (Array.isArray(initialProduct?.highlights) ? initialProduct.highlights : [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return {
    isCancellable: Boolean(initialProduct?.isCancellable) || highlightLabels.has("cancellable"),
    isReturnable: Boolean(initialProduct?.isReturnable) || highlightLabels.has("returnable"),
    cashOnDelivery: highlightLabels.has("cash on delivery") || Boolean((initialProduct as any)?.showCashOnDelivery),
    fastDelivery: highlightLabels.has("fast delivery") || Boolean((initialProduct as any)?.showDeliveryBadge),
    warrantyIncluded: highlightLabels.has("warranty included"),
    featuredQuality: highlightLabels.has("featured quality"),
    showDeliveryBadge: Boolean((initialProduct as any)?.showDeliveryBadge),
    showTopBrand: Boolean((initialProduct as any)?.showTopBrand),
    showFreeDelivery: Boolean((initialProduct as any)?.showFreeDelivery),
    showSecureTransaction: Boolean((initialProduct as any)?.showSecureTransaction),
    show7DaySupport: Boolean((initialProduct as any)?.show7DaySupport),
    showAssured: Boolean((initialProduct as any)?.showAssured),
  };
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified || 0}`;
}

function normalizeGalleryFiles(existingFiles: File[], incomingFiles: File[]): File[] {
  return Array.from(new Map([...existingFiles, ...incomingFiles].map((file) => [getFileKey(file), file])).values()).slice(0, 10);
}

function parseTagList(value: string): string[] {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}



const calculateDiscountPercentage = (mrpValue: string, sellingPriceValue: string) => {
  const mrp = Number(mrpValue);
  const sellingPrice = Number(sellingPriceValue);

  if (!Number.isFinite(mrp) || mrp <= 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0 || sellingPrice >= mrp) {
    return "";
  }

  const discount = ((mrp - sellingPrice) / mrp) * 100;
  const roundedDiscount = Number(discount.toFixed(2));
  return roundedDiscount > 0 ? String(roundedDiscount) : "";
};

const findNestedSubcategoryMatch = (
  categoryOptions: VendorCatalogSubcategory[],
  nestedSlug: string
): { parent: VendorCatalogSubcategory; child: VendorCatalogSubcategory } | null => {
  const normalizedSlug = String(nestedSlug || "").trim();
  if (!normalizedSlug) return null;

  for (const category of categoryOptions) {
    const nestedChild = (category.childSubcategories || []).find((item) => item.slug === normalizedSlug);
    if (nestedChild) {
      return { parent: category, child: nestedChild };
    }
  }

  return null;
};

const resolveStandardCategorySelection = (
  categoryOptions: VendorCatalogSubcategory[],
  initialCategorySlug: string,
  initialSubcategorySlug: string
): CategorySelection => {
  const normalizedCategorySlug = String(initialCategorySlug || "").trim();
  const normalizedSubcategorySlug = String(initialSubcategorySlug || "").trim();
  let resolvedCategory = categoryOptions.find((item) => item.slug === normalizedCategorySlug) || null;
  let resolvedSubcategory: VendorCatalogSubcategory | null = null;

  if (!resolvedCategory && normalizedSubcategorySlug) {
    resolvedCategory = categoryOptions.find((item) => item.slug === normalizedSubcategorySlug) || null;
  }

  if (!resolvedCategory && normalizedSubcategorySlug) {
    const nestedMatch = findNestedSubcategoryMatch(categoryOptions, normalizedSubcategorySlug);
    if (nestedMatch) {
      resolvedCategory = nestedMatch.parent;
      resolvedSubcategory = nestedMatch.child;
    }
  }

  if (!resolvedCategory) {
    resolvedCategory = categoryOptions[0] || null;
  }

  if (!resolvedSubcategory) {
    const childOptions = Array.isArray(resolvedCategory?.childSubcategories) ? resolvedCategory.childSubcategories : [];
    resolvedSubcategory = childOptions.find((item) => item.slug === normalizedSubcategorySlug) || childOptions[0] || null;
  }

  return {
    categorySlug: String(resolvedCategory?.slug || "").trim(),
    subcategorySlug: String(resolvedSubcategory?.slug || "").trim(),
  };
};

export default function VendorAddProductForm({
  categories,
  lockedCategory,
  sellerName,
  mode = "create",
  initialProduct,
  saving,
  actionMessage,
  actionError,
  onSubmitProduct,
  onClose,
}: VendorAddProductFormProps) {
  const compactMode = false;
  const isServiceVendor = false;
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const highlightOptionsPopupRef = useRef<HTMLDivElement | null>(null);
  const isEditMode = mode === "edit";

  const [checkingBarcode, setCheckingBarcode] = useState(false);
  const [isBarcodeLocked, setIsBarcodeLocked] = useState(false);
  const [validatingVariantBarcodes, setValidatingVariantBarcodes] = useState<Record<string, boolean>>({});
  const [variantBarcodeMessages, setVariantBarcodeMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  const verifyBarcode = async () => {
    const code = String(fieldValues.barcode || "").trim();
    if (!code || isEditMode) return;

    setCheckingBarcode(true);
    setSubmitNotice("");
    try {
      const response = await fetch(`/api/vendor/products/check-barcode?barcode=${encodeURIComponent(code)}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.ok && payload.exists && payload.product) {
          const prod = payload.product;
          
          // Check if this barcode matches a variant of the matched product instead of parent
          const matchedVariant = (prod.variantData || []).find((v: any) => v.barcode === code);
          if (matchedVariant) {
            // Swap: Promote variant to parent, and demote parent defaults to a variant draft
            setFieldValues(current => ({
              ...current,
              productName: prod.productName || current.productName,
              shortDescription: prod.shortDescription || current.shortDescription,
              mrp: matchedVariant.mrp ? String(matchedVariant.mrp) : "",
              sellingPrice: matchedVariant.sellingPrice ? String(matchedVariant.sellingPrice) : "",
              stock: matchedVariant.stock ? String(matchedVariant.stock) : "",
              badge: prod.badge || current.badge,
              brand: prod.brand || current.brand,
              tagsText: Array.isArray(prod.tags) ? prod.tags.join(", ") : current.tagsText,
            }));

            if (prod.categorySlug) {
              handleCategoryChange(prod.categorySlug);
              if (prod.subcategorySlug) {
                setSubcategorySlug(prod.subcategorySlug);
              }
            }

            let varMainImg = matchedVariant.image || "";
            let varGallery = matchedVariant.gallery || [];
            setExistingMainImageUrl(varMainImg);
            setExistingGalleryUrls(varGallery.filter((g: string) => g !== varMainImg));

            const parentVariant: VariantDraft = {
              id: `variant-exchanged-${Date.now()}`,
              variantSize: "Parent Default",
              variantColor: "Original",
              variantMrp: prod.oldPrice ? String(prod.oldPrice) : "",
              variantSellingPrice: prod.price ? String(prod.price) : "",
              variantStock: prod.inventory ? String(prod.inventory) : "",
              variantBarcode: prod.barcode || "",
              isVariantMapped: !!prod.barcode,
              variantMainImage: null,
              variantExistingMainImage: prod.image || "",
              variantExistingImages: (prod.gallery || []).filter((g: string) => g !== prod.image),
              variantImages: [],
            };

            setVariants([parentVariant]);
            setIsBarcodeLocked(true);
            setSubmitNotice("Variant barcode detected! Promoted variant to main product and mapped parent details.");
          } else {
            // Normal parent barcode matched
            setFieldValues(current => ({
              ...current,
              productName: prod.productName || current.productName,
              shortDescription: prod.shortDescription || current.shortDescription,
              mrp: prod.oldPrice ? String(prod.oldPrice) : "",
              sellingPrice: prod.price ? String(prod.price) : "",
              stock: prod.inventory ? String(prod.inventory) : "",
              badge: prod.badge || current.badge,
              brand: prod.brand || current.brand,
              tagsText: Array.isArray(prod.tags) ? prod.tags.join(", ") : current.tagsText,
            }));

            if (prod.categorySlug) {
              handleCategoryChange(prod.categorySlug);
              if (prod.subcategorySlug) {
                setSubcategorySlug(prod.subcategorySlug);
              }
            }

            if (prod.image) {
              setExistingMainImageUrl(prod.image);
            }
            if (Array.isArray(prod.gallery)) {
              setExistingGalleryUrls(prod.gallery.filter((g: string) => g !== prod.image));
            }

            setIsBarcodeLocked(true);
            setSubmitNotice("Barcode matched! Product details pre-loaded from catalog.");
          }
        } else {
          setSubmitNotice("Barcode not found. You can enter product details manually.");
        }
      } else {
        setSubmitNotice("Barcode not found. You can enter product details manually.");
      }
    } catch (err) {
      console.error("Barcode check failed:", err);
      setSubmitNotice("Failed to check barcode. Please enter details manually.");
    } finally {
      setCheckingBarcode(false);
    }
  };

  const verifyVariantBarcode = async (variantId: string, barcodeVal: string) => {
    const code = String(barcodeVal || "").trim();
    if (!code) return;

    setValidatingVariantBarcodes(prev => ({ ...prev, [variantId]: true }));
    setVariantBarcodeMessages(prev => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });

    try {
      const response = await fetch(`/api/vendor/products/check-barcode?barcode=${encodeURIComponent(code)}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.ok && payload.exists && payload.product) {
          const matchedProduct = payload.product;

          // 1. Check if variant barcode is parent's barcode
          if (matchedProduct.barcode === code || matchedProduct.id === initialProduct?.id) {
            const mainImg = matchedProduct.image || "";
            const galleryImgs = matchedProduct.gallery || [];

            setVariants(current => current.map(v => {
              if (v.id === variantId) {
                return {
                  ...v,
                  variantMrp: matchedProduct.oldPrice ? String(matchedProduct.oldPrice) : v.variantMrp,
                  variantSellingPrice: matchedProduct.price ? String(matchedProduct.price) : v.variantSellingPrice,
                  variantStock: matchedProduct.inventory ? String(matchedProduct.inventory) : v.variantStock,
                  variantImages: [],
                  variantExistingImages: galleryImgs.filter((g: string) => g !== mainImg),
                  variantMainImage: null,
                  variantExistingMainImage: mainImg,
                  isVariantMapped: true,
                };
              }
              return v;
            }));

            setVariantBarcodeMessages(prev => ({
              ...prev,
              [variantId]: { type: 'success', text: 'Parent barcode matched! Mapped default product details onto this variant.' }
            }));
          } else {
            // 2. Otherwise search inside variants list
            const matchedVariant = (matchedProduct.variantData || []).find((v: any) => v.barcode === code);
            if (matchedVariant) {
              let sizeVal = matchedVariant.size || "";
              let colorVal = matchedVariant.color || "";
              let mainImg = matchedVariant.image || "";
              let galleryImgs = matchedVariant.gallery || [];

              setVariants(current => current.map(v => {
                if (v.id === variantId) {
                  return {
                    ...v,
                    variantSize: sizeVal || v.variantSize,
                    variantColor: colorVal || v.variantColor,
                    variantMrp: matchedVariant.mrp ? String(matchedVariant.mrp) : v.variantMrp,
                    variantSellingPrice: matchedVariant.sellingPrice ? String(matchedVariant.sellingPrice) : v.variantSellingPrice,
                    variantStock: matchedVariant.stock ? String(matchedVariant.stock) : v.variantStock,
                    variantImages: [],
                    variantExistingImages: galleryImgs.filter((g: string) => g !== mainImg),
                    variantMainImage: null,
                    variantExistingMainImage: mainImg,
                    isVariantMapped: true,
                  };
                }
                return v;
              }));

              setVariantBarcodeMessages(prev => ({
                ...prev,
                [variantId]: { type: 'success', text: 'Variant matched! Mapped details onto this variant.' }
              }));
            } else {
              setVariantBarcodeMessages(prev => ({
                ...prev,
                [variantId]: { type: 'error', text: 'Barcode matched another product but has no matching variant. Creating new.' }
              }));
            }
          }
        } else {
          setVariantBarcodeMessages(prev => ({
            ...prev,
            [variantId]: { type: 'success', text: 'New variant barcode. Please enter details manually.' }
          }));
        }
      } else {
        setVariantBarcodeMessages(prev => ({
          ...prev,
          [variantId]: { type: 'success', text: 'New variant barcode. Please enter details manually.' }
        }));
      }
    } catch (err) {
      console.error(err);
      setVariantBarcodeMessages(prev => ({
        ...prev,
        [variantId]: { type: 'error', text: 'Error verifying variant barcode.' }
      }));
    } finally {
      setValidatingVariantBarcodes(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const categoryOptions = useMemo<VendorCatalogSubcategory[]>(() => {
    const lockedCategorySlug = String(lockedCategory?.categorySlug || "").trim();
    const sourceCategories = compactMode && lockedCategorySlug
      ? categories.filter((category) => category.slug === lockedCategorySlug)
      : categories;
    const firstLayerOptions: VendorCatalogSubcategory[] = [];

    sourceCategories.forEach((category) => {
      const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
      if (subcategories.length === 0) {
        firstLayerOptions.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentSubcategoryId: undefined,
          childSubcategories: [],
        });
      } else {
        subcategories.forEach((subcategory) => {
          firstLayerOptions.push({
            id: subcategory.id,
            name: subcategory.name,
            slug: subcategory.slug,
            parentSubcategoryId: subcategory.parentSubcategoryId,
            childSubcategories: Array.isArray(subcategory.childSubcategories) ? subcategory.childSubcategories : [],
          });
        });
      }
    });

    return firstLayerOptions;
  }, [categories, compactMode, lockedCategory]);

  const resolveCategorySelection = useCallback(
    (product?: VendorProductRecord | null): CategorySelection =>
      resolveStandardCategorySelection(
        categoryOptions,
        String(product?.categorySlug || "").trim(),
        String(product?.subcategorySlug || lockedCategory?.subcategorySlug || "").trim()
      ),
    [categoryOptions, lockedCategory]
  );

  const [categorySlug, setCategorySlug] = useState(() => resolveCategorySelection(initialProduct).categorySlug);
  const [subcategorySlug, setSubcategorySlug] = useState(() => resolveCategorySelection(initialProduct).subcategorySlug);
  const [fieldValues, setFieldValues] = useState<FieldValues>(() => createDefaultFieldValues(initialProduct));
  const [variants, setVariants] = useState<VariantDraft[]>(() => createInitialVariants(initialProduct));
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>(() => createInitialDescriptionBlocks(initialProduct));
  const [specPairs, setSpecPairs] = useState<SpecificationPair[]>(() => parseSpecificationsInput(initialProduct?.specifications || []));
  const [descPairs, setDescPairs] = useState<DescriptionPoint[]>(() => createInitialDescriptionPoints(initialProduct));
  const [customVariantFields, setCustomVariantFields] = useState<string[]>([]);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [brandProfiles, setBrandProfiles] = useState<any[]>([]);

  const [existingMainImageUrl, setExistingMainImageUrl] = useState(() => String(initialProduct?.image || "").trim());
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>(() =>
    Array.isArray(initialProduct?.gallery) ? initialProduct.gallery.map((item) => String(item || "").trim()).filter(Boolean) : []
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitNotice, setSubmitNotice] = useState("");
  const [mainImageDragOver, setMainImageDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const [isHighlightOptionsOpen, setIsHighlightOptionsOpen] = useState(false);
  const [highlightValues, setHighlightValues] = useState<Record<string, boolean>>(() => createInitialHighlightValues(initialProduct));

  const [customHighlights, setCustomHighlights] = useState<string[]>(() => {
    const existing = initialProduct?.highlights || [];
    return existing.length > 0 ? existing : [""];
  });

  const addCustomHighlight = () => {
    setCustomHighlights((current) => [...current, ""]);
  };

  const removeCustomHighlight = (index: number) => {
    setCustomHighlights((current) => current.filter((_, i) => i !== index));
  };

  const updateCustomHighlight = (index: number, value: string) => {
    setCustomHighlights((current) =>
      current.map((item, i) => (i === index ? value : item))
    );
  };

  // Fetch brand profiles
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    fetch(`${backendUrl}/api/brands/public`)
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data?.brands) ? data.brands : [];
        setBrandProfiles(rows);
      })
      .catch(() => {});
  }, []);

  const brandOptions = useMemo(() => {
    const safeCategorySlug = String(categorySlug || "").trim().toLowerCase();
    const safeSubcategorySlug = String(subcategorySlug || "").trim().toLowerCase();

    const matchesCategorySubcategory = (brand: any) => {
      const groups = Array.isArray(brand?.categorySelections) && brand.categorySelections.length
        ? brand.categorySelections
        : [{ category: brand?.category, subcategories: brand?.subcategories }];

      return groups.some((group: any) => {
        const groupCategory = String(group?.category || "").trim().toLowerCase();
        if (!groupCategory || groupCategory !== safeCategorySlug) {
          return false;
        }

        const groupSubs = Array.isArray(group?.subcategories)
          ? group.subcategories
              .map((item: any) => {
                if (item && typeof item === "object") {
                  return String(item?.slug || item?.name || item?.label || "").trim().toLowerCase();
                }
                return String(item || "").trim().toLowerCase();
              })
              .filter(Boolean)
          : [];

        return groupSubs.includes(safeSubcategorySlug);
      });
    };

    const options = brandProfiles
      .filter((brand) => matchesCategorySubcategory(brand))
      .map((brand) => String(brand?.name || "").trim())
      .filter(Boolean);

    const unique = Array.from(new Set(options));
    const currentBrand = String(fieldValues.brand || "").trim();
    if (currentBrand && !unique.includes(currentBrand)) {
      unique.unshift(currentBrand);
    }

    return unique;
  }, [brandProfiles, categorySlug, subcategorySlug, fieldValues.brand]);

  // Sync discount dynamically
  useEffect(() => {
    const nextDiscount = calculateDiscountPercentage(fieldValues.mrp, fieldValues.sellingPrice);
    if (String(fieldValues.discount || "") === nextDiscount) {
      return;
    }

    setFieldValues((current) => ({
      ...current,
      discount: calculateDiscountPercentage(current.mrp, current.sellingPrice),
    }));
  }, [fieldValues.mrp, fieldValues.sellingPrice, fieldValues.discount]);

  useEffect(() => {
    const nextSelection = resolveCategorySelection(initialProduct);
    setCategorySlug(nextSelection.categorySlug);
    setSubcategorySlug(nextSelection.subcategorySlug);
    setFieldValues(createDefaultFieldValues(initialProduct));
    setVariants(createInitialVariants(initialProduct));
    setDescriptionBlocks(createInitialDescriptionBlocks(initialProduct));
    setSpecPairs(parseSpecificationsInput(initialProduct?.specifications || []));
    setDescPairs(createInitialDescriptionPoints(initialProduct));
    setExistingMainImageUrl(String(initialProduct?.image || "").trim());
    setExistingGalleryUrls(
      Array.isArray(initialProduct?.gallery) ? initialProduct.gallery.map((item) => String(item || "").trim()).filter(Boolean) : []
    );
    setHighlightValues(createInitialHighlightValues(initialProduct));
    setFieldErrors({});

    // Load custom variant fields
    const loadedCustomFields = new Set<string>();
    if (Array.isArray(initialProduct?.variantData)) {
      initialProduct.variantData.forEach((variant: any) => {
        if (variant?.customFields && typeof variant.customFields === "object") {
          Object.keys(variant.customFields).forEach((k) => loadedCustomFields.add(k));
        }
      });
    }
    setCustomVariantFields(Array.from(loadedCustomFields));
  }, [initialProduct, resolveCategorySelection]);

  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => category.slug === categorySlug) || null,
    [categoryOptions, categorySlug]
  );
  const subcategoryOptions = useMemo(
    () => (Array.isArray(selectedCategory?.childSubcategories) ? selectedCategory.childSubcategories : []),
    [selectedCategory]
  );
  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((subcategory) => subcategory.slug === subcategorySlug) || null,
    [subcategoryOptions, subcategorySlug]
  );
  const selectedCategorySlug = selectedCategory?.slug || "";
  const selectedSubcategorySlug = selectedSubcategory?.slug || "";
  const selectedCategoryLabel = selectedCategory?.name || selectedCategorySlug;
  const selectedSubcategoryLabel = selectedSubcategory?.name || selectedSubcategorySlug;

  useEffect(() => {
    if (!selectedCategory) {
      if (subcategorySlug) setSubcategorySlug("");
      return;
    }

    if (subcategoryOptions.some((subcategory) => subcategory.slug === subcategorySlug)) {
      return;
    }

    setSubcategorySlug(subcategoryOptions[0]?.slug || "");
  }, [selectedCategory, subcategoryOptions, subcategorySlug]);

  useEffect(() => {
    if (!isHighlightOptionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!highlightOptionsPopupRef.current?.contains(event.target as Node)) {
        setIsHighlightOptionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsHighlightOptionsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isHighlightOptionsOpen]);

  const mainImagePreview = useMemo<ImagePreview | null>(() => {
    if (fieldValues.mainImage instanceof File) {
      return {
        id: getFileKey(fieldValues.mainImage),
        name: fieldValues.mainImage.name,
        url: URL.createObjectURL(fieldValues.mainImage),
        source: "new",
      };
    }

    if (existingMainImageUrl) {
      return {
        id: "existing-main-image",
        name: "Current image",
        url: existingMainImageUrl,
        source: "existing",
      };
    }

    return null;
  }, [fieldValues.mainImage, existingMainImageUrl]);

  useEffect(() => {
    return () => {
      if (mainImagePreview?.source === "new") {
        URL.revokeObjectURL(mainImagePreview.url);
      }
    };
  }, [mainImagePreview]);

  const newGalleryPreviews = useMemo<ImagePreview[]>(
    () =>
      fieldValues.images.map((file, index) => ({
        id: `${file.name}-${file.lastModified || index}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        source: "new",
      })),
    [fieldValues.images]
  );

  useEffect(() => {
    return () => {
      newGalleryPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newGalleryPreviews]);

  const existingGalleryPreviews = useMemo<ImagePreview[]>(() => {
    const mainUrl = String(existingMainImageUrl || "").trim();
    const seen = new Set<string>();
    return existingGalleryUrls
      .map((url) => String(url || "").trim())
      .filter(Boolean)
      .filter((url) => url !== mainUrl)
      .filter((url) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((url, index) => ({
        id: `existing-gallery-${index}`,
        name: `Existing ${index + 1}`,
        url,
        source: "existing",
      }));
  }, [existingGalleryUrls, existingMainImageUrl]);

  const combinedGalleryPreviews = useMemo(
    () => [...existingGalleryPreviews, ...newGalleryPreviews],
    [existingGalleryPreviews, newGalleryPreviews]
  );

  const selectedExtraOptionsCount = useMemo(
    () => HIGHLIGHT_OPTIONS.filter((option) => highlightValues[option.key]).length,
    [highlightValues]
  );

  const descriptionBlockPreviews = useMemo(
    () => {
      const previews: Record<string, { url: string; isObjectUrl: boolean }> = {};

      descriptionBlocks.forEach((block) => {
        if (block.image instanceof File) {
          previews[block.id] = { url: URL.createObjectURL(block.image), isObjectUrl: true };
          return;
        }

        const url = String(block.image || "").trim();
        if (url) {
          previews[block.id] = { url, isObjectUrl: false };
        }
      });

      return previews;
    },
    [descriptionBlocks]
  );

  useEffect(() => {
    return () => {
      Object.values(descriptionBlockPreviews).forEach((preview) => {
        if (preview.isObjectUrl) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [descriptionBlockPreviews]);

  const updateField = <K extends keyof FieldValues>(name: K, value: FieldValues[K]) => {
    const nextValue =
      name === "productName" && typeof value === "string"
        ? trimToWordLimit(value, MAX_PRODUCT_NAME_WORDS)
        : name === "shortDescription" && typeof value === "string"
          ? value.slice(0, 150)
          : value;

    setFieldValues((current) => ({ ...current, [name]: nextValue }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleCategoryChange = (value: string) => {
    const nextCategory = categoryOptions.find((category) => category.slug === value) || null;
    const nextSubcategory = (nextCategory?.childSubcategories || [])[0] || null;
    setCategorySlug(nextCategory?.slug || "");
    setSubcategorySlug(nextSubcategory?.slug || "");
    setFieldErrors((current) => ({ ...current, categorySlug: "", subcategorySlug: "" }));
  };

  const handleSubcategoryChange = (value: string) => {
    setSubcategorySlug(value);
    setFieldErrors((current) => ({ ...current, subcategorySlug: "" }));
  };

  const handleMainImageFiles = (files: FileList | null | undefined) => {
    const selectedFile = files?.[0] || null;
    if (!selectedFile) return;
    setExistingMainImageUrl("");
    setFieldValues((current) => ({ ...current, mainImage: selectedFile }));
    setFieldErrors((current) => ({ ...current, mainImage: "" }));
  };

  const handleGalleryFiles = (files: FileList | null | undefined) => {
    if (!files?.length) return;
    setFieldValues((current) => ({
      ...current,
      images: normalizeGalleryFiles(current.images, Array.from(files)),
    }));
    setFieldErrors((current) => ({ ...current, images: "" }));
  };

  const removeGalleryImage = (imageId: string) => {
    if (imageId.startsWith("existing-gallery-")) {
      const image = existingGalleryPreviews.find((item) => item.id === imageId);
      if (image) {
        setExistingGalleryUrls((current) => current.filter((url) => String(url || "").trim() !== image.url));
      }
      return;
    }

    setFieldValues((current) => ({
      ...current,
      images: current.images.filter((file, index) => `${file.name}-${file.lastModified || index}-${index}` !== imageId),
    }));
  };

  const setGalleryImageAsMain = (image: ImagePreview) => {
    if (image.source === "existing") {
      const previousMain = String(existingMainImageUrl || "").trim();
      setExistingMainImageUrl(image.url);
      setExistingGalleryUrls((current) => {
        const withoutSelected = current.map((url) => String(url || "").trim()).filter((url) => url && url !== image.url);
        return previousMain && previousMain !== image.url ? [previousMain, ...withoutSelected] : withoutSelected;
      });
      setFieldValues((current) => {
        if (!(current.mainImage instanceof File)) return current;
        return {
          ...current,
          mainImage: null,
          images: normalizeGalleryFiles(current.images, [current.mainImage]),
        };
      });
      return;
    }

    setFieldValues((current) => {
      const imageIndex = current.images.findIndex((file, index) => `${file.name}-${file.lastModified || index}-${index}` === image.id);
      if (imageIndex < 0) return current;

      const selectedFile = current.images[imageIndex];
      const remainingGallery = current.images.filter((_file, index) => index !== imageIndex);
      const nextGallery = current.mainImage instanceof File
        ? normalizeGalleryFiles(remainingGallery, [current.mainImage])
        : remainingGallery;

      return {
        ...current,
        mainImage: selectedFile,
        images: nextGallery,
      };
    });
    setExistingMainImageUrl("");
  };

  const clearGalleryImages = () => {
    setExistingGalleryUrls([]);
    setFieldValues((current) => ({ ...current, images: [] }));
  };

  const clearMainImage = () => {
    setExistingMainImageUrl("");
    setFieldValues((current) => ({ ...current, mainImage: null }));
  };

  const onVariantChange = <K extends keyof VariantDraft>(variantId: string, key: K, value: VariantDraft[K]) => {
    setVariants((current) => current.map((item) => (item.id === variantId ? { ...item, [key]: value } : item)));
  };

  const handleAddCustomVariantField = () => {
    const cleaned = String(newCustomFieldName || "").trim();
    if (!cleaned) return;
    const standardNames = ["Size", "Color", "MRP", "Selling Price", "Stock", "Upload Image"];
    if (standardNames.map(s => s.toLowerCase()).includes(cleaned.toLowerCase()) || 
        ["size", "color", "mrp", "sellingprice", "stock", "image"].includes(cleaned.toLowerCase())) {
      alert("This is a standard variant field.");
      return;
    }
    if (customVariantFields.map(f => f.toLowerCase()).includes(cleaned.toLowerCase())) {
      alert("This field already exists.");
      return;
    }
    setCustomVariantFields((prev) => [...prev, cleaned]);
    setNewCustomFieldName("");
  };

  const handleRemoveCustomVariantField = (fieldName: string) => {
    setCustomVariantFields((prev) => prev.filter((f) => f !== fieldName));
    setVariants((current) =>
      current.map((variant) => {
        const nextCustom = { ...(variant.customFields || {}) };
        delete nextCustom[fieldName];
        return {
          ...variant,
          customFields: nextCustom,
        };
      })
    );
  };

  const addSpecification = () => {
    setSpecPairs((current) => [...current, { label: "", value: "" }]);
  };

  const removeSpecification = (index: number) => {
    setSpecPairs((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  };

  const updateSpecification = (index: number, key: keyof SpecificationPair, value: string) => {
    setSpecPairs((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const addDescriptionPoint = () => {
    setDescPairs((prev) => [...prev, { heading: "", content: "" }]);
  };

  const removeDescriptionPoint = (index: number) => {
    setDescPairs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ heading: "", content: "" }]));
  };

  const updateDescriptionPoint = (index: number, key: keyof DescriptionPoint, value: string) => {
    setDescPairs((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addDescriptionBlock = () => {
    setDescriptionBlocks((current) => [...current, createDescriptionBlock()]);
  };

  const removeDescriptionBlock = (blockId: string) => {
    setDescriptionBlocks((current) => (current.length > 1 ? current.filter((item) => item.id !== blockId) : current));
  };

  const onDescriptionBlockChange = <K extends keyof DescriptionBlock>(blockId: string, key: K, value: DescriptionBlock[K]) => {
    setDescriptionBlocks((current) => current.map((item) => (item.id === blockId ? { ...item, [key]: value } : item)));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCategorySlug) errors.categorySlug = "Category is required.";
    if (subcategoryOptions.length > 0 && !selectedSubcategorySlug) errors.subcategorySlug = "Subcategory is required.";
    if (!String(fieldValues.productName || "").trim()) {
      errors.productName = isServiceVendor ? "Service name is required." : "Product name is required.";
    }
    if (!String(fieldValues.barcode || "").trim()) {
      errors.barcode = "Barcode is required.";
    }
    if (!(fieldValues.mainImage instanceof File) && !existingMainImageUrl) errors.mainImage = "Main image is required.";

    const sellingPrice = Number(fieldValues.sellingPrice);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      errors.sellingPrice = "Selling price must be greater than 0.";
    }

    const activeVariants = compactMode ? [] : variants.filter(
      (v) =>
        v.variantSize ||
        v.variantColor ||
        Number(v.variantMrp) > 0 ||
        Number(v.variantSellingPrice) > 0 ||
        Number(v.variantStock) > 0 ||
        v.variantMainImage ||
        v.variantExistingMainImage ||
        v.variantBarcode ||
        Object.values(v.customFields || {}).some((val) => String(val || "").trim())
    );

    if (activeVariants.length > 0) {
      activeVariants.forEach((v) => {
        if (!String(v.variantBarcode || "").trim()) {
          errors[`variantBarcode-${v.id}`] = "Barcode is required.";
        }
      });
    }

    return errors;
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitNotice("");

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitNotice(Object.values(validationErrors)[0] || "Please fill required fields first.");
      return;
    }

    try {
      setSubmitNotice("Uploading product images...");
      const mainImageUrl = fieldValues.mainImage instanceof File
        ? await uploadToCloudinary(fieldValues.mainImage, "winkget_products")
        : String(existingMainImageUrl || "").trim();
      const newGalleryUrls = await Promise.all(
        fieldValues.images.map((file) => uploadToCloudinary(file, "winkget_products"))
      );
      const orderedGallery = Array.from(
        new Set([mainImageUrl, ...existingGalleryUrls, ...newGalleryUrls].map((item) => String(item || "").trim()).filter(Boolean))
      );

      const serializedVariantsRaw = await Promise.all(
        variants.map(async (variant) => {
          const mainImgUrl = variant.variantMainImage instanceof File
            ? await uploadToCloudinary(variant.variantMainImage, "winkget_products")
            : String(variant.variantExistingMainImage || "").trim();
            
          const newUrls = await Promise.all(
            (variant.variantImages || []).map((file) => uploadToCloudinary(file, "winkget_products"))
          );
          const existingUrls = Array.isArray(variant.variantExistingImages) ? variant.variantExistingImages : [];
          const combined = Array.from(
            new Set([mainImgUrl, ...existingUrls, ...newUrls].map((item) => String(item || "").trim()).filter(Boolean))
          );
          
          let serializedImage = "";
          if (combined.length === 1) {
            serializedImage = combined[0];
          } else if (combined.length > 1) {
            serializedImage = JSON.stringify(combined);
          }

          return {
            size: String(variant.variantSize || "").trim(),
            color: String(variant.variantColor || "").trim(),
            mrp: Number(variant.variantMrp) || 0,
            sellingPrice: Number(variant.variantSellingPrice) || 0,
            stock: Number(variant.variantStock) || 0,
            image: serializedImage,
            barcode: String(variant.variantBarcode || "").trim() || undefined,
            customFields: variant.customFields || {},
          };
        })
      );
      const serializedVariants = compactMode
        ? []
        : serializedVariantsRaw.filter(
            (variant) =>
              variant.size ||
              variant.color ||
              variant.mrp > 0 ||
              variant.sellingPrice > 0 ||
              variant.stock > 0 ||
              variant.image ||
              variant.barcode ||
              Object.values(variant.customFields || {}).some((v) => String(v || "").trim())
          );

      const serializedDescriptionBlocks = await Promise.all(
        descriptionBlocks.map(async (block) => ({
          image: block.image instanceof File ? await uploadToCloudinary(block.image, "winkget_products") : String(block.image || "").trim(),
          headline: String(block.headline || "").trim(),
          text: String(block.text || "").trim(),
        }))
      );
      const filteredDescriptionBlocks = serializedDescriptionBlocks.filter((block) => block.image || block.headline || block.text);

      const keyAttributes: Array<{ label: string; value: string }> = [];
      const purchasePrice = String(fieldValues.purchasePrice || "").trim();
      const discount = String(fieldValues.discount || "").trim();
      if (purchasePrice) keyAttributes.push({ label: "Purchase Price", value: purchasePrice });
      if (discount) keyAttributes.push({ label: "Discount (%)", value: discount });

      const specificationPayload = parseSpecificationsInput(serializeSpecificationsInput(specPairs)).filter((item) => item.label || item.value);
      const highlights = HIGHLIGHT_OPTIONS.filter((option) => highlightValues[option.key]).map((option) => option.label);
      const variantHighlights = serializedVariants
        .filter((variant) => variant.size || variant.color)
        .map((variant) => `${variant.size || "Size"} ${variant.color || "Color"}`);
      const placement =
        !compactMode && (fieldValues.storePlacement === "featured" || fieldValues.storePlacement === "trending")
          ? fieldValues.storePlacement
          : undefined;

      const payload: VendorProductUpsertInput = {
        categorySlug: selectedCategorySlug,
        categoryLabel: selectedCategoryLabel,
        subcategorySlug: selectedSubcategorySlug,
        subcategoryName: selectedSubcategoryLabel,
        productName: String(fieldValues.productName || "").trim(),
        barcode: String(fieldValues.barcode || "").trim(),
        image: orderedGallery[0] || "",
        gallery: compactMode ? orderedGallery.slice(0, 1) : orderedGallery,
        price: Number(fieldValues.sellingPrice) || 0,
        oldPrice: Number(fieldValues.mrp) || 0,
        inventory: compactMode ? 0 : Number(fieldValues.stock) || 0,
        badge: compactMode ? undefined : String(fieldValues.badge || "").trim() || undefined,
        brand: compactMode ? undefined : String(fieldValues.brand || "").trim() || undefined,
        shortDescription: String(fieldValues.shortDescription || "").trim() || undefined,
        description: String(fieldValues.shortDescription || "").trim() || undefined,
        tags: compactMode ? undefined : parseTagList(fieldValues.tagsText),
        keyAttributes: compactMode ? undefined : keyAttributes,
        specifications: compactMode ? undefined : specificationPayload,
        highlights: isServiceVendor || compactMode
          ? customHighlights.map((h) => String(h || "").trim()).filter(Boolean)
          : [...highlights, ...variantHighlights],
        variantData: compactMode ? undefined : serializedVariants,
        detailedDescriptionBlocks: compactMode ? undefined : filteredDescriptionBlocks,
        moq: Number.isFinite(Number(initialProduct?.moq)) && Number(initialProduct?.moq) > 0 ? Number(initialProduct?.moq) : 1,
        status: isEditMode ? initialProduct?.status || "live" : "live",
        sellerName: String(fieldValues.sellerName || sellerName || "").trim() || "Vendor",
        vendorSource: "vendor-panel",
        sourcePlatform: "winkget_business",
        storePlacement: placement,
        isCancellable: compactMode ? undefined : highlightValues.isCancellable,
        isReturnable: compactMode ? undefined : highlightValues.isReturnable,
        descriptionPoints: descPairs.map((p) => ({ heading: String(p?.heading || "").trim(), content: String(p?.content || "").trim() })).filter((p) => p.heading || p.content),
        showDeliveryBadge: highlightValues.showDeliveryBadge,
        showTopBrand: highlightValues.showTopBrand,
        showFreeDelivery: highlightValues.showFreeDelivery,
        showSecureTransaction: highlightValues.showSecureTransaction,
        showCashOnDelivery: highlightValues.cashOnDelivery,
        show7DaySupport: highlightValues.show7DaySupport,
        showAssured: highlightValues.showAssured,
        originCountry: String(fieldValues.originCountry || "").trim(),
      };

      await onSubmitProduct(payload);
      setSubmitNotice(
        isEditMode
          ? (isServiceVendor ? "Service updated successfully." : "Product updated successfully.")
          : (isServiceVendor ? "Service published successfully." : "Product published successfully.")
      );
      onClose();
    } catch (error) {
      const fallback = isEditMode
        ? (isServiceVendor ? "Failed to update service. Please try again." : "Failed to update product. Please try again.")
        : (isServiceVendor ? "Failed to publish service. Please try again." : "Failed to publish product. Please try again.");
      setSubmitNotice(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <section className="rounded-[24px] border-2 border-[#d9ccb7] bg-[linear-gradient(180deg,#fffaf3,#fff5e9)] px-4 py-4 shadow-[0_16px_40px_rgba(87,63,38,0.08)] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-semibold leading-tight text-slate-950">
            {isEditMode
              ? (isServiceVendor ? "Edit Service" : "Edit Product")
              : (isServiceVendor ? "Add Service" : "Add Product")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEditMode
              ? (isServiceVendor ? "Update existing service details using the same form." : "Update existing product details using the same form.")
              : (isServiceVendor ? "Upload details with multiple images and select a clear main service image." : "Upload details with multiple images and select a clear main product image.")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#d9ccb7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-[#fffaf3]"
        >
          Close
        </button>
      </div>

      <form onSubmit={submitProduct} className="mt-5 space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">General Information</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  {isServiceVendor ? "Service Name" : "Product Name"}<span className="ml-1 text-rose-500">*</span>
                  <input
                    type="text"
                    value={fieldValues.productName}
                    onChange={(event) => updateField("productName", event.target.value)}
                    className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.productName ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                    placeholder={isServiceVendor ? "Enter service name" : "Enter product name"}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Word limit: {countWords(fieldValues.productName)}/{MAX_PRODUCT_NAME_WORDS}
                  </p>
                  {fieldErrors.productName ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.productName}</p> : null}
                </label>

                <div className="block text-sm text-slate-700">
                  <span className="block text-sm text-slate-700 font-semibold mb-1">
                    Barcode<span className="ml-1 text-rose-500">*</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fieldValues.barcode}
                      onChange={(event) => updateField("barcode", event.target.value)}
                      className={`h-11 flex-1 rounded-lg border px-3 text-sm outline-none transition ${
                        fieldErrors.barcode ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                      }`}
                      placeholder="Enter barcode or SKU code"
                      disabled={isEditMode || isBarcodeLocked || checkingBarcode}
                    />
                    <button
                      type="button"
                      onClick={verifyBarcode}
                      disabled={isEditMode || isBarcodeLocked || !fieldValues.barcode.trim() || checkingBarcode}
                      className="h-11 px-4 rounded-lg bg-[#c7a97a] hover:bg-[#b09265] text-white text-xs font-bold transition disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {checkingBarcode ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                  {isBarcodeLocked && (
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">✓ Barcode Locked & Mapped</p>
                  )}
                  {fieldErrors.barcode ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.barcode}</p> : null}
                </div>

                <label className="block text-sm text-slate-700">
                  Category<span className="ml-1 text-rose-500">*</span>
                  <select
                    value={selectedCategorySlug}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                    className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.categorySlug ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categorySlug ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.categorySlug}</p> : null}
                </label>

                <label className="block text-sm text-slate-700">
                  SubCategory{subcategoryOptions.length > 0 ? <span className="ml-1 text-rose-500">*</span> : null}
                  <select
                    value={selectedSubcategorySlug}
                    onChange={(event) => handleSubcategoryChange(event.target.value)}
                    disabled={!selectedCategory || subcategoryOptions.length === 0}
                    className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.subcategorySlug ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                  >
                    <option value="">Select subcategory</option>
                    {subcategoryOptions.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.slug}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.subcategorySlug ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.subcategorySlug}</p> : null}
                </label>

                {isServiceVendor || compactMode ? null : (
                  <label className="block text-sm text-slate-700">
                    Origin Country<span className="ml-1 text-rose-500">*</span>
                    <select
                      value={fieldValues.originCountry}
                      onChange={(event) => updateField("originCountry", event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-[#d9ccb7] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    >
                      <option value="India">India</option>
                      <option value="Nepal">Nepal</option>
                      <option value="China">China</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                )}

                <label className="block text-sm text-slate-700 md:col-span-2">
                  Short Description
                  <textarea
                    value={fieldValues.shortDescription}
                    onChange={(event) => updateField("shortDescription", event.target.value)}
                    className="mt-1 min-h-[62px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder={isServiceVendor ? "Enter short service description" : "Enter short product description"}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Character limit: {fieldValues.shortDescription.length}/150
                  </p>
                </label>

                {/* --- Description Points (two-column: heading + content) --- */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-700">Description</p>
                    <span className="text-xs text-slate-500">Heading &amp; sub-content per row</span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {descPairs.map((pair, index) => (
                      <div key={`desc-point-${index}`} className="grid grid-cols-2 gap-2">
                        <textarea
                          value={pair.heading}
                          onChange={(e) => updateDescriptionPoint(index, "heading", e.target.value)}
                          placeholder="Heading"
                          className="h-16 w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                        />
                        <div className="relative">
                          <textarea
                            value={pair.content}
                            onChange={(e) => updateDescriptionPoint(index, "content", e.target.value)}
                            placeholder="Sub-content"
                            className="h-16 w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                          <button
                            type="button"
                            onClick={() => removeDescriptionPoint(index)}
                            className="absolute right-1 top-1 text-sm font-semibold text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addDescriptionPoint}
                      className="mt-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center font-bold text-slate-700 hover:border-slate-400"
                    >
                      Add Description
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Pricing & Stock</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  MRP
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fieldValues.mrp}
                    onChange={(event) => updateField("mrp", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  Selling Price<span className="ml-1 text-rose-500">*</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fieldValues.sellingPrice}
                    onChange={(event) => updateField("sellingPrice", event.target.value)}
                    className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.sellingPrice ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                  />
                  {fieldErrors.sellingPrice ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.sellingPrice}</p> : null}
                </label>
                {isServiceVendor || compactMode ? null : (
                  <>
                    <label className="block text-sm text-slate-700">
                      Purchase Price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fieldValues.purchasePrice}
                        onChange={(event) => updateField("purchasePrice", event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      Stock<span className="ml-1 text-rose-500">*</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={fieldValues.stock}
                        onChange={(event) => updateField("stock", event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      />
                    </label>
                  </>
                )}
                {isServiceVendor || compactMode ? null : (
                  <label className="block text-sm text-slate-700">
                    Store Placement
                    <select
                      value={fieldValues.storePlacement}
                      onChange={(event) => updateField("storePlacement", event.target.value as FieldValues["storePlacement"])}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    >
                      <option value="none">None</option>
                      <option value="featured">{isServiceVendor ? "Featured Service" : "Featured Product"}</option>
                      <option value="trending">{isServiceVendor ? "Trending Service" : "Trending Product"}</option>
                    </select>
                  </label>
                )}
              </div>
            </section>

            {compactMode ? null : (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <h3 className="text-lg font-semibold text-slate-900">{isServiceVendor ? "Tags" : "Brand & Tags"}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {isServiceVendor ? null : (
                    <label className="block text-sm text-slate-700">
                      Brand
                      <select
                        value={fieldValues.brand}
                        onChange={(event) => updateField("brand", event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      >
                        <option value="">Select Brand</option>
                        {brandOptions.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm text-slate-700">
                    Sold By
                    <input
                      type="text"
                      value={fieldValues.sellerName}
                      onChange={(event) => updateField("sellerName", event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      placeholder="Enter seller/store name"
                    />
                  </label>
                  <label className="block text-sm text-slate-700 md:col-span-2">
                    Tags
                    <input
                      type="text"
                      value={fieldValues.tagsText}
                      onChange={(event) => updateField("tagsText", event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      placeholder="Comma separated tags"
                    />
                  </label>
                </div>
              </section>
            )}

            {isServiceVendor || compactMode ? null : (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">Variants</h3>
                  <button
                    type="button"
                    onClick={() => setVariants((current) => [...current, createVariant()])}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    + Add Variant
                  </button>
                </div>

                {/* Custom variant columns input form */}
                <div className="mt-3 rounded-xl border border-dashed border-[#d9ccb7] bg-[#fffaf2] p-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        Add Custom Variant Field (e.g. RAM, Storage)
                      </label>
                      <input
                        type="text"
                        value={newCustomFieldName}
                        onChange={(e) => setNewCustomFieldName(e.target.value)}
                        placeholder="Enter field name..."
                        className="mt-1 h-9 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomVariantField}
                      className="h-9 rounded-lg bg-[#b49267] px-4 text-xs font-bold text-white hover:bg-[#967751] transition-colors"
                    >
                      Add Field
                    </button>
                  </div>

                  {customVariantFields.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {customVariantFields.map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#f3eae1] px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {field}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomVariantField(field)}
                            className="text-slate-400 hover:text-slate-600 font-bold text-sm leading-none"
                            title={`Remove ${field}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {variants.map((variant) => (
                    <div key={variant.id} className="rounded-xl border-2 border-[#d9ccb7] bg-[#fff8ef] p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block text-sm text-slate-700">
                          Size
                          <input
                            value={variant.variantSize}
                            onChange={(event) => onVariantChange(variant.id, "variantSize", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
                          Color
                          <input
                            value={variant.variantColor}
                            onChange={(event) => onVariantChange(variant.id, "variantColor", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
                          MRP
                          <input
                            type="number"
                            value={variant.variantMrp}
                            onChange={(event) => onVariantChange(variant.id, "variantMrp", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
                          Selling Price
                          <input
                            type="number"
                            value={variant.variantSellingPrice}
                            onChange={(event) => onVariantChange(variant.id, "variantSellingPrice", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
                          Stock
                          <input
                            type="number"
                            value={variant.variantStock}
                            onChange={(event) => onVariantChange(variant.id, "variantStock", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                          />
                        </label>

                        <div className="block text-sm text-slate-700">
                          Variant Barcode / UPC<span className="ml-1 text-rose-500">*</span>
                          <div className="mt-1 flex gap-2">
                            <input
                              type="text"
                              value={variant.variantBarcode || ""}
                              onChange={(event) => onVariantChange(variant.id, "variantBarcode", event.target.value)}
                              disabled={isEditMode || variant.isVariantMapped || validatingVariantBarcodes[variant.id]}
                              className="h-10 flex-1 rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a] disabled:bg-slate-100 disabled:text-slate-500"
                              placeholder="Scan or enter barcode"
                            />
                            <button
                              type="button"
                              onClick={() => verifyVariantBarcode(variant.id, variant.variantBarcode || "")}
                              disabled={isEditMode || variant.isVariantMapped || !(variant.variantBarcode || "").trim() || validatingVariantBarcodes[variant.id]}
                              className="h-10 px-3 rounded-lg bg-[#c7a97a] hover:bg-[#b09265] text-white text-[11px] font-bold transition disabled:bg-slate-300 disabled:text-slate-500"
                            >
                              {validatingVariantBarcodes[variant.id] ? "..." : "Verify"}
                            </button>
                          </div>
                          {variantBarcodeMessages[variant.id] && (
                            <p className={`mt-1 text-[10px] font-semibold ${variantBarcodeMessages[variant.id].type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {variantBarcodeMessages[variant.id].text}
                            </p>
                          )}
                          {fieldErrors[`variantBarcode-${variant.id}`] && (
                            <p className="mt-1 text-[10px] text-rose-600 font-semibold">{fieldErrors[`variantBarcode-${variant.id}`]}</p>
                          )}
                        </div>

                        {/* Custom fields inputs */}
                        {customVariantFields.map((fieldName) => (
                          <label key={fieldName} className="block text-sm text-slate-700">
                            {fieldName}
                            <input
                              type="text"
                              value={(variant.customFields && variant.customFields[fieldName]) || ""}
                              onChange={(event) => {
                                const val = event.target.value;
                                setVariants((current) =>
                                  current.map((item) =>
                                    item.id === variant.id
                                      ? {
                                          ...item,
                                          customFields: {
                                            ...(item.customFields || {}),
                                            [fieldName]: val,
                                          },
                                        }
                                      : item
                                  )
                                );
                              }}
className="mt-1 h-10 w-full rounded-lg border border-[#e6dbcc] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                            />
                          </label>
                        ))}

                        {/* Variant Main Image */}
                        <div className="block text-sm text-slate-700 md:col-span-3">
                          <span className="block text-sm font-semibold text-slate-700">Upload Variant Main Image</span>
                          <div className="mt-1.5 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(event) => (event.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-[#fffaf3] transition-colors"
                            >
                              Choose Main Image
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  onVariantChange(variant.id, "variantMainImage", file);
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onVariantChange(variant.id, "variantMainImage", null);
                                onVariantChange(variant.id, "variantExistingMainImage", "");
                              }}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Clear Main Image
                            </button>
                          </div>

                          {(variant.variantMainImage || variant.variantExistingMainImage) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {variant.variantMainImage ? (
                                <VariantImageItem
                                  file={variant.variantMainImage}
                                  onRemove={() => onVariantChange(variant.id, "variantMainImage", null)}
                                />
                              ) : variant.variantExistingMainImage ? (
                                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#e6dbcc] bg-white p-1 shadow-sm">
                                  <img src={variant.variantExistingMainImage} alt="Variant main existing" className="h-full w-full object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => onVariantChange(variant.id, "variantExistingMainImage", "")}
                                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm hover:bg-rose-600 transition-colors"
                                    title="Remove main image"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Variant Gallery Images */}
                        <div className="block text-sm text-slate-700 md:col-span-3 mt-4">
                          <span className="block text-sm font-semibold text-slate-700">Upload Variant Gallery Images</span>
                          <div className="mt-1.5 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(event) => (event.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-[#fffaf3] transition-colors"
                            >
                              Choose Gallery Files
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) => {
                                const files = Array.from(event.target.files || []);
                                if (files.length > 0) {
                                  onVariantChange(variant.id, "variantImages", [...(variant.variantImages || []), ...files]);
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onVariantChange(variant.id, "variantImages", []);
                                onVariantChange(variant.id, "variantExistingImages", []);
                              }}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Clear Gallery
                            </button>
                          </div>

                          {((variant.variantExistingImages && variant.variantExistingImages.length > 0) || 
                            (variant.variantImages && variant.variantImages.length > 0)) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(variant.variantExistingImages || []).map((url, idx) => (
                                <div key={`exist-gall-${idx}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#e6dbcc] bg-white p-1 shadow-sm">
                                  <img src={url} alt="Variant gallery existing" className="h-full w-full object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = variant.variantExistingImages.filter((_, i) => i !== idx);
                                      onVariantChange(variant.id, "variantExistingImages", updated);
                                    }}
                                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm hover:bg-rose-600 transition-colors"
                                    title="Remove gallery image"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                              {(variant.variantImages || []).map((file, idx) => (
                                <VariantImageItem
                                  key={`new-gall-${idx}`}
                                  file={file}
                                  onRemove={() => {
                                    const updated = variant.variantImages.filter((_, i) => i !== idx);
                                    onVariantChange(variant.id, "variantImages", updated);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVariants((current) => (current.length > 1 ? current.filter((item) => item.id !== variant.id) : current))}
                        className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600"
                      >
                        Remove Variant
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Upload Images</h3>
              <div className="mt-3 space-y-4">
                <div className={`rounded-xl border border-dashed p-3 ${fieldErrors.mainImage ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] bg-[#fffaf2]"}`}>
                  <div
                    className={`rounded-xl border-2 border-dashed p-3 transition ${mainImageDragOver ? "border-[#c7a97a] bg-[#fff4e1]" : "border-[#d9ccb7] bg-white/80"}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setMainImageDragOver(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setMainImageDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setMainImageDragOver(false);
                      handleMainImageFiles(event.dataTransfer?.files);
                    }}
                  >
                    <input ref={mainImageInputRef} type="file" accept="image/*" onChange={(event) => handleMainImageFiles(event.target.files)} className="sr-only" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Main image</p>
                        <p className="mt-1 text-xs text-slate-500">Drop, click, or pick from gallery thumbnails.</p>
                      </div>
                      {mainImagePreview ? (
                        <button type="button" onClick={clearMainImage} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                      <button
                        type="button"
                        onClick={() => mainImageInputRef.current?.click()}
                        className="grid h-40 w-full shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-[#d9ccb7] bg-[#fff4e1] p-2 sm:w-44"
                      >
                        {mainImagePreview ? <img src={mainImagePreview.url} alt={mainImagePreview.name} className="h-full w-full object-contain" /> : <div className="text-center text-xs text-slate-400">Main image preview</div>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700">{mainImagePreview ? mainImagePreview.name : "No file selected"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {isServiceVendor ? "This image will be used as service cover." : "This image will be used as product cover."}
                        </p>
                        <button type="button" onClick={() => mainImageInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                          Choose file
                        </button>
                      </div>
                    </div>
                  </div>
                  {fieldErrors.mainImage ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.mainImage}</p> : null}
                </div>

                {isServiceVendor || compactMode ? null : (
                  <div
                    className={`rounded-xl border-2 border-dashed p-3 transition ${galleryDragOver ? "border-[#c7a97a] bg-[#fff4e1]" : "border-[#d9ccb7] bg-white/80"}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setGalleryDragOver(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setGalleryDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setGalleryDragOver(false);
                      handleGalleryFiles(event.dataTransfer?.files);
                    }}
                  >
                    <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={(event) => handleGalleryFiles(event.target.files)} className="sr-only" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Gallery images</p>
                        <p className="mt-1 text-xs text-slate-500">Drop multiple images or pick files. Click Set Main on any thumbnail.</p>
                      </div>
                      {combinedGalleryPreviews.length ? (
                        <button type="button" onClick={clearGalleryImages} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          Clear gallery
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 justify-items-start gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {combinedGalleryPreviews.map((image) => (
                        <div key={image.id} className="group w-full max-w-[160px] overflow-hidden rounded-xl border border-[#d9ccb7] bg-[#fffdf8] shadow-sm">
                          <button type="button" onClick={() => setGalleryImageAsMain(image)} className="relative h-20 w-full overflow-hidden bg-white p-1" title="Set as main image">
                            <img src={image.url} alt={image.name} className="h-full w-full object-contain" />
                          </button>
                          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
                            <button type="button" onClick={() => removeGalleryImage(image.id)} className="flex-1 rounded-md border border-rose-200 px-2 py-1 text-center text-[10px] font-semibold text-rose-600">
                              Remove
                            </button>
                            <button type="button" onClick={() => setGalleryImageAsMain(image)} className="flex-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-center text-[10px] font-semibold text-blue-700">
                              Set Main
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex h-24 w-full max-w-[160px] items-center justify-center rounded-xl border-2 border-dashed border-[#d9ccb7] bg-[#fffdf8] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex flex-col items-center gap-2 text-slate-600">
                          <div className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-xl text-slate-700">+</div>
                          <span className="text-xs font-medium">Add Image</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {compactMode ? (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <h3 className="text-lg font-semibold text-slate-900">Discount</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-700">
                    Discount (%)
                    <input type="number" min="0" max="100" step="0.01" value={fieldValues.discount} onChange={(event) => updateField("discount", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]" />
                  </label>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <h3 className="text-lg font-semibold text-slate-900">Extra</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-700">
                    Trust Badge
                    <select
                      value={fieldValues.badge}
                      onChange={(event) => updateField("badge", event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-[#d9ccb7] bg-white px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    >
                      <option value="">Select Trust Badge</option>
                      <option value="New">New</option>
                      <option value="Hot">Hot</option>
                      <option value="Sale">Sale</option>
                      <option value="Best Seller">Best Seller</option>
                      <option value="Assured">Assured</option>
                    </select>
                  </label>
                  {isServiceVendor ? null : (
                    <>
                      <div>
                        <p className="text-sm text-slate-700">Highlight Options</p>
                        <div ref={highlightOptionsPopupRef} className="relative mt-1">
                          <button type="button" onClick={() => setIsHighlightOptionsOpen((previous) => !previous)} className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d9ccb7] bg-white px-3 text-sm font-medium text-slate-700">
                            <span>{selectedExtraOptionsCount ? `${selectedExtraOptionsCount} option(s) selected` : "Select Highlight Options"}</span>
                            <span className={`text-base text-slate-500 transition ${isHighlightOptionsOpen ? "rotate-180" : ""}`} aria-hidden="true">▾</span>
                          </button>
                          {isHighlightOptionsOpen ? (
                            <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-[#d9ccb7] bg-white p-2.5 shadow-lg">
                              <div className="grid max-h-56 gap-2 overflow-y-auto overflow-x-hidden sm:grid-cols-2">
                                {HIGHLIGHT_OPTIONS.map((field) => (
                                  <label key={field.key} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={highlightValues[field.key] === true}
                                      onChange={(event) => setHighlightValues((current) => ({ ...current, [field.key]: event.target.checked }))}
                                      className="h-4 w-4 accent-emerald-600"
                                    />
                                    <span className="break-words">{field.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <label className="block text-sm text-slate-700">
                        Discount (%)
                        <input type="number" min="0" max="100" step="0.01" value={fieldValues.discount} onChange={(event) => updateField("discount", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]" />
                      </label>
                    </>
                  )}
                </div>
              </section>
            )}

            {isServiceVendor || compactMode ? null : (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 font-semibold">
                    Product Specifications
                  </h3>
                  <span className="text-xs text-slate-500">One per row - label and value</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {specPairs.map((pair, index) => (
                    <div key={`spec-${index}`} className="grid grid-cols-2 gap-2">
                      <textarea value={pair.label} onChange={(event) => updateSpecification(index, "label", event.target.value)} placeholder="Enter label (e.g. Warranty)" className="h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <div className="relative">
                        <textarea value={pair.value} onChange={(event) => updateSpecification(index, "value", event.target.value)} placeholder="Enter text here" className="h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                        <button type="button" onClick={() => removeSpecification(index)} className="absolute right-1 top-1 text-sm font-semibold text-red-600">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addSpecification} className="mt-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center font-bold text-slate-700 hover:border-slate-400">
                    Add Specification
                  </button>
                </div>
              </section>
            )}

            {(isServiceVendor || compactMode) && (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Highlights / Key Points
                  </h3>
                  <span className="text-xs text-slate-500">Key features (e.g. ✓ Includes document drafting)</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {customHighlights.map((highlight, index) => (
                    <div key={`highlight-${index}`} className="relative flex items-center">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(event) => updateCustomHighlight(index, event.target.value)}
                        placeholder="e.g. Includes document drafting"
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#c7a97a] pr-12"
                      />
                      {customHighlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomHighlight(index)}
                          className="absolute right-3 text-sm font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomHighlight}
                    className="mt-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-center font-bold text-slate-700 hover:border-slate-400 text-sm"
                  >
                    + Add Highlight Point
                  </button>
                </div>
              </section>
            )}

            {isServiceVendor || compactMode ? null : (
              <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Long Description</h3>
                  <button type="button" onClick={addDescriptionBlock} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Add Block
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Add image, headline, and text blocks that appear in detailed description sections.</p>
                <div className="mt-3 space-y-3">
                  {descriptionBlocks.map((block, index) => {
                    const imagePreview = descriptionBlockPreviews[block.id]?.url || "";
                    return (
                      <div key={block.id} className="rounded-xl border border-[#d9ccb7] bg-white p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500">Block {index + 1}</p>
                          {descriptionBlocks.length > 1 ? (
                            <button type="button" onClick={() => removeDescriptionBlock(block.id)} className="text-sm font-semibold text-rose-600">
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <label className="block text-xs text-slate-600">
                          <input type="file" accept="image/*" onChange={(event) => onDescriptionBlockChange(block.id, "image", event.target.files?.[0] || null)} className="sr-only" />
                          <button type="button" onClick={(event) => (event.currentTarget.previousElementSibling as HTMLInputElement | null)?.click()} className="grid h-40 w-full place-items-center overflow-hidden rounded-lg border border-dashed border-[#d9ccb7] bg-[#f8f5ef]">
                            {imagePreview ? <img src={imagePreview} alt={`Long description ${index + 1}`} className="h-full w-full object-contain" /> : <span className="text-sm font-medium text-slate-500">Upload image</span>}
                          </button>
                        </label>
                        <textarea value={block.headline} onChange={(event) => onDescriptionBlockChange(block.id, "headline", event.target.value)} placeholder="Enter headline here" className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                        <textarea value={block.text} onChange={(event) => onDescriptionBlockChange(block.id, "text", event.target.value)} placeholder="Enter text here" className="mt-2 min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? (isEditMode
                  ? (isServiceVendor ? "Updating Service..." : "Updating Product...")
                  : (isServiceVendor ? "Publishing Service..." : "Publishing Product..."))
              : isEditMode
                ? (isServiceVendor ? "Update Service" : "Update Product")
                : (isServiceVendor ? "Publish Service" : "Publish Product")}
          </button>
          {submitNotice || actionMessage ? <p className="text-sm text-slate-600">{submitNotice || actionMessage}</p> : null}
          {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
        </div>
      </form>
    </section>
  );
}
