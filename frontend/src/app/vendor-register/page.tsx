"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/vendor/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerName,
          phone,
          email,
          password,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Vendor registration failed");
      }

      setSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Vendor registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-3xl bg-white/85 border border-white/80 shadow-2xl p-6 sm:p-8 card-hover">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
          <Store size={14} /> Vendor / Shopkeeper Registration
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">Register your shop on Winkget</h1>
        <p className="mt-2 text-sm text-slate-600">
          Submit your business details and our team will verify and activate your vendor account.
        </p>

        {submitted ? (
          <>
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Vendor account created successfully. Please login to continue.
            </div>
            <button
              type="button"
              onClick={() => router.push("/vendor-login")}
              className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-800 py-3 text-sm font-semibold hover:bg-blue-100 btn-hover"
            >
              Go to Vendor Login
            </button>
          </>
        ) : (
          <form className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Business name"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
            />
            <input
              type="text"
              placeholder="Owner name"
              required
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
            />
            <input
              type="text"
              placeholder="Mobile number"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
            />
            <input
              type="password"
              placeholder="Create password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
            />
            {error ? <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div> : null}
            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 rounded-xl bg-orange-500 text-white py-3 text-sm font-semibold hover:bg-orange-600 btn-hover"
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/vendor-login")}
              className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 py-3 text-sm font-semibold hover:bg-blue-100 btn-hover"
            >
              Already a vendor? Login
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
