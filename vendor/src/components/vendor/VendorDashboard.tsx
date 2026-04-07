"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  Camera,
  CircleDot,
  ClipboardList,
  Facebook,
  ImagePlus,
  Instagram,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  PhoneCall,
  RefreshCcw,
  Save,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Upload,
  Youtube,
} from "lucide-react";
import {
  fetchVendorInquiries,
  fetchVendorReviewSnapshot,
  fetchVendorSession,
  logoutVendor,
  updateVendorProfile,
  type InquiryStatus,
  type VendorInquiry,
  type VendorInquirySnapshot,
  type VendorReview,
  type VendorReviewSnapshot,
  type VendorSession,
} from "@/lib/vendorApi";

type SidebarLabel = "Overview" | "Enquiries" | "Calls" | "Reviews" | "Orders" | "Posts" | "Shop" | "Settings";

type SidebarItem = {
  label: SidebarLabel;
  icon: ComponentType<{ className?: string }>;
};

type StatCardItem = {
  label: "Enquiries" | "Call Leads" | "Reviews" | "Orders";
  value: number;
  trend: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  trendPositive: boolean;
};

type InquiryStatusFilter = InquiryStatus | "All";

type SettingsFormState = {
  name: string;
  email: string;
  phone: string;
  alternatePhone: string;
  businessEmail: string;
  businessPhone: string;
  businessAlternatePhone: string;
  city: string;
  sublocality: string;
  state: string;
  shopOpeningTime: string;
  shopClosingTime: string;
  serviceTagsText: string;
};

type ShopProfileFormState = {
  image: string;
  shopBannerImage: string;
  shopGalleryText: string;
  businessAddress: string;
  website: string;
  businessDescription: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Enquiries", icon: MessageSquare },
  { label: "Calls", icon: PhoneCall },
  { label: "Reviews", icon: Star },
  { label: "Orders", icon: ShoppingBag },
  { label: "Posts", icon: Megaphone },
  { label: "Shop", icon: ImagePlus },
  { label: "Settings", icon: Settings },
];

const MOBILE_BAR_ITEMS: Array<{ label: "Overview" | "Enquiries" | "Calls" | "Shop" | "Settings"; icon: SidebarItem["icon"] }> = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Enquiries", icon: MessageSquare },
  { label: "Calls", icon: PhoneCall },
  { label: "Shop", icon: ImagePlus },
  { label: "Settings", icon: Settings },
];

const SECTION_META: Record<SidebarLabel, { title: string; subtitle: string }> = {
  Overview: {
    title: "Overview",
    subtitle: "Live health snapshot of your vendor profile and incoming demand.",
  },
  Enquiries: {
    title: "Enquiries",
    subtitle: "All lead enquiries currently available from your live backend records.",
  },
  Calls: {
    title: "Calls",
    subtitle: "Contact-first call desk view built from enquiry phone and email data.",
  },
  Reviews: {
    title: "Reviews",
    subtitle: "Customer rating stream and review history from your public listing.",
  },
  Orders: {
    title: "Orders",
    subtitle: "Order API is not available yet, but this section is ready for integration.",
  },
  Posts: {
    title: "Posts",
    subtitle: "Content composer interface; backend posting endpoint is not available yet.",
  },
  Shop: {
    title: "Shop Profile",
    subtitle: "Manage shop display photo, banner, gallery, social links, and listing details.",
  },
  Settings: {
    title: "Settings",
    subtitle: "Update your vendor profile fields currently supported by backend.",
  },
};

const MAIN_WEBSITE_URL = process.env.NEXT_PUBLIC_MAIN_WEBSITE_URL || "http://localhost:3000";
const VENDOR_REGISTRATION_URL = `${MAIN_WEBSITE_URL.replace(/\/$/, "")}/vendor-register`;
const DEFAULT_VENDOR_AVATAR =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=400&q=60";
const DEFAULT_VENDOR_BANNER =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=60";
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SHOP_GALLERY_ITEMS = 8;

const EMPTY_REVIEW_SNAPSHOT: VendorReviewSnapshot = {
  summary: { rating: 0, reviews: 0 },
  reviews: [],
};

const EMPTY_INQUIRY_SNAPSHOT: VendorInquirySnapshot = {
  summary: {
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  },
  inquiries: [],
};

function parseTimeToMinutes(value: string) {
  const normalized = String(value || "").trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) return null;

  const [hourToken, minuteToken] = normalized.split(":");
  const hour = Number(hourToken);
  const minute = Number(minuteToken);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function isBusinessOpenNow(vendor: VendorSession) {
  if (vendor.vendorStatus !== "approved") {
    return false;
  }

  const opening = parseTimeToMinutes(String(vendor.shopOpeningTime || ""));
  const closing = parseTimeToMinutes(String(vendor.shopClosingTime || ""));
  if (opening === null || closing === null) {
    return true;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (opening === closing) return true;
  if (opening < closing) {
    return nowMinutes >= opening && nowMinutes < closing;
  }

  return nowMinutes >= opening || nowMinutes < closing;
}

function formatRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0.0";
  return value.toFixed(1);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildSettingsForm(vendor: VendorSession | null): SettingsFormState {
  return {
    name: String(vendor?.name || ""),
    email: String(vendor?.email || ""),
    phone: String(vendor?.phone || ""),
    alternatePhone: String(vendor?.alternatePhone || ""),
    businessEmail: String(vendor?.businessEmail || ""),
    businessPhone: String(vendor?.businessPhone || ""),
    businessAlternatePhone: String(vendor?.businessAlternatePhone || ""),
    city: String(vendor?.city || ""),
    sublocality: String(vendor?.sublocality || ""),
    state: String(vendor?.state || ""),
    shopOpeningTime: String(vendor?.shopOpeningTime || ""),
    shopClosingTime: String(vendor?.shopClosingTime || ""),
    serviceTagsText: Array.isArray(vendor?.serviceTags) ? vendor.serviceTags.join(", ") : "",
  };
}

function buildShopProfileForm(vendor: VendorSession | null): ShopProfileFormState {
  return {
    image: String(vendor?.image || "").trim(),
    shopBannerImage: String(vendor?.shopBannerImage || "").trim(),
    shopGalleryText: Array.isArray(vendor?.shopGallery) ? vendor.shopGallery.join("\n") : "",
    businessAddress: String(vendor?.businessAddress || "").trim(),
    website: String(vendor?.website || "").trim(),
    businessDescription: String(vendor?.businessDescription || "").trim(),
    instagramUrl: String(vendor?.instagramUrl || "").trim(),
    facebookUrl: String(vendor?.facebookUrl || "").trim(),
    youtubeUrl: String(vendor?.youtubeUrl || "").trim(),
  };
}

function parseShopGalleryInput(value: string): string[] {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_SHOP_GALLERY_ITEMS);
}

function filterShopGalleryItems(values: string[], profileImage: string, bannerImage: string): string[] {
  const profileToken = String(profileImage || "").trim();
  const bannerToken = String(bannerImage || "").trim();
  const blocked = new Set([profileToken, bannerToken].filter(Boolean));

  return values.filter((value) => {
    const normalized = String(value || "").trim();
    return normalized && !blocked.has(normalized);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function DashboardSkeleton() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.12),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_320px]">
          <aside className="hidden h-[calc(100vh-3rem)] flex-col rounded-3xl border border-gray-200 bg-white/60 p-4 backdrop-blur-md lg:flex">
            <div className="skeleton-shimmer h-10 w-32 rounded-xl" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={`sidebar-${index}`} className="skeleton-shimmer h-11 w-full rounded-xl" />
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <header className="rounded-3xl border border-white/25 bg-white/65 p-6 backdrop-blur-xl">
              <div className="skeleton-shimmer h-6 w-52 rounded-lg" />
              <div className="mt-3 skeleton-shimmer h-4 w-72 rounded-lg" />
            </header>
            <div className="skeleton-shimmer h-64 rounded-3xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`stats-${index}`} className="skeleton-shimmer h-32 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="skeleton-shimmer h-64 rounded-2xl" />
              <div className="skeleton-shimmer h-64 rounded-2xl" />
            </div>
          </section>

          <aside className="hidden space-y-4 xl:block">
            <div className="skeleton-shimmer h-56 rounded-2xl" />
            <div className="skeleton-shimmer h-72 rounded-2xl" />
          </aside>
        </div>
      </div>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-5 text-center">
      <CircleDot className="mx-auto h-5 w-5 text-gray-400" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{body}</p>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200/70">
        <div
          className="h-full rounded-full bg-[var(--vendor-primary)] transition-all duration-300"
          style={{ width: `${safeValue}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const className =
    status === "Open"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "In Progress"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-100 text-gray-700";

  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>{status}</span>;
}

function OverviewSection({
  businessName,
  location,
  isOpen,
  stats,
  leadSources,
  servicePerformance,
  recentInquiries,
  recentReviews,
}: {
  businessName: string;
  location: string;
  isOpen: boolean;
  stats: StatCardItem[];
  leadSources: Array<{ label: string; value: number }>;
  servicePerformance: Array<{ label: string; value: number }>;
  recentInquiries: VendorInquiry[];
  recentReviews: VendorReview[];
}) {
  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">Business Summary</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-gray-900">{businessName}</h2>
            <p className="mt-1 text-sm text-gray-600">{location}</p>
          </div>

          <div
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
              isOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
            {isOpen ? "Open" : "Closed"}
          </div>
        </div>
      </article>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.trendPositive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.trend}
                </span>
              </div>
              <p className="mt-4 text-xs text-gray-500">{item.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{item.value}</p>
              <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-gray-900">Lead Sources</h3>
            <BarChart3 className="h-[18px] w-[18px] text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-xs text-gray-500">Built from enquiry channel data currently present in backend.</p>

          <div className="mt-4 space-y-3">
            {leadSources.map((source) => (
              <ProgressBar key={source.label} label={source.label} value={source.value} />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-gray-900">Service Performance</h3>
            <Sparkles className="h-[18px] w-[18px] text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-xs text-gray-500">Service confidence by tags currently configured on your profile.</p>

          <div className="mt-4 space-y-3">
            {servicePerformance.map((service) => (
              <ProgressBar key={service.label} label={service.label} value={service.value} />
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900">Recent Enquiries</h3>
          <div className="mt-3 space-y-2">
            {recentInquiries.length === 0 ? (
              <EmptyState
                title="No enquiries yet"
                body="As soon as customers contact you through the listing, they will appear here."
              />
            ) : (
              recentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{inquiry.name}</p>
                    <StatusBadge status={inquiry.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600">{inquiry.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{inquiry.message}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900">Latest Reviews</h3>
          <div className="mt-3 space-y-2">
            {recentReviews.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                body="Customer reviews from your public page will appear once submitted."
              />
            ) : (
              recentReviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{review.author}</p>
                    <span className="text-xs font-semibold text-amber-600">{formatRating(review.rating)}★</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{review.comment || "No comment"}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{formatDateLabel(review.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </section>
  );
}

function EnquiriesSection({
  summary,
  inquiries,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
}: {
  summary: VendorInquirySnapshot["summary"];
  inquiries: VendorInquiry[];
  statusFilter: InquiryStatusFilter;
  setStatusFilter: (value: InquiryStatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-700">Open</p>
          <p className="mt-1 text-xl font-semibold text-emerald-800">{summary.open}</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-amber-700">In Progress</p>
          <p className="mt-1 text-xl font-semibold text-amber-800">{summary.inProgress}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-gray-100 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-700">Closed</p>
          <p className="mt-1 text-xl font-semibold text-gray-800">{summary.closed}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Open", "In Progress", "Closed"] as InquiryStatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-blue-100 text-blue-700"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, subject"
            className="ml-auto w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 sm:w-72"
          />
        </div>

        <div className="mt-4 space-y-3">
          {inquiries.length === 0 ? (
            <EmptyState
              title="No enquiries found"
              body="Try adjusting filters, or wait for new customer enquiries from your listing."
            />
          ) : (
            inquiries.map((inquiry) => (
              <div key={inquiry.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inquiry.subject}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{inquiry.name}</p>
                  </div>
                  <StatusBadge status={inquiry.status} />
                </div>

                <div className="mt-2 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                  <p>Phone: {inquiry.phone || "--"}</p>
                  <p>Email: {inquiry.email || "--"}</p>
                  <p>Channel: {inquiry.channel}</p>
                  <p>Created: {formatDateTime(inquiry.createdAt)}</p>
                </div>

                <p className="mt-2 text-sm text-gray-700">{inquiry.message}</p>
                {inquiry.adminNote ? (
                  <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                    Admin note: {inquiry.adminNote}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

function CallsSection({ callLeads }: { callLeads: VendorInquiry[] }) {
  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          Calls are derived from enquiry contacts currently available in backend, including phone, email, and message context.
        </p>
      </article>

      {callLeads.length === 0 ? (
        <EmptyState
          title="No call leads yet"
          body="When enquiries include contact information, they will appear here with direct call and email actions."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {callLeads.map((lead) => (
            <article key={`call-${lead.id}`} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-600">{lead.subject}</p>
                </div>
                <StatusBadge status={lead.status} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-gray-700">
                <p>
                  Phone: {lead.phone ? <a href={`tel:${lead.phone}`} className="text-blue-700 underline">{lead.phone}</a> : "--"}
                </p>
                <p>
                  Email:{" "}
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-blue-700 underline">
                      {lead.email}
                    </a>
                  ) : (
                    "--"
                  )}
                </p>
                <p className="text-xs text-gray-500">Received: {formatDateTime(lead.createdAt)}</p>
              </div>

              <p className="mt-3 rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{lead.message || "No message"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewsSection({ reviews }: { reviews: VendorReviewSnapshot }) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Average Rating</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{formatRating(reviews.summary.rating)} / 5</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Reviews</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{reviews.summary.reviews}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {reviews.reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            body="Reviews from your listing will show up here automatically once customers submit them."
          />
        ) : (
          <div className="space-y-3">
            {reviews.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{review.author}</p>
                  <span className="text-xs font-semibold text-amber-600">{formatRating(review.rating)}★</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{review.comment || "No comment"}</p>
                <p className="mt-1 text-[11px] text-gray-500">{formatDateTime(review.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function OrdersSection() {
  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-gray-900">Orders Integration</h3>
        <p className="mt-2 text-sm text-gray-600">
          No orders API exists in current backend. This panel is kept active so it can start showing live order rows as soon as an
          orders endpoint is added.
        </p>
      </article>
      <EmptyState
        title="No order records available"
        body="Order section is functional and ready, but the backend currently does not expose order resources yet."
      />
    </section>
  );
}

function PostsSection({
  title,
  message,
  ctaLabel,
  setTitle,
  setMessage,
  setCtaLabel,
  notice,
  onPublish,
}: {
  title: string;
  message: string;
  ctaLabel: string;
  setTitle: (value: string) => void;
  setMessage: (value: string) => void;
  setCtaLabel: (value: string) => void;
  notice: string | null;
  onPublish: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={onPublish} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-gray-900">Post Composer</h3>
        <p className="mt-1 text-xs text-gray-500">
          UI is functional and stores draft locally. Backend publishing endpoint is not available yet.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Post title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Weekend service offer"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[130px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Share updates your customers should know..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">CTA Label</span>
            <input
              type="text"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Call Now"
            />
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--vendor-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Save Draft
          </button>

          {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
        </div>
      </form>

      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</p>
        <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">{title || "Your post title"}</p>
          <p className="mt-2 text-sm text-gray-700">{message || "Your post message preview will appear here."}</p>
          <button type="button" className="mt-3 rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {ctaLabel || "Contact"}
          </button>
        </div>
      </article>
    </section>
  );
}

function ShopProfileSection({
  form,
  businessName,
  onChange,
  onSubmit,
  onUploadSingle,
  onUploadGallery,
  saving,
  message,
  error,
}: {
  form: ShopProfileFormState;
  businessName: string;
  onChange: (field: keyof ShopProfileFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadSingle: (field: "image" | "shopBannerImage", files: FileList | null) => void;
  onUploadGallery: (files: FileList | null) => void;
  saving: boolean;
  message: string | null;
  error: string | null;
}) {
  const galleryItems = filterShopGalleryItems(
    parseShopGalleryInput(form.shopGalleryText),
    form.image,
    form.shopBannerImage
  );
  const avatarImage = form.image || DEFAULT_VENDOR_AVATAR;
  const bannerImage = form.shopBannerImage || DEFAULT_VENDOR_BANNER;
  const socialLocked = true;

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live Shop Preview</p>

        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
          <div className="vendor-shop-preview-banner relative w-full overflow-hidden bg-gray-100">
            <img src={bannerImage} alt="Shop banner" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-black/5" />
            <div className="absolute inset-x-3 bottom-3 flex items-end gap-3">
              <div className="vendor-shop-preview-avatar overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
                <img src={avatarImage} alt={businessName} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1 pb-1 text-white">
                <p className="truncate text-sm font-semibold">{businessName}</p>
                <p className="truncate text-xs text-white/90">{form.businessAddress || "Address not set"}</p>
              </div>
            </div>
          </div>

          {galleryItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 p-3">
              {galleryItems.slice(0, 4).map((url) => (
                <div key={url} className="h-14 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <img src={url} alt="Shop gallery" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {form.instagramUrl ? (
            <a
              href={form.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 font-semibold text-pink-700"
            >
              <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
              Instagram
            </a>
          ) : null}
          {form.facebookUrl ? (
            <a
              href={form.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700"
            >
              <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
              Facebook
            </a>
          ) : null}
          {form.youtubeUrl ? (
            <a
              href={form.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700"
            >
              <Youtube className="h-3.5 w-3.5" aria-hidden="true" />
              YouTube
            </a>
          ) : null}
        </div>
      </article>

      <form onSubmit={onSubmit} className="space-y-4">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900">Shop Profile</h3>
          <p className="mt-1 text-xs text-gray-500">
            Update your shop DP, banner, gallery photos, social links, and listing details.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Display Photo URL</span>
              <input
                type="url"
                value={form.image}
                onChange={(event) => onChange("image", event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Banner URL</span>
              <input
                type="url"
                value={form.shopBannerImage}
                onChange={(event) => onChange("shopBannerImage", event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Upload DP
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  onUploadSingle("image", event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Upload Banner
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  onUploadSingle("shopBannerImage", event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">
              Shop Photos (one URL per line, max {MAX_SHOP_GALLERY_ITEMS})
            </span>
            <textarea
              value={form.shopGalleryText}
              onChange={(event) => onChange("shopGalleryText", event.target.value)}
              className="min-h-[100px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="https://..."
            />
          </label>

          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload Shop Photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                onUploadGallery(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Address</span>
              <input
                type="text"
                value={form.businessAddress}
                onChange={(event) => onChange("businessAddress", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Website URL</span>
              <input
                type="url"
                value={form.website}
                onChange={(event) => onChange("website", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="https://..."
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Description</span>
              <textarea
                value={form.businessDescription}
                onChange={(event) => onChange("businessDescription", event.target.value)}
                className="min-h-[100px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">Premium feature</p>
            <p className="mt-1">Social media links are locked. Upgrade to Premium to unlock editing.</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Go Premium
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" /> Instagram URL
              </span>
              <input
                type="url"
                value={form.instagramUrl}
                onChange={(event) => onChange("instagramUrl", event.target.value)}
                disabled={socialLocked}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="https://instagram.com/..."
              />
            </label>

            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                <Facebook className="h-3.5 w-3.5" aria-hidden="true" /> Facebook URL
              </span>
              <input
                type="url"
                value={form.facebookUrl}
                onChange={(event) => onChange("facebookUrl", event.target.value)}
                disabled={socialLocked}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="https://facebook.com/..."
              />
            </label>

            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                <Youtube className="h-3.5 w-3.5" aria-hidden="true" /> YouTube URL
              </span>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(event) => onChange("youtubeUrl", event.target.value)}
                disabled={socialLocked}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="https://youtube.com/..."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--vendor-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving..." : "Save Shop Profile"}
            </button>

            {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
          </div>
        </article>
      </form>
    </section>
  );
}

function SettingsSection({
  form,
  onChange,
  onSubmit,
  saving,
  message,
  error,
}: {
  form: SettingsFormState;
  onChange: (field: keyof SettingsFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  message: string | null;
  error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-gray-900">Profile Settings</h3>
        <p className="mt-1 text-xs text-gray-500">These fields submit through /api/auth/me and save directly to your vendor profile.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {([
            ["name", "Owner Name"],
            ["email", "Personal Email"],
            ["phone", "Personal Phone"],
            ["alternatePhone", "Personal Alternate Phone"],
            ["businessEmail", "Business Email"],
            ["businessPhone", "Business Phone"],
            ["businessAlternatePhone", "Business Alternate Phone"],
            ["sublocality", "Sublocality"],
            ["state", "State"],
            ["shopOpeningTime", "Opening Time (HH:MM)"],
            ["shopClosingTime", "Closing Time (HH:MM)"],
          ] as Array<[keyof SettingsFormState, string]>).map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
              <input
                type="text"
                value={form[field]}
                onChange={(event) => onChange(field, event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Service Tags (comma separated)</span>
          <textarea
            value={form.serviceTagsText}
            onChange={(event) => onChange("serviceTagsText", event.target.value)}
            className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--vendor-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>
      </article>
    </form>
  );
}

export default function VendorDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<SidebarLabel>("Overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [vendor, setVendor] = useState<VendorSession | null>(null);
  const [reviews, setReviews] = useState<VendorReviewSnapshot>(EMPTY_REVIEW_SNAPSHOT);
  const [inquiryData, setInquiryData] = useState<VendorInquirySnapshot>(EMPTY_INQUIRY_SNAPSHOT);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<InquiryStatusFilter>("All");
  const [inquirySearch, setInquirySearch] = useState("");
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() => buildSettingsForm(null));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [shopProfileForm, setShopProfileForm] = useState<ShopProfileFormState>(() => buildShopProfileForm(null));
  const [shopProfileSaving, setShopProfileSaving] = useState(false);
  const [shopProfileMessage, setShopProfileMessage] = useState<string | null>(null);
  const [shopProfileError, setShopProfileError] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [postCta, setPostCta] = useState("Contact Now");
  const [postNotice, setPostNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setLoading(true);
      const session = await fetchVendorSession();
      if (!active) return;

      setVendor(session);
      setSettingsForm(buildSettingsForm(session));
      setShopProfileForm(buildShopProfileForm(session));

      if (!session?.id) {
        setReviews(EMPTY_REVIEW_SNAPSHOT);
        setInquiryData(EMPTY_INQUIRY_SNAPSHOT);
        setLoading(false);
        return;
      }

      const [reviewSnapshot, inquiriesSnapshot] = await Promise.all([
        fetchVendorReviewSnapshot(session.id),
        fetchVendorInquiries({ limit: 200 }),
      ]);

      if (!active) return;
      setReviews(reviewSnapshot);
      setInquiryData(inquiriesSnapshot);
      setLoading(false);
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const refreshDashboardData = async () => {
    if (!vendor?.id || refreshing) return;

    setRefreshing(true);
    const [reviewSnapshot, inquiriesSnapshot] = await Promise.all([
      fetchVendorReviewSnapshot(vendor.id),
      fetchVendorInquiries({ limit: 200 }),
    ]);

    setReviews(reviewSnapshot);
    setInquiryData(inquiriesSnapshot);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logoutVendor();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const filteredInquiries = useMemo(() => {
    const query = inquirySearch.trim().toLowerCase();

    return inquiryData.inquiries.filter((inquiry) => {
      if (inquiryStatusFilter !== "All" && inquiry.status !== inquiryStatusFilter) {
        return false;
      }

      if (!query) return true;

      return [inquiry.subject, inquiry.name, inquiry.phone, inquiry.email || "", inquiry.message]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [inquiryData.inquiries, inquirySearch, inquiryStatusFilter]);

  const callLeads = useMemo(
    () => inquiryData.inquiries.filter((inquiry) => Boolean(String(inquiry.phone || "").trim() || inquiry.email)),
    [inquiryData.inquiries]
  );

  const stats = useMemo<StatCardItem[]>(() => {
    const reviewCount = Number.isFinite(Number(reviews.summary.reviews)) ? Number(reviews.summary.reviews) : 0;
    const enquiryCount = Number.isFinite(Number(inquiryData.summary.total)) ? Number(inquiryData.summary.total) : 0;
    const openEnquiries = Number.isFinite(Number(inquiryData.summary.open)) ? Number(inquiryData.summary.open) : 0;

    return [
      {
        label: "Enquiries",
        value: enquiryCount,
        trend: `Open ${openEnquiries}`,
        hint: "Live from vendor inquiries API",
        icon: MessageSquare,
        trendPositive: openEnquiries > 0,
      },
      {
        label: "Call Leads",
        value: callLeads.length,
        trend: callLeads.length > 0 ? `+${callLeads.length}` : "+0",
        hint: "From enquiry contacts",
        icon: PhoneCall,
        trendPositive: callLeads.length > 0,
      },
      {
        label: "Reviews",
        value: reviewCount,
        trend: `Avg ${formatRating(reviews.summary.rating)}`,
        hint: "Live from reviews API",
        icon: Star,
        trendPositive: reviewCount > 0,
      },
      {
        label: "Orders",
        value: 0,
        trend: "API pending",
        hint: "Awaiting backend endpoint",
        icon: ClipboardList,
        trendPositive: false,
      },
    ];
  }, [callLeads.length, inquiryData.summary.open, inquiryData.summary.total, reviews.summary.rating, reviews.summary.reviews]);

  const isOpen = useMemo(() => (vendor ? isBusinessOpenNow(vendor) : false), [vendor]);

  const leadSources = useMemo(() => {
    const total = inquiryData.inquiries.length;
    if (!total) {
      return [
        { label: "Web", value: 0 },
        { label: "Phone", value: 0 },
        { label: "Email", value: 0 },
        { label: "Closed Leads", value: 0 },
      ];
    }

    const web = inquiryData.inquiries.filter((inquiry) => inquiry.channel === "Web").length;
    const phone = inquiryData.inquiries.filter((inquiry) => inquiry.channel === "Phone").length;
    const email = inquiryData.inquiries.filter((inquiry) => inquiry.channel === "Email").length;
    const closed = inquiryData.inquiries.filter((inquiry) => inquiry.status === "Closed").length;

    return [
      { label: "Web", value: Math.round((web / total) * 100) },
      { label: "Phone", value: Math.round((phone / total) * 100) },
      { label: "Email", value: Math.round((email / total) * 100) },
      { label: "Closed Leads", value: Math.round((closed / total) * 100) },
    ];
  }, [inquiryData.inquiries]);

  const servicePerformance = useMemo(() => {
    const tags = Array.isArray(vendor?.serviceTags) ? vendor.serviceTags.slice(0, 4) : [];
    if (!tags.length) {
      return [
        { label: "Service data", value: 0 },
        { label: "Pending", value: 0 },
      ];
    }

    const base = reviews.summary.rating > 0 ? Math.round(reviews.summary.rating * 16) : 54;
    return tags.map((tag, index) => ({
      label: tag,
      value: Math.max(22, Math.min(96, base - index * 10)),
    }));
  }, [reviews.summary.rating, vendor?.serviceTags]);

  const sectionMeta = SECTION_META[activeNav];
  const greetingName = String(vendor?.name || vendor?.businessName || "Partner").trim() || "Partner";
  const businessName = String(vendor?.businessName || "Your Business").trim() || "Your Business";
  const location = [vendor?.city, vendor?.state].filter(Boolean).join(", ") || "Location not set";
  const sidebarAvatar = String(vendor?.image || DEFAULT_VENDOR_AVATAR).trim() || DEFAULT_VENDOR_AVATAR;

  const handleSettingsChange = (field: keyof SettingsFormState, value: string) => {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor || settingsSaving) return;

    setSettingsMessage(null);
    setSettingsError(null);
    setSettingsSaving(true);

    const serviceTags = settingsForm.serviceTagsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 100);

    try {
      const updatedVendor = await updateVendorProfile({
        name: settingsForm.name,
        email: settingsForm.email,
        phone: settingsForm.phone,
        alternatePhone: settingsForm.alternatePhone,
        businessEmail: settingsForm.businessEmail,
        businessPhone: settingsForm.businessPhone,
        businessAlternatePhone: settingsForm.businessAlternatePhone,
        sublocality: settingsForm.sublocality,
        state: settingsForm.state,
        shopOpeningTime: settingsForm.shopOpeningTime,
        shopClosingTime: settingsForm.shopClosingTime,
        serviceTags,
      });

      setVendor(updatedVendor);
      setSettingsForm(buildSettingsForm(updatedVendor));
      setShopProfileForm(buildShopProfileForm(updatedVendor));
      setSettingsMessage("Settings updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      setSettingsError(message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleShopProfileChange = (field: keyof ShopProfileFormState, value: string) => {
    setShopProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleShopProfileSingleUpload = async (field: "image" | "shopBannerImage", files: FileList | null) => {
    if (!files?.length) return;

    const file = files[0];
    setShopProfileMessage(null);
    setShopProfileError(null);

    if (!file.type.startsWith("image/")) {
      setShopProfileError("Please upload an image file only.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setShopProfileError("Image is too large. Please keep each upload under 2MB.");
      return;
    }

    try {
      const imageData = await fileToDataUrl(file);
      setShopProfileForm((current) => ({
        ...current,
        [field]: imageData,
      }));
      setShopProfileMessage(field === "image" ? "Shop DP selected." : "Shop banner selected.");
    } catch {
      setShopProfileError("Could not read image file. Please try again.");
    }
  };

  const handleShopProfileGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setShopProfileMessage(null);
    setShopProfileError(null);

    const selectedFiles = Array.from(files);
    const validImageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));

    if (!validImageFiles.length) {
      setShopProfileError("Please upload image files only.");
      return;
    }

    if (validImageFiles.some((file) => file.size > MAX_UPLOAD_SIZE_BYTES)) {
      setShopProfileError("One or more images exceed 2MB. Please use smaller files.");
      return;
    }

    const existingGallery = parseShopGalleryInput(shopProfileForm.shopGalleryText);
    const sanitizedExistingGallery = filterShopGalleryItems(
      existingGallery,
      shopProfileForm.image,
      shopProfileForm.shopBannerImage
    );
    const availableSlots = Math.max(0, MAX_SHOP_GALLERY_ITEMS - sanitizedExistingGallery.length);
    if (availableSlots === 0) {
      setShopProfileError(`Shop gallery supports up to ${MAX_SHOP_GALLERY_ITEMS} images.`);
      return;
    }

    try {
      const uploadedGallery = await Promise.all(validImageFiles.slice(0, availableSlots).map((file) => fileToDataUrl(file)));
      const mergedGallery = filterShopGalleryItems(
        [...sanitizedExistingGallery, ...uploadedGallery],
        shopProfileForm.image,
        shopProfileForm.shopBannerImage
      ).slice(0, MAX_SHOP_GALLERY_ITEMS);

      setShopProfileForm((current) => ({
        ...current,
        shopGalleryText: mergedGallery.join("\n"),
      }));
      setShopProfileMessage(`${uploadedGallery.length} shop photo${uploadedGallery.length === 1 ? "" : "s"} added.`);
    } catch {
      setShopProfileError("Could not process one or more photos. Please try again.");
    }
  };

  const handleShopProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor || shopProfileSaving) return;

    setShopProfileMessage(null);
    setShopProfileError(null);
    setShopProfileSaving(true);

    try {
      const updatedVendor = await updateVendorProfile({
        image: shopProfileForm.image,
        shopBannerImage: shopProfileForm.shopBannerImage,
        shopGallery: filterShopGalleryItems(
          parseShopGalleryInput(shopProfileForm.shopGalleryText),
          shopProfileForm.image,
          shopProfileForm.shopBannerImage
        ),
        businessAddress: shopProfileForm.businessAddress,
        website: shopProfileForm.website,
        businessDescription: shopProfileForm.businessDescription,
        instagramUrl: shopProfileForm.instagramUrl,
        facebookUrl: shopProfileForm.facebookUrl,
        youtubeUrl: shopProfileForm.youtubeUrl,
      });

      setVendor(updatedVendor);
      setShopProfileForm(buildShopProfileForm(updatedVendor));
      setSettingsForm(buildSettingsForm(updatedVendor));
      setShopProfileMessage("Shop profile updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update shop profile";
      setShopProfileError(message);
    } finally {
      setShopProfileSaving(false);
    }
  };

  const handlePostSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postTitle.trim() || !postMessage.trim()) {
      setPostNotice("Add title and message to save draft.");
      return;
    }
    setPostNotice("Draft saved locally. Backend publish endpoint is not available yet.");
  };

  const renderActiveSection = () => {
    if (!vendor) return null;

    if (activeNav === "Overview") {
      return (
        <OverviewSection
          businessName={businessName}
          location={location}
          isOpen={isOpen}
          stats={stats}
          leadSources={leadSources}
          servicePerformance={servicePerformance}
          recentInquiries={inquiryData.inquiries.slice(0, 4)}
          recentReviews={reviews.reviews.slice(0, 4)}
        />
      );
    }

    if (activeNav === "Enquiries") {
      return (
        <EnquiriesSection
          summary={inquiryData.summary}
          inquiries={filteredInquiries}
          statusFilter={inquiryStatusFilter}
          setStatusFilter={setInquiryStatusFilter}
          search={inquirySearch}
          setSearch={setInquirySearch}
        />
      );
    }

    if (activeNav === "Calls") {
      return <CallsSection callLeads={callLeads} />;
    }

    if (activeNav === "Reviews") {
      return <ReviewsSection reviews={reviews} />;
    }

    if (activeNav === "Orders") {
      return <OrdersSection />;
    }

    if (activeNav === "Posts") {
      return (
        <PostsSection
          title={postTitle}
          message={postMessage}
          ctaLabel={postCta}
          setTitle={setPostTitle}
          setMessage={setPostMessage}
          setCtaLabel={setPostCta}
          notice={postNotice}
          onPublish={handlePostSubmit}
        />
      );
    }

    if (activeNav === "Shop") {
      return (
        <ShopProfileSection
          form={shopProfileForm}
          businessName={businessName}
          onChange={handleShopProfileChange}
          onSubmit={handleShopProfileSubmit}
          onUploadSingle={handleShopProfileSingleUpload}
          onUploadGallery={handleShopProfileGalleryUpload}
          saving={shopProfileSaving}
          message={shopProfileMessage}
          error={shopProfileError}
        />
      );
    }

    return (
      <SettingsSection
        form={settingsForm}
        onChange={handleSettingsChange}
        onSubmit={handleSettingsSubmit}
        saving={settingsSaving}
        message={settingsMessage}
        error={settingsError}
      />
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!vendor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--vendor-canvas)] px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto h-9 w-9 text-[var(--vendor-primary)]" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-gray-900">Vendor session required</h1>
          <p className="mt-2 text-sm text-gray-600">
            Log in with a vendor account to view your dashboard. This panel relies on the existing Winkget backend session.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--vendor-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              Vendor Login
            </Link>
            <a
              href={VENDOR_REGISTRATION_URL}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Register as Vendor
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--vendor-canvas)] text-[var(--vendor-text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.17),transparent_54%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.16),transparent_56%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_320px]">
          <aside className="hidden h-[calc(100vh-3rem)] flex-col rounded-3xl border-r border-gray-200 bg-white/60 p-4 backdrop-blur-md lg:flex">
            <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  <img src={sidebarAvatar} alt={businessName} className="h-full w-full object-cover" loading="lazy" />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold text-gray-900">{businessName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{location}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveNav("Shop")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Edit Shop Profile
              </button>
            </div>

            <nav className="mt-5 space-y-1.5" aria-label="Sidebar navigation">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveNav(item.label)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-white hover:text-gray-900"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-2xl border border-white/60 bg-white/70 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-800">Account Status</p>
              <p className="mt-1">{vendor.vendorStatus === "approved" ? "Verified vendor" : "Pending verification"}</p>
            </div>
          </aside>

          <section className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
              <div>
                <p className="text-sm text-gray-600">Good to see you,</p>
                <h1 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">{greetingName}</h1>
                <p className="mt-1 text-sm text-gray-600">{sectionMeta.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveNav("Shop")}
                  className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"
                  aria-label="Open shop profile"
                >
                  <img src={sidebarAvatar} alt={businessName} className="h-full w-full object-cover" loading="lazy" />
                </button>
                <button
                  type="button"
                  onClick={refreshDashboardData}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                  {refreshing ? "Refreshing" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {loggingOut ? "Signing out" : "Logout"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  Alerts
                </button>
              </div>
            </header>

            <div>{renderActiveSection()}</div>
          </section>

          <aside className="hidden space-y-4 xl:block">
            <article className="rounded-2xl bg-white/60 p-5 backdrop-blur-md">
              <h3 className="font-display text-lg font-semibold text-gray-900">Quick Analytics</h3>
              <p className="mt-1 text-xs text-gray-500">Current backend-fed status summary.</p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/60 bg-white/70 p-3">
                  <p className="text-xs text-gray-500">Enquiries</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{inquiryData.summary.total}</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/70 p-3">
                  <p className="text-xs text-gray-500">Call Leads</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{callLeads.length}</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/70 p-3">
                  <p className="text-xs text-gray-500">Average rating</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatRating(reviews.summary.rating)} / 5</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/70 p-3">
                  <p className="text-xs text-gray-500">Section</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{sectionMeta.title}</p>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </div>

      <nav
        aria-label="Mobile quick actions"
        className="fixed inset-x-4 bottom-3 z-40 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-lg backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5 gap-1">
          {MOBILE_BAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;

            return (
              <li key={`mobile-${item.label}`}>
                <button
                  type="button"
                  onClick={() => setActiveNav(item.label)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                    isActive ? "bg-blue-100 text-blue-600" : "text-gray-600"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}