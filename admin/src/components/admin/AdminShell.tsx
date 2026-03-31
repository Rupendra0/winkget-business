"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  fetchAdminSession,
  loginAsAdmin,
  logoutAdmin,
  toErrorMessage,
  type AdminUser,
} from "@/lib/adminClient";
import { getDisplayName } from "@/lib/adminUi";

type AdminShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  showPageIntro?: boolean;
};

export default function AdminShell({ title, subtitle, children, showPageIntro = true }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const signedIn = await loginAsAdmin(identifier.trim(), password);
      setUser(signedIn);
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

  const breadcrumbLabel = useMemo(() => {
    if (title) return title;
    if (!pathname || pathname === "/") return "Home";
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "workspace";
    return last
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }, [pathname, title]);

  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Winkget Admin</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Initializing control room</h1>
          <p className="mt-2 text-sm text-slate-500">Verifying secure session</p>
          <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Administrator access</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900">Sign in to Control Room</h1>
          <p className="mt-2 text-sm text-slate-500">Use admin email or phone. Workspace pages stay protected.</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email or phone</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                placeholder="admin@winkget.com"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500"
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
              className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 pb-8 pt-4 sm:px-4 lg:px-5">
      <div className="w-full space-y-3">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur">
          <div className="bg-linear-to-r from-orange-50 via-transparent to-blue-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Secure Control Room
          </div>

          <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-orange-600">Winkget</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Admin Control Room</h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Dedicated workspaces for faster daily operations.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {getDisplayName(user).charAt(0).toUpperCase()}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 sm:text-sm">
                {getDisplayName(user)}
              </span>
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Main Page
              </Link>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-600"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
          {pathname !== "/" ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50">
                Home
              </Link>
              <span className="text-slate-400">/</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                {breadcrumbLabel}
              </span>
            </div>
          ) : null}
          {showPageIntro ? (
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
              </div>
            </header>
          ) : null}

          <div className="page-fade">{children}</div>
        </section>
      </div>
    </main>
  );
}
