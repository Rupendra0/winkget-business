"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Store } from "lucide-react";
import { fetchCurrentUser } from "@/lib/authClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

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
      const currentUser = await fetchCurrentUser();
      if (!active) return;

      if (currentUser) {
        if (currentUser.role === "vendor") {
          router.replace("/vendor");
        } else {
          router.replace("/");
        }
        return;
      }

      setCheckingSession(false);
    };

    void guardRoute();

    return () => {
      active = false;
    };
  }, [router]);

  const handleVendorLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/vendor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Vendor login failed");
      }

      window.dispatchEvent(new Event("auth:changed"));
      router.push("/vendor");
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
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-3xl bg-white/85 border border-white/80 shadow-2xl p-6 sm:p-8">
          <div className="h-3 w-40 rounded-full bg-slate-200 animate-pulse" />
          <div className="mt-4 h-8 w-72 rounded-lg bg-slate-200 animate-pulse" />
          <div className="mt-3 h-4 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="mt-8 space-y-3">
            <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-11 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-3xl bg-white/85 border border-white/80 shadow-2xl p-6 sm:p-8 card-hover">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-800">
          <Store size={14} /> Vendor Login
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">Login to your vendor account</h1>
        <p className="mt-2 text-sm text-slate-600">Use your registered email or phone and password.</p>

        <form className="mt-6 space-y-4" onSubmit={handleVendorLogin}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email or phone</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
              <Mail size={16} className="text-slate-500" />
              <input
                type="text"
                placeholder="Enter email or phone"
                className="w-full bg-transparent text-sm text-black placeholder:text-slate-500 outline-none"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
              <Lock size={16} className="text-slate-500" />
              <input
                type="password"
                placeholder="Enter password"
                className="w-full bg-transparent text-sm text-black placeholder:text-slate-500 outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-900 text-white py-3 text-sm font-semibold hover:bg-blue-800 btn-hover"
          >
            {loading ? "Logging in..." : "Vendor Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
