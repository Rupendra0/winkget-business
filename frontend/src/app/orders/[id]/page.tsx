"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import { paymentMethodLabel, readOrderById, type CheckoutOrder } from "@/lib/checkoutStore";
import { Calendar, MapPin, User, ChevronLeft, Package, Clock, ShieldCheck, CheckCircle2, ChevronRight, Copy, Check, ArrowLeft, Home, HelpCircle, ChevronDown, Coins, X, Info } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value || 0)).toLocaleString("en-IN")}`;
const formatDateTime = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "--";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatusDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
  
  return `${day} ${monthName} ${year}, ${time}`;
};

const getProductSize = (name: string) => {
  const match = name.match(/(\d+\s*(?:ml|g|kg|l|s|pcs|pack|meter|cm|mm|oz|ml|ML|G|KG|L|PCS))\b/i);
  return match ? match[1] : "500 ml";
};

const formatStatus = (value: CheckoutOrder["status"]) => value;

const statusClassName = (value: CheckoutOrder["status"]) => {
  if (value === "Completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (value === "Disputed") {
    return "bg-rose-50 text-rose-700 border-rose-100";
  }
  return "bg-amber-50 text-amber-800 border-amber-100";
};

export default function OrderDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : "";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [copied, setCopied] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [showUpdatesMobile, setShowUpdatesMobile] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const loadSessionAndOrder = async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.replace(buildAuthHref(pathname || "/orders"));
        return;
      }

      setUser(currentUser);
      const nextOrder = await readOrderById(currentUser.id, orderId);
      setOrder(nextOrder);
      setLoading(false);
    };

    void loadSessionAndOrder();
  }, [orderId, pathname, router]);

  const itemCount = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
  }, [order]);

  const detailedUpdates = useMemo(() => {
    if (!order) return [];

    const baseDate = new Date(order.createdAt);
    
    const addHours = (date: Date, hours: number) => {
      const copy = new Date(date);
      copy.setMinutes(copy.getMinutes() + Math.round(hours * 60));
      return copy;
    };

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formatDt = (date: Date) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      const dayName = days[date.getDay()];
      const ordinalDay = getOrdinal(date.getDate());
      const monthName = months[date.getMonth()];
      const yearShort = String(date.getFullYear()).slice(-2);
      
      return `${dayName}, ${ordinalDay} ${monthName} '${yearShort}`;
    };

    const formatTm = (date: Date) => {
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).replace(/\s+/g, "").toLowerCase();
    };

    const formatSubEventTime = (date: Date) => {
      return `${formatDt(date)} - ${formatTm(date)}`;
    };

    const confirmedDate = baseDate;
    const shippedDate = addHours(baseDate, 3);
    const attemptDate = addHours(baseDate, 24);
    const outDate = addHours(baseDate, 26);
    const deliveredDate = addHours(baseDate, 28);

    const trackingNo = `FMPP${order.id.slice(-8).toUpperCase()}`;

    // Group 1: Order Confirmed
    const groupConfirmed = {
      title: "Order Confirmed",
      dateStr: formatDt(confirmedDate),
      status: "completed" as const,
      subEvents: [
        { title: "Your Order has been placed.", description: formatSubEventTime(confirmedDate) },
        { title: "Seller has processed your order.", description: formatSubEventTime(addHours(confirmedDate, 2)) },
        { title: "Your item has been picked up by delivery partner.", description: formatSubEventTime(addHours(confirmedDate, 2.5)) },
      ]
    };

    // Group 2: Shipped
    const groupShipped = {
      title: "Shipped",
      dateStr: formatDt(shippedDate),
      status: "completed" as const,
      subEvents: [
        { title: `Ekart Logistics - ${trackingNo}`, description: `Your item has been shipped. ${formatSubEventTime(shippedDate)}` },
        { title: "Your item has been received in the hub nearest to you", description: undefined },
      ]
    };

    if (order.status === "Pending") {
      const groupAttempted = {
        title: "Delivery Attempted",
        dateStr: undefined,
        status: "warning" as const,
        subEvents: [
          { title: "Delivery agent was unable to deliver your order. Please check again after some time for further updates.", description: formatSubEventTime(attemptDate) },
        ]
      };

      const groupOut = {
        title: "Out For Delivery",
        dateStr: formatDt(outDate),
        status: "completed" as const,
        subEvents: [
          { title: "Your item is out for delivery", description: formatSubEventTime(outDate) },
        ]
      };

      const groupDelivered = {
        title: `Delivered ${formatDt(deliveredDate)}`,
        dateStr: undefined,
        status: "pending" as const,
        subEvents: [
          { title: "Your item has been delivered", description: formatSubEventTime(deliveredDate) },
        ]
      };

      return [groupConfirmed, groupShipped, groupAttempted, groupOut, groupDelivered];
    } else if (order.status === "Completed") {
      const groupOut = {
        title: "Out For Delivery",
        dateStr: formatDt(outDate),
        status: "completed" as const,
        subEvents: [
          { title: "Your item is out for delivery", description: formatSubEventTime(outDate) },
        ]
      };

      const groupDelivered = {
        title: "Delivered",
        dateStr: formatDt(deliveredDate),
        status: "completed" as const,
        subEvents: [
          { title: "Your item has been delivered", description: formatSubEventTime(deliveredDate) },
        ]
      };

      return [groupConfirmed, groupShipped, groupOut, groupDelivered];
    } else {
      const groupAttempted = {
        title: "Delivery Attempted",
        dateStr: undefined,
        status: "warning" as const,
        subEvents: [
          { title: "Delivery agent was unable to deliver your order. Please check again after some time for further updates.", description: formatSubEventTime(attemptDate) },
        ]
      };

      const groupCancelled = {
        title: "Cancelled / Returned",
        dateStr: formatDt(outDate),
        status: "warning" as const,
        subEvents: [
          { title: "Your order was cancelled or returned.", description: formatSubEventTime(outDate) },
        ]
      };

      return [groupConfirmed, groupShipped, groupAttempted, groupCancelled];
    }
  }, [order]);

  const steps = useMemo(() => {
    if (!order) return [];

    const placedStep = {
      label: "Order Confirmed",
      date: formatDateTime(order.createdAt),
      active: true,
      isCancelled: false,
    };

    let secondStepLabel = "Delivery Pending";
    let secondStepDate: string | null = null;
    let isSecondStepActive = false;
    let isCancelled = false;

    if (order.status === "Completed") {
      secondStepLabel = "Delivered";
      secondStepDate = formatDateTime(order.createdAt);
      isSecondStepActive = true;
    } else if (order.status === "Disputed") {
      secondStepLabel = "Cancelled";
      secondStepDate = formatDateTime(order.createdAt);
      isSecondStepActive = true;
      isCancelled = true;
    } else {
      secondStepLabel = "Processing / Delivery Pending";
      isSecondStepActive = false;
    }

    return [
      placedStep,
      {
        label: secondStepLabel,
        date: secondStepDate,
        active: isSecondStepActive,
        isCancelled: isCancelled,
      }
    ];
  }, [order]);

  const renderTimelineContent = () => {
    return (
      <div className="relative pl-6 space-y-8 select-none">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
        
        {detailedUpdates.map((group, groupIdx) => {
          const isLast = groupIdx === detailedUpdates.length - 1;
          
          let dotClass = "bg-slate-200 border-slate-200";
          let lineClass = "bg-slate-200";
          
          if (group.status === "completed") {
            dotClass = "bg-emerald-600 border-emerald-600";
            lineClass = "bg-emerald-600";
          } else if (group.status === "warning") {
            dotClass = "bg-amber-500 border-amber-500";
            lineClass = "bg-amber-500";
          } else {
            dotClass = "bg-white border-slate-300 border-2";
            lineClass = "bg-slate-200";
          }

          if (!isLast) {
            const nextGroup = detailedUpdates[groupIdx + 1];
            if (nextGroup.status === "pending") {
              lineClass = "bg-slate-200";
            } else {
              lineClass = group.status === "completed" ? "bg-emerald-600" : "bg-amber-500";
            }
          }

          return (
            <div key={groupIdx} className="relative flex flex-col gap-2.5">
              {!isLast && (
                <div className={`absolute -left-[14px] top-4 -bottom-10 w-0.5 ${lineClass}`} />
              )}

              <div className={`absolute -left-[20px] top-1.5 h-3.5 w-3.5 rounded-full border border-white flex items-center justify-center shadow-sm z-10 ${dotClass}`}>
                {group.status === "completed" && (
                  <span className="text-[6px] text-white font-bold">✓</span>
                )}
                {group.status === "warning" && (
                  <span className="text-[6px] text-white font-bold">!</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-slate-700 text-xs md:text-sm leading-snug">
                  {group.title}
                </span>
                {group.dateStr && (
                  <span className="text-[10px] md:text-xs text-slate-400 font-normal">
                    {group.dateStr}
                  </span>
                )}
              </div>

              {group.subEvents.length > 0 && (
                <div className="space-y-3 pl-1">
                  {group.subEvents.map((sub, subIdx) => (
                    <div key={subIdx} className="space-y-0.5">
                      <p className="text-[11px] md:text-xs font-normal text-slate-500 leading-snug">
                        {sub.title}
                      </p>
                      {sub.description && (
                        <p className="text-[10px] text-slate-400 font-normal">
                          {sub.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto h-72 w-full max-w-none animate-pulse bg-white rounded-xl" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-6xl bg-white p-7 rounded-xl border border-slate-200/80">
          <p className="text-xl font-bold text-slate-900">Order not found</p>
          <p className="mt-2 text-sm text-slate-600">This order is unavailable or does not belong to your account.</p>
          <Link
            href="/orders"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95"
          >
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  if (showUpdatesMobile) {
    return (
      <main className="min-h-screen bg-white px-6 py-4">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowUpdatesMobile(false)}
            className="text-slate-800 hover:text-slate-900 transition p-1 -ml-1 rounded-full hover:bg-slate-50 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </button>
        </div>
        {renderTimelineContent()}
      </main>
    );
  }

  const primaryItem = order.items[0];
  const otherItems = order.items.slice(1);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-4 sm:px-4 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        
        {/* Desktop-only Breadcrumbs */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 mb-4 px-1">
          <Link href="/" className="hover:text-blue-600 transition">Home</Link>
          <span>&gt;</span>
          <Link href="/profile" className="hover:text-blue-600 transition">My Account</Link>
          <span>&gt;</span>
          <Link href="/orders" className="hover:text-blue-600 transition">My Orders</Link>
          <span>&gt;</span>
          <span className="text-slate-700 font-semibold truncate max-w-[150px]">{order.id}</span>
        </div>

        {/* Mobile-only Header */}
        <div className="flex md:hidden items-center gap-3 mb-4 px-1">
          <Link href="/orders" className="text-slate-800 hover:text-slate-900 transition">
            <ArrowLeft size={20} strokeWidth={2.4} />
          </Link>
          <h1 className="text-base font-bold text-slate-900">Order Details</h1>
        </div>

        {/* Desktop-only Back Link & status banner */}
        <div className="hidden md:flex items-center justify-between gap-3 mb-5 px-1">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
          >
            <ChevronLeft size={14} strokeWidth={2.4} />
            <span>Back to Orders</span>
          </Link>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClassName(order.status)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${order.status === "Completed" ? "bg-emerald-600" : order.status === "Disputed" ? "bg-rose-600" : "bg-amber-600"}`} />
            {formatStatus(order.status)}
          </span>
        </div>

        {/* Responsive Details Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          
          {/* Left Column: Product details and status tracker */}
          <div className="space-y-6">
            
            {/* Desktop-only: Primary Item card (item details + full vertical tracker timeline) */}
            {primaryItem && (
              <div className="hidden md:block bg-white p-5 rounded-xl border border-slate-200/80 space-y-6">
                <div className="flex gap-4 items-start justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="line-clamp-2 text-base font-semibold text-slate-800 hover:text-blue-600 leading-snug">
                      <Link
                        href={`/product/${encodeURIComponent(
                          buildProductSlug({
                            id: primaryItem.product.id,
                            name: primaryItem.product.name,
                            storeId: primaryItem.product.storeId,
                            sellerName: primaryItem.product.sellerName,
                          })
                        )}`}
                      >
                        {primaryItem.product.name}
                      </Link>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Seller: <strong className="text-slate-600 font-semibold">{primaryItem.product.sellerName || "Winkget Seller"}</strong>
                    </p>
                    <div className="pt-1.5 text-sm flex items-center gap-3">
                      <strong className="text-slate-900 font-bold">{formatPrice(primaryItem.product.price)}</strong>
                      <span className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded px-2 py-0.5">
                        Qty: {Math.max(1, Number(primaryItem.quantity || 1))}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Image */}
                  <Link
                    href={`/product/${encodeURIComponent(
                      buildProductSlug({
                        id: primaryItem.product.id,
                        name: primaryItem.product.name,
                        storeId: primaryItem.product.storeId,
                        sellerName: primaryItem.product.sellerName,
                      })
                    )}`}
                    className="block h-20 w-20 sm:h-24 sm:w-24 shrink-0 flex items-center justify-center rounded border border-slate-100 p-1 hover:opacity-90 transition bg-transparent"
                  >
                    {primaryItem.product.image ? (
                      <img
                        src={primaryItem.product.image}
                        alt={primaryItem.product.name}
                        className="max-h-full max-w-full object-contain mx-auto"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-blue-50 text-xs font-bold text-blue-700">
                        {primaryItem.product.name?.slice(0, 1).toUpperCase() || "P"}
                      </div>
                    )}
                  </Link>
                </div>

                {/* Progress Status Timeline */}
                <div className="pt-5 border-t border-slate-100">
                  <div className="relative pl-6 space-y-6">
                    {/* Vertical line connector */}
                    <div className={`absolute left-[11px] top-2 bottom-2 w-0.5 ${steps[1]?.active ? (steps[1].isCancelled ? "bg-rose-200" : "bg-emerald-200") : "bg-slate-200"}`} />

                    {steps.map((step, idx) => {
                      const isCompleted = step.active;
                      const dotBg = isCompleted 
                        ? (step.isCancelled ? "bg-rose-600 border-rose-600" : "bg-emerald-600 border-emerald-600") 
                        : "bg-slate-200 border-slate-200";

                      return (
                        <div key={idx} className="relative flex items-start gap-4 text-sm">
                          {/* Circle dot marker */}
                          <div className={`absolute -left-[20px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${dotBg} flex items-center justify-center shadow-sm z-10`}>
                            {isCompleted && !step.isCancelled && (
                              <span className="text-[6px] text-white font-bold leading-none">✓</span>
                            )}
                            {isCompleted && step.isCancelled && (
                              <span className="text-[6px] text-white font-bold leading-none">✕</span>
                            )}
                          </div>

                          <div className="flex flex-col gap-0.5 leading-tight">
                            <span className={`font-semibold ${isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                              {step.label}
                            </span>
                            {step.date && (
                              <span className="text-xs text-slate-500 font-medium">
                                {step.date}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pl-6">
                    <button
                      type="button"
                      onClick={() => setShowUpdatesModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      See All Updates <ChevronRight size={12} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile-only: Attached Card container + Product Details */}
            {primaryItem && (
              <div className="block md:hidden space-y-4">
                {/* Product details */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex gap-3.5 items-center">
                  <Link
                    href={`/product/${encodeURIComponent(
                      buildProductSlug({
                        id: primaryItem.product.id,
                        name: primaryItem.product.name,
                        storeId: primaryItem.product.storeId,
                        sellerName: primaryItem.product.sellerName,
                      })
                    )}`}
                    className="block h-16 w-16 shrink-0 flex items-center justify-center rounded border border-slate-100 p-1 hover:opacity-90 transition bg-transparent"
                  >
                    {primaryItem.product.image ? (
                      <img
                        src={primaryItem.product.image}
                        alt={primaryItem.product.name}
                        className="max-h-full max-w-full object-contain mx-auto"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-blue-50 text-[10px] font-bold text-blue-700">P</div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-600 leading-snug">
                      <Link
                        href={`/product/${encodeURIComponent(
                          buildProductSlug({
                            id: primaryItem.product.id,
                            name: primaryItem.product.name,
                            storeId: primaryItem.product.storeId,
                            sellerName: primaryItem.product.sellerName,
                          })
                        )}`}
                      >
                        {primaryItem.product.name}
                      </Link>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      {getProductSize(primaryItem.product.name)}
                    </p>
                  </div>
                </div>



                {/* Order ID Line */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-1 mt-3">
                  <span>Order #{order.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-600 transition active:scale-95"
                    aria-label="Copy order ID"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Attached Mobile Containers: Status + Delivery details + Price details */}
                <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
                  
                  {/* 1. Status Section */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-sm font-bold ${order.status === "Completed" ? "text-emerald-700" : order.status === "Disputed" ? "text-rose-700" : "text-amber-800"}`}>
                          {order.status === "Completed" ? "Delivered" : order.status === "Disputed" ? "Cancelled" : "Delivery Pending"}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatStatusDateTime(order.createdAt)}
                        </span>
                      </div>

                      {/* Circular marker on right (hidden if Pending) */}
                      {order.status !== "Pending" && (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm shadow-sm shrink-0 ${order.status === "Completed" ? "bg-[#008A5E]" : "bg-rose-600"}`}>
                          {order.status === "Completed" ? "✓" : "✕"}
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-slate-100 pt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowUpdatesMobile(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                      >
                        See all updates
                      </button>
                    </div>
                  </div>

                  {/* 2. Delivery Details Section */}
                  <div className="p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Delivery details</h3>
                    <div className="space-y-3.5 text-sm text-slate-600">
                      
                      {/* Address */}
                      <div className="flex gap-3 items-start">
                        <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <strong className="text-slate-800 block text-xs uppercase tracking-wide">Delivery Address</strong>
                          <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                            {order.address.line1}
                            {order.address.line2 ? `, ${order.address.line2}` : ""}
                            {order.address.landmark ? `, ${order.address.landmark}` : ""}
                            <br />
                            {order.address.city}, {order.address.state} - {order.address.postalCode}
                          </p>
                        </div>
                      </div>

                      {/* Receiver */}
                      <div className="flex gap-3 items-start border-t border-slate-100 pt-3.5">
                        <User size={16} className="text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800 block text-xs uppercase tracking-wide">Receiver</strong>
                          <p className="mt-1 text-slate-700 font-bold">{order.address.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Phone: {order.address.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Price Details Section */}
                  <div className="p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Price details</h3>
                    <div className="space-y-2.5 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Listing Price (MRP)</span>
                        <span className="font-semibold text-slate-700">{formatPrice(order.totals.mrp)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          Special Price (Subtotal)
                          <HelpCircle size={14} className="text-slate-400 cursor-pointer" />
                        </span>
                        <span className="font-semibold text-slate-700">{formatPrice(order.totals.subtotal)}</span>
                      </div>
                      {order.totals.savings > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Savings</span>
                          <span>-{formatPrice(order.totals.savings)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Shipping Fee</span>
                        <span className="font-semibold text-slate-700">{order.totals.shippingFee > 0 ? formatPrice(order.totals.shippingFee) : "Free"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          Platform Fee
                          <ChevronDown size={14} className="text-slate-400 cursor-pointer" />
                        </span>
                        <span className="font-semibold text-slate-700">{formatPrice(order.totals.platformFee)}</span>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between text-base font-bold text-slate-900">
                        <span>Total Amount</span>
                        <span>{formatPrice(order.totals.total)}</span>
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 mt-2 text-xs flex justify-between items-center text-slate-500 font-medium">
                        <span>Paid By</span>
                        <span className="font-bold text-slate-700 uppercase">{paymentMethodLabel(order.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Desktop-only: Other items feed */}
            {otherItems.length > 0 && (
              <div className="hidden md:block space-y-3">
                <h3 className="text-sm font-bold text-slate-700 px-1">Other Items In This Order</h3>
                <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {otherItems.map((item) => {
                    const otherHref = `/product/${encodeURIComponent(
                      buildProductSlug({
                        id: item.product.id,
                        name: item.product.name,
                        storeId: item.product.storeId,
                        sellerName: item.product.sellerName,
                      })
                    )}`;

                    return (
                      <div key={`${order.id}-${item.product.id}`} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-blue-600">
                            <Link href={otherHref}>{item.product.name}</Link>
                          </h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>Price: <strong className="text-slate-600">{formatPrice(item.product.price)}</strong></span>
                            <span>•</span>
                            <span>Qty: <strong className="text-slate-600">{Math.max(1, Number(item.quantity || 1))}</strong></span>
                          </div>
                          <div className="pt-1 flex items-center gap-1.5 text-xs font-bold">
                            <span className={`h-1.5 w-1.5 rounded-full ${order.status === "Completed" ? "bg-emerald-600" : order.status === "Disputed" ? "bg-rose-600" : "bg-amber-600"}`} />
                            <span className={order.status === "Completed" ? "text-emerald-700" : order.status === "Disputed" ? "text-rose-700" : "text-amber-800"}>
                              {order.status === "Completed" ? "Delivered" : order.status === "Disputed" ? "Cancelled" : "Delivery Pending"}
                            </span>
                          </div>
                        </div>

                        {/* Image Thumbnail */}
                        <Link
                          href={otherHref}
                          className="block h-16 w-16 shrink-0 flex items-center justify-center rounded border border-slate-100 p-1 hover:opacity-90 transition bg-transparent"
                        >
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="max-h-full max-w-full object-contain mx-auto"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-blue-50 text-[10px] font-bold text-blue-700">P</div>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Address, Price details & Mobile-only other items list */}
          <div className="space-y-6">
            
            {/* Delivery Details Card (Desktop only) */}
            <div className="hidden md:block bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">Delivery details</h3>
              <div className="space-y-3.5 text-sm text-slate-600">
                
                {/* Address info */}
                <div className="flex gap-3 items-start">
                  <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <strong className="text-slate-800 block text-xs uppercase tracking-wide">Delivery Address</strong>
                    <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                      {order.address.line1}
                      {order.address.line2 ? `, ${order.address.line2}` : ""}
                      {order.address.landmark ? `, ${order.address.landmark}` : ""}
                      <br />
                      {order.address.city}, {order.address.state} - {order.address.postalCode}
                    </p>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="flex gap-3 items-start border-t border-slate-100 pt-3.5">
                  <User size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block text-xs uppercase tracking-wide">Receiver</strong>
                    <p className="mt-1 text-slate-700 font-bold">{order.address.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Phone: {order.address.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Details Card (Desktop only) */}
            <div className="hidden md:block bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">Price details</h3>
              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Listing Price (MRP)</span>
                  <span className="font-semibold text-slate-700">{formatPrice(order.totals.mrp)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Price (Subtotal)</span>
                  <span className="font-semibold text-slate-700">{formatPrice(order.totals.subtotal)}</span>
                </div>
                {order.totals.savings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Savings</span>
                    <span>-{formatPrice(order.totals.savings)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="font-semibold text-slate-700">{order.totals.shippingFee > 0 ? formatPrice(order.totals.shippingFee) : "Free"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-slate-700">{formatPrice(order.totals.platformFee)}</span>
                </div>
                
                <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span>{formatPrice(order.totals.total)}</span>
                </div>

                <div className="border-t border-slate-100 pt-2.5 mt-2 text-xs flex justify-between items-center text-slate-500 font-medium">
                  <span>Paid By</span>
                  <span className="font-bold text-slate-700 uppercase">{paymentMethodLabel(order.paymentMethod)}</span>
                </div>
              </div>
            </div>

            {/* Mobile-only: Other items feed */}
            {otherItems.length > 0 && (
              <div className="block md:hidden space-y-3">
                <div className="px-1 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">Other items in this order</h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                    <span>Order #{order.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-slate-600 transition active:scale-95"
                      aria-label="Copy order ID"
                    >
                      {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {otherItems.map((item) => {
                    const otherHref = `/product/${encodeURIComponent(
                      buildProductSlug({
                        id: item.product.id,
                        name: item.product.name,
                        storeId: item.product.storeId,
                        sellerName: item.product.sellerName,
                      })
                    )}`;

                    return (
                      <div key={`${order.id}-${item.product.id}`} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-blue-600">
                            <Link href={otherHref}>{item.product.name}</Link>
                          </h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>Price: <strong className="text-slate-600">{formatPrice(item.product.price)}</strong></span>
                          </div>
                        </div>

                        {/* Image Thumbnail */}
                        <Link
                          href={otherHref}
                          className="block h-16 w-16 shrink-0 flex items-center justify-center rounded border border-slate-100 p-1 hover:opacity-90 transition bg-transparent"
                        >
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="max-h-full max-w-full object-contain mx-auto"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-blue-50 text-[10px] font-bold text-blue-700">P</div>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile-only CTA: Shop more */}
            <div className="block md:hidden mt-6 pb-6 px-1">
              <Link
                href="/orders"
                className="flex items-center justify-center w-full rounded-lg border border-blue-600 bg-white py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition active:scale-95 shadow-sm"
              >
                Shop more from Winkget
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Updates Modal Popup */}
      {showUpdatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowUpdatesModal(false)} 
          />
          <div className="relative bg-white rounded-xl w-full max-w-xl max-h-[80vh] overflow-y-auto p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 z-10">
            <button
              type="button"
              onClick={() => setShowUpdatesModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition active:scale-95"
              aria-label="Close updates"
            >
              <X size={20} />
            </button>
            {renderTimelineContent()}
          </div>
        </div>
      )}
    </main>
  );
}

