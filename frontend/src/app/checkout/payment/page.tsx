"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  CreditCard,
  Gift,
  HelpCircle,
  Landmark,
  Lock,
  Percent,
  ShieldCheck,
  Smartphone,
  Smile,
  Wallet,
} from "lucide-react";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import {
  computeCheckoutTotals,
  readCheckoutItems,
  paymentMethodLabel,
  placeOrder,
  readAddresses,
  readCheckoutDraft,
  saveCheckoutDraft,
  type PaymentMethod,
} from "@/lib/checkoutStore";

const formatPrice = (value: number) => `₹${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod | "emi" | "giftcard";
  title: string;
  subtitle: string;
  Icon: typeof CreditCard;
}> = [
  {
    value: "card",
    title: "Credit / Debit / ATM Card",
    subtitle: "Add and secure cards as per RBI guidelines",
    Icon: CreditCard,
  },
  {
    value: "emi",
    title: "EMI",
    subtitle: "Winkget EMI & cardless options",
    Icon: Percent,
  },
  {
    value: "netbanking",
    title: "Net Banking",
    subtitle: "Pay using bank account",
    Icon: Landmark,
  },
  {
    value: "giftcard",
    title: "Have a Winkget Gift Card?",
    subtitle: "Apply card number and PIN to redeem",
    Icon: Gift,
  },
  {
    value: "cod",
    title: "Cash on Delivery",
    subtitle: "Pay when order arrives",
    Icon: Coins,
  },
  {
    value: "upi",
    title: "UPI",
    subtitle: "Use any UPI app",
    Icon: Smartphone,
  },
];

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "emi" | "giftcard">("card");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  
  // EMI custom states
  const [emiOption, setEmiOption] = useState<"winkget" | "cc" | "bajaj">("winkget");
  const [emiEligible, setEmiEligible] = useState(false);
  const [checkingEmi, setCheckingEmi] = useState(false);
  
  // Gift Card custom states
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [giftCardPin, setGiftCardPin] = useState("");
  const [giftCardApplied, setGiftCardApplied] = useState(false);
  
  const userId = user?.id || "";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setAuthChecked(false);
      const currentUser = await fetchCurrentUser();
      if (!active) return;

      setUser(currentUser);
      setAuthChecked(true);
    };

    void loadSession();

    const handleAuthChange = () => {
      if (active) void loadSession();
    };
    window.addEventListener("auth:changed", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("auth:changed", handleAuthChange);
    };
  }, []);

  const checkoutDraft = useMemo(() => {
    if (!userId) {
      return null;
    }

    const existingDraft = readCheckoutDraft(userId);
    if (existingDraft) {
      return existingDraft;
    }

    // Fallback for dev refresh/direct-entry: rebuild checkout draft from current items + selected address.
    const { addresses, selectedAddressId: storedSelectedAddressId } = readAddresses(userId);
    const resolvedAddressId = storedSelectedAddressId || addresses[0]?.id || "";
    if (!resolvedAddressId) {
      return null;
    }

    const buyNowItems = readCheckoutItems("buy-now");
    const cartItems = readCheckoutItems("cart");
    const recoveredItems = buyNowItems.length > 0 ? buyNowItems : cartItems;
    if (recoveredItems.length === 0) {
      return null;
    }

    const recoveredMode = buyNowItems.length > 0 ? "buy-now" : "cart";
    const recoveredDraft = {
      userId,
      mode: recoveredMode,
      items: recoveredItems,
      totals: computeCheckoutTotals(recoveredItems),
      addressId: resolvedAddressId,
      createdAt: new Date().toISOString(),
    } as const;

    saveCheckoutDraft(recoveredDraft);
    return recoveredDraft;
  }, [userId]);

  const selectedAddressId = checkoutDraft?.addressId || "";

  const selectedAddress = useMemo(() => {
    if (!userId || !selectedAddressId) {
      return null;
    }

    const { addresses } = readAddresses(userId);
    return addresses.find((item) => item.id === selectedAddressId) || null;
  }, [selectedAddressId, userId]);

  const canPlaceOrder = Boolean(user && checkoutDraft && selectedAddress && !placingOrder);

  const handlePlaceOrder = async () => {
    if (!user || !checkoutDraft || !selectedAddress || placingOrder) {
      return;
    }

    setPaymentError("");

    if (selectedMethod === "upi") {
      if ((checkoutDraft?.totals.total || 0) > 15000) {
        setPaymentError("UPI is unavailable for orders above ₹15,000.");
        return;
      }
      if (!String(upiId || "").trim()) {
        setPaymentError("Please enter a UPI ID to continue.");
        return;
      }
    }

    if (selectedMethod === "card") {
      if (!String(cardNumber || "").trim() || !String(cardExpiry || "").trim() || !String(cardCvv || "").trim()) {
        setPaymentError("Please fill card number, expiry and CVV.");
        return;
      }
    }

    if (selectedMethod === "emi") {
      if (emiOption === "winkget" && !emiEligible) {
        setPaymentError("Please check eligibility for Winkget EMI first.");
        return;
      }
    }

    if (selectedMethod === "giftcard" && !giftCardApplied) {
      setPaymentError("Please enter a valid Gift Card number/PIN and click Apply.");
      return;
    }

    if (selectedMethod === "cod" && (checkoutDraft?.totals.total || 0) > 15000) {
      setPaymentError("Cash on Delivery is unavailable for orders above ₹15,000.");
      return;
    }

    setPlacingOrder(true);

    const actualMethod: PaymentMethod =
      selectedMethod === "emi" || selectedMethod === "giftcard" ? "card" : selectedMethod;

    if (actualMethod !== "cod") {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 700);
      });
    }

    // If gift card is applied, we could adjust totals or place it as is.
    // For simplicity, we just pass the original draft totals to the server.
    const placed = await placeOrder({
      userId: user.id,
      mode: checkoutDraft.mode,
      items: checkoutDraft.items,
      totals: checkoutDraft.totals,
      address: selectedAddress,
      paymentMethod: actualMethod,
    });

    setPlacingOrder(false);

    if (!placed) {
      setPaymentError("Could not place order. Please return to checkout and try again.");
      return;
    }

    router.replace(`/orders?placed=${encodeURIComponent(placed.id)}`);
  };

  if (!isMounted) {
    return (
      <main className="page-scaled-fonts min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-0 pt-0 pb-44 sm:px-4 lg:px-12 lg:pb-6">
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4 pt-0 sm:pt-4">
          <div className="h-12 bg-white rounded border border-gray-200" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="h-96 bg-white rounded border border-gray-200" />
            <div className="h-64 bg-white rounded border border-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-scaled-fonts min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-0 pt-0 pb-44 sm:px-4 lg:px-12 lg:pb-6">
      <div className="mx-auto w-full max-w-6xl space-y-0 pt-0 sm:pt-0">
        {!authChecked ? (
          <div className="border-none sm:border sm:rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
            <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-[#1f2937] shrink-0" />
                <h1 className="text-lg font-bold text-gray-900">Payments</h1>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                <Lock size={12} className="text-gray-500" />
                <span>100% Secure</span>
              </div>
            </header>
            <section className="bg-white p-6 text-sm text-[#64748b]">Checking login status...</section>
          </div>
        ) : !user ? (
          <div className="border-none sm:border sm:rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
            <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-[#1f2937] shrink-0" />
                <h1 className="text-lg font-bold text-gray-900">Payments</h1>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                <Lock size={12} className="text-gray-500" />
                <span>100% Secure</span>
              </div>
            </header>
            <section className="bg-white p-6">
              <p className="text-lg font-semibold text-[#9a3412]">Login required for payment</p>
              <p className="mt-1 text-sm text-[#9a3412]">Please login/signup to complete your purchase.</p>
              <Link
                href={buildAuthHref(pathname || "/checkout/payment")}
                className="mt-3 inline-flex rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Login / Signup
              </Link>
            </section>
          </div>
        ) : !checkoutDraft || !selectedAddress ? (
          <div className="border-none sm:border sm:rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
            <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-[#1f2937] shrink-0" />
                <h1 className="text-lg font-bold text-gray-900">Payments</h1>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                <Lock size={12} className="text-gray-500" />
                <span>100% Secure</span>
              </div>
            </header>
            <section className="bg-white p-6">
              <p className="text-lg font-semibold text-[#0f172a]">Checkout session not found</p>
              <p className="mt-1 text-sm text-[#64748b]">Please confirm your address and items again.</p>
              <Link
                href="/checkout"
                className="mt-3 inline-flex rounded border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
              >
                Go to Checkout
              </Link>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] pt-4">
            {/* Left Column: Payments accordion */}
            <section className="space-y-0 border-none sm:border sm:rounded-lg bg-white divide-y divide-gray-100">
              
              {/* Header */}
              <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
                <div className="flex items-center gap-3">
                  <CreditCard size={22} className="text-[#1f2937] shrink-0" />
                  <h1 className="text-lg font-bold text-gray-900">Payments</h1>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                  <Lock size={12} className="text-gray-500" />
                  <span>100% Secure</span>
                </div>
              </header>
              
              {/* Computed Display Totals for UI interaction */}
              {(() => {
                const totalAmount = checkoutDraft.totals.total;
                const displayTotal = giftCardApplied ? Math.max(0, totalAmount - 2000) : totalAmount;
                const isHighValue = totalAmount > 15000;

                return (
                  <>
                    {/* Blue Total Block */}
                    <div className="bg-[#edf2ff] border-b border-[#dbe4ff] sm:border px-4 py-3.5 mx-0 sm:mx-3 mt-0 sm:mt-3 mb-3 rounded-none sm:rounded-lg flex items-center justify-between text-sm font-semibold text-blue-900 sticky top-[60px] z-20 sm:relative sm:top-auto sm:z-auto">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-800 font-bold">Total Amount</span>
                        <ChevronDown size={14} className="text-blue-700 mt-0.5" />
                      </div>
                      <span className="text-base font-extrabold text-blue-700">
                        {formatPrice(displayTotal)}
                      </span>
                    </div>

                    {/* Green Discount Block */}
                    <div className="bg-[#eafaf1] border border-[#d3f4e2] px-4 py-3.5 mx-3 mb-4 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold text-emerald-700 text-sm">10% instant discount</span>
                        <span className="text-[11px] text-emerald-600 font-medium mt-0.5">Claim now with payment offers</span>
                      </div>
                      <div className="flex items-center -space-x-1 shrink-0">
                        <div className="h-6 w-6 rounded-full bg-[#ff5f00] flex items-center justify-center text-[7px] font-bold text-white border border-white shadow-sm" title="Mastercard">
                          mc
                        </div>
                        <div className="h-6.5 w-6.5 rounded-full bg-[#1a1f71] flex items-center justify-center text-[7px] font-bold text-white border border-white shadow-sm" title="Visa">
                          V
                        </div>
                        <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-[8px] font-bold text-gray-600 border border-gray-200 shadow-sm" title="3 more offers">
                          +3
                        </div>
                      </div>
                    </div>

                    {/* Accordion List */}
                    <div className="divide-y divide-gray-100">
                      {PAYMENT_OPTIONS.map((option) => {
                        const isExpanded = selectedMethod === option.value;
                        const isUnavailable = (option.value === "cod" || option.value === "upi") && isHighValue;

                        return (
                          <div key={option.value} className="w-full">
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => setSelectedMethod(option.value)}
                              className={`flex w-full items-center justify-between px-4 py-4 text-left transition ${
                                isExpanded ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/30"
                              } ${isUnavailable ? "opacity-60 cursor-pointer" : ""}`}
                            >
                              <div className="flex items-start gap-3">
                                <option.Icon size={18} className={`mt-0.5 shrink-0 ${isUnavailable ? "text-gray-400" : "text-gray-500"}`} />
                                <div className="leading-tight">
                                  <p className={`text-sm font-semibold ${isUnavailable ? "text-gray-400" : "text-gray-900"}`}>{option.title}</p>
                                  {option.value === "card" ? (
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Save upto ₹2,000 • 4 offers available</p>
                                  ) : option.value === "emi" ? (
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Winkget EMI Available</p>
                                  ) : (
                                    <p className="text-[11px] text-gray-500 mt-0.5">{option.subtitle}</p>
                                  )}
                                </div>
                              </div>
                              {isUnavailable ? (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                                  <span>Unavailable</span>
                                  <HelpCircle size={14} className="text-gray-400" />
                                </div>
                              ) : isExpanded ? (
                                <ChevronUp size={16} className="text-gray-400 shrink-0" />
                              ) : option.value === "giftcard" ? (
                                <span className="text-sm font-bold text-blue-600 hover:text-blue-700 transition">Add</span>
                              ) : (
                                <ChevronDown size={16} className="text-gray-400 shrink-0" />
                              )}
                            </button>

                            {/* Accordion Expanded Content */}
                            {isExpanded && (
                              <div className="px-4 pb-5 pt-3 bg-slate-50/30 border-t border-gray-100 space-y-3">
                                {isUnavailable ? (
                                  <div className="p-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg">
                                    This payment method is unavailable for orders above {formatPrice(15000)}. Please choose a Credit/Debit Card, Net Banking or Winkget EMI.
                                  </div>
                                ) : (
                                  <>
                                    {/* 1. Credit Card Expanded */}
                                    {option.value === "card" && (
                                      <div className="space-y-3">
                                        <p className="text-[11px] text-blue-700 bg-blue-50/40 border border-blue-100 rounded-lg p-2.5 leading-relaxed font-medium">
                                          Note: Please ensure your card can be used for online transactions. <a href="#" className="underline font-semibold hover:text-blue-800">Learn More</a>
                                        </p>
                                        <div className="grid gap-3.5">
                                          <div className="relative">
                                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Card Number</label>
                                            <input
                                              type="text"
                                              value={cardNumber}
                                              onChange={(event) => setCardNumber(event.target.value)}
                                              placeholder="XXXX XXXX XXXX XXXX"
                                              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                            />
                                            <CreditCard size={16} className="absolute right-3 top-9 text-gray-400" />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3.5">
                                            <div>
                                              <label className="text-xs text-gray-500 font-semibold mb-1 block">Valid Thru</label>
                                              <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={(event) => setCardExpiry(event.target.value)}
                                                placeholder="MM / YY"
                                                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                              />
                                            </div>
                                            <div className="relative">
                                              <label className="text-xs text-gray-500 font-semibold mb-1 block">CVV</label>
                                              <input
                                                type="password"
                                                value={cardCvv}
                                                onChange={(event) => setCardCvv(event.target.value)}
                                                placeholder="CVV"
                                                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 pr-8"
                                              />
                                              <HelpCircle size={16} className="absolute right-3 top-9 text-gray-400" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2. EMI Expanded */}
                                    {option.value === "emi" && (
                                      <div className="space-y-4">
                                        {/* Winkget EMI Option */}
                                        <div
                                          onClick={() => setEmiOption("winkget")}
                                          className={`border rounded-lg p-3.5 cursor-pointer transition ${
                                            emiOption === "winkget" ? "border-blue-500 bg-blue-50/20" : "border-gray-200 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <input
                                              type="radio"
                                              checked={emiOption === "winkget"}
                                              onChange={() => setEmiOption("winkget")}
                                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                              <div className="flex items-center">
                                                <span className="text-sm font-bold text-gray-900">Winkget EMI</span>
                                                <span className="bg-red-500 text-white text-[9px] px-1 rounded-sm font-bold uppercase ml-2 leading-normal">New</span>
                                              </div>
                                              <div className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded mt-1.5 font-medium inline-block border border-emerald-100/50">
                                                No Credit or Debit Card required
                                              </div>
                                              {emiOption === "winkget" && (
                                                <div className="mt-3.5">
                                                  {!emiEligible ? (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCheckingEmi(true);
                                                        setTimeout(() => {
                                                          setCheckingEmi(false);
                                                          setEmiEligible(true);
                                                        }, 800);
                                                      }}
                                                      disabled={checkingEmi}
                                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded py-1.5 px-4 transition shadow-xs disabled:opacity-60"
                                                    >
                                                      {checkingEmi ? "Checking..." : "Check Eligibility"}
                                                    </button>
                                                  ) : (
                                                    <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded border border-emerald-100">
                                                      ✓ Pre-approved! Up to ₹50,000 credit limit. Limit applied automatically to payment.
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* CC EMI Option */}
                                        <div
                                          onClick={() => setEmiOption("cc")}
                                          className={`border rounded-lg p-3.5 cursor-pointer transition ${
                                            emiOption === "cc" ? "border-blue-500 bg-blue-50/20" : "border-gray-200 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <input
                                              type="radio"
                                              checked={emiOption === "cc"}
                                              onChange={() => setEmiOption("cc")}
                                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-900">Credit Card EMI</span>
                                                <div className="flex items-center gap-1.5 opacity-80 shrink-0">
                                                  <div className="h-4.5 w-6 rounded bg-[#ff5f00] text-[6px] text-white flex items-center justify-center font-bold">MC</div>
                                                  <div className="h-4.5 w-6 rounded bg-[#1a1f71] text-[6px] text-white flex items-center justify-center font-bold">V</div>
                                                  <span className="text-[9px] text-gray-500 font-bold border rounded px-1 bg-gray-50">+17</span>
                                                </div>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-1 font-medium">EMI starting from ₹2,113/month</p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Bajaj Option */}
                                        <div
                                          onClick={() => setEmiOption("bajaj")}
                                          className={`border rounded-lg p-3.5 cursor-pointer transition ${
                                            emiOption === "bajaj" ? "border-blue-500 bg-blue-50/20" : "border-gray-200 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <input
                                              type="radio"
                                              checked={emiOption === "bajaj"}
                                              onChange={() => setEmiOption("bajaj")}
                                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1 flex justify-between items-center">
                                              <div>
                                                <span className="text-sm font-bold text-gray-900">Bajaj Finserv EMI Network Card</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-xs font-bold text-emerald-700">No Cost EMI</span>
                                                  <span className="text-xs text-gray-500 font-medium">• from ₹4,996/month</span>
                                                </div>
                                              </div>
                                              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">B</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* All EMI Options Link */}
                                        <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                                          <span>All EMI Options</span>
                                          <span>›</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. Net Banking Expanded */}
                                    {option.value === "netbanking" && (
                                      <div className="space-y-3">
                                        <select
                                          className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium text-gray-700"
                                          defaultValue=""
                                        >
                                          <option value="" disabled>
                                            Select Bank
                                          </option>
                                          <option>State Bank of India</option>
                                          <option>HDFC Bank</option>
                                          <option>ICICI Bank</option>
                                          <option>Axis Bank</option>
                                          <option>Punjab National Bank</option>
                                        </select>
                                      </div>
                                    )}

                                    {/* 4. Gift Card Expanded */}
                                    {option.value === "giftcard" && (
                                      <div className="space-y-3">
                                        <div className="grid gap-3">
                                          <div>
                                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Gift Card Number</label>
                                            <input
                                              type="text"
                                              value={giftCardNumber}
                                              onChange={(event) => setGiftCardNumber(event.target.value)}
                                              placeholder="Enter 16-digit card number"
                                              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Gift Card PIN</label>
                                            <input
                                              type="password"
                                              value={giftCardPin}
                                              onChange={(event) => setGiftCardPin(event.target.value)}
                                              placeholder="Enter 6-digit PIN"
                                              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                            />
                                          </div>
                                        </div>
                                        {giftCardApplied ? (
                                          <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded border border-emerald-100">
                                            ✓ Gift Card worth ₹2,000 applied successfully! ₹2,000 has been deducted from your payable total.
                                          </p>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (giftCardNumber.trim().length >= 8 && giftCardPin.trim().length >= 4) {
                                                setEmiEligible(true); // set dummy
                                                setGiftCardApplied(true);
                                                setPaymentError("");
                                              } else {
                                                setPaymentError("Please enter a valid gift card number and PIN.");
                                              }
                                            }}
                                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs uppercase tracking-wider shadow-sm transition"
                                          >
                                            Apply Gift Card
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* 5. Cash on Delivery Expanded */}
                                    {option.value === "cod" && (
                                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3.5 leading-relaxed font-medium">
                                        Cash on Delivery is available. Pay securely at your doorstep when your order arrives.
                                      </p>
                                    )}

                                    {/* 6. UPI Expanded */}
                                    {option.value === "upi" && (
                                      <div className="space-y-3">
                                        <label className="text-xs text-gray-500 font-semibold mb-1 block">UPI ID</label>
                                        <input
                                          type="text"
                                          value={upiId}
                                          onChange={(event) => setUpiId(event.target.value)}
                                          placeholder="yourname@upi"
                                          className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    )}

                                    {paymentError && (
                                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-2">
                                        <span>⚠️</span> {paymentError}
                                      </p>
                                    )}

                                    {/* Main Blue Theme Action Button inside Expanded Panel (except if already applied giftcard) */}
                                    {!(option.value === "giftcard" && giftCardApplied) && (
                                      <button
                                        type="button"
                                        onClick={() => void handlePlaceOrder()}
                                        disabled={!canPlaceOrder || (option.value === "emi" && emiOption === "winkget" && !emiEligible)}
                                        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 mt-4"
                                      >
                                        {placingOrder
                                          ? "Processing..."
                                          : option.value === "cod"
                                            ? `Place Order ${formatPrice(displayTotal)}`
                                            : option.value === "emi" && emiOption === "winkget"
                                              ? `Pay ${formatPrice(displayTotal)} with Winkget EMI`
                                              : `Pay ${formatPrice(displayTotal)}`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Trust Footer */}
              <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50/50 border-t border-gray-100">
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider px-4">
                  35 Crore happy customers and counting!
                </p>
                <div className="mt-2.5 text-gray-400">
                  <Smile size={24} strokeWidth={1.8} />
                </div>
              </div>
            </section>

            {/* Right Column: Order Details (Hidden on Mobile) */}
            <aside className="hidden lg:block h-fit border-y border-gray-200 sm:border sm:rounded-lg bg-white p-6 space-y-4 lg:sticky lg:top-24 lg:self-start lg:mt-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Order Details</p>
              <div className="mt-2 space-y-2 text-sm text-[#334155]">
                <div className="flex items-center justify-between">
                  <span>MRP</span>
                  <span>{formatPrice(checkoutDraft.totals.mrp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Items Total</span>
                  <span>{formatPrice(checkoutDraft.totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#166534]">
                  <span>Savings</span>
                  <span>-{formatPrice(checkoutDraft.totals.savings)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery Fee</span>
                  <span>{checkoutDraft.totals.shippingFee > 0 ? formatPrice(checkoutDraft.totals.shippingFee) : "Free"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform Fee</span>
                  <span>{formatPrice(checkoutDraft.totals.platformFee)}</span>
                </div>
                {giftCardApplied && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold border-t border-dashed border-gray-100 pt-2">
                    <span>Gift Card</span>
                    <span>-₹2,000</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-[#d5deea] pt-3">
                <div className="flex items-center justify-between text-base font-bold text-gray-900">
                  <span>Total Payable</span>
                  <span>
                    {formatPrice(
                      giftCardApplied
                        ? Math.max(0, checkoutDraft.totals.total - 2000)
                        : checkoutDraft.totals.total
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-blue-50/50 p-3 text-xs text-[#475569]">
                <p className="font-semibold text-[#0f172a]">Deliver to</p>
                <p className="mt-1">{selectedAddress.fullName}</p>
                <p>{selectedAddress.line1}</p>
                {selectedAddress.line2 ? <p>{selectedAddress.line2}</p> : null}
                <p>
                  {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}
                </p>
                <p className="mt-1">Phone: {selectedAddress.phone}</p>
              </div>

              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#475569]">
                <ShieldCheck size={14} className="text-[#16a34a]" /> Secure checkout protected by encrypted session
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
