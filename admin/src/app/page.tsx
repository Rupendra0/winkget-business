"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchDashboard, toErrorMessage, type DashboardStats } from "@/lib/adminClient";

type WorkspaceCard = {
  badge: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: string;
};

const WORKSPACE_CARDS: WorkspaceCard[] = [
  {
    badge: "DAT",
    title: "Dashboard Workspace",
    description: "Platform pulse, totals, and pending activity in one focused page.",
    href: "/workspace/dashboard",
    cta: "Open Dashboard",
    tone: "from-blue-50 to-cyan-50 border-blue-200",
  },
  {
    badge: "CAT",
    title: "Categories Workspace",
    description: "Create and toggle categories and subcategories with a cleaner operational flow.",
    href: "/workspace/categories",
    cta: "Manage Categories",
    tone: "from-amber-50 to-orange-50 border-amber-200",
  },
  {
    badge: "USR",
    title: "Users Workspace",
    description: "Filter and browse user accounts quickly with dedicated role and search controls.",
    href: "/workspace/users",
    cta: "Manage Users",
    tone: "from-emerald-50 to-teal-50 border-emerald-200",
  },
  {
    badge: "VND",
    title: "Vendors Workspace",
    description: "Review complete vendor profiles, approve or reject, and keep actions auditable.",
    href: "/workspace/vendors",
    cta: "Manage Vendors",
    tone: "from-rose-50 to-pink-50 border-rose-200",
  },
];

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

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
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
      } catch (dashboardError) {
        if (!active) return;
        setError(toErrorMessage(dashboardError, "Unable to load admin summary"));
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

  const summaryCards = useMemo(
    () => [
      {
        label: "Total Users",
        value: stats.totalUsers,
        helper: `${stats.admins} admin / ${stats.customers} customer`,
      },
      {
        label: "Vendor Queue",
        value: stats.pendingVendors,
        helper: `${stats.approvedVendors} approved / ${stats.rejectedVendors} rejected`,
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
    <AdminShell title="" subtitle="" showPageIntro={false}>
      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      ) : null}

      <section className="stagger-grid rounded-3xl border border-slate-200 bg-slate-50/90 p-3 shadow-sm sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">Operations Snapshot</h3>
          {loading ? <span className="text-[11px] text-slate-500">Refreshing...</span> : null}
        </div>

        <div className="stagger-grid grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <article key={item.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{item.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.helper}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stagger-grid mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {WORKSPACE_CARDS.map((card) => (
          <article
            key={card.href}
            className={`group rounded-2xl border bg-linear-to-br p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex rounded-full border border-slate-300 bg-white/80 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-700">
                {card.badge}
              </span>
            </div>

            <h4 className="mt-2 text-base font-extrabold text-slate-900">{card.title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.description}</p>

            <Link
              href={card.href}
              className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
