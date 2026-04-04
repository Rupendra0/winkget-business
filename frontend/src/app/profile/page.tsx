"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, LogOut, UserRound, Building2, BadgeCheck, MapPin, Globe } from "lucide-react";
import { AUTH_BACKEND_URL, fetchCurrentUser, type AuthUser } from "@/lib/authClient";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const businessLocation = [user?.businessAddress, user?.sublocality, user?.city, user?.state, user?.postalCode]
    .filter(Boolean)
    .join(", ");
  const businessTags = Array.isArray(user?.serviceTags) ? user.serviceTags.filter(Boolean) : [];
  const hasBusinessDetails = Boolean(
    user?.businessName ||
      user?.businessCategory?.name ||
      user?.businessSubcategory?.name ||
      user?.businessAddress ||
      user?.businessPhone ||
      user?.businessEmail ||
      businessTags.length > 0 ||
      user?.businessDescription
  );

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore logout API failures in UI flow.
    }

    window.dispatchEvent(new Event("auth:changed"));
    router.replace("/auth");
    router.refresh();
  };

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

          {hasBusinessDetails && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business Profile</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} /> {user.businessName || "Not provided"}
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={16} />
                    {user.vendorStatus ? `${user.vendorStatus[0].toUpperCase()}${user.vendorStatus.slice(1)}` : "Status unavailable"}
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span> {user.businessCategory?.name || "Not selected"}
                  </div>
                  <div>
                    <span className="text-slate-500">Subcategory:</span> {user.businessSubcategory?.name || "Not selected"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business Contact</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <Phone size={16} /> {user.businessPhone || "Not provided"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} /> {user.businessEmail || "Not provided"}
                  </div>
                  <div>
                    <span className="text-slate-500">Alt Phone:</span> {user.businessAlternatePhone || "Not provided"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={16} /> {user.website || "No website"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location & Services</div>
                <div className="mt-3 text-sm text-slate-800 space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5" />
                    <span>{businessLocation || "Address not added yet"}</span>
                  </div>
                  {businessTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {businessTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {user.businessDescription && (
                    <p className="text-sm text-slate-700">{user.businessDescription}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/orders" className="rounded-xl bg-blue-900 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-800 btn-hover">
              My Orders
            </Link>
            <Link href="/account-settings" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 btn-hover">
              Account Settings
            </Link>
          </div>
        </section>

        <section className="md:hidden rounded-3xl bg-white/85 border border-white/80 shadow-xl p-4">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full rounded-xl bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 btn-hover flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Logout
          </button>
        </section>
      </div>
    </main>
  );
}
