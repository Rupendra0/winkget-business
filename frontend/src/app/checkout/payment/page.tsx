"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import {
  paymentMethodLabel,
  placeOrder,
  readAddresses,
  readCheckoutDraft,
  type PaymentMethod,
} from "@/lib/checkoutStore";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod;
  title: string;
  subtitle: string;
  Icon: typeof CreditCard;
}> = [
  {
    value: "card",
    title: "Credit / Debit / ATM Card",
    subtitle: "Pay securely with card",
    Icon: CreditCard,
  },
  {
    value: "razorpay",
    title: "Razorpay",
    subtitle: "Cards, UPI, Wallets in one flow",
    Icon: BadgeCheck,
  },
  {
    value: "upi",
    title: "UPI",
    subtitle: "Use any UPI app",
    Icon: Smartphone,
  },
  {
    value: "netbanking",
    title: "Net Banking",
    subtitle: "Pay using bank account",
    Icon: Landmark,
  },
  {
    value: "wallet",
    title: "Wallet",
    subtitle: "Use Paytm/PhonePe wallet style flow",
    Icon: Wallet,
  },
  {
    value: "cod",
    title: "Cash on Delivery",
    subtitle: "Pay when order arrives",
    Icon: Building2,
  },
];

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const userId = user?.id || "";

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const currentUser = await fetchCurrentUser();
      if (!active) return;

      setUser(currentUser);
      setAuthChecked(true);
    };

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const checkoutDraft = useMemo(() => {
    if (!userId) {
      return null;
    }

    return readCheckoutDraft(userId);
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

    if (selectedMethod === "upi" && !String(upiId || "").trim()) {
      setPaymentError("Please enter a UPI ID to continue.");
      return;
    }

    if (selectedMethod === "card") {
      if (!String(cardNumber || "").trim() || !String(cardExpiry || "").trim() || !String(cardCvv || "").trim()) {
        setPaymentError("Please fill card number, expiry and CVV.");
        return;
      }
    }

    setPlacingOrder(true);

    if (selectedMethod !== "cod") {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 700);
      });
    }

    const placed = await placeOrder({
      userId: user.id,
      mode: checkoutDraft.mode,
      items: checkoutDraft.items,
      totals: checkoutDraft.totals,
      address: selectedAddress,
      paymentMethod: selectedMethod,
    });

    setPlacingOrder(false);

    if (!placed) {
      setPaymentError("Could not place order. Please return to checkout and try again.");
      return;
    }

    router.replace(`/orders?placed=${encodeURIComponent(placed.id)}`);
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-none space-y-4">
        <header className="rounded-2xl border border-[#d6e0fb] bg-white shadow-sm">
          <div className=" px-4 py-3 text-black">
            <p className="brand-wordmark text-lg">Complete Payment</p>
          </div>
        </header>

        {!authChecked ? (
          <section className="rounded-2xl border border-[#dde3ea] bg-white p-6 text-sm text-[#64748b] shadow-sm">Checking login status...</section>
        ) : !user ? (
          <section className="rounded-2xl border border-[#fed7aa] bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-[#9a3412]">Login required for payment</p>
            <p className="mt-1 text-sm text-[#9a3412]">Please login/signup to complete your purchase.</p>
            <Link
              href={buildAuthHref(pathname || "/checkout/payment")}
              className="mt-3 inline-flex rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Login / Signup
            </Link>
          </section>
        ) : !checkoutDraft || !selectedAddress ? (
          <section className="rounded-2xl border border-[#dde3ea] bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-[#0f172a]">Checkout session not found</p>
            <p className="mt-1 text-sm text-[#64748b]">Please confirm your address and items again.</p>
            <Link
              href="/checkout"
              className="mt-3 inline-flex rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
            >
              Go to Checkout
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-2xl border border-[#dde3ea] bg-white shadow-sm">
              <div className="border-b border-[#e2e8f0] px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Payment Options</p>
              </div>

              <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-b border-[#e2e8f0] lg:border-b-0 lg:border-r">
                  {PAYMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedMethod(option.value)}
                      className={`flex w-full items-start gap-2 border-b border-[#e2e8f0] px-4 py-3 text-left last:border-b-0 ${
                        selectedMethod === option.value ? "bg-[#edf3ff]" : "bg-white hover:bg-[#f8fbff]"
                      }`}
                    >
                      <option.Icon size={18} className="mt-0.5 text-[#334155]" />
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">{option.title}</p>
                        <p className="text-xs text-[#64748b]">{option.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  <p className="text-sm font-semibold text-[#0f172a]">{paymentMethodLabel(selectedMethod)}</p>

                  {selectedMethod === "card" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(event) => setCardNumber(event.target.value)}
                        placeholder="Card Number"
                        className="sm:col-span-2 rounded-lg border border-[#cdd8ea] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                      />
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(event) => setCardExpiry(event.target.value)}
                        placeholder="MM/YY"
                        className="rounded-lg border border-[#cdd8ea] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                      />
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(event) => setCardCvv(event.target.value)}
                        placeholder="CVV"
                        className="rounded-lg border border-[#cdd8ea] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  ) : null}

                  {selectedMethod === "upi" ? (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(event) => setUpiId(event.target.value)}
                        placeholder="yourname@upi"
                        className="w-full rounded-lg border border-[#cdd8ea] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  ) : null}

                  {selectedMethod === "razorpay" ? (
                    <p className="mt-3 rounded-lg border border-[#dbe7ff] bg-[#f4f8ff] p-3 text-sm text-[#1e40af]">
                      You will be redirected to Razorpay style payment flow after clicking Pay.
                    </p>
                  ) : null}

                  {selectedMethod === "netbanking" ? (
                    <select className="mt-3 w-full rounded-lg border border-[#cdd8ea] px-3 py-2 text-sm outline-none focus:border-[#2563eb]" defaultValue="">
                      <option value="" disabled>
                        Select bank
                      </option>
                      <option>State Bank of India</option>
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                    </select>
                  ) : null}

                  {selectedMethod === "wallet" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <button type="button" className="rounded-lg border border-[#dbe3ef] bg-white px-3 py-2 text-sm font-semibold text-[#334155]">PhonePe</button>
                      <button type="button" className="rounded-lg border border-[#dbe3ef] bg-white px-3 py-2 text-sm font-semibold text-[#334155]">Paytm</button>
                      <button type="button" className="rounded-lg border border-[#dbe3ef] bg-white px-3 py-2 text-sm font-semibold text-[#334155]">Amazon Pay</button>
                    </div>
                  ) : null}

                  {selectedMethod === "cod" ? (
                    <p className="mt-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3 text-sm text-[#92400e]">
                      Cash on Delivery is available for this order.
                    </p>
                  ) : null}

                  {paymentError ? (
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#b91c1c]">
                      <AlertCircle size={14} /> {paymentError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handlePlaceOrder()}
                    disabled={!canPlaceOrder}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#f5bf00] px-4 py-2.5 text-sm font-bold text-[#111827] hover:bg-[#e6b500] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {placingOrder
                      ? "Processing..."
                      : selectedMethod === "cod"
                        ? `Place Order ${formatPrice(checkoutDraft.totals.total)}`
                        : `Pay ${formatPrice(checkoutDraft.totals.total)}`}
                  </button>
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-[#dde3ea] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Order Details</p>
              <div className="mt-2 space-y-1 text-sm text-[#334155]">
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
              </div>

              <div className="mt-3 border-t border-dashed border-[#d8e0ea] pt-3">
                <div className="flex items-center justify-between text-lg font-bold text-[#0f172a]">
                  <span>Total</span>
                  <span>{formatPrice(checkoutDraft.totals.total)}</span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8fbff] p-3 text-xs text-[#475569]">
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
