"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";

const DEMO_ORDERS = [
  {
    id: "ORD-1001",
    service: "Home Cleaning",
    status: "Completed",
    amount: "Rs. 1,299",
    date: "2026-03-12",
  },
  {
    id: "ORD-1002",
    service: "AC Repair",
    status: "In Progress",
    amount: "Rs. 899",
    date: "2026-03-24",
  },
];

export default function OrdersPage() {
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
        <div className="max-w-5xl mx-auto animate-pulse rounded-3xl bg-white/80 border border-white/80 shadow-xl p-6 h-64" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto rounded-3xl bg-white/85 border border-white/80 shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Orders</h1>
        <p className="mt-1 text-sm text-slate-600">Track your service bookings and statuses.</p>

        <div className="mt-6 space-y-3">
          {DEMO_ORDERS.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{order.service}</div>
                  <div className="text-xs text-slate-500">{order.id} | {order.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">{order.amount}</div>
                  <div className="text-xs text-blue-700 font-medium">{order.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
