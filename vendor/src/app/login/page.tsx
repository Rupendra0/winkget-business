"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Building2, KeyRound, UserPlus } from "lucide-react";
import { fetchVendorSession, loginVendor } from "@/lib/vendorApi";

const MAIN_WEBSITE_URL = process.env.NEXT_PUBLIC_MAIN_WEBSITE_URL || "http://localhost:3000";
const VENDOR_REGISTRATION_URL = `${MAIN_WEBSITE_URL.replace(/\/$/, "")}/vendor-register`;

export default function VendorLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const guardRoute = async () => {
      const currentSession = await fetchVendorSession();
      if (!active) return;

      if (currentSession) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    };

    void guardRoute();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      await loginVendor(identifier, password);
      router.replace("/");
      router.refresh();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Vendor login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white/80 p-7 shadow-sm backdrop-blur-sm">
          <div className="skeleton-shimmer h-6 w-48 rounded-lg" />
          <div className="mt-3 skeleton-shimmer h-4 w-72 rounded-lg" />
          <div className="mt-8 space-y-3">
            <div className="skeleton-shimmer h-12 rounded-xl" />
            <div className="skeleton-shimmer h-12 rounded-xl" />
            <div className="skeleton-shimmer h-12 rounded-xl" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/60 bg-white/85 p-7 shadow-lg backdrop-blur-md sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[var(--vendor-primary)]">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">Vendor Login</h1>
            <p className="mt-1 text-sm text-gray-600">
              Sign in with your vendor email or phone and password to access your dashboard.
            </p>
          </div>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Email or phone</span>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter registered email or phone"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--vendor-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <p className="text-sm text-gray-700">New to Winkget vendor?</p>
          <a
            href={VENDOR_REGISTRATION_URL}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register as Vendor
          </a>
        </div>
      </section>
    </main>
  );
}
