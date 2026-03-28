"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, Chrome, Lock, Mail, Store, User, Phone } from "lucide-react";

type AuthMode = "signin" | "signup";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const logFailure = async (message: string, metadata?: Record<string, unknown>) => {
    try {
      await fetch(`${BACKEND_URL}/api/dev-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "frontend-auth-page",
          type: "failure",
          role: "customer",
          message,
          metadata,
        }),
      });
    } catch {
      // Ignore logging errors on UI.
    }
  };

  const handlePrimaryAuth = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!password.trim()) {
      const message = "Password is required.";
      setError(message);
      await logFailure(message, { mode });
      setLoading(false);
      return;
    }

    if (mode === "signin" && !identifier.trim()) {
      const message = "Identifier is required for login.";
      setError(message);
      await logFailure(message, { mode });
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        const message = "Name is required for signup.";
        setError(message);
        await logFailure(message, { mode });
        setLoading(false);
        return;
      }

      if (!email.trim() && !phone.trim()) {
        const message = "Enter email or phone for signup.";
        setError(message);
        await logFailure(message, { mode });
        setLoading(false);
        return;
      }
    }

    if (mode === "signup" && password !== confirmPassword) {
      const message = "Password and confirm password must match.";
      setError(message);
      await logFailure(message, { mode });
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "signin"
          ? { identifier, password }
          : { name, email, phone, password };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const message = payload.message || "Authentication failed";
        setError(message);
        await logFailure(message, { mode });
        return;
      }

      setSuccess(mode === "signin" ? "Login successful." : "Account created successfully.");
      window.dispatchEvent(new Event("auth:changed"));
      router.push("/");
      router.refresh();
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication failed";
      setError(message);
      await logFailure(message, { mode });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: "google" | "apple") => {
    const message = `${provider} sign-in will be enabled from separated backend OAuth flow.`;
    setError(message);
    setSuccess(null);
    await logFailure(message, { provider, mode });
  };

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-3xl bg-white/80 border border-white/80 shadow-2xl p-6 sm:p-8 card-hover max-h-[calc(100vh-110px)] overflow-y-auto">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800">
            Winkget Business Auth
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            Login or create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Anyone can login/signup as a user customer from this form.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all btn-hover ${
              mode === "signin" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
            onClick={() => setMode("signin")}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all btn-hover ${
              mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === "signup" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
                <User size={16} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </label>
          ) : null}

          {mode === "signin" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email or phone number</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
                <Mail size={16} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter email or phone number"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
                  <Mail size={16} className="text-slate-500" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
                  <Phone size={16} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Enter your phone number"
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
              <Lock size={16} className="text-slate-500" />
              <input
                type="password"
                placeholder="Enter password"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {mode === "signup" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
                <Lock size={16} className="text-slate-500" />
                <input
                  type="password"
                  placeholder="Confirm password"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </label>
          ) : null}

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div> : null}

          <button
            type="button"
            className="w-full rounded-xl bg-blue-900 text-white py-3 text-sm font-semibold hover:bg-blue-800 btn-hover"
            onClick={handlePrimaryAuth}
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Login" : "Create account"}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-orange-200 bg-orange-50 text-orange-800 py-3 text-sm font-semibold hover:bg-orange-100 btn-hover flex items-center justify-center gap-2"
            onClick={() => router.push("/vendor-register")}
          >
            <Store size={16} /> Register as Vendor / Shopkeeper
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          OR CONTINUE WITH
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 btn-hover"
            onClick={() => handleProviderSignIn("google")}
            disabled={loading}
          >
            <Chrome size={18} className="text-rose-500" />
            Sign in with Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 btn-hover"
            onClick={() => handleProviderSignIn("apple")}
            disabled={loading}
          >
            <Apple size={18} />
            Sign in with Apple
          </button>
        </div>
      </section>
    </main>
  );
}
