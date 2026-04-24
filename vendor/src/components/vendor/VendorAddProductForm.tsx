"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  VendorCatalogCategory,
  VendorCatalogSubcategory,
  VendorProductRecord,
  VendorProductUpsertInput,
} from "@/lib/vendorApi";

type VendorAddProductFormProps = {
  categories: VendorCatalogCategory[];
  lockedCategory?: {
    categorySlug: string;
    categoryLabel: string;
    subcategorySlug: string;
    subcategoryLabel: string;
  } | null;
  sellerName: string;
  compactMode?: boolean;
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
  variantImage: File | null;
  variantExistingImage: string;
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

type FieldValues = {
  productName: string;
  shortDescription: string;
  longDescription: string;
  mrp: string;
  sellingPrice: string;
  stock: string;
  purchasePrice: string;
  discount: string;
  badge: string;
  brand: string;
  tagsText: string;
  attributesText: string;
  mainImage: File | null;
  images: File[];
  storePlacement: "none" | "featured" | "trending";
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
] as const;

const createVariant = (): VariantDraft => ({
  id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  variantSize: "",
  variantColor: "",
  variantMrp: "",
  variantSellingPrice: "",
  variantStock: "",
  variantImage: null,
  variantExistingImage: "",
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
  shortDescription: String(initialProduct?.shortDescription || "").trim(),
  longDescription: String(initialProduct?.description || "").trim(),
  mrp: Number.isFinite(Number(initialProduct?.oldPrice)) ? String(initialProduct?.oldPrice || "") : "",
  sellingPrice: Number.isFinite(Number(initialProduct?.price)) ? String(initialProduct?.price || "") : "",
  stock: Number.isFinite(Number(initialProduct?.inventory)) ? String(initialProduct?.inventory || "") : "",
  purchasePrice: readAttributeValue(initialProduct?.keyAttributes, "Purchase Price"),
  discount: readAttributeValue(initialProduct?.keyAttributes, "Discount (%)"),
  badge: String(initialProduct?.badge || "").trim(),
  brand: String(initialProduct?.brand || "").trim(),
  tagsText: Array.isArray(initialProduct?.tags) ? initialProduct.tags.join(", ") : "",
  attributesText: Array.isArray(initialProduct?.keyAttributes)
    ? initialProduct.keyAttributes.map((item) => `${item.label}: ${item.value}`).join("\n")
    : "",
  mainImage: null,
  images: [],
  storePlacement: normalizePlacement(initialProduct?.storePlacement),
});

const createInitialVariants = (initialProduct?: VendorProductRecord | null): VariantDraft[] => {
  if (!Array.isArray(initialProduct?.variantData) || initialProduct.variantData.length === 0) {
    return [createVariant()];
  }

  return initialProduct.variantData.map((variant, index) => ({
    id: `variant-existing-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variantSize: String(variant.size || "").trim(),
    variantColor: String(variant.color || "").trim(),
    variantMrp: Number.isFinite(Number(variant.mrp)) ? String(variant.mrp || "") : "",
    variantSellingPrice: Number.isFinite(Number(variant.sellingPrice)) ? String(variant.sellingPrice || "") : "",
    variantStock: Number.isFinite(Number(variant.stock)) ? String(variant.stock || "") : "",
    variantImage: null,
    variantExistingImage: String(variant.image || "").trim(),
  }));
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

const createInitialHighlightValues = (initialProduct?: VendorProductRecord | null): Record<string, boolean> => {
  const highlightLabels = new Set(
    (Array.isArray(initialProduct?.highlights) ? initialProduct.highlights : [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return {
    isCancellable: Boolean(initialProduct?.isCancellable) || highlightLabels.has("cancellable"),
    isReturnable: Boolean(initialProduct?.isReturnable) || highlightLabels.has("returnable"),
    cashOnDelivery: highlightLabels.has("cash on delivery"),
    fastDelivery: highlightLabels.has("fast delivery"),
    warrantyIncluded: highlightLabels.has("warranty included"),
    featuredQuality: highlightLabels.has("featured quality"),
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

function parseLabelValueLines(value: string): Array<{ label: string; value: string }> {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex < 0) {
        return null;
      }

      const label = line.slice(0, colonIndex).trim();
      const lineValue = line.slice(colonIndex + 1).trim();
      if (!label || !lineValue) {
        return null;
      }

      return { label, value: lineValue };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

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
  compactMode = false,
  mode = "create",
  initialProduct,
  saving,
  actionMessage,
  actionError,
  onSubmitProduct,
  onClose,
}: VendorAddProductFormProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const highlightOptionsPopupRef = useRef<HTMLDivElement | null>(null);
  const isEditMode = mode === "edit";

  const categoryOptions = useMemo<VendorCatalogSubcategory[]>(() => {
    const lockedCategorySlug = String(lockedCategory?.categorySlug || "").trim();
    const sourceCategories = compactMode && lockedCategorySlug
      ? categories.filter((category) => category.slug === lockedCategorySlug)
      : categories;
    const firstLayerOptions: VendorCatalogSubcategory[] = [];

    sourceCategories.forEach((category) => {
      const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
      subcategories.forEach((subcategory) => {
        firstLayerOptions.push({
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          parentSubcategoryId: subcategory.parentSubcategoryId,
          childSubcategories: Array.isArray(subcategory.childSubcategories) ? subcategory.childSubcategories : [],
        });
      });
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

  useEffect(() => {
    const nextSelection = resolveCategorySelection(initialProduct);
    setCategorySlug(nextSelection.categorySlug);
    setSubcategorySlug(nextSelection.subcategorySlug);
    setFieldValues(createDefaultFieldValues(initialProduct));
    setVariants(createInitialVariants(initialProduct));
    setDescriptionBlocks(createInitialDescriptionBlocks(initialProduct));
    setSpecPairs(parseSpecificationsInput(initialProduct?.specifications || []));
    setExistingMainImageUrl(String(initialProduct?.image || "").trim());
    setExistingGalleryUrls(
      Array.isArray(initialProduct?.gallery) ? initialProduct.gallery.map((item) => String(item || "").trim()).filter(Boolean) : []
    );
    setHighlightValues(createInitialHighlightValues(initialProduct));
    setFieldErrors({});
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
          ? trimToWordLimit(value, MAX_SHORT_DESCRIPTION_WORDS)
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

  const addSpecification = () => {
    setSpecPairs((current) => [...current, { label: "", value: "" }]);
  };

  const removeSpecification = (index: number) => {
    setSpecPairs((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  };

  const updateSpecification = (index: number, key: keyof SpecificationPair, value: string) => {
    setSpecPairs((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
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
    if (!String(fieldValues.productName || "").trim()) errors.productName = "Product name is required.";
    if (!(fieldValues.mainImage instanceof File) && !existingMainImageUrl) errors.mainImage = "Main image is required.";

    const sellingPrice = Number(fieldValues.sellingPrice);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      errors.sellingPrice = "Selling price must be greater than 0.";
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
      const mainImageDataUrl = fieldValues.mainImage instanceof File
        ? await readFileAsDataUrl(fieldValues.mainImage)
        : String(existingMainImageUrl || "").trim();
      const newGalleryDataUrls = await Promise.all(fieldValues.images.map((file) => readFileAsDataUrl(file)));
      const orderedGallery = Array.from(
        new Set([mainImageDataUrl, ...existingGalleryUrls, ...newGalleryDataUrls].map((item) => String(item || "").trim()).filter(Boolean))
      );

      const serializedVariantsRaw = await Promise.all(
        variants.map(async (variant) => ({
          size: String(variant.variantSize || "").trim(),
          color: String(variant.variantColor || "").trim(),
          mrp: Number(variant.variantMrp) || 0,
          sellingPrice: Number(variant.variantSellingPrice) || 0,
          stock: Number(variant.variantStock) || 0,
          image: variant.variantImage ? await readFileAsDataUrl(variant.variantImage) : String(variant.variantExistingImage || "").trim(),
        }))
      );
      const serializedVariants = compactMode
        ? []
        : serializedVariantsRaw.filter(
            (variant) => variant.size || variant.color || variant.mrp > 0 || variant.sellingPrice > 0 || variant.stock > 0 || variant.image
          );

      const serializedDescriptionBlocks = await Promise.all(
        descriptionBlocks.map(async (block) => ({
          image: block.image instanceof File ? await readFileAsDataUrl(block.image) : String(block.image || "").trim(),
          headline: String(block.headline || "").trim(),
          text: String(block.text || "").trim(),
        }))
      );
      const filteredDescriptionBlocks = serializedDescriptionBlocks.filter((block) => block.image || block.headline || block.text);

      const keyAttributes = parseLabelValueLines(fieldValues.attributesText);
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
        image: orderedGallery[0] || "",
        gallery: compactMode ? orderedGallery.slice(0, 1) : orderedGallery,
        price: Number(fieldValues.sellingPrice) || 0,
        oldPrice: Number(fieldValues.mrp) || 0,
        inventory: compactMode ? 0 : Number(fieldValues.stock) || 0,
        badge: compactMode ? undefined : String(fieldValues.badge || "").trim() || undefined,
        brand: compactMode ? undefined : String(fieldValues.brand || "").trim() || undefined,
        shortDescription: String(fieldValues.shortDescription || "").trim() || undefined,
        description: String(fieldValues.longDescription || "").trim() || undefined,
        tags: compactMode ? undefined : parseTagList(fieldValues.tagsText),
        keyAttributes: compactMode ? undefined : keyAttributes,
        specifications: compactMode ? undefined : specificationPayload,
        highlights: compactMode ? undefined : [...highlights, ...variantHighlights],
        variantData: compactMode ? undefined : serializedVariants,
        detailedDescriptionBlocks: compactMode ? undefined : filteredDescriptionBlocks,
        moq: Number.isFinite(Number(initialProduct?.moq)) && Number(initialProduct?.moq) > 0 ? Number(initialProduct?.moq) : 1,
        status: isEditMode ? initialProduct?.status || "live" : "live",
        sellerName: String(sellerName || "").trim() || "Vendor",
        vendorSource: "vendor-panel",
        sourcePlatform: "winkget_vendor",
        storePlacement: placement,
        isCancellable: compactMode ? undefined : highlightValues.isCancellable,
        isReturnable: compactMode ? undefined : highlightValues.isReturnable,
      };

      await onSubmitProduct(payload);
      setSubmitNotice(isEditMode ? "Product updated successfully." : "Product published successfully.");
      onClose();
    } catch (error) {
      const fallback = isEditMode ? "Failed to update product. Please try again." : "Failed to publish product. Please try again.";
      setSubmitNotice(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <section className="rounded-[24px] border-2 border-[#d9ccb7] bg-[linear-gradient(180deg,#fffaf3,#fff5e9)] px-4 py-4 shadow-[0_16px_40px_rgba(87,63,38,0.08)] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-semibold leading-tight text-slate-950">{isEditMode ? "Edit Product" : "Add Product"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEditMode ? "Update existing product details using the same form." : "Upload details with multiple images and select a clear main product image."}
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
                  Product Name<span className="ml-1 text-rose-500">*</span>
                  <input
                    type="text"
                    value={fieldValues.productName}
                    onChange={(event) => updateField("productName", event.target.value)}
                    className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.productName ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                    placeholder="Enter product name"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Word limit: {countWords(fieldValues.productName)}/{MAX_PRODUCT_NAME_WORDS}
                  </p>
                  {fieldErrors.productName ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.productName}</p> : null}
                </label>

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

                <label className="block text-sm text-slate-700 md:col-span-2">
                  Short Description
                  <textarea
                    value={fieldValues.shortDescription}
                    onChange={(event) => updateField("shortDescription", event.target.value)}
                    className="mt-1 min-h-[62px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder="Enter short product description"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Word limit: {countWords(fieldValues.shortDescription)}/{MAX_SHORT_DESCRIPTION_WORDS}
                  </p>
                </label>

                <label className="block text-sm text-slate-700 md:col-span-2">
                  Description
                  <textarea
                    value={fieldValues.longDescription}
                    onChange={(event) => updateField("longDescription", event.target.value)}
                    className="mt-1 min-h-[120px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder="Enter long product description"
                  />
                </label>
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
                <label className="block text-sm text-slate-700">
                  Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fieldValues.stock}
                    onChange={(event) => updateField("stock", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  Store Placement
                  <select
                    value={fieldValues.storePlacement}
                    onChange={(event) => updateField("storePlacement", event.target.value as FieldValues["storePlacement"])}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                  >
                    <option value="none">None</option>
                    <option value="featured">Featured Product</option>
                    <option value="trending">Trending Product</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-700">Selected Details</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HIGHLIGHT_OPTIONS.filter((option) => highlightValues[option.key]).length ? (
                      HIGHLIGHT_OPTIONS.filter((option) => highlightValues[option.key]).map((option) => (
                        <span
                          key={option.key}
                          className="rounded-full border border-[#d9ccb7] bg-[#fff4e1] px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {option.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No details selected yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Brand & Tags</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Brand
                  <input
                    type="text"
                    value={fieldValues.brand}
                    onChange={(event) => updateField("brand", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder="Brand name"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  Tags
                  <input
                    type="text"
                    value={fieldValues.tagsText}
                    onChange={(event) => updateField("tagsText", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder="skincare, facewash"
                  />
                </label>
              </div>
            </section>

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
              <div className="mt-3 space-y-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="rounded-xl border-2 border-[#d9ccb7] bg-[#fff8ef] p-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block text-sm text-slate-700">
                        Size
                        <input value={variant.variantSize} onChange={(event) => onVariantChange(variant.id, "variantSize", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm text-slate-700">
                        Color
                        <input value={variant.variantColor} onChange={(event) => onVariantChange(variant.id, "variantColor", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm text-slate-700">
                        MRP
                        <input type="number" value={variant.variantMrp} onChange={(event) => onVariantChange(variant.id, "variantMrp", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm text-slate-700">
                        Selling Price
                        <input type="number" value={variant.variantSellingPrice} onChange={(event) => onVariantChange(variant.id, "variantSellingPrice", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm text-slate-700">
                        Stock
                        <input type="number" value={variant.variantStock} onChange={(event) => onVariantChange(variant.id, "variantStock", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                      </label>
                      <label className="block text-sm text-slate-700 md:col-span-3">
                        Variant Image
                        <input type="file" accept="image/*" onChange={(event) => onVariantChange(variant.id, "variantImage", event.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                      </label>
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
                        <p className="mt-1 text-xs text-slate-500">This image will be used as product cover.</p>
                        <button type="button" onClick={() => mainImageInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                          Choose file
                        </button>
                      </div>
                    </div>
                  </div>
                  {fieldErrors.mainImage ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.mainImage}</p> : null}
                </div>

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
              </div>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Attributes</h3>
              <label className="mt-3 block text-sm text-slate-700">
                Key Attributes
                <textarea value={fieldValues.attributesText} onChange={(event) => updateField("attributesText", event.target.value)} className="mt-1 min-h-[100px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]" placeholder="Material: Cotton" />
              </label>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Extra</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Badge
                  <input value={fieldValues.badge} onChange={(event) => updateField("badge", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]" />
                </label>
                <div>
                  <p className="text-sm text-slate-700">Highlight Options</p>
                  <div ref={highlightOptionsPopupRef} className="relative mt-1">
                    <button type="button" onClick={() => setIsHighlightOptionsOpen((previous) => !previous)} className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d9ccb7] bg-white px-3 text-sm font-medium text-slate-700">
                      <span>{selectedExtraOptionsCount ? `${selectedExtraOptionsCount} option(s) selected` : "Select Highlight Options"}</span>
                      <span className={`text-base text-slate-500 transition ${isHighlightOptionsOpen ? "rotate-180" : ""}`} aria-hidden="true">v</span>
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
                  Purchase Price
                  <input type="number" min="0" step="0.01" value={fieldValues.purchasePrice} onChange={(event) => updateField("purchasePrice", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]" />
                </label>
                <label className="block text-sm text-slate-700">
                  Discount (%)
                  <input type="number" min="0" max="100" step="0.01" value={fieldValues.discount} onChange={(event) => updateField("discount", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Product Specifications</h3>
                <span className="text-xs text-slate-500">One per row - label and value</span>
              </div>
              <div className="mt-3 grid gap-2">
                {specPairs.map((pair, index) => (
                  <div key={`spec-${index}`} className="grid grid-cols-2 gap-2">
                    <textarea value={pair.label} onChange={(event) => updateSpecification(index, "label", event.target.value)} placeholder="Enter text here" className="h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Detailed Description</h3>
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (isEditMode ? "Updating Product..." : "Publishing Product...") : isEditMode ? "Update Product" : "Publish Product"}
          </button>
          {submitNotice || actionMessage ? <p className="text-sm text-slate-600">{submitNotice || actionMessage}</p> : null}
          {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
        </div>
      </form>
    </section>
  );
}
