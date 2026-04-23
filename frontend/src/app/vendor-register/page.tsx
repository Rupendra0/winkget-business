"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, Store, UserRound } from "lucide-react";
import { fetchCurrentUser } from "@/lib/authClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
};

type SubcategoryOption = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
  category?: {
    id: string;
    name: string;
  };
  parentSubcategory?: {
    id: string;
    name: string;
  };
};

type CityLocalityOption = {
  id: string;
  name: string;
  slug: string;
};

type CityOption = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  localities: CityLocalityOption[];
};

type CustomFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi-select"
  | "email"
  | "phone"
  | "url";

type CustomFormField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  span?: 6 | 12;
  sortOrder: number;
};

type EffectiveCustomForm = {
  source: "none" | "category" | "subcategory";
  title?: string;
  fields: CustomFormField[];
};

type CustomFormDataMap = Record<string, string | number | string[]>;

type VendorFormState = {
  businessName: string;
  ownerName: string;
  gender: string;
  dateOfBirth: string;
  personalEmail: string;
  personalPhone: string;
  businessEmail: string;
  businessPhone: string;
  password: string;
  confirmPassword: string;
  businessCategoryId: string;
  businessSubcategoryId: string;
  businessAddress: string;
  city: string;
  sublocality: string;
  state: string;
  postalCode: string;
  gstNumber: string;
  gstDocument: string;
  website: string;
  shopOpeningTime: string;
  shopClosingTime: string;
  establishmentYear: string;
  serviceTags: string[];
  businessDescription: string;
  idProofType: string;
  idProofNumber: string;
  idProofDocument: string;
  marketingOptIn: boolean;
  customFormData: CustomFormDataMap;
};

const STEP_META = [
  {
    number: 1,
    title: "Personal",
    subtitle: "Owner identity details",
    icon: UserRound,
  },
  {
    number: 2,
    title: "Business",
    subtitle: "Business profile and contacts",
    icon: Building2,
  },
  {
    number: 3,
    title: "Verification",
    subtitle: "Security, GST and proof",
    icon: ShieldCheck,
  },
] as const;

const ID_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar card" },
  { value: "pan", label: "PAN card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driver's license" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" },
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const POSTAL_REGEX = /^[0-9]{5,10}$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX = /^[0-9A-Z]{15}$/i;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const MAX_DOCUMENT_FILE_SIZE = 8 * 1024 * 1024;

const INITIAL_FORM: VendorFormState = {
  businessName: "",
  ownerName: "",
  gender: "",
  dateOfBirth: "",
  personalEmail: "",
  personalPhone: "",
  businessEmail: "",
  businessPhone: "",
  password: "",
  confirmPassword: "",
  businessCategoryId: "",
  businessSubcategoryId: "",
  businessAddress: "",
  city: "",
  sublocality: "",
  state: "",
  postalCode: "",
  gstNumber: "",
  gstDocument: "",
  website: "",
  shopOpeningTime: "",
  shopClosingTime: "",
  establishmentYear: "",
  serviceTags: [],
  businessDescription: "",
  idProofType: "",
  idProofNumber: "",
  idProofDocument: "",
  marketingOptIn: false,
  customFormData: {},
};

const sortAndNormalizeCustomFields = (fields?: CustomFormField[]): CustomFormField[] => {
  if (!Array.isArray(fields)) return [];

  const seen = new Set<string>();
  const next: CustomFormField[] = [];

  fields.forEach((field, index) => {
    const fieldRecord = (field && typeof field === "object" ? field : {}) as Record<string, unknown>;

    const label = String(
      fieldRecord.label ?? fieldRecord.fieldLabel ?? fieldRecord.name ?? fieldRecord.title ?? ""
    ).trim();
    if (!label) return;

    const key = String(fieldRecord.key ?? fieldRecord.fieldKey ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key || seen.has(key)) return;
    seen.add(key);

    const type = String(fieldRecord.type ?? fieldRecord.inputType ?? fieldRecord.fieldType ?? "text") as CustomFormFieldType;
    const supportedType = ["text", "textarea", "number", "date", "select", "multi-select", "email", "phone", "url"].includes(type)
      ? type
      : "text";

    const rawOptions =
      fieldRecord.options ?? fieldRecord.optionValues ?? fieldRecord.choices ?? fieldRecord.values ?? [];

    next.push({
      key,
      label,
      type: supportedType,
      required: Boolean(fieldRecord.required ?? fieldRecord.isRequired ?? fieldRecord.mandatory),
      placeholder: String(fieldRecord.placeholder ?? fieldRecord.hint ?? "").trim() || undefined,
      helpText: String(fieldRecord.helpText ?? fieldRecord.description ?? "").trim() || undefined,
      options: Array.isArray(rawOptions)
        ? rawOptions.map((option) => String(option || "").trim()).filter(Boolean)
        : [],
      span: Number(fieldRecord.span ?? fieldRecord.width) === 6 ? 6 : 12,
      sortOrder: Number.isFinite(Number(fieldRecord.sortOrder ?? fieldRecord.order ?? fieldRecord.position))
        ? Number(fieldRecord.sortOrder ?? fieldRecord.order ?? fieldRecord.position)
        : (index + 1) * 10,
    });
  });

  return next.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });
};

const resolveEffectiveCustomForm = (
  category: CategoryOption | null,
  subcategory: SubcategoryOption | null
): EffectiveCustomForm => {
  const subcategoryFields = sortAndNormalizeCustomFields(subcategory?.customFormFields);
  if (subcategory?.customFormEnabled && subcategoryFields.length > 0) {
    return {
      source: "subcategory",
      title: String(subcategory.customFormTitle || "").trim() || subcategory.name || "Additional details",
      fields: subcategoryFields,
    };
  }

  const categoryFields = sortAndNormalizeCustomFields(category?.customFormFields);
  if (category?.customFormEnabled && categoryFields.length > 0) {
    return {
      source: "category",
      title: String(category.customFormTitle || "").trim() || category.name || "Additional details",
      fields: categoryFields,
    };
  }

  return {
    source: "none",
    title: "",
    fields: [],
  };
};

const retainCustomFormDataForFields = (data: CustomFormDataMap, fields: CustomFormField[]) => {
  const nextData: CustomFormDataMap = {};

  fields.forEach((field) => {
    const current = data[field.key];
    if (Array.isArray(current)) {
      nextData[field.key] = current;
      return;
    }

    if (typeof current === "number" && Number.isFinite(current)) {
      nextData[field.key] = current;
      return;
    }

    if (typeof current === "string") {
      nextData[field.key] = current;
      return;
    }

    nextData[field.key] = field.type === "multi-select" ? [] : "";
  });

  return nextData;
};

const areCustomMapsEqual = (left: CustomFormDataMap, right: CustomFormDataMap) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    const leftValue = left[key];
    const rightValue = right[key];

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      if (!Array.isArray(leftValue) || !Array.isArray(rightValue)) return false;
      if (leftValue.length !== rightValue.length) return false;
      if (leftValue.some((value, index) => value !== rightValue[index])) return false;
      continue;
    }

    if (leftValue !== rightValue) return false;
  }

  return true;
};

const validateCustomFormRequired = (data: CustomFormDataMap, fields: CustomFormField[]): string | null => {
  for (const field of fields) {
    if (!field.required) continue;

    const value = data[field.key];
    if (field.type === "multi-select") {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) return `${field.label} is required`;
      continue;
    }

    if (!String(value || "").trim()) {
      return `${field.label} is required`;
    }
  }

  return null;
};

const serializeCustomFormDataForPayload = (data: CustomFormDataMap, fields: CustomFormField[]) => {
  const payload: CustomFormDataMap = {};

  fields.forEach((field) => {
    const value = data[field.key];

    if (field.type === "multi-select") {
      const values = Array.isArray(value)
        ? Array.from(new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean)))
        : [];
      if (values.length > 0) {
        payload[field.key] = values;
      }
      return;
    }

    const raw = typeof value === "number" ? String(value) : String(value || "").trim();
    if (!raw) return;

    if (field.type === "number") {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        payload[field.key] = numeric;
      }
      return;
    }

    payload[field.key] = raw;
  });

  return payload;
};

const formatCustomDataValue = (value: string | number | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value || "").trim() || "-";
};

const toSlugLike = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeReference = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const id = String(record.id ?? record._id ?? "").trim();
  const name = String(record.name ?? "").trim();

  if (!id && !name) return undefined;
  return {
    id,
    name,
  };
};

const normalizeCategoryOption = (value: unknown): CategoryOption | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = String(record.id ?? record._id ?? "").trim();
  const name = String(record.name ?? record.label ?? "").trim();
  if (!id || !name) return null;

  const customFormFields = sortAndNormalizeCustomFields(record.customFormFields as CustomFormField[] | undefined);
  const slug = String(record.slug ?? toSlugLike(name)).trim() || toSlugLike(name);

  return {
    id,
    name,
    slug,
    description: String(record.description ?? "").trim() || undefined,
    customFormEnabled: Boolean(record.customFormEnabled) || customFormFields.length > 0,
    customFormTitle: String(record.customFormTitle ?? "").trim() || undefined,
    customFormFields,
  };
};

const normalizeSubcategoryOption = (value: unknown): SubcategoryOption | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = String(record.id ?? record._id ?? "").trim();
  const name = String(record.name ?? record.label ?? "").trim();
  if (!id || !name) return null;

  const customFormFields = sortAndNormalizeCustomFields(record.customFormFields as CustomFormField[] | undefined);
  const slug = String(record.slug ?? toSlugLike(name)).trim() || toSlugLike(name);

  return {
    id,
    name,
    slug,
    description: String(record.description ?? "").trim() || undefined,
    customFormEnabled: Boolean(record.customFormEnabled) || customFormFields.length > 0,
    customFormTitle: String(record.customFormTitle ?? "").trim() || undefined,
    customFormFields,
    category: normalizeReference(record.category),
    parentSubcategory: normalizeReference(record.parentSubcategory),
  };
};

const buildSubcategoryLabelMap = (items: SubcategoryOption[]) => {
  const byId = new Map<string, SubcategoryOption>();
  const labelById = new Map<string, string>();

  items.forEach((item) => {
    const id = String(item.id || "").trim();
    if (!id) return;
    byId.set(id, item);
  });

  const resolveLabel = (subcategoryId: string, visited = new Set<string>()): string => {
    const normalizedId = String(subcategoryId || "").trim();
    if (!normalizedId) return "";

    const cached = labelById.get(normalizedId);
    if (cached) return cached;

    const current = byId.get(normalizedId);
    if (!current) return "";

    const currentName = String(current.name || "").trim();
    if (!currentName) return "";

    if (visited.has(normalizedId)) {
      return currentName;
    }

    const parentId = String(current.parentSubcategory?.id || "").trim();
    if (!parentId) {
      labelById.set(normalizedId, currentName);
      return currentName;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(normalizedId);

    const parentLabel = byId.has(parentId)
      ? resolveLabel(parentId, nextVisited)
      : String(current.parentSubcategory?.name || "").trim();

    const finalLabel = parentLabel ? `${parentLabel} > ${currentName}` : currentName;
    labelById.set(normalizedId, finalLabel);
    return finalLabel;
  };

  Array.from(byId.keys()).forEach((subcategoryId) => {
    void resolveLabel(subcategoryId);
  });

  return labelById;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const DOCUMENT_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const DOCUMENT_ACCEPT_ATTR = DOCUMENT_ACCEPTED_TYPES.join(",");

const normalizeGstin = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);

const normalizeIdProofNumber = (value: string, idProofType: string) => {
  if (idProofType === "aadhaar") {
    return value.replace(/\D/g, "").slice(0, 12);
  }

  return value.trim().toUpperCase();
};

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read selected file"));
    };
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });

const RequiredMark = () => <span className="text-red-500">*</span>;

export default function VendorRegisterPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [subcategoryLoadError, setSubcategoryLoadError] = useState<string | null>(null);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormState>(INITIAL_FORM);
  const [selectedIdDocumentName, setSelectedIdDocumentName] = useState("");
  const [selectedGstDocumentName, setSelectedGstDocumentName] = useState("");
  const [serviceTagInput, setServiceTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const user = await fetchCurrentUser();
      if (!active) return;

      if (user) {
        if (user.role === "vendor") {
          router.replace("/vendor");
        } else {
          router.replace("/");
        }
        return;
      }

      setCheckingSession(false);
    };

    void checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoryLoadError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/categories`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to load categories");
        }

        if (!active) return;

        const seenCategoryIds = new Set<string>();
        const nextCategories = (Array.isArray(payload.categories) ? payload.categories : [])
          .map(normalizeCategoryOption)
          .filter((category: CategoryOption | null): category is CategoryOption => Boolean(category))
          .filter((category: CategoryOption) => {
            if (seenCategoryIds.has(category.id)) return false;
            seenCategoryIds.add(category.id);
            return true;
          });

        setCategories(nextCategories);

        if (nextCategories.length > 0) {
          setForm((current) => {
            const currentValue = String(current.businessCategoryId || "").trim().toLowerCase();
            if (currentValue) {
              const matched = nextCategories.find(
                (item: CategoryOption) =>
                  item.id === current.businessCategoryId ||
                  item.slug.toLowerCase() === currentValue ||
                  item.name.toLowerCase() === currentValue
              );

              if (matched) {
                return matched.id === current.businessCategoryId
                  ? current
                  : { ...current, businessCategoryId: matched.id };
              }
            }

            return { ...current, businessCategoryId: nextCategories[0].id };
          });
        }
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load categories";
        setCategoryLoadError(message);
      } finally {
        if (!active) return;
        setLoadingCategories(false);
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      setLoadingCities(true);
      setCityLoadError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/cities`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to load cities");
        }

        if (!active) return;

        const nextCities = Array.isArray(payload.cities) ? payload.cities : [];
        setCities(nextCities);

        if (nextCities.length > 0) {
          setForm((current) => {
            if (current.city) return current;

            const firstCity = nextCities[0] as CityOption;
            const firstLocality = Array.isArray(firstCity.localities) ? firstCity.localities[0] : undefined;

            return {
              ...current,
              city: firstCity.name,
              sublocality: firstLocality?.name || "",
              state: current.state || firstCity.state || "",
            };
          });
        }
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load cities";
        setCityLoadError(message);
      } finally {
        if (!active) return;
        setLoadingCities(false);
      }
    };

    void loadCities();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSubcategories = async () => {
      const rawCategoryValue = String(form.businessCategoryId || "").trim();
      const normalizedCategoryValue = rawCategoryValue.toLowerCase();
      const resolvedCategory = categories.find(
        (category) =>
          category.id === rawCategoryValue ||
          category.slug.toLowerCase() === normalizedCategoryValue ||
          category.name.toLowerCase() === normalizedCategoryValue
      );
      const resolvedCategoryId = resolvedCategory?.id || rawCategoryValue;

      if (!resolvedCategoryId) {
        setSubcategories([]);
        setSubcategoryLoadError(null);
        return;
      }

      if (resolvedCategory && resolvedCategoryId !== rawCategoryValue) {
        setForm((current) => ({ ...current, businessCategoryId: resolvedCategoryId }));
      }

      setLoadingSubcategories(true);
      setSubcategoryLoadError(null);

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/subcategories?categoryId=${encodeURIComponent(resolvedCategoryId)}`,
          {
            cache: "no-store",
          }
        );
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to load subcategories");
        }

        if (!active) return;

        const seenSubcategoryIds = new Set<string>();
        const nextSubcategories = (Array.isArray(payload.subcategories) ? payload.subcategories : [])
          .map(normalizeSubcategoryOption)
          .filter((subcategory: SubcategoryOption | null): subcategory is SubcategoryOption => Boolean(subcategory))
          .filter((subcategory: SubcategoryOption) => {
            if (seenSubcategoryIds.has(subcategory.id)) return false;
            seenSubcategoryIds.add(subcategory.id);
            return true;
          });

        setSubcategories(nextSubcategories);
        setForm((current) => {
          if (!current.businessSubcategoryId) return current;
          const exists = nextSubcategories.some((item: SubcategoryOption) => item.id === current.businessSubcategoryId);
          if (exists) return current;
          return { ...current, businessSubcategoryId: "" };
        });
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load subcategories";
        setSubcategoryLoadError(message);
        setSubcategories([]);
      } finally {
        if (!active) return;
        setLoadingSubcategories(false);
      }
    };

    void loadSubcategories();

    return () => {
      active = false;
    };
  }, [categories, form.businessCategoryId]);

  const updateField = <K extends keyof VendorFormState>(field: K, value: VendorFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCustomFieldValue = (fieldKey: string, value: string | number | string[]) => {
    setForm((current) => ({
      ...current,
      customFormData: {
        ...current.customFormData,
        [fieldKey]: value,
      },
    }));
  };

  const toggleCustomFieldOption = (fieldKey: string, option: string, checked: boolean) => {
    setForm((current) => {
      const currentValues = Array.isArray(current.customFormData[fieldKey])
        ? (current.customFormData[fieldKey] as string[])
        : [];

      const nextValues = checked
        ? currentValues.includes(option)
          ? currentValues
          : [...currentValues, option]
        : currentValues.filter((entry) => entry !== option);

      return {
        ...current,
        customFormData: {
          ...current.customFormData,
          [fieldKey]: nextValues,
        },
      };
    });
  };

  const currentStepMeta = useMemo(() => STEP_META.find((item) => item.number === step) ?? STEP_META[0], [step]);

  const subcategoryLabelMap = useMemo(() => buildSubcategoryLabelMap(subcategories), [subcategories]);
  const sortedSubcategories = useMemo(
    () =>
      [...subcategories].sort((left, right) => {
        const leftLabel = subcategoryLabelMap.get(left.id) || left.name;
        const rightLabel = subcategoryLabelMap.get(right.id) || right.name;
        return leftLabel.localeCompare(rightLabel);
      }),
    [subcategories, subcategoryLabelMap]
  );

  const filteredCities = useMemo(
    () =>
      form.state
        ? cities.filter(
            (cityOption) => String(cityOption.state || "").trim().toLowerCase() === form.state.trim().toLowerCase()
          )
        : cities,
    [cities, form.state]
  );

  const selectedCity = useMemo(
    () => cities.find((cityOption) => cityOption.name === form.city) || null,
    [cities, form.city]
  );

  const selectedCategory = useMemo(
    () => {
      const rawValue = String(form.businessCategoryId || "").trim();
      if (!rawValue) return null;

      const normalizedValue = rawValue.toLowerCase();
      return (
        categories.find(
          (category) =>
            category.id === rawValue ||
            category.slug.toLowerCase() === normalizedValue ||
            category.name.toLowerCase() === normalizedValue
        ) || null
      );
    },
    [categories, form.businessCategoryId]
  );

  const selectedSubcategory = useMemo(
    () => {
      const rawValue = String(form.businessSubcategoryId || "").trim();
      if (!rawValue) return null;

      const normalizedValue = rawValue.toLowerCase();
      return (
        subcategories.find(
          (subcategory) =>
            subcategory.id === rawValue ||
            subcategory.slug.toLowerCase() === normalizedValue ||
            subcategory.name.toLowerCase() === normalizedValue
        ) || null
      );
    },
    [form.businessSubcategoryId, subcategories]
  );

  const selectedCategoryId = selectedCategory?.id || String(form.businessCategoryId || "").trim();
  const selectedSubcategoryId = selectedSubcategory?.id || String(form.businessSubcategoryId || "").trim();

  const effectiveCustomForm = useMemo(
    () => resolveEffectiveCustomForm(selectedCategory, selectedSubcategory),
    [selectedCategory, selectedSubcategory]
  );

  const cityLocalities = useMemo(
    () => (selectedCity && Array.isArray(selectedCity.localities) ? selectedCity.localities : []),
    [selectedCity]
  );

  useEffect(() => {
    setForm((current) => {
      const nextCustomFormData = retainCustomFormDataForFields(current.customFormData, effectiveCustomForm.fields);
      if (areCustomMapsEqual(current.customFormData, nextCustomFormData)) {
        return current;
      }

      return {
        ...current,
        customFormData: nextCustomFormData,
      };
    });
  }, [effectiveCustomForm.fields]);

  const validateStepOne = () => {
    if (!form.ownerName.trim()) return "Owner name is required";
    if (!form.gender.trim()) return "Gender is required";
    if (!form.dateOfBirth.trim()) return "Date of birth is required";
    if (!form.personalEmail.trim()) return "Personal email is required";
    if (!EMAIL_REGEX.test(form.personalEmail.trim().toLowerCase())) return "Personal email format is invalid";
    if (!PHONE_REGEX.test(form.personalPhone.trim())) return "Personal phone must be exactly 10 digits";
    return null;
  };

  const validateStepTwo = () => {
    if (!form.businessName.trim()) return "Business name is required";
    if (!form.businessEmail.trim()) return "Business email is required";
    if (!EMAIL_REGEX.test(form.businessEmail.trim().toLowerCase())) return "Business email format is invalid";
    if (!PHONE_REGEX.test(form.businessPhone.trim())) return "Business phone must be exactly 10 digits";
    if (!selectedCategoryId) return "Please select a business category";
    if (!form.businessAddress.trim()) return "Business address is required";
    if (!form.city.trim()) return "City is required";
    if (!form.sublocality.trim()) return "Sublocality is required";
    if (!form.state.trim()) return "State is required";
    if (!form.postalCode.trim()) return "Postal code is required";
    if (!POSTAL_REGEX.test(form.postalCode.trim())) return "Postal code must be 5 to 10 digits";
    if (!form.shopOpeningTime.trim() || !form.shopClosingTime.trim()) return "Shop opening and closing time are required";
    if (form.serviceTags.length === 0) return "Add at least one service tag";

    if (form.establishmentYear.trim()) {
      const year = Number(form.establishmentYear);
      const currentYear = new Date().getFullYear();
      if (Number.isNaN(year) || year < 1900 || year > currentYear) {
        return "Establishment year must be between 1900 and current year";
      }
    }

    const customFieldError = validateCustomFormRequired(form.customFormData, effectiveCustomForm.fields);
    if (customFieldError) {
      return customFieldError;
    }

    return null;
  };

  const validateStepThree = () => {
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Password and confirm password do not match";
    if (!form.gstNumber.trim()) return "GSTIN number is required";
    if (!GSTIN_REGEX.test(form.gstNumber.trim())) return "GSTIN must be a valid 15-character value";
    if (!form.gstDocument.trim()) return "Please upload GST document";
    if (!form.idProofType) return "Please select an ID proof type";
    if (!form.idProofNumber.trim()) return "ID proof number is required";
    if (form.idProofType === "aadhaar" && !AADHAAR_REGEX.test(form.idProofNumber.trim())) {
      return "Aadhaar number must be exactly 12 digits";
    }
    if (!form.idProofDocument.trim()) return "Please upload an ID proof document";
    return null;
  };

  const handleDocumentChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "idProofDocument" | "gstDocument",
    setDocumentName: React.Dispatch<React.SetStateAction<string>>,
    label: string
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      updateField(field, "");
      setDocumentName("");
      return;
    }

    if (!DOCUMENT_ACCEPTED_TYPES.includes(file.type as (typeof DOCUMENT_ACCEPTED_TYPES)[number])) {
      setError(`${label} must be PNG, JPG, JPEG, WEBP, PDF, DOC or DOCX`);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      setError(`${label} must be 8MB or smaller`);
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      updateField(field, dataUrl);
      setDocumentName(file.name);
      setError(null);
    } catch (fileError) {
      const message = fileError instanceof Error ? fileError.message : "Failed to read selected document";
      setError(message);
      event.target.value = "";
    }
  };

  const addServiceTag = () => {
    const normalized = serviceTagInput.trim().replace(/\s+/g, " ");
    if (!normalized) return;

    setForm((current) => {
      const exists = current.serviceTags.some((tag) => tag.toLowerCase() === normalized.toLowerCase());
      if (exists) return current;
      if (current.serviceTags.length >= 100) return current;
      return {
        ...current,
        serviceTags: [...current.serviceTags, normalized],
      };
    });
    setServiceTagInput("");
  };

  const removeServiceTag = (tagToRemove: string) => {
    setForm((current) => ({
      ...current,
      serviceTags: current.serviceTags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const stepError = validateStepOne();
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    if (step === 2) {
      const stepError = validateStepTwo();
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    setStep((current) => Math.min(3, current + 1));
  };

  const handlePrevious = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const firstError = validateStepOne();
    if (firstError) {
      setStep(1);
      setError(firstError);
      return;
    }

    const secondError = validateStepTwo();
    if (secondError) {
      setStep(2);
      setError(secondError);
      return;
    }

    const thirdError = validateStepThree();
    if (thirdError) {
      setStep(3);
      setError(thirdError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/vendor/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          personalEmail: form.personalEmail.trim().toLowerCase(),
          personalPhone: form.personalPhone.trim(),
          businessEmail: form.businessEmail.trim().toLowerCase(),
          businessPhone: form.businessPhone.trim(),
          password: form.password,
          businessCategoryId: selectedCategoryId,
          businessSubcategoryId: selectedSubcategoryId || undefined,
          businessAddress: form.businessAddress.trim(),
          city: form.city.trim(),
          sublocality: form.sublocality.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          gstNumber: form.gstNumber.trim(),
          gstDocument: form.gstDocument,
          website: form.website.trim(),
          shopOpeningTime: form.shopOpeningTime.trim(),
          shopClosingTime: form.shopClosingTime.trim(),
          establishmentYear: form.establishmentYear.trim() ? Number(form.establishmentYear.trim()) : undefined,
          serviceTags: form.serviceTags,
          businessDescription: form.businessDescription.trim(),
          idProofType: form.idProofType,
          idProofNumber: form.idProofNumber.trim(),
          idProofDocument: form.idProofDocument,
          marketingOptIn: form.marketingOptIn,
          customFormData: serializeCustomFormDataForPayload(form.customFormData, effectiveCustomForm.fields),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Vendor registration failed");
      }

      setSubmitted(true);
      setForm({
        ...INITIAL_FORM,
        businessCategoryId: categories[0]?.id || "",
      });
      setSelectedIdDocumentName("");
      setSelectedGstDocumentName("");
      setServiceTagInput("");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Vendor registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
        <section className="w-full max-w-4xl rounded-3xl border border-white/80 bg-white/85 p-6 shadow-2xl sm:p-8">
          <div className="h-4 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="mt-4 h-8 w-80 rounded bg-slate-200 animate-pulse" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <section className="w-full max-w-5xl rounded-3xl bg-white/85 border border-white/80 shadow-2xl p-6 sm:p-8 card-hover">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
          <Store size={14} /> Vendor / Shopkeeper Registration
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">Register your business on Winkget</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete all three steps. Admin will review your profile before account activation.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {STEP_META.map((item) => {
            const Icon = item.icon;
            const isActive = item.number === step;
            const isComplete = item.number < step;
            return (
              <article
                key={item.number}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  isActive
                    ? "border-orange-300 bg-orange-50"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-orange-500 text-white"
                        : isComplete
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.number}
                  </span>
                  <Icon size={16} className="text-slate-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {submitted ? (
          <>
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Registration submitted successfully. Your account is now pending admin approval.
            </div>
            <button
              type="button"
              onClick={() => router.push("/vendor-login")}
              className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-800 py-3 text-sm font-semibold hover:bg-blue-100 btn-hover"
            >
              Go to Vendor Login
            </button>
          </>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step {step} of 3</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{currentStepMeta.title}</h2>
              <p className="text-sm text-slate-500">{currentStepMeta.subtitle}</p>

              {step === 1 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Owner full name <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(event) => updateField("ownerName", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Enter owner full name"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Gender <RequiredMark />
                    </span>
                    <select
                      value={form.gender}
                      onChange={(event) => updateField("gender", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Date of birth <RequiredMark />
                    </span>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) => updateField("dateOfBirth", event.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Personal phone <RequiredMark />
                    </span>
                    <input
                      type="tel"
                      value={form.personalPhone}
                      onChange={(event) => updateField("personalPhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Personal email <RequiredMark />
                    </span>
                    <input
                      type="email"
                      value={form.personalEmail}
                      onChange={(event) => updateField("personalEmail", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="owner@email.com"
                      required
                    />
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business name <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(event) => updateField("businessName", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Enter legal business name"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business email <RequiredMark />
                    </span>
                    <input
                      type="email"
                      value={form.businessEmail}
                      onChange={(event) => updateField("businessEmail", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="store@business.com"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business phone <RequiredMark />
                    </span>
                    <input
                      type="tel"
                      value={form.businessPhone}
                      onChange={(event) => updateField("businessPhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="10-digit store phone"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                    />
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business category <RequiredMark />
                    </span>
                    <select
                      value={selectedCategoryId}
                      onChange={(event) => {
                        updateField("businessCategoryId", event.target.value);
                        updateField("businessSubcategoryId", "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={loadingCategories || categories.length === 0}
                      required
                    >
                      {loadingCategories ? <option value="">Loading categories...</option> : null}
                      {!loadingCategories && categories.length === 0 ? (
                        <option value="">No categories available</option>
                      ) : null}
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {categoryLoadError ? <p className="mt-1 text-xs text-red-600">{categoryLoadError}</p> : null}
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Business subcategory</span>
                    <select
                      value={selectedSubcategoryId}
                      onChange={(event) => updateField("businessSubcategoryId", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={!selectedCategoryId || loadingSubcategories || subcategories.length === 0}
                    >
                      <option value="">Select subcategory (optional)</option>
                      {sortedSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategoryLabelMap.get(subcategory.id) || subcategory.name}
                        </option>
                      ))}
                    </select>
                    {loadingSubcategories ? <p className="mt-1 text-xs text-slate-500">Loading subcategories...</p> : null}
                    {subcategoryLoadError ? <p className="mt-1 text-xs text-red-600">{subcategoryLoadError}</p> : null}
                  </label>

                  {effectiveCustomForm.fields.length > 0 ? (
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                          {effectiveCustomForm.title || "Additional details"}
                        </p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          {effectiveCustomForm.source}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-12 gap-3">
                        {effectiveCustomForm.fields.map((field) => {
                          const rawValue = form.customFormData[field.key];
                          const value = Array.isArray(rawValue)
                            ? rawValue
                            : typeof rawValue === "number"
                              ? String(rawValue)
                              : String(rawValue || "");

                          return (
                            <label
                              key={field.key}
                              className={`block space-y-1 ${field.span === 6 ? "col-span-12 sm:col-span-6" : "col-span-12"}`}
                            >
                              <span className="block text-sm font-medium text-slate-700">
                                {field.label}
                                {field.required ? <RequiredMark /> : null}
                              </span>

                              {field.type === "textarea" ? (
                                <textarea
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                                  placeholder={field.placeholder || "Enter details"}
                                />
                              ) : null}

                              {field.type === "select" ? (
                                <select
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                                >
                                  <option value="">Select {field.label}</option>
                                  {(field.options || []).map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : null}

                              {field.type === "multi-select" ? (
                                (field.options || []).length > 0 ? (
                                  <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-2.5">
                                    {(field.options || []).map((option) => {
                                      const selectedValues = Array.isArray(rawValue) ? rawValue : [];
                                      const checked = selectedValues.includes(option);

                                      return (
                                        <label key={option} className="inline-flex items-center gap-2 text-xs text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                              toggleCustomFieldOption(field.key, option, event.target.checked)
                                            }
                                            className="h-3.5 w-3.5"
                                          />
                                          {option}
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <input
                                    value={Array.isArray(rawValue) ? rawValue.join(", ") : ""}
                                    onChange={(event) =>
                                      updateCustomFieldValue(
                                        field.key,
                                        event.target.value
                                          .split(",")
                                          .map((entry) => entry.trim())
                                          .filter(Boolean)
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                                    placeholder={field.placeholder || "Comma separated values"}
                                  />
                                )
                              ) : null}

                              {!['textarea', 'select', 'multi-select'].includes(field.type) ? (
                                <input
                                  type={
                                    field.type === "number"
                                      ? "number"
                                      : field.type === "date"
                                        ? "date"
                                        : field.type === "email"
                                          ? "email"
                                          : field.type === "url"
                                            ? "url"
                                            : field.type === "phone"
                                              ? "tel"
                                              : "text"
                                  }
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                                  placeholder={field.placeholder || "Enter value"}
                                />
                              ) : null}

                              {field.helpText ? <p className="text-xs text-slate-500">{field.helpText}</p> : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business address <RequiredMark />
                    </span>
                    <textarea
                      value={form.businessAddress}
                      onChange={(event) => updateField("businessAddress", event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Street, area, landmark"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      City <RequiredMark />
                    </span>
                    <select
                      value={form.city}
                      onChange={(event) => {
                        const nextCityName = event.target.value;
                        const nextCity = filteredCities.find((item) => item.name === nextCityName) || null;
                        const nextLocalities = nextCity && Array.isArray(nextCity.localities) ? nextCity.localities : [];

                        updateField("city", nextCityName);
                        updateField("sublocality", nextLocalities[0]?.name || "");
                        if (nextCity?.state) {
                          updateField("state", nextCity.state);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={loadingCities || filteredCities.length === 0}
                      required
                    >
                      {loadingCities ? <option value="">Loading cities...</option> : null}
                      {!loadingCities && filteredCities.length === 0 ? (
                        <option value="">No cities available for selected state</option>
                      ) : null}
                      {form.city && !filteredCities.some((cityOption) => cityOption.name === form.city) ? (
                        <option value={form.city}>{form.city}</option>
                      ) : null}
                      {filteredCities.map((cityOption) => (
                        <option key={cityOption.id} value={cityOption.name}>
                          {cityOption.name}
                        </option>
                      ))}
                    </select>
                    {cityLoadError ? <p className="mt-1 text-xs text-red-600">{cityLoadError}</p> : null}
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Sublocality <RequiredMark />
                    </span>
                    <select
                      value={form.sublocality}
                      onChange={(event) => updateField("sublocality", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={!form.city || cityLocalities.length === 0}
                      required
                    >
                      <option value="">Select sublocality</option>
                      {cityLocalities.map((locality) => (
                        <option key={locality.id} value={locality.name}>
                          {locality.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      State <RequiredMark />
                    </span>
                    <select
                      value={form.state}
                      onChange={(event) => {
                        const nextState = event.target.value;
                        const nextCities = cities.filter(
                          (cityOption) =>
                            String(cityOption.state || "").trim().toLowerCase() === nextState.trim().toLowerCase()
                        );
                        const matchedCity = nextCities.find((cityOption) => cityOption.name === form.city) || null;
                        const resolvedCity = matchedCity || nextCities[0] || null;
                        const resolvedLocalities = resolvedCity && Array.isArray(resolvedCity.localities) ? resolvedCity.localities : [];

                        updateField("state", nextState);
                        updateField("city", resolvedCity?.name || "");
                        updateField("sublocality", resolvedLocalities[0]?.name || "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    >
                      <option value="">Select state</option>
                      {form.state && !INDIAN_STATES.some((stateName) => stateName === form.state) ? (
                        <option value={form.state}>{form.state}</option>
                      ) : null}
                      {INDIAN_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Postal code <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(event) => updateField("postalCode", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Website</span>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) => updateField("website", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="https://example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Shop opening time <RequiredMark />
                    </span>
                    <input
                      type="time"
                      value={form.shopOpeningTime}
                      onChange={(event) => updateField("shopOpeningTime", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Shop closing time <RequiredMark />
                    </span>
                    <input
                      type="time"
                      value={form.shopClosingTime}
                      onChange={(event) => updateField("shopClosingTime", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Establishment year</span>
                    <input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={form.establishmentYear}
                      onChange={(event) => updateField("establishmentYear", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="e.g. 2014"
                    />
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Services / tags <RequiredMark />
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serviceTagInput}
                        onChange={(event) => setServiceTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addServiceTag();
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                        placeholder="Add service tags like AC repair, plumbing, catering"
                      />
                      <button
                        type="button"
                        onClick={addServiceTag}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-800 hover:bg-orange-100"
                      >
                        Add
                      </button>
                    </div>
                    {form.serviceTags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {form.serviceTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeServiceTag(tag)}
                              className="text-orange-700 hover:text-orange-900"
                              aria-label={`Remove ${tag}`}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Add one or more services. You can add as many as needed.</p>
                    )}
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Business description</span>
                    <textarea
                      value={form.businessDescription}
                      onChange={(event) => updateField("businessDescription", event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Describe your products and service area"
                    />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      GSTIN number <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.gstNumber}
                      onChange={(event) => updateField("gstNumber", normalizeGstin(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Example: 22AAAAA0000A1Z5"
                      maxLength={15}
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">GSTIN format example: 22AAAAA0000A1Z5 (15 characters).</p>
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Upload GST document <RequiredMark />
                    </span>
                    <input
                      type="file"
                      accept={DOCUMENT_ACCEPT_ATTR}
                      onChange={(event) =>
                        void handleDocumentChange(event, "gstDocument", setSelectedGstDocumentName, "GST document")
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-800"
                      required={!form.gstDocument}
                    />
                    <p className="mt-1 text-xs text-slate-500">Accepted: PNG, JPG, JPEG, WEBP, PDF, DOC, DOCX up to 8MB.</p>
                    {selectedGstDocumentName ? (
                      <p className="mt-1 text-xs text-emerald-700">Selected: {selectedGstDocumentName}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      ID proof type <RequiredMark />
                    </span>
                    <select
                      value={form.idProofType}
                      onChange={(event) => {
                        const nextType = event.target.value;
                        updateField("idProofType", nextType);
                        updateField("idProofNumber", normalizeIdProofNumber(form.idProofNumber, nextType));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      required
                    >
                      <option value="">Select proof type</option>
                      {ID_PROOF_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      ID proof number <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.idProofNumber}
                      onChange={(event) =>
                        updateField("idProofNumber", normalizeIdProofNumber(event.target.value, form.idProofType))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder={form.idProofType === "aadhaar" ? "Enter 12-digit Aadhaar number" : "Enter ID number"}
                      inputMode={form.idProofType === "aadhaar" ? "numeric" : "text"}
                      maxLength={form.idProofType === "aadhaar" ? 12 : 32}
                      required
                    />
                    {form.idProofType === "aadhaar" ? (
                      <p className="mt-1 text-xs text-slate-500">Aadhaar number must be exactly 12 digits.</p>
                    ) : null}
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Upload ID proof document <RequiredMark />
                    </span>
                    <input
                      type="file"
                      accept={DOCUMENT_ACCEPT_ATTR}
                      onChange={(event) =>
                        void handleDocumentChange(event, "idProofDocument", setSelectedIdDocumentName, "ID proof document")
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-800"
                      required={!form.idProofDocument}
                    />
                    <p className="mt-1 text-xs text-slate-500">Accepted: PNG, JPG, JPEG, WEBP, PDF, DOC, DOCX up to 8MB.</p>
                    {selectedIdDocumentName ? <p className="mt-1 text-xs text-emerald-700">Selected: {selectedIdDocumentName}</p> : null}
                  </label>

                  <div className="sm:col-span-2 mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Security
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Create password <RequiredMark />
                    </span>
                    <input
                      type="password"
                      minLength={6}
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Confirm password <RequiredMark />
                    </span>
                    <input
                      type="password"
                      minLength={6}
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Re-enter password"
                      required
                    />
                  </label>

                  <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.marketingOptIn}
                      onChange={(event) => updateField("marketingOptIn", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    I agree to receive platform updates and marketing communication.
                  </label>

                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Review summary</p>
                    <p className="mt-1">Owner: {form.ownerName || "-"}</p>
                    <p>Gender: {form.gender || "-"}</p>
                    <p>DOB: {form.dateOfBirth || "-"}</p>
                    <p>Business: {form.businessName || "-"}</p>
                    <p>Personal contact: {form.personalEmail || "-"} / {form.personalPhone || "-"}</p>
                    <p>Business contact: {form.businessEmail || "-"} / {form.businessPhone || "-"}</p>
                    <p>
                      Category: {categories.find((item) => item.id === form.businessCategoryId)?.name || "Not selected"}
                    </p>
                    <p>Subcategory: {subcategoryLabelMap.get(form.businessSubcategoryId) || "Not selected"}</p>
                    <p>Location: {[form.sublocality, form.city, form.state].filter(Boolean).join(", ") || "-"}</p>
                    <p>Established: {form.establishmentYear || "-"}</p>
                    <p>Services: {form.serviceTags.length > 0 ? form.serviceTags.join(", ") : "-"}</p>
                    {effectiveCustomForm.fields.length > 0 ? (
                      <>
                        <p className="mt-1 font-semibold text-slate-700">{effectiveCustomForm.title || "Additional details"}</p>
                        {effectiveCustomForm.fields.map((field) => (
                          <p key={field.key}>
                            {field.label}: {formatCustomDataValue(form.customFormData[field.key])}
                          </p>
                        ))}
                      </>
                    ) : null}
                    <p>GST doc: {selectedGstDocumentName || "Not uploaded"}</p>
                    <p>ID doc: {selectedIdDocumentName || "Not uploaded"}</p>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={handlePrevious}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/vendor-login")}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    Already a vendor? Login
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Next step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Submitting..." : "Submit registration"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
