"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_BACKEND_URL, fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";

const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const RequiredMark = () => <span className="text-red-500">*</span>;

export default function AccountSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.replace(buildAuthHref(pathname || "/account-settings"));
        return;
      }

      setUser(currentUser);
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
      setLoading(false);
    };

    void loadSession();
  }, [pathname, router]);

  const handleProfileUpdate = async () => {
    setError(null);
    setProfileMessage(null);

    if (!user) {
      setError("Session expired. Please sign in again.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      setError("Invalid email format");
      return;
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError("Phone must be exactly 10 digits");
      return;
    }

    if (user.role === "vendor") {
      if (!normalizedEmail || !normalizedPhone) {
        setError("Personal email and personal phone are required for vendor profiles");
        return;
      }
    } else if (!normalizedEmail && !normalizedPhone) {
      setError("Email or phone is required");
      return;
    }

    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update profile");
      }

      setProfileMessage(payload.message || "Profile updated");
      window.dispatchEvent(new Event("auth:changed"));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update profile");
    }
  };

  const handlePasswordUpdate = async () => {
    setError(null);
    setPasswordMessage(null);

    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update password");
      }

      setPasswordMessage(payload.message || "Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update password");
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto animate-pulse rounded-3xl bg-white/80 border border-white/80 shadow-xl p-6 h-72" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="rounded-3xl bg-white/85 border border-white/80 shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Update your profile and security details.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Full name <RequiredMark />
              </span>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Personal email{user.role === "vendor" ? <RequiredMark /> : null}
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
              />
            </label>
            <label className="sm:col-span-2 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Personal phone{user.role === "vendor" ? <RequiredMark /> : null}
              </span>
              <input
                type="tel"
                placeholder="10-digit phone"
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleProfileUpdate}
            className="mt-4 rounded-xl bg-blue-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-800 btn-hover"
          >
            Save Profile
          </button>

          {profileMessage ? <div className="mt-3 text-sm text-emerald-700">{profileMessage}</div> : null}
        </section>

        <section className="rounded-3xl bg-white/85 border border-white/80 shadow-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Change Password</h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
            />
          </div>

          <button
            type="button"
            onClick={handlePasswordUpdate}
            className="mt-4 rounded-xl border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 btn-hover"
          >
            Update Password
          </button>

          {passwordMessage ? <div className="mt-3 text-sm text-emerald-700">{passwordMessage}</div> : null}
          {error ? <div className="mt-3 text-sm text-red-700">{error}</div> : null}
        </section>
      </div>
    </main>
  );
}
