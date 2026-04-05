const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const SUPPORTED_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multi-select",
  "email",
  "phone",
  "url",
]);

const normalizeFieldKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

const normalizeOptionValues = (options) => {
  if (!Array.isArray(options)) return [];

  const seen = new Set();
  const nextOptions = [];

  for (const option of options) {
    const normalized = String(option || "").trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;

    seen.add(normalized.toLowerCase());
    nextOptions.push(normalized);
    if (nextOptions.length >= 60) break;
  }

  return nextOptions;
};

const sanitizeCustomFormFields = (rawFields) => {
  if (!Array.isArray(rawFields)) return [];

  const fields = [];
  const seenKeys = new Set();

  rawFields.slice(0, 100).forEach((rawField, index) => {
    const label = String(rawField?.label || "").trim().slice(0, 80);
    if (!label) return;

    const baseKey = normalizeFieldKey(rawField?.key || label) || `field_${index + 1}`;
    let key = baseKey;
    let suffix = 2;
    while (seenKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }
    seenKeys.add(key);

    const incomingType = String(rawField?.type || "text").trim().toLowerCase();
    const type = SUPPORTED_FIELD_TYPES.has(incomingType) ? incomingType : "text";
    const sortOrder = Number.isFinite(Number(rawField?.sortOrder))
      ? Number(rawField.sortOrder)
      : (index + 1) * 10;
    const spanInput = Number(rawField?.span);
    const span = spanInput === 6 ? 6 : 12;

    fields.push({
      key,
      label,
      type,
      required: Boolean(rawField?.required),
      placeholder: String(rawField?.placeholder || "").trim().slice(0, 140) || undefined,
      helpText: String(rawField?.helpText || "").trim().slice(0, 240) || undefined,
      options: type === "select" || type === "multi-select" ? normalizeOptionValues(rawField?.options) : [],
      span,
      sortOrder,
    });
  });

  return fields.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.label.localeCompare(right.label);
  });
};

const normalizeCustomFormDataInput = (rawData) => {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {};
  }

  const normalized = {};

  for (const [rawKey, rawValue] of Object.entries(rawData)) {
    const key = normalizeFieldKey(rawKey);
    if (!key) continue;

    if (Array.isArray(rawValue)) {
      normalized[key] = rawValue
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 50);
      continue;
    }

    if (rawValue === null || rawValue === undefined) {
      normalized[key] = "";
      continue;
    }

    normalized[key] = String(rawValue).trim();
  }

  return normalized;
};

const toUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const resolveEffectiveCustomForm = (input) => {
  const category = input?.category || null;
  const subcategory = input?.subcategory || null;

  const subcategoryFields = sanitizeCustomFormFields(subcategory?.customFormFields);
  if (subcategory?.customFormEnabled && subcategoryFields.length > 0) {
    return {
      source: "subcategory",
      title: String(subcategory.customFormTitle || "").trim() || subcategory.name || "Additional details",
      fields: subcategoryFields,
    };
  }

  const categoryFields = sanitizeCustomFormFields(category?.customFormFields);
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

const validateCustomFormData = (rawData, fields) => {
  const normalizedFields = sanitizeCustomFormFields(fields);
  if (normalizedFields.length === 0) {
    return { ok: true, data: {} };
  }

  const input = normalizeCustomFormDataInput(rawData);
  const validated = {};

  for (const field of normalizedFields) {
    const current = input[field.key];

    if (field.type === "multi-select") {
      const values = Array.isArray(current)
        ? current.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

      if (field.required && values.length === 0) {
        return { ok: false, message: `${field.label} is required`, data: {} };
      }

      if (values.length > 0 && Array.isArray(field.options) && field.options.length > 0) {
        const optionSet = new Set(field.options.map((item) => item.toLowerCase()));
        const invalid = values.find((item) => !optionSet.has(item.toLowerCase()));
        if (invalid) {
          return { ok: false, message: `${field.label} has an invalid option`, data: {} };
        }
      }

      if (values.length > 0) {
        validated[field.key] = values;
      }

      continue;
    }

    const value = String(current || "").trim();

    if (field.required && !value) {
      return { ok: false, message: `${field.label} is required`, data: {} };
    }

    if (!value) {
      continue;
    }

    if (field.type === "email" && !EMAIL_REGEX.test(value)) {
      return { ok: false, message: `${field.label} must be a valid email`, data: {} };
    }

    if (field.type === "phone" && !PHONE_REGEX.test(value.replace(/\D/g, ""))) {
      return { ok: false, message: `${field.label} must be exactly 10 digits`, data: {} };
    }

    if (field.type === "number") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return { ok: false, message: `${field.label} must be numeric`, data: {} };
      }
      validated[field.key] = numeric;
      continue;
    }

    if (field.type === "date" && !DATE_REGEX.test(value)) {
      return { ok: false, message: `${field.label} must be in YYYY-MM-DD format`, data: {} };
    }

    if (field.type === "url") {
      const normalizedUrl = toUrl(value);
      if (!normalizedUrl) {
        return { ok: false, message: `${field.label} must be a valid URL`, data: {} };
      }
      validated[field.key] = normalizedUrl;
      continue;
    }

    if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
      const optionSet = new Set(field.options.map((item) => item.toLowerCase()));
      if (!optionSet.has(value.toLowerCase())) {
        return { ok: false, message: `${field.label} has an invalid option`, data: {} };
      }
    }

    validated[field.key] = value;
  }

  return { ok: true, data: validated };
};

module.exports = {
  SUPPORTED_FIELD_TYPES,
  sanitizeCustomFormFields,
  normalizeCustomFormDataInput,
  resolveEffectiveCustomForm,
  validateCustomFormData,
};
