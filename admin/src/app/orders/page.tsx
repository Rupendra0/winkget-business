"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import { fetchOrders, type OrderRecord } from "@/lib/adminApi";
import { formatDate } from "@/lib/adminUi";

type OrderFilter = "All" | "Pending" | "Disputed";

export default function OrdersPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view") || "manage-orders";
  const globalQuery = searchParams.get("q") || "";
  const activeItem = findSidebarItem(viewId);

  const [statusFilter, setStatusFilter] = useState<OrderFilter>(
    viewId === "pending-orders" ? "Pending" : viewId === "disputed-orders" ? "Disputed" : "All"
  );
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const { data, error, isLoading } = useSWR(["orders", statusFilter], () =>
    fetchOrders(statusFilter === "All" ? undefined : statusFilter)
  );

  const rows = useMemo(() => {
    const list = data || [];
    const query = `${globalQuery} ${searchInput}`.trim().toLowerCase();

    return list.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (!query) return true;
      return `${item.orderNo} ${item.customer}`.toLowerCase().includes(query);
    });
  }, [data, globalQuery, searchInput, statusFilter]);

  const columns: TableColumn<OrderRecord>[] = [
    {
      key: "orderNo",
      label: "Order",
      render: (row) => <span className="font-medium text-(--text-strong)">{row.orderNo}</span>,
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => row.customer,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => `Rs ${row.amount.toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={row.status === "Pending" ? "warning" : row.status === "Disputed" ? "danger" : "success"}
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
    <AdminShell title="Orders" subtitle="Track order lifecycle with status-specific queues.">
      <PageLayout
        title={activeItem?.label || "Orders"}
        subtitle="Pending and disputed filters with reusable table/grid view."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                viewMode === "table"
                  ? "border-(--accent) bg-(--accent-soft) text-(--accent-strong)"
                  : "border-(--border) text-(--text-soft)"
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                viewMode === "grid"
                  ? "border-(--accent) bg-(--accent-soft) text-(--accent-strong)"
                  : "border-(--border) text-(--text-soft)"
              }`}
            >
              Grid
            </button>
          </div>
        }
      >
        <section className="grid gap-2 rounded-xl border border-(--border) bg-(--surface) p-3 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OrderFilter)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-2 text-sm"
          >
            <option value="All">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Disputed">Disputed</option>
          </select>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search order/customer"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent) sm:col-span-2"
          />
        </section>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load orders"}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            Loading orders...
          </section>
        ) : viewMode === "table" ? (
          <Table rows={rows} columns={columns} rowKey={(row) => row.id} emptyText="No orders match this filter." />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-3 py-6 text-sm text-(--text-soft)">
                No orders match this filter.
              </div>
            ) : (
              rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-(--border) bg-(--surface) p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-(--text-strong)">{row.orderNo}</p>
                    <StatusBadge
                      label={row.status}
                      tone={row.status === "Pending" ? "warning" : row.status === "Disputed" ? "danger" : "success"}
                    />
                  </div>
                  <p className="mt-2 text-sm text-(--text-soft)">{row.customer}</p>
                  <p className="mt-1 text-sm text-(--text-soft)">Rs {row.amount.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-(--text-soft)">{formatDate(row.createdAt)}</p>
                </article>
              ))
            )}
          </section>
        )}
      </PageLayout>
    </AdminShell>
  );
}
