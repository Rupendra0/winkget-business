"use client";

import { useMemo, useState } from "react";
import { type CustomFormField } from "@/lib/adminClient";

type DynamicVendorFormProps = {
  fields: CustomFormField[];
  title?: string;
  previewMode?: "desktop" | "mobile";
};

type FieldValue = string | string[];

const RequiredMark = () => <span className="text-red-500">*</span>;

const sortFields = (fields: CustomFormField[]) =>
  [...fields].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });

export default function DynamicVendorForm({ fields, title, previewMode = "desktop" }: DynamicVendorFormProps) {
  const orderedFields = useMemo(() => sortFields(Array.isArray(fields) ? fields : []), [fields]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  const setValue = (key: string, value: FieldValue) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const toggleMultiSelect = (key: string, option: string, checked: boolean) => {
    setValues((current) => {
      const existing = current[key];
      const selected = Array.isArray(existing) ? existing : [];
      const next = checked ? (selected.includes(option) ? selected : [...selected, option]) : selected.filter((v) => v !== option);
      return { ...current, [key]: next };
    });
  };

  if (orderedFields.length === 0) return null;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">{title || "Additional details"}</p>
      </div>

      <p className="mt-1 text-sm font-semibold text-slate-900">Fill the form</p>

      <div className="mt-3 grid grid-cols-12 gap-4">
        {orderedFields.map((field) => {
          const rawValue = values[field.key];
          const stringValue = typeof rawValue === "string" ? rawValue : "";
          const multiValue = Array.isArray(rawValue) ? rawValue : [];

          const spanClass =
            previewMode === "mobile"
              ? "col-span-12"
              : field.span === 6
                ? "col-span-12 sm:col-span-6"
                : "col-span-12";

          return (
            <label key={field.key} className={`block space-y-1 ${spanClass}`}>
              <span className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.required ? <RequiredMark /> : null}
              </span>

              {field.type === "textarea" ? (
                <textarea
                  value={stringValue}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                  placeholder={field.placeholder || "Enter details"}
                />
              ) : null}

              {field.type === "select" ? (
                <select
                  value={stringValue}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                >
                  <option value="">{`Select ${field.label}`}</option>
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
                      const checked = multiValue.includes(option);
                      return (
                        <label key={option} className="inline-flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleMultiSelect(field.key, option, event.target.checked)}
                            className="h-3.5 w-3.5"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    value={multiValue.join(", ")}
                    onChange={(event) =>
                      setValue(
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

              {!["textarea", "select", "multi-select"].includes(field.type) ? (
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
                  value={stringValue}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                  placeholder={field.placeholder || "Enter value"}
                />
              ) : null}

              {field.helpText ? <p className="text-xs text-slate-500">{field.helpText}</p> : null}
            </label>
          );
        })}
      </div>
    </section>
  );
}

