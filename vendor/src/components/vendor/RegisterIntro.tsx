"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  CheckCircle2, 
  Coins, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  Store, 
  TrendingUp 
} from "lucide-react";

type RegisterIntroProps = {
  onStart?: () => void;
};

export default function RegisterIntro({ onStart }: RegisterIntroProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"login" | "register" | null>(null);

  const handleStart = () => {
    if (onStart) {
      onStart();
    } else {
      setLoadingAction("register");
      router.push("/register?start=true");
    }
  };

  const handleLogin = () => {
    setLoadingAction("login");
    router.push("/login");
  };

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-white relative pb-20 md:pb-0">
      {/* Left Section: Information Content */}
      <div className="flex-1 p-6 sm:p-10 lg:p-16 flex flex-col justify-center">
        {/* Mobile-only Top Banner Image */}
        <div className="block md:hidden pb-6 flex justify-center shrink-0">
          <img 
            src="/onboarding_intro_banner.png" 
            alt="Become a Winkget Merchant Partner" 
            className="max-h-[220px] w-auto object-contain"
          />
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
            <Sparkles size={13} className="text-orange-600 animate-pulse" /> Become a Winkget Partner
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Grow Your Local Business <br className="hidden sm:inline" />
            <span className="text-[#fb6a3d]">With Winkget</span>
          </h1>
          
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Create a digital storefront on Winkget in minutes. List your products, menus, or services to start receiving online orders, managing local deliveries, and scaling your business locally.
          </p>

          {/* Key Benefits (2x2 Grid) */}
          <div className="grid gap-6 sm:grid-cols-2 pt-2 max-w-4xl">
            <article className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40">
              <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                <Coins size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Onboarding Cost</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Join for free and list your catalogs without any setup fees or hidden deposits.</p>
            </article>

            <article className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Local Customer Reach</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Gain immediate visibility and get discovered by thousands of customers in your city.</p>
            </article>

            <article className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Store size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Powerful Seller Tools</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Manage inventories, update pricing in real time, and track sales performance with ease.</p>
            </article>

            <article className="p-5 rounded-2xl border border-slate-100 bg-[#fbfaff]">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Secure Direct Payouts</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Transactions are processed securely and settlements are credited directly to your bank account.</p>
            </article>
          </div>

          {/* Checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">What you will need:</h4>
            <ul className="grid gap-3 sm:grid-cols-2 text-sm font-medium text-slate-600 max-w-4xl">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Personal ID proof document
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Business information & contact details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> GST number (optional/where applicable)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Active bank account for payouts
              </li>
            </ul>
          </div>

          {/* Security Box (Moved from Right Section) */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5 mt-8 max-w-4xl shrink-0">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-orange-950">100% Secure & Regulated</h4>
                <p className="text-xs text-orange-850 leading-relaxed">
                  Your business credentials, identification documents, and bank payout records are protected with bank-grade AES-256 encryption. We prioritize your privacy and transaction security at every step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Banner & Actions (Desktop Only) */}
      <div className="hidden md:flex md:w-[420px] lg:w-[480px] bg-white border-l border-slate-100 p-8 flex-col justify-center shrink-0 md:sticky md:top-0 md:h-screen self-start">
        <div className="flex items-center justify-center py-6">
          <img 
            src="/onboarding_intro_banner.png" 
            alt="Become a Winkget Merchant Partner" 
            className="max-h-[340px] w-auto object-contain"
          />
        </div>
        
        {/* Actions Area (Desktop Only) */}
        <div className="flex flex-col gap-3 py-6">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleStart}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#fb6a3d] px-8 text-sm font-bold text-white hover:bg-[#e0562b] shadow-lg shadow-orange-500/10 transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loadingAction === "register" ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>Start Registration <ArrowRight size={16} /></>
            )}
          </button>
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleLogin}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loadingAction === "login" ? (
              <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
            ) : (
              "Partner Login"
            )}
          </button>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] pb-safe">
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleLogin}
          className="flex-1 inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {loadingAction === "login" ? (
            <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          ) : (
            "Partner Login"
          )}
        </button>
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleStart}
          className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#fb6a3d] text-sm font-bold text-white hover:bg-[#e0562b] shadow-lg shadow-orange-500/10 transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {loadingAction === "register" ? (
            <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>Start Registration <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </main>
  );
}
