"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import CommandPalette from "@/components/admin/CommandPalette";
import Navbar from "@/components/admin/Navbar";
import Sidebar from "@/components/admin/Sidebar";
import { findSidebarItem, findSidebarSectionByPath, SIDEBAR_SECTIONS, type SidebarSection } from "@/data/adminNavigation";
import {
  fetchDashboard,
  fetchAdminSession,
  loginAsAdmin,
  logoutAdmin,
  toErrorMessage,
  type AdminUser,
} from "@/lib/adminClient";
import { getDisplayName } from "@/lib/adminUi";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showPageIntro?: boolean;
  sidebarSections?: SidebarSection[];
};

export default function AdminShell(props: AdminShellProps) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <AdminShellInner {...props} />
    </Suspense>
  );
}

function AdminShellInner({ title, subtitle, children, showPageIntro = true, sidebarSections }: AdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  const sections = useMemo(() => {
    const baseSections =
      sidebarSections ||
      SIDEBAR_SECTIONS.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item })),
      }));

    return baseSections.map((section) => {
      if (section.id !== "users-partners") return section;

      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== "verification-pending") return item;
          return {
            ...item,
            badgeCount: pendingVerificationCount,
          };
        }),
      };
    });
  }, [pendingVerificationCount, sidebarSections]);

  const currentSearch = searchParams.get("q") || "";
  const activeItemId = searchParams.get("view");

  const setQueryParam = useCallback(
    (key: string, value: string | null, options?: { push?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }

      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;

      if (options?.push) {
        router.push(target);
        return;
      }

      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const navigateToItem = (route: string, itemId: string) => {
    const params = new URLSearchParams();
    const query = searchDraft.trim() || currentSearch;
    if (query) params.set("q", query);
    params.set("view", itemId);
    const nextQuery = params.toString();
    router.push(nextQuery ? `${route}?${nextQuery}` : route);
    setMobileSidebarOpen(false);
  };

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const current = await fetchAdminSession();
      if (!active) return;
      setUser(current);
      setBooting(false);
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPendingVerificationCount(0);
      return;
    }

    let active = true;

    const loadBadgeCounts = async () => {
      try {
        const payload = await fetchDashboard();
        if (!active) return;
        setPendingVerificationCount(Number(payload.stats?.pendingVendors || 0));
      } catch {
        if (!active) return;
        setPendingVerificationCount(0);
      }
    };

    void loadBadgeCounts();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setSearchDraft(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    if (searchDraft === currentSearch) return;
    const timer = window.setTimeout(() => {
      setQueryParam("q", searchDraft || null);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [currentSearch, searchDraft, setQueryParam]);

  useEffect(() => {
    const persisted = window.localStorage.getItem("winkget-admin-theme");
    if (persisted === "dark") {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("winkget-admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const signedIn = await loginAsAdmin(identifier.trim(), password);

      let settledSession: AdminUser | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = await fetchAdminSession();
        if (current) {
          settledSession = current;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 160));
      }

      setUser(settledSession || signedIn);
      setIdentifier("");
      setPassword("");
      router.refresh();
    } catch (error) {
      setAuthError(toErrorMessage(error, "Login failed"));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Ignore API failures during logout.
    }

    setUser(null);
    setAuthError(null);
    router.push("/");
    router.refresh();
  };

  const activeSection = findSidebarSectionByPath(pathname);
  const activeItem = findSidebarItem(activeItemId);

  const breadcrumbLabel = useMemo(() => {
    const sectionLabel = activeSection?.title || "Workspace";
    const itemLabel = activeItem?.label || title;
    return `${sectionLabel} / ${itemLabel}`;
  }, [activeItem?.label, activeSection?.title, title]);

  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--canvas) px-4 py-10">
        <section className="w-full max-w-xl rounded-xl border border-(--border) bg-(--surface) p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-(--text-soft)">Winkget Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-(--text-strong)">Initializing workspace</h1>
          <p className="mt-2 text-sm text-(--text-soft)">Verifying secure session</p>
          <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-(--surface-muted)">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-(--accent)" />
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--canvas) px-4 py-10 sm:px-6">
        <section className="w-full max-w-md rounded-xl border border-(--border) bg-(--surface) p-7 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-(--accent-strong)">Administrator access</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-(--text-strong)">Sign in to Admin Panel</h1>
          <p className="mt-2 text-sm text-(--text-soft)">Use your admin email or phone to access all pages.</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-(--text-soft)">Email or phone</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3.5 py-2.5 text-sm text-(--text-strong) outline-none transition focus:border-(--accent)"
                placeholder="admin@winkget.com"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-(--text-soft)">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3.5 py-2.5 text-sm text-(--text-strong) outline-none transition focus:border-(--accent)"
                placeholder="Enter password"
                required
              />
            </label>

            {authError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{authError}</p>
            ) : null}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-(--canvas) text-(--text-strong)">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar
            sections={sections}
            pathname={pathname}
            activeItemId={activeItemId}
            collapsed={desktopCollapsed}
            onNavigate={navigateToItem}
          />
        </div>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-20 bg-black/25 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        ) : null}

        <div className="fixed inset-y-0 left-0 z-30 lg:hidden" style={{ transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 160ms ease" }}>
          <Sidebar
            sections={sections}
            pathname={pathname}
            activeItemId={activeItemId}
            collapsed={false}
            onNavigate={navigateToItem}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            searchQuery={searchDraft}
            onSearchQueryChange={setSearchDraft}
            onToggleSidebar={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen((prev) => !prev);
              } else {
                setDesktopCollapsed((prev) => !prev);
              }
            }}
            onOpenPalette={() => setPaletteOpen(true)}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            userLabel={getDisplayName(user)}
            onLogout={handleLogout}
          />

          <section className="px-3 py-3 sm:px-5 sm:py-4">
            <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
              <p className="mb-2 text-xs text-(--text-soft)">{breadcrumbLabel}</p>
              {showPageIntro ? (
                <header className="mb-4">
                  <h2 className="text-xl font-semibold text-(--text-strong)">{title}</h2>
                  {subtitle ? <p className="mt-1 text-sm text-(--text-soft)">{subtitle}</p> : null}
                </header>
              ) : null}
              <div className="page-fade">{children}</div>
            </div>
          </section>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        sections={sections}
        onClose={() => setPaletteOpen(false)}
        onSelect={navigateToItem}
      />
    </main>
  );
}
