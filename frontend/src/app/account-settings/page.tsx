"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] flex items-center justify-center">
      <div className="animate-pulse font-semibold text-slate-500 text-sm">
        Redirecting to Profile Settings...
      </div>
    </main>
  );
}
