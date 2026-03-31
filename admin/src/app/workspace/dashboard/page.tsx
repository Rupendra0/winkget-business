"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchDashboard, toErrorMessage, type DashboardStats, type VendorRecord } from "@/lib/adminClient";
import { formatDate, getDisplayName } from "@/lib/adminUi";

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  admins: 0,
  customers: 0,
  vendors: 0,
  pendingVendors: 0,
  approvedVendors: 0,
  rejectedVendors: 0,
  totalCategories: 0,
  activeCategories: 0,
  inactiveCategories: 0,
  totalSubcategories: 0,
  activeSubcategories: 0,
  inactiveSubcategories: 0,
};

export default function DashboardWorkspacePage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [pendingVendors, setPendingVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchDashboard();
        if (!active) return;
        setStats(payload.stats);
        setPendingVendors(payload.pendingVendors);
      } catch (dashboardError) {
        if (!active) return;
        setError(toErrorMessage(dashboardError, "Unable to load dashboard workspace"));
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const majorCards = useMemo(
    () => [
      {
        label: "Users",
        value: stats.totalUsers,
        helper: `${stats.admins} admin / ${stats.customers} customer`,
      },
      {
        label: "Vendors",
        value: stats.vendors,
        helper: `${stats.pendingVendors} pending`,
      },
      {
        label: "Categories",
        value: stats.totalCategories,
        helper: `${stats.activeCategories} active`,
      },
      {
        label: "Subcategories",
        value: stats.totalSubcategories,
        helper: `${stats.activeSubcategories} active`,
      },
    ],
    [stats]
  );

  return (
    <AdminShell
      title="Dashboard Workspace"
      subtitle="Dedicated operational dashboard with metrics and pending review queue."
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {majorCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{loading ? "..." : card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">Pending Vendor Queue</h3>
          {loading ? <span className="text-xs text-slate-500">Loading queue...</span> : null}
        </div>

        {pendingVendors.length === 0 && !loading ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No pending vendors right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-2 py-2">Business</th>
                  <th className="px-2 py-2">Owner</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Registered</th>
                </tr>
              </thead>
              <tbody>
                {pendingVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-100">
                    <td className="px-2 py-2.5 font-semibold text-slate-800">{vendor.businessName || "Unnamed business"}</td>
                    <td className="px-2 py-2.5 text-slate-600">{getDisplayName(vendor)}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-600">
                      <p>{vendor.businessEmail || vendor.email || "-"}</p>
                      <p>{vendor.businessPhone || vendor.phone || "-"}</p>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-slate-600">{vendor.businessCategory?.name || "-"}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-500">{formatDate(vendor.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
