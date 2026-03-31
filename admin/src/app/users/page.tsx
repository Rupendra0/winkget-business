"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import DropdownMenu from "@/components/admin/DropdownMenu";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  type AdminDirectoryUser,
  type UserMutationInput,
} from "@/lib/adminApi";
import { formatDate, getDisplayName } from "@/lib/adminUi";

type RoleFilter = "all" | "admin" | "customer" | "vendor";
type VendorFilter = "all" | "pending" | "approved" | "rejected";

const DEFAULT_ROLE_BY_VIEW: Record<string, RoleFilter> = {
  "manage-users": "all",
  "manage-partners": "vendor",
  "manage-admins": "admin",
  "verification-pending": "vendor",
};

const DEFAULT_VENDOR_BY_VIEW: Record<string, VendorFilter> = {
  "verification-pending": "pending",
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

  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(DEFAULT_ROLE_BY_VIEW[viewId] || "all");
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>(DEFAULT_VENDOR_BY_VIEW[viewId] || "all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminDirectoryUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDirectoryUser | null>(null);

  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveSearch = `${globalQuery} ${searchInput}`.trim();

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

  const users = useMemo(() => {
    const base = data || [];
    if (vendorFilter === "all") return base;
    return base.filter((item) => item.vendorStatus === vendorFilter);
  }, [data, vendorFilter]);

  const columns: TableColumn<AdminDirectoryUser>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => <span className="font-medium text-(--text-strong)">{getDisplayName(row)}</span>,
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
        <DropdownMenu
          trigger={<span className="rounded-md border border-(--border) px-2 py-1 text-xs">Actions</span>}
          actions={[
            {
              id: "edit",
              label: "Edit",
              onClick: () => setEditTarget(row),
            },
            {
              id: "delete",
              label: "Delete",
              onClick: () => setDeleteTarget(row),
              destructive: true,
            },
          ]}
        />
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

  return (
    <AdminShell title="Manage Users" subtitle="Search, filter, and moderate user records.">
      <PageLayout
        title={activeItem?.label || "Manage Users"}
        subtitle="Search, filter, pagination, status badges, and row-level actions."
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

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load users"}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            Loading users...
          </section>
        ) : (
          <Table rows={users} columns={columns} rowKey={(row) => row.id} emptyText="No users found for current filters." />
        )}
      </PageLayout>

      <UserFormModal
        key={`create-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        title="Create User"
        submitting={submitting}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => void submitUserMutation("create", payload)}
      />

      <UserFormModal
        key={`edit-${editTarget?.id || "none"}`}
        open={Boolean(editTarget)}
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
          This will call <span className="font-medium">/api/users/:id</span>. Continue deleting {deleteTarget?.name || "this user"}?
        </p>
      </Modal>
    </AdminShell>
  );
}

type UserFormModalProps = {
  open: boolean;
  title: string;
  initialValue?: AdminDirectoryUser;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: UserMutationInput) => void;
};

function UserFormModal({ open, title, initialValue, submitting, onClose, onSubmit }: UserFormModalProps) {
  const [name, setName] = useState(initialValue?.name || "");
  const [email, setEmail] = useState(initialValue?.email || "");
  const [phone, setPhone] = useState(initialValue?.phone || "");
  const [role, setRole] = useState<UserMutationInput["role"]>(initialValue?.role || "customer");

  const canSubmit = name.trim().length > 0;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft)"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                role,
              })
            }
            className="rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <label className="block space-y-1 text-sm text-(--text-soft)">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
          placeholder="Full name"
        />
      </label>
      <label className="block space-y-1 text-sm text-(--text-soft)">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
          placeholder="name@email.com"
        />
      </label>
      <label className="block space-y-1 text-sm text-(--text-soft)">
        Phone
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
          placeholder="10-digit phone"
        />
      </label>
      <label className="block space-y-1 text-sm text-(--text-soft)">
        Role
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserMutationInput["role"])}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2"
        >
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>
      </label>
    </Modal>
  );
}
