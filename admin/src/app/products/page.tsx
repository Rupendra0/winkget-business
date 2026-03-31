"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import StatusBadge from "@/components/admin/StatusBadge";
import Table, { type TableColumn } from "@/components/admin/Table";
import { findSidebarItem } from "@/data/adminNavigation";
import { fetchProducts, type ProductRecord } from "@/lib/adminApi";

type ProductStatusFilter = "All" | "Active" | "Draft" | "Blocked";

export default function ProductsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const activeItem = findSidebarItem(searchParams.get("view"));
  const globalQuery = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const { data, error, isLoading } = useSWR("products", fetchProducts, {
    keepPreviousData: true,
  });

  const rows = useMemo(() => {
    const list = data || [];
    const query = `${globalQuery} ${searchInput}`.trim().toLowerCase();

    return list.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (!query) return true;
      return `${item.name} ${item.seller} ${item.category}`.toLowerCase().includes(query);
    });
  }, [data, globalQuery, searchInput, statusFilter]);

  const columns: TableColumn<ProductRecord>[] = [
    {
      key: "name",
      label: "Product",
      render: (row) => <span className="font-medium text-(--text-strong)">{row.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (row) => row.category,
    },
    {
      key: "seller",
      label: "Seller",
      render: (row) => row.seller,
    },
    {
      key: "price",
      label: "Price",
      render: (row) => `Rs ${row.price.toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={row.status === "Active" ? "success" : row.status === "Draft" ? "warning" : "danger"}
        />
      ),
    },
  ];

  return (
    <AdminShell title="Products" subtitle="Review product catalog and moderation status.">
      <PageLayout
        title={activeItem?.label || "Products"}
        subtitle="Table and grid views with reusable status chips."
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
            onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-2 text-sm"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Blocked">Blocked</option>
          </select>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search product/category/seller"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent) sm:col-span-2"
          />
        </section>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load products"}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            Loading products...
          </section>
        ) : viewMode === "table" ? (
          <Table rows={rows} columns={columns} rowKey={(row) => row.id} emptyText="No products found." />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-3 py-6 text-sm text-(--text-soft)">
                No products found.
              </div>
            ) : (
              rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-(--border) bg-(--surface) p-3">
                  <p className="text-sm font-medium text-(--text-strong)">{row.name}</p>
                  <p className="mt-1 text-xs text-(--text-soft)">{row.category}</p>
                  <p className="mt-1 text-xs text-(--text-soft)">Seller: {row.seller}</p>
                  <p className="mt-1 text-sm text-(--text-soft)">Rs {row.price.toLocaleString()}</p>
                  <div className="mt-2">
                    <StatusBadge
                      label={row.status}
                      tone={row.status === "Active" ? "success" : row.status === "Draft" ? "warning" : "danger"}
                    />
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </PageLayout>
    </AdminShell>
  );
}
