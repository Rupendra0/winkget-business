"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.replace("/auth");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };

    void loadSession();
  }, [router]);

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto animate-pulse rounded-3xl bg-white/80 border border-white/80 shadow-xl p-6 h-64" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="rounded-3xl bg-white/85 border border-white/80 shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <UserRound size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{user.name || "User"}</h1>
              <p className="text-sm text-slate-500">Role: {user.role}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</div>
              <div className="mt-2 flex items-center gap-2 text-slate-800">
                <Mail size={16} /> {user.email || "Not provided"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</div>
              <div className="mt-2 flex items-center gap-2 text-slate-800">
                <Phone size={16} /> {user.phone || "Not provided"}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/orders" className="rounded-xl bg-blue-900 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-800 btn-hover">
              My Orders
            </Link>
            <Link href="/account-settings" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 btn-hover">
              Account Settings
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white/85 border border-white/80 shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <ShieldCheck size={18} className="text-emerald-600" /> Session Active
          </div>
          <p className="mt-2 text-sm text-slate-600">
            You are securely logged in with backend cookie session.
          </p>
        </section>
      </div>
    </main>
  );
}
