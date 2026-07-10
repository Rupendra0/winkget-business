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
import { Star, X, ShoppingCart, Heart } from "lucide-react";

type VendorAddServiceFormProps = {
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

type DescriptionPoint = {
  heading: string;
  content: string;
};

type FieldValues = {
  productName: string;
  shortDescription: string;
  mrp: string;
  sellingPrice: string;
  sellerName: string;
  mainImage: File | null;
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

const createInitialDescriptionPoints = (initialProduct?: VendorProductRecord | null): DescriptionPoint[] => {
  if (initialProduct?.descriptionPoints && Array.isArray(initialProduct.descriptionPoints) && initialProduct.descriptionPoints.length > 0) {
    return initialProduct.descriptionPoints.map((item) => ({
      heading: String(item?.heading || "").trim(),
      content: String(item?.content || "").trim(),
    }));
  }
  return [{ heading: "", content: "" }];
};

const countWords = (value: string) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const createDefaultFieldValues = (initialProduct?: VendorProductRecord | null): FieldValues => ({
  productName: String(initialProduct?.productName || "").trim(),
  shortDescription: String(initialProduct?.shortDescription || "").trim(),
  mrp: Number.isFinite(Number(initialProduct?.oldPrice)) ? String(initialProduct?.oldPrice || "") : "",
  sellingPrice: Number.isFinite(Number(initialProduct?.price)) ? String(initialProduct?.price || "") : "",
  sellerName: String(initialProduct?.sellerName || "").trim(),
  mainImage: null,
});

const resolveStandardCategorySelection = (
  options: VendorCatalogSubcategory[],
  catSlug: string,
  subcatSlug: string
): CategorySelection => {
  const safeCat = String(catSlug || "").trim();
  const safeSubcat = String(subcatSlug || "").trim();

  const matchSub = options.find((item) => item.slug === safeSubcat);
  if (matchSub) {
    return {
      categorySlug: safeCat || matchSub.slug,
      subcategorySlug: matchSub.slug,
    };
  }

  const matchCat = options.find((item) => item.slug === safeCat);
  if (matchCat) {
    return {
      categorySlug: matchCat.slug,
      subcategorySlug: "",
    };
  }

  if (options.length > 0) {
    return {
      categorySlug: options[0].slug,
      subcategorySlug: "",
    };
  }

  return { categorySlug: "", subcategorySlug: "" };
};

export default function VendorAddServiceForm({
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
}: VendorAddServiceFormProps) {
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = mode === "edit";

  const categoryOptions = useMemo<VendorCatalogSubcategory[]>(() => {
    const lockedCategorySlug = String(lockedCategory?.categorySlug || "").trim();
    const sourceCategories = lockedCategorySlug
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
  }, [categories, lockedCategory]);

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
  const [descPairs, setDescPairs] = useState<DescriptionPoint[]>(() => createInitialDescriptionPoints(initialProduct));

  const [existingMainImageUrl, setExistingMainImageUrl] = useState(() => String(initialProduct?.image || "").trim());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitNotice, setSubmitNotice] = useState("");
  const [mainImageDragOver, setMainImageDragOver] = useState(false);

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

  const mainImagePreview = useMemo<ImagePreview | null>(() => {
    if (fieldValues.mainImage instanceof File) {
      return {
        id: "main-new",
        name: fieldValues.mainImage.name,
        url: URL.createObjectURL(fieldValues.mainImage),
        source: "new",
      };
    }

    const existingUrl = String(existingMainImageUrl || "").trim();
    if (existingUrl) {
      return {
        id: "main-existing",
        name: "Current main image",
        url: existingUrl,
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

  const handleMainImageFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      setFieldValues((current) => ({ ...current, mainImage: file }));
      setExistingMainImageUrl("");
      setFieldErrors((current) => ({ ...current, mainImage: "" }));
    }
  };

  const clearMainImage = () => {
    setExistingMainImageUrl("");
    setFieldValues((current) => ({ ...current, mainImage: null }));
  };

  const selectedCategory = useMemo(() => {
    const slug = String(categorySlug || "").trim().toLowerCase();
    return categories.find((item) => String(item.slug || "").trim().toLowerCase() === slug);
  }, [categories, categorySlug]);

  const selectedSubcategory = useMemo(() => {
    const subSlug = String(subcategorySlug || "").trim().toLowerCase();
    const subcategories = Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : [];
    return subcategories.find((item) => String(item.slug || "").trim().toLowerCase() === subSlug);
  }, [selectedCategory, subcategorySlug]);

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }
    return Array.isArray(selectedCategory.subcategories) ? selectedCategory.subcategories : [];
  }, [selectedCategory]);

  const selectedCategorySlug = useMemo(() => {
    if (categorySlug) return categorySlug;
    if (categoryOptions.length > 0) return categoryOptions[0].slug;
    return "";
  }, [categorySlug, categoryOptions]);

  const selectedSubcategorySlug = useMemo(() => {
    if (subcategorySlug) return subcategorySlug;
    if (subcategoryOptions.length > 0) return subcategoryOptions[0].slug;
    return "";
  }, [subcategorySlug, subcategoryOptions]);

  const handleCategoryChange = (slug: string) => {
    const nextSlug = String(slug || "").trim();
    setCategorySlug(nextSlug);
    const category = categories.find((c) => c.slug === nextSlug);
    const subcategories = Array.isArray(category?.subcategories) ? category.subcategories : [];
    if (subcategories.length > 0) {
      setSubcategorySlug(subcategories[0].slug);
    } else {
      setSubcategorySlug("");
    }
    setFieldErrors((current) => ({ ...current, categorySlug: "" }));
  };

  const handleSubcategoryChange = (slug: string) => {
    setSubcategorySlug(String(slug || "").trim());
    setFieldErrors((current) => ({ ...current, subcategorySlug: "" }));
  };

  const updateField = <K extends keyof FieldValues>(key: K, value: FieldValues[K]) => {
    setFieldValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const addDescriptionPoint = () => {
    setDescPairs((current) => [...current, { heading: "", content: "" }]);
  };

  const removeDescriptionPoint = (index: number) => {
    setDescPairs((current) => (current.length > 1 ? current.filter((_, idx) => idx !== index) : current));
  };

  const updateDescriptionPoint = <K extends keyof DescriptionPoint>(
    index: number,
    key: K,
    value: DescriptionPoint[K]
  ) => {
    setDescPairs((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const nameVal = String(fieldValues.productName || "").trim();
    if (!nameVal) {
      errors.productName = "Service name is required.";
    } else if (countWords(nameVal) > MAX_PRODUCT_NAME_WORDS) {
      errors.productName = `Service name cannot exceed ${MAX_PRODUCT_NAME_WORDS} words.`;
    }

    if (!selectedCategorySlug) {
      errors.categorySlug = "Please select a category.";
    }

    if (subcategoryOptions.length > 0 && !selectedSubcategorySlug) {
      errors.subcategorySlug = "Please select a subcategory.";
    }

    const priceVal = Number(fieldValues.sellingPrice);
    if (!fieldValues.sellingPrice) {
      errors.sellingPrice = "Selling price is required.";
    } else if (!Number.isFinite(priceVal) || priceVal < 0) {
      errors.sellingPrice = "Please enter a valid selling price.";
    }

    if (!fieldValues.mainImage && !existingMainImageUrl) {
      errors.mainImage = "A main service image is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      setSubmitNotice("Please resolve the validation errors above.");
      return;
    }

    setSubmitNotice("Uploading service image...");

    try {
      const mainImageUrl = fieldValues.mainImage
        ? await uploadToCloudinary(fieldValues.mainImage, "winkget_products")
        : String(existingMainImageUrl || "").trim();

      const orderedGallery = [mainImageUrl].filter(Boolean);

      const payload: VendorProductUpsertInput = {
        categorySlug: selectedCategorySlug,
        subcategorySlug: selectedSubcategorySlug,
        productName: String(fieldValues.productName || "").trim(),
        image: orderedGallery[0] || "",
        gallery: orderedGallery,
        price: Number(fieldValues.sellingPrice) || 0,
        oldPrice: Number(fieldValues.mrp) || 0,
        inventory: 0,
        shortDescription: String(fieldValues.shortDescription || "").trim() || undefined,
        description: String(fieldValues.shortDescription || "").trim() || undefined,
        highlights: customHighlights.map((h) => String(h || "").trim()).filter(Boolean),
        sellerName: String(fieldValues.sellerName || sellerName || "").trim() || "Vendor",
        vendorSource: "vendor-panel",
        sourcePlatform: "winkget_vendor",
        storePlacement: undefined,
        descriptionPoints: descPairs
          .map((p) => ({ heading: String(p?.heading || "").trim(), content: String(p?.content || "").trim() }))
          .filter((p) => p.heading || p.content),
        showDeliveryBadge: false,
        showTopBrand: false,
        showFreeDelivery: false,
        showSecureTransaction: false,
        show7DaySupport: false,
        showAssured: false,
        originCountry: "",
      };

      await onSubmitProduct(payload);
      setSubmitNotice(
        isEditMode
          ? "Service updated successfully."
          : "Service published successfully."
      );
      onClose();
    } catch (error) {
      const fallback = isEditMode
        ? "Failed to update service. Please try again."
        : "Failed to publish service. Please try again.";
      setSubmitNotice(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <section className="rounded-[24px] border-2 border-[#d9ccb7] bg-[linear-gradient(180deg,#fffaf3,#fff5e9)] px-4 py-4 shadow-[0_16px_40px_rgba(87,63,38,0.08)] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-semibold leading-tight text-slate-950">
            {isEditMode ? "Edit Service" : "Add Service"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEditMode
              ? "Update existing service details using the same form."
              : "Upload details with a clear main service image."}
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
                  Service Name<span className="ml-1 text-rose-500">*</span>
                  <input
                    type="text"
                    value={fieldValues.productName}
                    onChange={(event) => updateField("productName", event.target.value)}
                    className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                      fieldErrors.productName ? "border-rose-400 bg-rose-50" : "border-[#d9ccb7] focus:border-[#c7a97a]"
                    }`}
                    placeholder="Enter service name"
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
                    placeholder="Enter short service description"
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
              <h3 className="text-lg font-semibold text-slate-900">Pricing</h3>
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
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border-2 border-[#d9ccb7] bg-[#fffdf8] p-4 shadow-[0_8px_18px_rgba(87,63,38,0.06)]">
              <h3 className="text-lg font-semibold text-slate-900">Upload Image</h3>
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
                        <p className="mt-1 text-xs text-slate-500">Drop or click to upload.</p>
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
                        {mainImagePreview ? <img src={mainImagePreview.url} alt={mainImagePreview.name} className="h-full w-full object-contain" /> : <div className="text-center text-xs text-slate-400">Image preview</div>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700">{mainImagePreview ? mainImagePreview.name : "No file selected"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          This image will be used as service cover.
                        </p>
                        <button type="button" onClick={() => mainImageInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                          Choose file
                        </button>
                      </div>
                    </div>
                  </div>
                  {fieldErrors.mainImage ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.mainImage}</p> : null}
                </div>
              </div>
            </section>

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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? (isEditMode ? "Updating Service..." : "Publishing Service...")
              : (isEditMode ? "Update Service" : "Publish Service")}
          </button>
          {submitNotice || actionMessage ? <p className="text-sm text-slate-600">{submitNotice || actionMessage}</p> : null}
          {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
        </div>
      </form>
    </section>
  );
}
