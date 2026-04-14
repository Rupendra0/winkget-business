"use client";

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
  specificationsText: string;
  mainImage: File | null;
  images: File[];
  storePlacement: "none" | "featured" | "trending";
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
  isObjectUrl?: boolean;
  isExisting?: boolean;
};

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

const normalizePlacement = (value: unknown): FieldValues["storePlacement"] => {
  if (value === "featured" || value === "trending") {
    return value;
  }

  return "none";
};

const createDefaultFieldValues = (initialProduct?: VendorProductRecord | null): FieldValues => ({
  productName: String(initialProduct?.productName || "").trim(),
  shortDescription: String(initialProduct?.shortDescription || "").trim(),
  longDescription: String(initialProduct?.description || "").trim(),
  mrp: Number.isFinite(Number(initialProduct?.oldPrice)) ? String(initialProduct?.oldPrice || "") : "",
  sellingPrice: Number.isFinite(Number(initialProduct?.price)) ? String(initialProduct?.price || "") : "",
  stock: Number.isFinite(Number(initialProduct?.inventory)) ? String(initialProduct?.inventory || "") : "",
  purchasePrice: "",
  discount: "",
  badge: String(initialProduct?.badge || "").trim(),
  brand: String(initialProduct?.brand || "").trim(),
  tagsText: Array.isArray(initialProduct?.tags) ? initialProduct.tags.join(", ") : "",
  attributesText: Array.isArray(initialProduct?.keyAttributes)
    ? initialProduct.keyAttributes.map((item) => `${item.label}: ${item.value}`).join("\n")
    : "",
  specificationsText: Array.isArray(initialProduct?.specifications)
    ? initialProduct.specifications.map((item) => `${item.label}: ${item.value}`).join("\n")
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function buildPreviewList(files: File[]): ImagePreview[] {
  return files.map((file, index) => ({
    id: `${file.name}-${file.lastModified || index}-${index}`,
    name: file.name,
    url: URL.createObjectURL(file),
  }));
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

      return {
        label,
        value: lineValue,
      };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

type CategorySelection = {
  categorySlug: string;
  subcategorySlug: string;
};

const findNestedSubcategoryMatch = (
  categoryOptions: VendorCatalogSubcategory[],
  nestedSlug: string
): { parent: VendorCatalogSubcategory; child: VendorCatalogSubcategory } | null => {
  const normalizedSlug = String(nestedSlug || "").trim();
  if (!normalizedSlug) {
    return null;
  }

  for (const category of categoryOptions) {
    const nestedChild = (category.childSubcategories || []).find((item) => item.slug === normalizedSlug);
    if (nestedChild) {
      return {
        parent: category,
        child: nestedChild,
      };
    }
  }

  return null;
};

const resolveRestaurantCategorySelection = (
  child2Options: VendorCatalogSubcategory[],
  initialCategorySlug: string,
  initialSubcategorySlug: string,
  preferredSubcategorySlug: string
): CategorySelection => {
  const normalizedCategorySlug = String(initialCategorySlug || "").trim();
  const normalizedSubcategorySlug = String(initialSubcategorySlug || "").trim();
  const normalizedPreferredSubcategorySlug = String(preferredSubcategorySlug || "").trim();

  let resolvedCategory =
    child2Options.find((item) => item.slug === normalizedCategorySlug) ||
    child2Options.find((item) => item.slug === normalizedSubcategorySlug) ||
    null;
  let resolvedSubcategory: VendorCatalogSubcategory | null = null;

  if (!resolvedCategory && normalizedSubcategorySlug) {
    const nestedInitial = findNestedSubcategoryMatch(child2Options, normalizedSubcategorySlug);
    if (nestedInitial) {
      resolvedCategory = nestedInitial.parent;
      resolvedSubcategory = nestedInitial.child;
    }
  }

  if (!resolvedCategory && normalizedPreferredSubcategorySlug) {
    const preferredCategory = child2Options.find((item) => item.slug === normalizedPreferredSubcategorySlug) || null;
    if (preferredCategory) {
      resolvedCategory = preferredCategory;
    } else {
      const nestedPreferred = findNestedSubcategoryMatch(child2Options, normalizedPreferredSubcategorySlug);
      if (nestedPreferred) {
        resolvedCategory = nestedPreferred.parent;
        resolvedSubcategory = nestedPreferred.child;
      }
    }
  }

  if (!resolvedCategory) {
    resolvedCategory = child2Options[0] || null;
  }

  if (!resolvedSubcategory) {
    const child3Options = Array.isArray(resolvedCategory?.childSubcategories)
      ? resolvedCategory.childSubcategories
      : [];
    resolvedSubcategory =
      child3Options.find((item) => item.slug === normalizedSubcategorySlug) || child3Options[0] || null;
  }

  return {
    categorySlug: String(resolvedCategory?.slug || "").trim(),
    subcategorySlug: String(resolvedSubcategory?.slug || "").trim(),
  };
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
    const fallbackCategory = categoryOptions.find((item) => item.slug === normalizedSubcategorySlug) || null;
    if (fallbackCategory) {
      resolvedCategory = fallbackCategory;
    }
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
    const child2Options = Array.isArray(resolvedCategory?.childSubcategories)
      ? resolvedCategory.childSubcategories
      : [];
    resolvedSubcategory = child2Options.find((item) => item.slug === normalizedSubcategorySlug) || null;
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

  const isRestaurantFlow = compactMode;
  const lockedCategorySlug = String(lockedCategory?.categorySlug || "").trim();
  const lockedSubcategorySlug = String(lockedCategory?.subcategorySlug || "").trim();
  const restaurantRootCategory = useMemo(() => {
    if (!isRestaurantFlow) {
      return null;
    }

    return categories.find((category) => category.slug === lockedCategorySlug) || categories[0] || null;
  }, [categories, isRestaurantFlow, lockedCategorySlug]);

  const categoryOptions = useMemo<VendorCatalogSubcategory[]>(() => {
    if (isRestaurantFlow) {
      return Array.isArray(restaurantRootCategory?.subcategories)
        ? restaurantRootCategory.subcategories
        : [];
    }

    const firstLayerOptions: VendorCatalogSubcategory[] = [];
    categories.forEach((category) => {
      const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
      subcategories.forEach((subcategory) => {
        firstLayerOptions.push({
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          parentSubcategoryId: subcategory.parentSubcategoryId,
          childSubcategories: Array.isArray(subcategory.childSubcategories)
            ? subcategory.childSubcategories
            : [],
        });
      });
    });

    return firstLayerOptions;
  }, [categories, isRestaurantFlow, restaurantRootCategory]);

  const resolveCategorySelection = useCallback(
    (product?: VendorProductRecord | null): CategorySelection => {
      const initialCategorySlug = String(product?.categorySlug || "").trim();
      const initialSubcategorySlug = String(product?.subcategorySlug || "").trim();

      if (isRestaurantFlow) {
        return resolveRestaurantCategorySelection(
          categoryOptions,
          initialCategorySlug,
          initialSubcategorySlug,
          lockedSubcategorySlug
        );
      }

      return resolveStandardCategorySelection(categoryOptions, initialCategorySlug, initialSubcategorySlug);
    },
    [categoryOptions, isRestaurantFlow, lockedSubcategorySlug]
  );

  const [categorySlug, setCategorySlug] = useState(() => resolveCategorySelection(initialProduct).categorySlug);
  const [subcategorySlug, setSubcategorySlug] = useState(() => resolveCategorySelection(initialProduct).subcategorySlug);

  useEffect(() => {
    const nextSelection = resolveCategorySelection(initialProduct);
    setCategorySlug(nextSelection.categorySlug);
    setSubcategorySlug(nextSelection.subcategorySlug);
  }, [initialProduct, resolveCategorySelection]);

  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => category.slug === categorySlug) || null,
    [categoryOptions, categorySlug]
  );
  const selectedCategorySlug = selectedCategory?.slug || "";

  const subcategoryOptions = useMemo(
    () => (Array.isArray(selectedCategory?.childSubcategories) ? selectedCategory.childSubcategories : []),
    [selectedCategory]
  );
  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((subcategory) => subcategory.slug === subcategorySlug) || null,
    [subcategoryOptions, subcategorySlug]
  );
  const selectedSubcategorySlug = selectedSubcategory?.slug || "";
  const selectedCategoryLabel = selectedCategory?.name || selectedCategorySlug;
  const selectedSubcategoryLabel = selectedSubcategory?.name || selectedSubcategorySlug;

  useEffect(() => {
    if (!selectedCategory) {
      if (subcategorySlug) {
        setSubcategorySlug("");
      }
      return;
    }

    if (subcategoryOptions.some((subcategory) => subcategory.slug === subcategorySlug)) {
      return;
    }

    setSubcategorySlug(subcategoryOptions[0]?.slug || "");
  }, [selectedCategory, subcategoryOptions, subcategorySlug]);

  const [fieldValues, setFieldValues] = useState<FieldValues>(() => createDefaultFieldValues(initialProduct));
  const [variants, setVariants] = useState<VariantDraft[]>(() => createInitialVariants(initialProduct));
  const [existingMainImageUrl, setExistingMainImageUrl] = useState(() => String(initialProduct?.image || "").trim());
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>(() =>
    Array.isArray(initialProduct?.gallery)
      ? initialProduct.gallery.map((item) => String(item || "").trim()).filter(Boolean)
      : []
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitNotice, setSubmitNotice] = useState<string>("");
  const [mainImageDragOver, setMainImageDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);

  const uploadedImagePreviews = useMemo(() => buildPreviewList(fieldValues.images), [fieldValues.images]);
  const existingImagePreviews = useMemo<ImagePreview[]>(
    () =>
      existingGalleryUrls.map((url, index) => ({
        id: `existing-${index}`,
        name: `Current image ${index + 1}`,
        url,
        isExisting: true,
      })),
    [existingGalleryUrls]
  );
  const imagePreviews = useMemo(() => [...existingImagePreviews, ...uploadedImagePreviews], [existingImagePreviews, uploadedImagePreviews]);

  useEffect(() => {
    return () => {
      uploadedImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [uploadedImagePreviews]);

  const mainImagePreview = useMemo<ImagePreview | null>(() => {
    if (fieldValues.mainImage instanceof File) {
      return {
        id: `${fieldValues.mainImage.name}-${fieldValues.mainImage.lastModified || 0}`,
        name: fieldValues.mainImage.name,
        url: URL.createObjectURL(fieldValues.mainImage),
        isObjectUrl: true,
      };
    }

    if (existingMainImageUrl) {
      return {
        id: "existing-main-image",
        name: "Current main image",
        url: existingMainImageUrl,
        isObjectUrl: false,
      };
    }

    return null;
  }, [fieldValues.mainImage, existingMainImageUrl]);

  useEffect(() => {
    return () => {
      if (mainImagePreview?.isObjectUrl) {
        URL.revokeObjectURL(mainImagePreview.url);
      }
    };
  }, [mainImagePreview]);

  const updateField = <K extends keyof FieldValues>(name: K, value: FieldValues[K]) => {
    setFieldValues((current) => ({ ...current, [name]: value }));
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

  const removeGalleryImage = (imageId: string) => {
    if (imageId.startsWith("existing-")) {
      const index = Number(imageId.replace("existing-", ""));
      if (Number.isFinite(index)) {
        setExistingGalleryUrls((current) => current.filter((_item, itemIndex) => itemIndex !== index));
      }
      return;
    }

    setFieldValues((current) => ({
      ...current,
      images: current.images.filter((file, index) => `${file.name}-${file.lastModified || index}-${index}` !== imageId),
    }));
  };

  const clearGalleryImages = () => {
    setExistingGalleryUrls([]);
    setFieldValues((current) => ({ ...current, images: [] }));
  };

  const clearMainImage = () => {
    setExistingMainImageUrl("");
    setFieldValues((current) => ({ ...current, mainImage: null }));
  };

  const openMainImagePicker = () => {
    mainImageInputRef.current?.click();
  };

  const handleMainImageFiles = (files: FileList | null | undefined) => {
    const selectedFile = files?.[0] || null;
    if (!selectedFile) {
      return;
    }

    setExistingMainImageUrl("");
    setFieldValues((current) => ({ ...current, mainImage: selectedFile }));
    setFieldErrors((current) => ({ ...current, mainImage: "" }));
  };

  const handleMainImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMainImageDragOver(false);
    handleMainImageFiles(event.dataTransfer?.files);
  };

  const handleMainImageDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMainImageDragOver(true);
  };

  const handleMainImageDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMainImageDragOver(false);
  };

  const openGalleryPicker = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryFiles = (files: FileList | null | undefined) => {
    if (!files?.length) {
      return;
    }

    const incomingFiles = Array.from(files);
    setFieldValues((current) => ({
      ...current,
      images: normalizeGalleryFiles(current.images, incomingFiles),
    }));
    setFieldErrors((current) => ({ ...current, images: "" }));
  };

  const handleGalleryDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setGalleryDragOver(false);
    handleGalleryFiles(event.dataTransfer?.files);
  };

  const handleGalleryDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setGalleryDragOver(true);
  };

  const handleGalleryDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setGalleryDragOver(false);
  };

  const onVariantChange = <K extends keyof VariantDraft>(variantId: string, key: K, value: VariantDraft[K]) => {
    setVariants((current) => current.map((item) => (item.id === variantId ? { ...item, [key]: value } : item)));
  };

  const resetForm = () => {
    const nextSelection = resolveCategorySelection(mode === "edit" ? initialProduct : null);

    if (mode === "edit" && initialProduct) {
      setCategorySlug(nextSelection.categorySlug);
      setSubcategorySlug(nextSelection.subcategorySlug);
      setFieldValues(createDefaultFieldValues(initialProduct));
      setVariants(createInitialVariants(initialProduct));
      setExistingMainImageUrl(String(initialProduct.image || "").trim());
      setExistingGalleryUrls(
        Array.isArray(initialProduct.gallery)
          ? initialProduct.gallery.map((item) => String(item || "").trim()).filter(Boolean)
          : []
      );
    } else {
      setCategorySlug(nextSelection.categorySlug);
      setSubcategorySlug(nextSelection.subcategorySlug);
      setFieldValues(createDefaultFieldValues());
      setVariants([createVariant()]);
      setExistingMainImageUrl("");
      setExistingGalleryUrls([]);
    }

    setFieldErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!String(selectedCategorySlug || "").trim()) {
      errors.categorySlug = "Category is required.";
    }

    const hasSelectableSubcategories = Array.isArray(subcategoryOptions) && subcategoryOptions.length > 0;
    if (hasSelectableSubcategories && !String(selectedSubcategorySlug || "").trim()) {
      errors.subcategorySlug = "Subcategory is required.";
    }

    if (!String(fieldValues.productName || "").trim()) {
      errors.productName = "Product name is required.";
    }

    if (!(fieldValues.mainImage instanceof File) && !existingMainImageUrl) {
      errors.mainImage = "Main image is required.";
    }

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
      setSubmitNotice("Please fill required fields first.");
      return;
    }

    try {
      const mainImageFile = fieldValues.mainImage;
      const mainImageDataUrl =
        mainImageFile instanceof File ? await readFileAsDataUrl(mainImageFile) : String(existingMainImageUrl || "").trim();
      const imageDataUrls = await Promise.all(fieldValues.images.map((file) => readFileAsDataUrl(file)));
      const orderedGallery = compactMode
        ? [String(mainImageDataUrl || "").trim()].filter(Boolean)
        : Array.from(
            new Set([mainImageDataUrl, ...existingGalleryUrls, ...imageDataUrls].map((item) => String(item || "").trim()).filter(Boolean))
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

      const keyAttributes = compactMode ? undefined : parseLabelValueLines(fieldValues.attributesText);
      const customSpecifications = compactMode ? undefined : parseLabelValueLines(fieldValues.specificationsText);
      const specifications = compactMode
        ? undefined
        : [
            { label: "Purchase Price", value: String(fieldValues.purchasePrice || "").trim() },
            { label: "Discount (%)", value: String(fieldValues.discount || "").trim() },
            ...(customSpecifications || []),
          ].filter((item) => item.value);

      const compactDescription = String(fieldValues.longDescription || fieldValues.shortDescription || "").trim();
      const compactShortDescription = compactDescription ? compactDescription.slice(0, 120).trim() : "";

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
        gallery: orderedGallery,
        price: Number(fieldValues.sellingPrice) || 0,
        oldPrice: Number(fieldValues.mrp) || 0,
        inventory: compactMode ? 0 : Number(fieldValues.stock) || 0,
        badge: compactMode ? undefined : String(fieldValues.badge || "").trim() || undefined,
        brand: compactMode ? undefined : String(fieldValues.brand || "").trim() || undefined,
        shortDescription: compactMode
          ? compactShortDescription || undefined
          : String(fieldValues.shortDescription || "").trim() || undefined,
        description: compactMode
          ? compactDescription || undefined
          : String(fieldValues.longDescription || "").trim() || undefined,
        tags: compactMode ? undefined : parseTagList(fieldValues.tagsText),
        keyAttributes,
        specifications,
        highlights: compactMode
          ? undefined
          : serializedVariants
              .filter((variant) => variant.size || variant.color)
              .map((variant) => `${variant.size || "Size"} ${variant.color || "Color"}`),
        variantData: compactMode ? undefined : serializedVariants,
        moq: compactMode
          ? 1
          : Number.isFinite(Number(initialProduct?.moq)) && Number(initialProduct?.moq) > 0
            ? Number(initialProduct?.moq)
            : 1,
        status: mode === "edit" ? initialProduct?.status || "live" : "live",
        sellerName: String(sellerName || "").trim() || "Vendor",
        vendorSource: "vendor-panel",
        sourcePlatform: "winkget_vendor",
        storePlacement: placement,
        isCancellable: compactMode ? undefined : true,
        isReturnable: compactMode ? undefined : true,
      };

      await onSubmitProduct(payload);

      setSubmitNotice(
        mode === "edit"
          ? compactMode
            ? "Menu item updated successfully."
            : "Product updated successfully."
          : compactMode
          ? "Menu item published successfully."
          : "Product published successfully."
      );
      resetForm();
      onClose();
    } catch {
      setSubmitNotice(compactMode ? "Failed to publish menu item. Please try again." : "Failed to publish product. Please try again.");
    }
  };

  return (
    <section className="relative z-10 h-[100dvh] w-full overflow-y-auto bg-white p-5 md:p-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-lg border border-gray-300 bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100 md:right-6 md:top-6"
      >
        Close
      </button>

      <form onSubmit={submitProduct} className="mt-2 space-y-5">
        <div className="rounded-2xl border border-[#ece4d6] bg-[#fffdfa] px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">
            {compactMode ? "Add menu item" : "Add Product"}
          </p>
        </div>

        <div className={`grid gap-5 ${compactMode ? "xl:grid-cols-[1.2fr_0.8fr]" : "xl:grid-cols-[1.45fr_1fr]"}`}>
          <div className="space-y-5 xl:sticky xl:top-5 self-start">
            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">
                {compactMode ? "Menu Item Information" : "General Information"}
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  {compactMode ? "Menu Item Name" : "Product Name"}<span className="ml-1 text-rose-500">*</span>
                  <input
                    type="text"
                    value={fieldValues.productName}
                    onChange={(event) => updateField("productName", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder={compactMode ? "Chicken Zinger Combo" : "Enter product name"}
                  />
                  {fieldErrors.productName ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.productName}</p> : null}
                </label>

                <>
                  <label className="block text-sm text-slate-700">
                    Category
                    <span className="ml-1 text-rose-500">*</span>
                    <select
                      value={selectedCategorySlug}
                      onChange={(event) => handleCategoryChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                    >
                      <option value="">{compactMode ? "Select first-layer category" : "Select category"}</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.categorySlug ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.categorySlug}</p> : null}
                  </label>

                  <label className="block text-sm text-slate-700">
                    SubCategory
                    {subcategoryOptions.length > 0 ? <span className="ml-1 text-rose-500">*</span> : null}
                    <select
                      value={selectedSubcategorySlug}
                      onChange={(event) => handleSubcategoryChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      disabled={!selectedCategory || subcategoryOptions.length === 0}
                    >
                      <option value="">{compactMode ? "Select second-layer subcategory" : "Select subcategory"}</option>
                      {subcategoryOptions.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.slug}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.subcategorySlug ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.subcategorySlug}</p> : null}
                  </label>
                </>

                {compactMode && restaurantRootCategory ? (
                  <p className="text-[11px] text-slate-500 md:col-span-2 md:-mt-2">
                    Menu hierarchy source: {restaurantRootCategory.name} -&gt; Category (first layer) -&gt; SubCategory (second layer).
                  </p>
                ) : null}

                {!compactMode ? (
                  <label className="block text-sm text-slate-700">
                    Short Description
                    <textarea
                      value={fieldValues.shortDescription}
                      onChange={(event) => updateField("shortDescription", event.target.value)}
                      className="mt-1 min-h-[62px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                      placeholder="Quick one-line summary"
                    />
                  </label>
                ) : null}

                <label className="block text-sm text-slate-700 md:col-span-2 md:-mt-1">
                  {compactMode ? "Menu Description" : "Description"}
                  <textarea
                    value={fieldValues.longDescription}
                    onChange={(event) => updateField("longDescription", event.target.value)}
                    className="mt-1 min-h-[92px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                    placeholder={compactMode ? "Describe this menu item" : "Detailed product description"}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">{compactMode ? "Pricing & Availability" : "Pricing & Stock"}</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  {compactMode ? "Original Price (optional)" : "MRP"}
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
                    className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                  />
                  {fieldErrors.sellingPrice ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.sellingPrice}</p> : null}
                </label>

                {!compactMode ? (
                  <>
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
                  </>
                ) : null}
              </div>
            </section>

            {!compactMode ? (
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
                    Badge
                    <input
                      type="text"
                      value={fieldValues.badge}
                      onChange={(event) => updateField("badge", event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      placeholder="Top Seller, 20% OFF"
                    />
                  </label>

                  <label className="block text-sm text-slate-700 md:col-span-2">
                    Tags (comma separated)
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
            ) : null}

            {!compactMode ? (
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
                          <input
                            type="text"
                            value={variant.variantSize}
                            onChange={(event) => onVariantChange(variant.id, "variantSize", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        </label>

                        <label className="block text-sm text-slate-700">
                          Color
                          <input
                            type="text"
                            value={variant.variantColor}
                            onChange={(event) => onVariantChange(variant.id, "variantColor", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        </label>

                        <label className="block text-sm text-slate-700">
                          MRP
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.variantMrp}
                            onChange={(event) => onVariantChange(variant.id, "variantMrp", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        </label>

                        <label className="block text-sm text-slate-700">
                          Selling Price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.variantSellingPrice}
                            onChange={(event) => onVariantChange(variant.id, "variantSellingPrice", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        </label>

                        <label className="block text-sm text-slate-700">
                          Stock
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.variantStock}
                            onChange={(event) => onVariantChange(variant.id, "variantStock", event.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        </label>

                        <label className="block text-sm text-slate-700 md:col-span-3">
                          Variant Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => onVariantChange(variant.id, "variantImage", event.target.files?.[0] || null)}
                            className="mt-1 block w-full text-sm"
                          />
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
            ) : null}
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Upload Images</h3>
              <div className="mt-3 space-y-4">
                <label className="block text-sm text-slate-700">
                  Main Image<span className="ml-1 text-rose-500">*</span>
                  <div className={`mt-1 rounded-xl border border-dashed p-3 ${fieldErrors.mainImage ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] bg-[#fffaf2]"}`}>
                    <div
                      className={`rounded-xl border-2 border-dashed p-4 transition ${mainImageDragOver ? "border-[#c7a97a] bg-[#fff4e1]" : "border-[#d9ccb7] bg-white/80"}`}
                      onDragEnter={handleMainImageDragOver}
                      onDragOver={handleMainImageDragOver}
                      onDragLeave={handleMainImageDragLeave}
                      onDrop={handleMainImageDrop}
                    >
                      <input
                        ref={mainImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleMainImageFiles(event.target.files)}
                        className="sr-only"
                      />

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Main image</p>
                          <p className="mt-1 text-xs text-slate-500">Drop one image here or choose from the button below.</p>
                        </div>
                        {mainImagePreview ? (
                          <button type="button" onClick={clearMainImage} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700">
                            Clear
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
                        <div className="grid h-56 w-full shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-[#d9ccb7] bg-[#fff4e1] p-3 sm:h-64 md:w-64">
                          {mainImagePreview ? (
                            <img src={mainImagePreview.url} alt={mainImagePreview.name} className="h-full w-full object-contain" />
                          ) : (
                            <div className="text-center text-xs text-slate-400">Preview</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700">{mainImagePreview ? mainImagePreview.name : "No file selected"}</p>
                          <p className="mt-1 text-xs text-slate-500">The image will be shown in full without cropping.</p>
                          <button
                            type="button"
                            onClick={openMainImagePicker}
                            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            Choose file
                          </button>
                        </div>
                      </div>
                    </div>
                    {fieldErrors.mainImage ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.mainImage}</p> : null}
                  </div>
                </label>

                {!compactMode ? (
                  <label className="block text-sm text-slate-700">
                    Gallery Images
                    <div className="mt-1 rounded-xl border border-dashed border-[#d9ccb7] bg-[#fffaf2] p-3">
                      <div
                        className={`rounded-xl border-2 border-dashed p-4 transition ${galleryDragOver ? "border-[#c7a97a] bg-[#fff4e1]" : "border-[#d9ccb7] bg-white/80"}`}
                        onDragEnter={handleGalleryDragOver}
                        onDragOver={handleGalleryDragOver}
                        onDragLeave={handleGalleryDragLeave}
                        onDrop={handleGalleryDrop}
                      >
                        <input
                          ref={galleryInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => handleGalleryFiles(event.target.files)}
                          className="sr-only"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Gallery images</p>
                            <p className="mt-1 text-xs text-slate-500">Drop images here or add from the tile below. Up to 10 images.</p>
                          </div>
                          {imagePreviews.length > 0 ? (
                            <button type="button" onClick={clearGalleryImages} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700">
                              Clear gallery
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 grid grid-cols-2 justify-items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {imagePreviews.map((image) => (
                            <div key={image.id} className="group w-full max-w-[220px] overflow-hidden rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] shadow-sm">
                              <div className="relative h-40 overflow-hidden bg-white p-2">
                                <img src={image.url} alt={image.name} className="h-full w-full object-contain" />
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(image.id)}
                                  className="absolute right-2 top-2 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-rose-600 shadow-sm"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="flex items-center justify-between gap-2 px-3 py-2">
                                <p className="truncate text-xs text-slate-500">{image.name}</p>
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Image</span>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={openGalleryPicker}
                            className="flex h-[200px] w-full max-w-[220px] items-center justify-center rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex flex-col items-center gap-2 text-slate-600">
                              <div className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 text-2xl text-slate-700">+</div>
                              <span className="text-sm font-medium">Add Image</span>
                              <span className="text-xs text-slate-400">Browse or drop</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </label>
                ) : null}
              </div>
            </section>

            {!compactMode ? (
              <>
                <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                  <h3 className="text-lg font-semibold text-slate-900">Attributes</h3>
                  <label className="mt-3 block text-sm text-slate-700">
                    Key Attributes (Label: Value, one per line)
                    <textarea
                      value={fieldValues.attributesText}
                      onChange={(event) => updateField("attributesText", event.target.value)}
                      className="mt-1 min-h-[100px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                      placeholder="Material: Cotton"
                    />
                  </label>
                </section>

                <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
                  <h3 className="text-lg font-semibold text-slate-900">Extra</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
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
                      Discount (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={fieldValues.discount}
                        onChange={(event) => updateField("discount", event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-[#d9ccb7] px-3 text-sm outline-none transition focus:border-[#c7a97a]"
                      />
                    </label>

                    <label className="block text-sm text-slate-700 md:col-span-2">
                      Additional Specifications (Label: Value, one per line)
                      <textarea
                        value={fieldValues.specificationsText}
                        onChange={(event) => updateField("specificationsText", event.target.value)}
                        className="mt-1 min-h-[90px] w-full rounded-lg border border-[#d9ccb7] px-3 py-2 text-sm outline-none transition focus:border-[#c7a97a]"
                        placeholder="Weight: 250g"
                      />
                    </label>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? mode === "edit"
                ? compactMode
                  ? "Updating Menu Item..."
                  : "Updating Product..."
                : compactMode
                ? "Publishing Menu Item..."
                : "Publishing Product..."
              : mode === "edit"
              ? compactMode
                ? "Update Menu Item"
                : "Update Product"
              : compactMode
              ? "Publish Menu Item"
              : "Publish Product"}
          </button>

          {submitNotice || actionMessage ? <p className="text-sm text-slate-600">{submitNotice || actionMessage}</p> : null}
          {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
        </div>
      </form>
    </section>
  );
}
