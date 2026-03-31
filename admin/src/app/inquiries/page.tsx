"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import { fetchInquiries, type InquiryRecord } from "@/lib/adminApi";
import { formatDate } from "@/lib/adminUi";

type InquiryStatusFilter = "All" | "Open" | "In Progress" | "Closed";

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

  const { data, error, isLoading } = useSWR("inquiries", fetchInquiries, {
    keepPreviousData: true,
  });

  const rows = useMemo(() => {
    const list = data || [];
    const query = `${globalQuery} ${searchInput}`.trim().toLowerCase();

    return list.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (!query) return true;
      return `${item.subject} ${item.name} ${item.channel}`.toLowerCase().includes(query);
    });
  }, [data, globalQuery, searchInput, statusFilter]);

  const columns: TableColumn<InquiryRecord>[] = [
    {
      key: "subject",
      label: "Subject",
      render: (row) => <span className="font-medium text-(--text-strong)">{row.subject}</span>,
    },
    {
      key: "name",
      label: "Requester",
      render: (row) => row.name,
    },
    {
      key: "channel",
      label: "Channel",
      render: (row) => row.channel,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={row.status === "Open" ? "warning" : row.status === "In Progress" ? "neutral" : "success"}
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
    <AdminShell title="Inquiries" subtitle="Monitor incoming support and profile inquiries.">
      <PageLayout title={activeItem?.label || "Inquiries"} subtitle="Search and status filters with reusable table controls.">
        <section className="grid gap-2 rounded-xl border border-(--border) bg-(--surface) p-3 sm:grid-cols-3">
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
            placeholder="Search subject/requester"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent) sm:col-span-2"
          />
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
          <Table rows={rows} columns={columns} rowKey={(row) => row.id} emptyText="No inquiries found." />
        )}
      </PageLayout>
    </AdminShell>
  );
}
