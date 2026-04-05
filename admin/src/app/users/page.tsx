"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createUser,
  deleteUser,
  fetchCategoryExplorer,
  fetchUserDetails,
  fetchUsers,
  updateUser,
  type AdminCategory,
  type AdminSubcategory,
  type AdminUserDetail,
  type AdminDirectoryUser,
  type UserMutationInput,
} from "@/lib/adminApi";
import { type CustomFormField, type EffectiveCustomForm } from "@/lib/adminClient";
import {
  buildDocumentFileName,
  downloadDocument,
  getDocumentKind,
  getDocumentTypeLabel,
  openDocumentInNewTab,
  requestFullscreen,
} from "@/lib/documentPreview";
import { formatDate, getDisplayName } from "@/lib/adminUi";

type RoleFilter = "all" | "admin" | "customer" | "vendor";
type VendorFilter = "all" | "pending" | "approved" | "rejected";
type MutationRole = NonNullable<UserMutationInput["role"]>;
type MutationVendorStatus = NonNullable<UserMutationInput["vendorStatus"]>;

type PreviewDocument = {
  title: string;
  dataUrl: string;
  fileName: string;
};

type CustomFormDataMap = Record<string, string | number | string[]>;

const DEFAULT_ROLE_BY_VIEW: Record<string, RoleFilter> = {
  "manage-users": "all",
  "manage-partners": "vendor",
  "manage-admins": "admin",
  "verification-pending": "vendor",
};

const DEFAULT_VENDOR_BY_VIEW: Record<string, VendorFilter> = {
  "verification-pending": "pending",
};

const VIEW_CONFIG: Record<string, { title: string; subtitle: string; showVendorRequestBoard?: boolean }> = {
  "manage-users": {
    title: "Manage Users",
    subtitle: "All roles in one searchable directory.",
  },
  "manage-partners": {
    title: "Manage Partners",
    subtitle: "Vendor accounts and business profiles.",
  },
  "manage-admins": {
    title: "Manage Admins",
    subtitle: "Admin-only accounts and access control.",
  },
  "verification-pending": {
    title: "Verification Pending",
    subtitle: "Action vendor approval requests quickly.",
    showVendorRequestBoard: true,
  },
};

function roleTone(role: AdminDirectoryUser["role"]) {
  if (role === "admin") return "success" as const;
  if (role === "vendor") return "warning" as const;
  return "neutral" as const;
}

function vendorTone(value?: string) {
  if (value === "approved") return "success" as const;
  if (value === "pending") return "warning" as const;
  if (value === "rejected") return "danger" as const;
  return "neutral" as const;
}

const normalizePhoneInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const formatYesNo = (value?: boolean) => (value ? "Yes" : "No");
const normalizeGstin = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
const normalizeIdProofNumber = (value: string, idProofType: string) => {
  if (idProofType === "aadhaar") {
    return value.replace(/\D/g, "").slice(0, 12);
  }

  return value.trim().toUpperCase();
};

const buildSubcategoryPathMap = (items: AdminSubcategory[]) => {
  const byId = new Map<string, AdminSubcategory>();
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

const sortAndNormalizeCustomFields = (fields?: CustomFormField[]): CustomFormField[] => {
  if (!Array.isArray(fields)) return [];

  const seen = new Set<string>();
  const nextFields: CustomFormField[] = [];

  fields.forEach((field, index) => {
    const label = String(field?.label || "").trim();
    if (!label) return;

    const key = String(field?.key || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key || seen.has(key)) return;
    seen.add(key);

    const type = String(field?.type || "text") as CustomFormField["type"];
    const supportedType = ["text", "textarea", "number", "date", "select", "multi-select", "email", "phone", "url"].includes(type)
      ? type
      : "text";

    nextFields.push({
      key,
      label,
      type: supportedType,
      required: Boolean(field?.required),
      placeholder: String(field?.placeholder || "").trim() || undefined,
      helpText: String(field?.helpText || "").trim() || undefined,
      options: Array.isArray(field?.options)
        ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
        : [],
      span: field?.span === 6 ? 6 : 12,
      sortOrder: Number.isFinite(Number(field?.sortOrder)) ? Number(field.sortOrder) : (index + 1) * 10,
    });
  });

  return nextFields.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });
};

const normalizeCustomFormData = (value: unknown): CustomFormDataMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const nextData: CustomFormDataMap = {};
  Object.entries(value as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
    const key = String(rawKey || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) return;

    if (Array.isArray(rawValue)) {
      nextData[key] = rawValue.map((entry) => String(entry || "").trim()).filter(Boolean);
      return;
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      nextData[key] = rawValue;
      return;
    }

    nextData[key] = String(rawValue || "").trim();
  });

  return nextData;
};

const resolveEffectiveCustomTemplate = (
  category: Pick<AdminCategory, "name" | "customFormEnabled" | "customFormTitle" | "customFormFields"> | null,
  subcategory:
    | Pick<AdminSubcategory, "name" | "customFormEnabled" | "customFormTitle" | "customFormFields">
    | null,
  fallback?: EffectiveCustomForm
): EffectiveCustomForm => {
  const subcategoryFields = sortAndNormalizeCustomFields(subcategory?.customFormFields);
  if (subcategory?.customFormEnabled && subcategoryFields.length > 0) {
    return {
      source: "subcategory",
      title: String(subcategory.customFormTitle || "").trim() || String(subcategory.name || "").trim() || "Additional details",
      fields: subcategoryFields,
    };
  }

  const categoryFields = sortAndNormalizeCustomFields(category?.customFormFields);
  if (category?.customFormEnabled && categoryFields.length > 0) {
    return {
      source: "category",
      title: String(category.customFormTitle || "").trim() || String(category.name || "").trim() || "Additional details",
      fields: categoryFields,
    };
  }

  if (fallback?.fields?.length) {
    return {
      source: fallback.source,
      title: String(fallback.title || "").trim() || "Additional details",
      fields: sortAndNormalizeCustomFields(fallback.fields),
    };
  }

  return {
    source: "none",
    title: "",
    fields: [],
  };
};

const retainCustomDataForFields = (data: CustomFormDataMap, fields: CustomFormField[]): CustomFormDataMap => {
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

const validateCustomDataForFields = (data: CustomFormDataMap, fields: CustomFormField[]): string | null => {
  for (const field of fields) {
    const value = data[field.key];

    if (!field.required) continue;

    if (field.type === "multi-select") {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) {
        return `${field.label} is required`;
      }
      continue;
    }

    const text = String(value || "").trim();
    if (!text) {
      return `${field.label} is required`;
    }
  }

  return null;
};

const serializeCustomDataForPayload = (data: CustomFormDataMap, fields: CustomFormField[]): CustomFormDataMap => {
  const nextData: CustomFormDataMap = {};

  fields.forEach((field) => {
    const value = data[field.key];

    if (field.type === "multi-select") {
      const values = Array.isArray(value)
        ? Array.from(new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean)))
        : [];

      if (values.length > 0) {
        nextData[field.key] = values;
      }
      return;
    }

    const raw = typeof value === "number" ? String(value) : String(value || "").trim();
    if (!raw) return;

    if (field.type === "number") {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        nextData[field.key] = numeric;
      }
      return;
    }

    nextData[field.key] = raw;
  });

  return nextData;
};

const formatCustomFieldValue = (value: string | number | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const text = String(value || "").trim();
  return text || "-";
};

const areCustomDataMapsEqual = (left: CustomFormDataMap, right: CustomFormDataMap) => {
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

const ID_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar card" },
  { value: "pan", label: "PAN card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driver's license" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" },
] as const;

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
const MAX_DOCUMENT_FILE_SIZE = 8 * 1024 * 1024;
const TRANSIENT_AUTH_RETRY_LIMIT = 4;

export default function UsersPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view") || "manage-users";
  const globalQuery = searchParams.get("q") || "";
  const activeItem = findSidebarItem(viewId);
  const viewConfig = VIEW_CONFIG[viewId] || VIEW_CONFIG["manage-users"];

  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(DEFAULT_ROLE_BY_VIEW[viewId] || "all");
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>(DEFAULT_VENDOR_BY_VIEW[viewId] || "all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDirectoryUser | null>(null);

  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<AdminDirectoryUser | null>(null);
  const [detailData, setDetailData] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReviewNote, setDetailReviewNote] = useState("");
  const [activeDocument, setActiveDocument] = useState<PreviewDocument | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [authSyncRetryCount, setAuthSyncRetryCount] = useState(0);

  const [pendingActionByUser, setPendingActionByUser] = useState<Record<string, boolean>>({});

  const effectiveSearch = `${globalQuery} ${searchInput}`.trim();

  useEffect(() => {
    setRoleFilter(DEFAULT_ROLE_BY_VIEW[viewId] || "all");
    setVendorFilter(DEFAULT_VENDOR_BY_VIEW[viewId] || "all");
    setSearchInput("");
  }, [viewId]);

  useEffect(() => {
    if (!detailTarget) {
      setDetailData(null);
      setDetailError(null);
      setDetailReviewNote("");
      return;
    }

    let active = true;

    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const payload = await fetchUserDetails(detailTarget.id);
        if (!active) return;
        setDetailData(payload);
        setDetailReviewNote(payload.vendorReviewNote || "");
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to load details";
        setDetailError(message);
      } finally {
        if (!active) return;
        setDetailLoading(false);
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [detailTarget]);

  const { data, error, isLoading, mutate } = useSWR(
    ["users", roleFilter, effectiveSearch],
    () =>
      fetchUsers({
        role: roleFilter,
        search: effectiveSearch || undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  const errorMessage = error instanceof Error ? error.message : "";
  const isTransientAuthError = Boolean(
    errorMessage &&
      /(not authenticated|session expired|request failed with status 401|request failed with status 403)/i.test(
        errorMessage
      )
  );
  const isSyncingAuthSession = isTransientAuthError && authSyncRetryCount < TRANSIENT_AUTH_RETRY_LIMIT;
  const hasUsableRows = Array.isArray(data) && data.length > 0;
  const shouldShowListError = Boolean(error && !isSyncingAuthSession && !(isTransientAuthError && hasUsableRows));

  useEffect(() => {
    if (!isTransientAuthError) {
      setAuthSyncRetryCount(0);
      return;
    }

    if (authSyncRetryCount >= TRANSIENT_AUTH_RETRY_LIMIT) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAuthSyncRetryCount((prev) => prev + 1);
      void mutate();
    }, 220 + authSyncRetryCount * 180);

    return () => window.clearTimeout(timer);
  }, [authSyncRetryCount, isTransientAuthError, mutate]);

  const users = useMemo(() => {
    const base = data || [];
    if (vendorFilter === "all") return base;
    return base.filter((item) => item.vendorStatus === vendorFilter);
  }, [data, vendorFilter]);

  const pendingVendorRequests = useMemo(
    () => users.filter((item) => item.role === "vendor" && item.vendorStatus === "pending"),
    [users]
  );

  const detailUser = detailData || detailTarget;
  const detailUserBusy = detailUser ? Boolean(pendingActionByUser[detailUser.id]) : false;
  const activeDocumentKind = useMemo(() => {
    if (!activeDocument) return "other";
    return getDocumentKind(activeDocument.dataUrl);
  }, [activeDocument]);
  const canInlinePreview = activeDocumentKind === "image" || activeDocumentKind === "pdf";

  const columns: TableColumn<AdminDirectoryUser>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <button
          type="button"
          onClick={() => setDetailTarget(row)}
          className="font-medium text-(--text-strong) underline-offset-2 hover:underline"
        >
          {getDisplayName(row)}
        </button>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <StatusBadge label={row.role} tone={roleTone(row.role)} />,
    },
    {
      key: "email",
      label: "Email",
      render: (row) => row.email || "-",
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "-",
    },
    {
      key: "vendorStatus",
      label: "Vendor Status",
      render: (row) => <StatusBadge label={row.vendorStatus || "-"} tone={vendorTone(row.vendorStatus)} />,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          type="button"
          onClick={() => setDetailTarget(row)}
          className="inline-flex items-center rounded-full border border-(--accent-soft) bg-(--surface) px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-(--accent-strong) transition hover:bg-(--accent-soft)"
        >
          View
        </button>
      ),
    },
  ];

  const submitUserMutation = async (
    mode: "create" | "edit",
    payload: UserMutationInput,
    userId?: string
  ) => {
    setSubmitting(true);
    setMutationError(null);
    setMutationMessage(null);

    try {
      if (mode === "create") {
        await createUser(payload);
        setMutationMessage("User created");
      } else if (userId) {
        await updateUser(userId, payload);
        setMutationMessage("User updated");
      }
      setCreateOpen(false);
      setEditTarget(null);
      await mutate();
    } catch (mutationFail) {
      const message = mutationFail instanceof Error ? mutationFail.message : "Mutation failed";
      setMutationError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setMutationError(null);
    setMutationMessage(null);

    try {
      await deleteUser(deleteTarget.id);
      setMutationMessage("User deleted");
      setDeleteTarget(null);
      await mutate();
    } catch (deleteFail) {
      const message = deleteFail instanceof Error ? deleteFail.message : "Delete failed";
      setMutationError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitVendorStatus = async (
    user: AdminDirectoryUser,
    nextStatus: "approved" | "rejected",
    reviewNote?: string
  ) => {
    setMutationError(null);
    setMutationMessage(null);
    setPendingActionByUser((prev) => ({ ...prev, [user.id]: true }));

    try {
      await updateUser(user.id, {
        role: "vendor",
        vendorStatus: nextStatus,
        vendorReviewNote: reviewNote?.trim() || undefined,
      });
      setMutationMessage(`${getDisplayName(user)} marked as ${nextStatus}`);
      await mutate();

      if (detailTarget?.id === user.id) {
        const refreshed = await fetchUserDetails(user.id);
        setDetailData(refreshed);
        setDetailReviewNote(refreshed.vendorReviewNote || "");
      }
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "Status update failed";
      setMutationError(message);
    } finally {
      setPendingActionByUser((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const openDocumentPreview = (title: string, dataUrl: string, fileName: string) => {
    if (!dataUrl) return;
    setActiveDocument({ title, dataUrl, fileName });
  };

  return (
    <AdminShell title={viewConfig.title} subtitle={viewConfig.subtitle} showPageIntro={false}>
      <PageLayout
        title={activeItem?.label || viewConfig.title}
        subtitle={viewConfig.subtitle}
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs font-medium text-(--text-soft) hover:bg-(--surface-hover)"
          >
            New User
          </button>
        }
      >
        {viewConfig.showVendorRequestBoard ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-(--text-soft)">Incoming Vendor Requests</h3>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700">
                {pendingVendorRequests.length} pending
              </span>
            </div>

            {pendingVendorRequests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-(--border) bg-(--surface-muted) px-3 py-3 text-xs text-(--text-soft)">
                No pending vendor approval requests.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {pendingVendorRequests.map((request) => {
                  const busy = Boolean(pendingActionByUser[request.id]);
                  return (
                    <article key={request.id} className="rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-[11px] font-semibold text-amber-900" title={request.businessName || getDisplayName(request)}>
                          {request.businessName || getDisplayName(request)}
                        </p>
                        <span className="rounded-full border border-amber-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700">
                          Pending
                        </span>
                      </div>

                      <p className="truncate text-[10px] text-amber-800">{getDisplayName(request)}</p>
                      <p className="truncate text-[10px] text-amber-800">{request.phone || request.email || "No contact"}</p>

                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(request)}
                          className="w-full rounded-md border border-amber-300 bg-white px-1.5 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            void submitVendorStatus(request, "approved");
                          }}
                          className="w-full rounded-md bg-emerald-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-70"
                        >
                          {busy ? "..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDeleteTarget(request);
                          }}
                          className="w-full rounded-md bg-rose-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-rose-500 disabled:opacity-70"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {mutationError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{mutationError}</p>
        ) : null}
        {mutationMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mutationMessage}</p>
        ) : null}

        <section className="grid gap-2 rounded-xl border border-(--border) bg-(--surface) p-3 lg:grid-cols-4">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search users"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent) lg:col-span-2"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-2 text-sm"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="customer">Customers</option>
            <option value="vendor">Vendors</option>
          </select>

          <select
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value as VendorFilter)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-2 text-sm"
          >
            <option value="all">Any vendor status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </section>

        {shouldShowListError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load users"}
          </p>
        ) : null}

        {isLoading || isSyncingAuthSession ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            {isSyncingAuthSession ? "Syncing admin session..." : "Loading users..."}
          </section>
        ) : (
          <Table rows={users} columns={columns} rowKey={(row) => row.id} emptyText="No users found for current filters." />
        )}
      </PageLayout>

      <UserFormModal
        key={`create-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        mode="create"
        title="Create User"
        submitting={submitting}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => void submitUserMutation("create", payload)}
      />

      <UserFormModal
        key={`edit-${editTarget?.id || "none"}`}
        open={Boolean(editTarget)}
        mode="edit"
        title="Edit User"
        initialValue={editTarget || undefined}
        submitting={submitting}
        onClose={() => setEditTarget(null)}
        onSubmit={(payload) => void submitUserMutation("edit", payload, editTarget?.id)}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete user"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft)"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitDelete()}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-(--text-soft)">
          This will call <span className="font-medium">/api/admin/users/:id</span>. Continue deleting {deleteTarget?.name || "this user"}?
        </p>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        title={detailTarget?.businessName ? `${detailTarget.businessName} Details` : "User Details"}
        onClose={() => setDetailTarget(null)}
        panelClassName={detailUser?.role === "vendor" ? "max-w-[88vw] xl:max-w-[1280px] 2xl:max-w-[1480px]" : undefined}
        footer={
          <>
            {detailUser ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(detailUser);
                  setDetailTarget(null);
                }}
                className="rounded-full border border-rose-500 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
              >
                Delete
              </button>
            ) : null}

            {detailData ? (
              <button
                type="button"
                onClick={() => {
                  setEditTarget(detailData);
                  setDetailTarget(null);
                }}
                className="rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--text-soft) transition hover:bg-(--surface-hover)"
              >
                Edit
              </button>
            ) : null}

            {detailUser?.role === "vendor" && detailUser.vendorStatus !== "approved" ? (
              <button
                type="button"
                disabled={detailUserBusy}
                onClick={() => {
                  void submitVendorStatus(detailUser, "approved", detailReviewNote);
                }}
                className="rounded-full border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-70"
              >
                {detailUserBusy ? "Working..." : "Approve"}
              </button>
            ) : null}

            {detailUser?.role === "vendor" && detailUser.vendorStatus !== "rejected" ? (
              <button
                type="button"
                disabled={detailUserBusy}
                onClick={() => {
                  void submitVendorStatus(detailUser, "rejected", detailReviewNote);
                }}
                className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-70"
              >
                {detailUserBusy ? "Working..." : "Reject"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setDetailTarget(null)}
              className="rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--text-soft) transition hover:bg-(--surface-hover)"
            >
              Close
            </button>
          </>
        }
      >
        {detailLoading ? <p className="text-sm text-(--text-soft)">Loading details...</p> : null}
        {detailError ? <p className="text-sm text-rose-700">{detailError}</p> : null}
        {detailData ? (
          <section className="space-y-2 break-words rounded-xl border border-(--border) bg-(--surface-muted) p-2.5 text-[13px] text-(--text-soft)">
            <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--surface) px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--border) bg-(--surface-muted) text-sm font-bold text-(--text-strong)">
                  {getDisplayName(detailData).charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-base font-semibold text-(--text-strong)">{getDisplayName(detailData)}</p>
                  <p className="text-sm text-(--text-soft)">{detailData.email || detailData.phone || "No contact info"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StatusBadge label={detailData.role} tone={roleTone(detailData.role)} />
                {detailData.role === "vendor" ? (
                  <StatusBadge label={detailData.vendorStatus || "pending"} tone={vendorTone(detailData.vendorStatus)} />
                ) : null}
              </div>
            </header>

            <div className="space-y-1 rounded-lg border border-(--border) bg-(--surface) p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--text-soft)">Account Profile</p>
              <div className="grid gap-x-4 gap-y-1 lg:grid-cols-3">
              <p><span className="font-semibold text-(--text-strong)">Name:</span> {getDisplayName(detailData)}</p>
              <p><span className="font-semibold text-(--text-strong)">Role:</span> {detailData.role}</p>
              <p><span className="font-semibold text-(--text-strong)">Email:</span> {detailData.email || "-"}</p>
              <p><span className="font-semibold text-(--text-strong)">Phone:</span> {detailData.phone || "-"}</p>
              <p><span className="font-semibold text-(--text-strong)">Created:</span> {formatDate(detailData.createdAt)}</p>
              <p><span className="font-semibold text-(--text-strong)">Updated:</span> {formatDate(detailData.updatedAt)}</p>
            </div>
            </div>

            {detailData.role === "vendor" ? (
              <>
                <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Vendor Registration Snapshot</p>
                  <div className="grid gap-x-4 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
                    <p><span className="font-semibold text-(--text-strong)">Vendor Status:</span> {detailData.vendorStatus || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Owner Name:</span> {getDisplayName(detailData)}</p>
                    <p><span className="font-semibold text-(--text-strong)">Personal Email:</span> {detailData.email || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Personal Phone:</span> {detailData.phone || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Business Name:</span> {detailData.businessName || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Business Email:</span> {detailData.businessEmail || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Business Phone:</span> {detailData.businessPhone || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Category:</span> {detailData.businessCategory?.name || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Subcategory:</span> {detailData.businessSubcategory?.name || "-"}</p>
                    <p className="xl:col-span-4"><span className="font-semibold text-(--text-strong)">Business Address:</span> {detailData.businessAddress || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">City:</span> {detailData.city || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Sublocality:</span> {detailData.sublocality || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">State:</span> {detailData.state || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Postal Code:</span> {detailData.postalCode || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">GSTIN:</span> {detailData.gstNumber || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Shop Opening Time:</span> {detailData.shopOpeningTime || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Shop Closing Time:</span> {detailData.shopClosingTime || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Establishment Year:</span> {detailData.establishmentYear || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Website:</span> {detailData.website || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">ID Proof Type:</span> {detailData.idProofType || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">ID Proof Number:</span> {detailData.idProofNumber || "-"}</p>
                    <p><span className="font-semibold text-(--text-strong)">Marketing Opt-in:</span> {formatYesNo(detailData.marketingOptIn)}</p>
                    <p className="xl:col-span-4"><span className="font-semibold text-(--text-strong)">Services/Tags:</span> {detailData.serviceTags?.length ? detailData.serviceTags.join(", ") : "-"}</p>
                    <p className="xl:col-span-4"><span className="font-semibold text-(--text-strong)">Business Description:</span> {detailData.businessDescription || "-"}</p>
                  </div>
                </div>

                {(() => {
                  const templateFields = sortAndNormalizeCustomFields(detailData.effectiveCustomForm?.fields);
                  const customData = normalizeCustomFormData(detailData.customFormData);
                  const hasTemplate = templateFields.length > 0;
                  const hasRawData = Object.keys(customData).length > 0;

                  if (!hasTemplate && !hasRawData) {
                    return null;
                  }

                  return (
                    <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
                        {detailData.effectiveCustomForm?.title || "Additional vendor details"}
                      </p>

                      {hasTemplate ? (
                        <div className="grid gap-x-4 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
                          {templateFields.map((field) => (
                            <p key={field.key} className={field.span === 12 ? "xl:col-span-3 2xl:col-span-4" : ""}>
                              <span className="font-semibold text-(--text-strong)">{field.label}:</span>{" "}
                              {formatCustomFieldValue(customData[field.key])}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      {!hasTemplate && hasRawData ? (
                        <div className="grid gap-x-4 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
                          {Object.entries(customData).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-semibold text-(--text-strong)">{key}:</span>{" "}
                              {formatCustomFieldValue(value)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="space-y-2 rounded-lg border border-(--border) bg-(--surface) p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--text-soft)">Documents</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-(--text-strong)">GST Document:</span>
                    {detailData.gstDocument ? (
                      <>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {getDocumentTypeLabel(detailData.gstDocument)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openDocumentPreview(
                              "GST Document",
                              detailData.gstDocument || "",
                              buildDocumentFileName(`${detailData.businessName || detailData.id}-gst`, detailData.gstDocument || "")
                            )
                          }
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700"
                        >
                          View Document
                        </button>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-(--text-strong)">ID Proof:</span>
                    {detailData.idProofDocument ? (
                      <>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {getDocumentTypeLabel(detailData.idProofDocument)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openDocumentPreview(
                              "ID Proof Document",
                              detailData.idProofDocument || "",
                              buildDocumentFileName(`${detailData.businessName || detailData.id}-id-proof`, detailData.idProofDocument || "")
                            )
                          }
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700"
                        >
                          View Document
                        </button>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>

                <label className="block space-y-1 text-sm text-(--text-soft)">
                  Review note
                  <textarea
                    value={detailReviewNote}
                    onChange={(event) => setDetailReviewNote(event.target.value)}
                    rows={1}
                    className="w-full resize-none rounded-lg border border-(--border) bg-(--surface) px-2 py-1.5 text-sm outline-none focus:border-(--accent)"
                    placeholder="Optional note for vendor approval review"
                  />
                </label>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-(--border) bg-(--surface) px-2.5 py-2 text-sm text-(--text-soft)">
                This role has account-level details only.
              </p>
            )}
          </section>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(activeDocument)}
        title={activeDocument ? `${activeDocument.title} preview` : "Document preview"}
        onClose={() => setActiveDocument(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                void requestFullscreen(previewRef.current);
              }}
              disabled={!canInlinePreview}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              Full Screen
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeDocument) return;
                openDocumentInNewTab(activeDocument.dataUrl);
              }}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeDocument) return;
                downloadDocument(activeDocument.dataUrl, activeDocument.fileName);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Download
            </button>
          </>
        }
      >
        {activeDocument ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700">
                {getDocumentTypeLabel(activeDocument.dataUrl)}
              </span>
              <span className="truncate">{activeDocument.fileName}</span>
            </div>

            <div ref={previewRef} className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {activeDocumentKind === "image" ? (
                <img src={activeDocument.dataUrl} alt={activeDocument.title} className="mx-auto max-h-[64vh] w-auto rounded-md" />
              ) : null}

              {activeDocumentKind === "pdf" ? (
                <iframe title={activeDocument.title} src={activeDocument.dataUrl} className="h-[64vh] w-full rounded-md bg-white" />
              ) : null}

              {activeDocumentKind === "word" ? (
                <p className="px-2 py-10 text-center text-sm text-slate-600">
                  Preview is not available for Word files. Use Open to view or Download to save.
                </p>
              ) : null}

              {activeDocumentKind === "other" ? (
                <p className="px-2 py-10 text-center text-sm text-slate-600">
                  Preview is not available for this file type. Use Open or Download.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  title: string;
  initialValue?: AdminUserDetail;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: UserMutationInput) => void;
};

function UserFormModal({ open, mode, title, initialValue, submitting, onClose, onSubmit }: UserFormModalProps) {
  const isCreate = mode === "create";

  const [name, setName] = useState(initialValue?.name || "");
  const [email, setEmail] = useState(initialValue?.email || "");
  const [phone, setPhone] = useState(initialValue?.phone ? normalizePhoneInput(initialValue.phone) : "");
  const [role, setRole] = useState<MutationRole>(initialValue?.role || "customer");
  const [password, setPassword] = useState("");

  const [vendorStatus, setVendorStatus] = useState<MutationVendorStatus>(initialValue?.vendorStatus || "pending");
  const [businessName, setBusinessName] = useState(initialValue?.businessName || "");
  const [businessCategoryId, setBusinessCategoryId] = useState(initialValue?.businessCategory?.id || "");
  const [businessSubcategoryId, setBusinessSubcategoryId] = useState(initialValue?.businessSubcategory?.id || "");
  const [businessEmail, setBusinessEmail] = useState(initialValue?.businessEmail || "");
  const [businessPhone, setBusinessPhone] = useState(
    initialValue?.businessPhone ? normalizePhoneInput(initialValue.businessPhone) : ""
  );
  const [businessAddress, setBusinessAddress] = useState(initialValue?.businessAddress || "");
  const [city, setCity] = useState(initialValue?.city || "");
  const [sublocality, setSublocality] = useState(initialValue?.sublocality || "");
  const [state, setState] = useState(initialValue?.state || "");
  const [postalCode, setPostalCode] = useState(initialValue?.postalCode || "");
  const [gstNumber, setGstNumber] = useState(initialValue?.gstNumber || "");
  const [gstDocument, setGstDocument] = useState(initialValue?.gstDocument || "");
  const [website, setWebsite] = useState(initialValue?.website || "");
  const [shopOpeningTime, setShopOpeningTime] = useState(initialValue?.shopOpeningTime || "");
  const [shopClosingTime, setShopClosingTime] = useState(initialValue?.shopClosingTime || "");
  const [establishmentYear, setEstablishmentYear] = useState(
    initialValue?.establishmentYear ? String(initialValue.establishmentYear) : ""
  );
  const [serviceTagsInput, setServiceTagsInput] = useState(initialValue?.serviceTags?.join(", ") || "");
  const [businessDescription, setBusinessDescription] = useState(initialValue?.businessDescription || "");
  const [idProofType, setIdProofType] = useState(initialValue?.idProofType || "");
  const [idProofNumber, setIdProofNumber] = useState(initialValue?.idProofNumber || "");
  const [idProofDocument, setIdProofDocument] = useState(initialValue?.idProofDocument || "");
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(initialValue?.marketingOptIn));
  const [vendorReviewNote, setVendorReviewNote] = useState(initialValue?.vendorReviewNote || "");
  const [customFormData, setCustomFormData] = useState<CustomFormDataMap>(() =>
    normalizeCustomFormData(initialValue?.customFormData)
  );

  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AdminSubcategory[]>([]);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedIdProofDocumentName, setSelectedIdProofDocumentName] = useState("");
  const [selectedGstDocumentName, setSelectedGstDocumentName] = useState("");

  const isVendor = role === "vendor";

  useEffect(() => {
    if (!isVendor) return;

    let active = true;

    const loadTaxonomy = async () => {
      setTaxonomyLoading(true);
      setTaxonomyError(null);

      try {
        const payload = await fetchCategoryExplorer();
        if (!active) return;
        setCategories(payload.categories);
        setSubcategories(payload.subcategories);
        setBusinessCategoryId((current) => current || payload.categories[0]?.id || "");
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load category options";
        setTaxonomyError(message);
      } finally {
        if (!active) return;
        setTaxonomyLoading(false);
      }
    };

    void loadTaxonomy();

    return () => {
      active = false;
    };
  }, [isVendor]);

  const subcategoryPathMap = useMemo(() => buildSubcategoryPathMap(subcategories), [subcategories]);

  const filteredSubcategories = useMemo(() => {
    if (!businessCategoryId) return [];

    return subcategories
      .filter((item) => item.category?.id === businessCategoryId)
      .sort((left, right) => {
        const leftLabel = subcategoryPathMap.get(left.id) || left.name;
        const rightLabel = subcategoryPathMap.get(right.id) || right.name;
        return leftLabel.localeCompare(rightLabel);
      });
  }, [businessCategoryId, subcategories, subcategoryPathMap]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === businessCategoryId) || null,
    [businessCategoryId, categories]
  );

  const selectedSubcategory = useMemo(
    () => subcategories.find((subcategory) => subcategory.id === businessSubcategoryId) || null,
    [businessSubcategoryId, subcategories]
  );

  const effectiveCustomForm = useMemo(
    () => resolveEffectiveCustomTemplate(selectedCategory, selectedSubcategory, initialValue?.effectiveCustomForm),
    [initialValue?.effectiveCustomForm, selectedCategory, selectedSubcategory]
  );

  useEffect(() => {
    if (!businessSubcategoryId) return;
    const existsInCategory = filteredSubcategories.some((item) => item.id === businessSubcategoryId);
    if (!existsInCategory) {
      setBusinessSubcategoryId("");
    }
  }, [businessSubcategoryId, filteredSubcategories]);

  useEffect(() => {
    if (!isVendor) return;

    setCustomFormData((current) => {
      const next = retainCustomDataForFields(current, effectiveCustomForm.fields);
      if (areCustomDataMapsEqual(current, next)) {
        return current;
      }
      return next;
    });
  }, [effectiveCustomForm.fields, isVendor]);

  const parsedServiceTags = useMemo(() => {
    const tags = serviceTagsInput
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 100);

    return Array.from(new Set(tags));
  }, [serviceTagsInput]);

  const customFormValidationError = useMemo(
    () => (isVendor ? validateCustomDataForFields(customFormData, effectiveCustomForm.fields) : null),
    [customFormData, effectiveCustomForm.fields, isVendor]
  );

  const roleNeedsPassword = role === "admin" || role === "vendor";
  const passwordValid =
    password.trim().length === 0 ? !(isCreate && roleNeedsPassword) : password.trim().length >= 6;
  const hasContact = email.trim().length > 0 || phone.trim().length > 0;
  const vendorRequiredValid =
    !isVendor ||
    (businessName.trim().length > 0 && businessEmail.trim().length > 0 && businessPhone.trim().length === 10);
  const canSubmit =
    name.trim().length > 0 && hasContact && passwordValid && vendorRequiredValid && !customFormValidationError;

  const handleDocumentUpload = async (field: "idProofDocument" | "gstDocument", files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setDocumentError(null);
    const allowed = DOCUMENT_ACCEPTED_TYPES.includes(file.type as (typeof DOCUMENT_ACCEPTED_TYPES)[number]);
    if (!allowed) {
      setDocumentError("Only PNG, JPG, WEBP, PDF, DOC or DOCX files are allowed.");
      return;
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      setDocumentError("Document file size should be less than 8MB.");
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      if (field === "idProofDocument") {
        setIdProofDocument(dataUrl);
        setSelectedIdProofDocumentName(file.name);
      } else {
        setGstDocument(dataUrl);
        setSelectedGstDocumentName(file.name);
      }
    } catch {
      setDocumentError("Failed to read selected file.");
    }
  };

  const updateCustomFieldValue = (fieldKey: string, value: string | number | string[]) => {
    setCustomFormData((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const toggleCustomFieldOption = (fieldKey: string, option: string, checked: boolean) => {
    setCustomFormData((current) => {
      const currentValues = Array.isArray(current[fieldKey])
        ? (current[fieldKey] as string[])
        : [];

      if (checked) {
        if (currentValues.includes(option)) return current;
        return {
          ...current,
          [fieldKey]: [...currentValues, option],
        };
      }

      return {
        ...current,
        [fieldKey]: currentValues.filter((value) => value !== option),
      };
    });
  };

  const submit = () => {
    const payload: UserMutationInput = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    if (isVendor) {
      payload.vendorStatus = vendorStatus;
      payload.vendorReviewNote = vendorReviewNote.trim();
      payload.businessName = businessName.trim() || undefined;
      payload.businessCategoryId = businessCategoryId;
      payload.businessSubcategoryId = businessSubcategoryId;
      payload.businessEmail = businessEmail.trim() || undefined;
      payload.businessPhone = businessPhone.trim() || undefined;
      payload.businessAddress = businessAddress.trim();
      payload.city = city.trim();
      payload.sublocality = sublocality.trim();
      payload.state = state.trim();
      payload.postalCode = postalCode.trim();
      payload.gstNumber = gstNumber.trim();
      payload.gstDocument = gstDocument.trim();
      payload.website = website.trim();
      payload.shopOpeningTime = shopOpeningTime.trim() || undefined;
      payload.shopClosingTime = shopClosingTime.trim() || undefined;

      const parsedEstablishmentYear = establishmentYear.trim() ? Number(establishmentYear) : null;
      if (parsedEstablishmentYear === null || Number.isFinite(parsedEstablishmentYear)) {
        payload.establishmentYear = parsedEstablishmentYear;
      }

      payload.serviceTags = parsedServiceTags;
      payload.businessDescription = businessDescription.trim();
      payload.idProofType = idProofType;
      payload.idProofNumber = idProofNumber.trim();
      payload.idProofDocument = idProofDocument.trim();
      payload.marketingOptIn = marketingOptIn;
      payload.customFormData = serializeCustomDataForPayload(customFormData, effectiveCustomForm.fields);
    }

    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      panelClassName={isVendor ? "max-w-[94vw] xl:max-w-[1200px]" : undefined}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--text-soft) transition hover:bg-(--surface-hover)"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="rounded-full border border-(--accent) bg-(--accent) px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
        <section className="space-y-2 rounded-xl border border-(--border) bg-(--surface) p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-soft)">Base Details</p>
            <span className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-(--text-soft)">
              {role}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm text-(--text-soft)">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
              placeholder="Full name"
            />
          </label>

          <label className="block space-y-1 text-sm text-(--text-soft)">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MutationRole)}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-(--text-soft)">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
              placeholder="name@email.com"
            />
          </label>

          <label className="block space-y-1 text-sm text-(--text-soft)">
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
              placeholder="10-digit phone"
            />
          </label>

          <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2">
            Password {isCreate && roleNeedsPassword ? "(required)" : "(optional)"}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
              placeholder={isCreate && roleNeedsPassword ? "Minimum 6 characters" : "Leave blank to keep unchanged"}
            />
          </label>
        </div>
        </section>

        {isVendor ? (
          <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Vendor Details</p>

            {taxonomyError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{taxonomyError}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <label className="block space-y-1 text-sm text-(--text-soft)">
                Vendor status
                <select
                  value={vendorStatus}
                  onChange={(event) => setVendorStatus(event.target.value as MutationVendorStatus)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Business name
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Business name"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Business category
                <select
                  value={businessCategoryId}
                  onChange={(event) => setBusinessCategoryId(event.target.value)}
                  disabled={taxonomyLoading}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 disabled:opacity-70"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Business subcategory
                <select
                  value={businessSubcategoryId}
                  onChange={(event) => setBusinessSubcategoryId(event.target.value)}
                  disabled={taxonomyLoading || !businessCategoryId}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 disabled:opacity-70"
                >
                  <option value="">No subcategory</option>
                  {filteredSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategoryPathMap.get(subcategory.id) || subcategory.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
                    {effectiveCustomForm.title || "Additional vendor details"}
                  </p>
                  <span className="rounded-full border border-sky-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                    {effectiveCustomForm.source}
                  </span>
                </div>

                {effectiveCustomForm.fields.length === 0 ? (
                  <p className="text-xs text-sky-700">
                    No dynamic fields are configured for the selected category/subcategory.
                  </p>
                ) : (
                  <div className="grid grid-cols-12 gap-2">
                    {effectiveCustomForm.fields.map((field) => {
                      const rawValue = customFormData[field.key];
                      const value = Array.isArray(rawValue)
                        ? rawValue
                        : typeof rawValue === "number"
                          ? String(rawValue)
                          : String(rawValue || "");
                      const isHalf = field.span === 6;

                      return (
                        <label
                          key={field.key}
                          className={`block space-y-1 text-xs text-slate-700 ${isHalf ? "col-span-12 sm:col-span-6" : "col-span-12"}`}
                        >
                          <span className="font-medium text-slate-700">
                            {field.label}
                            {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
                          </span>

                          {field.type === "textarea" ? (
                            <textarea
                              rows={2}
                              value={typeof value === "string" ? value : ""}
                              onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                              placeholder={field.placeholder || "Enter details"}
                              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-sky-500"
                            />
                          ) : null}

                          {field.type === "select" ? (
                            <select
                              value={typeof value === "string" ? value : ""}
                              onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5"
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
                              <div className="grid gap-1 rounded-md border border-slate-200 bg-white p-2">
                                {(field.options || []).map((option) => {
                                  const selectedValues = Array.isArray(rawValue) ? rawValue : [];
                                  const checked = selectedValues.includes(option);
                                  return (
                                    <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) =>
                                          toggleCustomFieldOption(field.key, option, event.target.checked)
                                        }
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
                                placeholder={field.placeholder || "comma separated values"}
                                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-sky-500"
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
                              value={typeof value === "string" ? value : ""}
                              onChange={(event) => updateCustomFieldValue(field.key, event.target.value)}
                              placeholder={field.placeholder || "Enter value"}
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-sky-500"
                            />
                          ) : null}

                          {field.helpText ? <p className="text-[11px] text-slate-500">{field.helpText}</p> : null}
                        </label>
                      );
                    })}
                  </div>
                )}

                {customFormValidationError ? (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                    {customFormValidationError}
                  </p>
                ) : null}
              </div>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Business email
                <input
                  value={businessEmail}
                  onChange={(event) => setBusinessEmail(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="store@email.com"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Business phone
                <input
                  value={businessPhone}
                  onChange={(event) => setBusinessPhone(normalizePhoneInput(event.target.value))}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="10-digit business phone"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                City
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="City"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Sublocality
                <input
                  value={sublocality}
                  onChange={(event) => setSublocality(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Sublocality"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                State
                <input
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="State"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Postal code
                <input
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Postal code"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                GSTIN
                <input
                  value={gstNumber}
                  onChange={(event) => setGstNumber(normalizeGstin(event.target.value))}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="GSTIN"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2 lg:col-span-2">
                GST document
                <input
                  type="file"
                  accept={DOCUMENT_ACCEPT_ATTR}
                  onChange={(event) => {
                    void handleDocumentUpload("gstDocument", event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-2.5 py-2 text-xs"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-soft)">
                  <span>
                    {gstDocument
                      ? `Current: ${selectedGstDocumentName || getDocumentTypeLabel(gstDocument)}`
                      : "No GST document uploaded"}
                  </span>
                  {gstDocument ? (
                    <button
                      type="button"
                      onClick={() => {
                        setGstDocument("");
                        setSelectedGstDocumentName("");
                      }}
                      className="rounded-md border border-(--border) bg-(--surface) px-2 py-0.5 text-[11px] font-semibold text-(--text-soft)"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Establishment year
                <input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={establishmentYear}
                  onChange={(event) => setEstablishmentYear(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="e.g. 2018"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Shop opening time
                <input
                  type="time"
                  value={shopOpeningTime}
                  onChange={(event) => setShopOpeningTime(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                Shop closing time
                <input
                  type="time"
                  value={shopClosingTime}
                  onChange={(event) => setShopClosingTime(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2">
                Website
                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="https://example.com"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2">
                Business address
                <textarea
                  value={businessAddress}
                  onChange={(event) => setBusinessAddress(event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Street, area, landmark"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2 lg:col-span-3">
                Services/tags (comma separated)
                <textarea
                  value={serviceTagsInput}
                  onChange={(event) => setServiceTagsInput(event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="plumbing, electrical, home automation"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2 lg:col-span-3">
                Business description
                <textarea
                  value={businessDescription}
                  onChange={(event) => setBusinessDescription(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Describe what this business offers"
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                ID proof type
                <select
                  value={idProofType}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setIdProofType(nextType);
                    setIdProofNumber((current) => normalizeIdProofNumber(current, nextType));
                  }}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2"
                >
                  <option value="">Select ID proof type</option>
                  {ID_PROOF_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                ID proof number
                <input
                  value={idProofNumber}
                  onChange={(event) => setIdProofNumber(normalizeIdProofNumber(event.target.value, idProofType))}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder={idProofType === "aadhaar" ? "12-digit Aadhaar number" : "ID number"}
                />
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft)">
                ID proof document
                <input
                  type="file"
                  accept={DOCUMENT_ACCEPT_ATTR}
                  onChange={(event) => {
                    void handleDocumentUpload("idProofDocument", event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-2.5 py-2 text-xs"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-soft)">
                  <span>
                    {idProofDocument
                      ? `Current: ${selectedIdProofDocumentName || getDocumentTypeLabel(idProofDocument)}`
                      : "No ID proof document uploaded"}
                  </span>
                  {idProofDocument ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIdProofDocument("");
                        setSelectedIdProofDocumentName("");
                      }}
                      className="rounded-md border border-(--border) bg-(--surface) px-2 py-0.5 text-[11px] font-semibold text-(--text-soft)"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </label>

              <label className="block space-y-1 text-sm text-(--text-soft) sm:col-span-2 lg:col-span-3">
                Review note
                <textarea
                  value={vendorReviewNote}
                  onChange={(event) => setVendorReviewNote(event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-(--border) bg-(--surface) px-3 py-2 outline-none focus:border-(--accent)"
                  placeholder="Optional review note"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-soft) sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  className="h-4 w-4"
                />
                Vendor agreed to marketing updates
              </label>
            </div>

            {documentError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{documentError}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
