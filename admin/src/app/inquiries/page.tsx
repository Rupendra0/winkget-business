"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  fetchInquiries,
  updateInquiry,
  type InquiryRecord,
  type InquiryStatus,
} from "@/lib/adminApi";
import { formatDate } from "@/lib/adminUi";

type InquiryStatusFilter = "All" | InquiryStatus;

export default function InquiriesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <InquiriesPageContent />
    </Suspense>
  );
}

function InquiriesPageContent() {
  const searchParams = useSearchParams();
  const activeItem = findSidebarItem(searchParams.get("view"));
  const globalQuery = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("All");
  const [selectedId, setSelectedId] = useState("");
  const [statusDraft, setStatusDraft] = useState<InquiryStatus>("Open");
  const [noteDraft, setNoteDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR("inquiries", () => fetchInquiries({ limit: 300 }), {
    keepPreviousData: true,
  });

  const rows = useMemo(() => {
    const list = data || [];
    const query = `${globalQuery} ${searchInput}`.trim().toLowerCase();

    return list.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (!query) return true;
      return `${item.subject} ${item.name} ${item.phone} ${item.email || ""} ${item.message}`
        .toLowerCase()
        .includes(query);
    });
  }, [data, globalQuery, searchInput, statusFilter]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId("");
      return;
    }

    if (!rows.some((item) => item.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selectedInquiry = useMemo(
    () => rows.find((item) => item.id === selectedId) || null,
    [rows, selectedId]
  );

  useEffect(() => {
    if (!selectedInquiry) return;
    setStatusDraft(selectedInquiry.status);
    setNoteDraft(selectedInquiry.adminNote || "");
    setActionError(null);
    setActionSuccess(null);
  }, [selectedInquiry]);

  const stats = useMemo(() => {
    const source = data || [];
    const open = source.filter((item) => item.status === "Open").length;
    const inProgress = source.filter((item) => item.status === "In Progress").length;
    const closed = source.filter((item) => item.status === "Closed").length;
    return { total: source.length, open, inProgress, closed };
  }, [data]);

  const handleSave = async () => {
    if (!selectedInquiry) return;

    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateInquiry(selectedInquiry.id, {
        status: statusDraft,
        adminNote: noteDraft.trim() || undefined,
      });

      await mutate(
        (current) => (current || []).map((item) => (item.id === updated.id ? updated : item)),
        { revalidate: false }
      );
      setActionSuccess("Inquiry updated successfully.");
    } catch (updateError) {
      setActionError(
        updateError instanceof Error ? updateError.message : "Failed to update inquiry"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<InquiryRecord>[] = [
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          className={`text-left font-medium transition-colors ${
            selectedId === row.id ? "text-(--accent)" : "text-(--text-strong)"
          }`}
        >
          {row.subject}
        </button>
      ),
    },
    {
      key: "name",
      label: "Requester",
      render: (row) => (
        <div>
          <p className="font-medium text-(--text-strong)">{row.name}</p>
          <p>{row.phone}</p>
        </div>
      ),
    },
    {
      key: "vendor",
      label: "Vendor",
      render: (row) => row.vendor?.businessName || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={
            row.status === "Open"
              ? "warning"
              : row.status === "In Progress"
              ? "neutral"
              : "success"
          }
        />
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <AdminShell
      title="Inquiries"
      subtitle="Review incoming customer enquiries and manage response status."
    >
      <PageLayout
        title={activeItem?.label || "Inquiries"}
        subtitle="Realtime data from backend inquiry APIs with status and note updates."
      >
        <section className="grid gap-3 rounded-xl border border-(--border) bg-(--surface) p-3 sm:grid-cols-5">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as InquiryStatusFilter)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-2 text-sm"
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search subject, requester, phone"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent) sm:col-span-3"
          />
          <button
            type="button"
            onClick={() => void mutate()}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm hover:bg-(--surface-hover)"
          >
            {isValidating ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        <section className="grid gap-2 rounded-xl border border-(--border) bg-(--surface) p-3 sm:grid-cols-4 text-sm text-(--text-soft)">
          <p>Total: <span className="font-semibold text-(--text-strong)">{stats.total}</span></p>
          <p>Open: <span className="font-semibold text-(--text-strong)">{stats.open}</span></p>
          <p>In Progress: <span className="font-semibold text-(--text-strong)">{stats.inProgress}</span></p>
          <p>Closed: <span className="font-semibold text-(--text-strong)">{stats.closed}</span></p>
        </section>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load inquiries"}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            Loading inquiries...
          </section>
        ) : (
          <Table
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            emptyText="No inquiries found."
            initialPageSize={20}
          />
        )}

        {selectedInquiry ? (
          <section className="grid gap-4 rounded-xl border border-(--border) bg-(--surface) p-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-(--text-strong)">Inquiry Details</h3>
              <div className="grid gap-2 text-sm text-(--text-soft)">
                <p><span className="font-medium text-(--text-strong)">Subject:</span> {selectedInquiry.subject}</p>
                <p><span className="font-medium text-(--text-strong)">Requester:</span> {selectedInquiry.name}</p>
                <p><span className="font-medium text-(--text-strong)">Phone:</span> {selectedInquiry.phone}</p>
                <p><span className="font-medium text-(--text-strong)">Email:</span> {selectedInquiry.email || "Not provided"}</p>
                <p><span className="font-medium text-(--text-strong)">Channel:</span> {selectedInquiry.channel}</p>
                <p><span className="font-medium text-(--text-strong)">Created:</span> {formatDate(selectedInquiry.createdAt)}</p>
                <p><span className="font-medium text-(--text-strong)">Updated:</span> {formatDate(selectedInquiry.updatedAt)}</p>
                <p>
                  <span className="font-medium text-(--text-strong)">Vendor:</span>{" "}
                  {selectedInquiry.vendor?.businessName || "Not linked"}
                </p>
                {selectedInquiry.vendor ? (
                  <p>
                    <span className="font-medium text-(--text-strong)">Vendor Contact:</span>{" "}
                    {selectedInquiry.vendor.businessPhone || "Not provided"}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-(--border) bg-(--surface-muted) p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-(--text-soft)">Message</p>
                <p className="mt-2 text-sm text-(--text-strong) whitespace-pre-wrap">
                  {selectedInquiry.message}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-(--text-strong)">Admin Actions</h3>
              <select
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as InquiryStatus)}
                className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add internal admin note"
                rows={6}
                className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm"
              />

              {actionError ? (
                <p className="text-xs text-rose-700">{actionError}</p>
              ) : null}
              {actionSuccess ? (
                <p className="text-xs text-emerald-700">{actionSuccess}</p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Update"}
              </button>
            </div>
          </section>
        ) : null}
      </PageLayout>
    </AdminShell>
  );
}
