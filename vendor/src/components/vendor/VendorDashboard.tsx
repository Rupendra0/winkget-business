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
  Trash2,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import {
  createVendorProduct,
  deleteVendorProduct,
  fetchVendorCategories,
  fetchVendorCities,
  fetchVendorInquiries,
  fetchVendorOrders,
  fetchVendorProducts,
  fetchVendorReviewSnapshot,
  fetchVendorSession,
  logoutVendor,
  updateVendorProduct,
  updateVendorInquiryStatus,
  updateVendorOrderStatus,
  updateVendorProfile,
  updateVendorStoreStatus,
  type InquiryStatus,
  type VendorCatalogCategory,
  type VendorCity,
  type VendorInquiry,
  type VendorInquirySnapshot,
  type VendorOrderRecord,
  type VendorOrderSnapshot,
  type VendorOrderStatus,
  type VendorProductRecord,
  type VendorProfileUpdateInput,
  type VendorProductUpsertInput,
  type VendorReview,
  type VendorReviewSnapshot,
  type VendorSession,
} from "@/lib/vendorApi";
import VendorAddProductForm from "@/components/vendor/VendorAddProductForm";

type SidebarLabel = "Overview" | "Enquiries" | "Calls" | "Reviews" | "Orders" | "Posts" | "Shop" | "Products" | "Settings";

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
type NotificationFilter = "All" | "Unread" | "Read";

type SettingsFormState = {
  name: string;
  email: string;
  phone: string;
  businessEmail: string;
  businessPhone: string;
  city: string;
  sublocality: string;
  state: string;
  shopOpeningTime: string;
  shopClosingTime: string;
  serviceTagsText: string;
};

type VendorNotification = {
  id: string;
  nav: "Enquiries" | "Calls" | "Reviews" | "Orders";
  title: string;
  detail: string;
  createdAt: string;
};

type VendorBusinessStatus = {
  isOpen: boolean | null;
  source: "manual" | "schedule" | "unknown" | "vendor-status";
  mode: "auto" | "manual";
  manualStatus: "open" | "closed" | null;
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

type MyStoreMediaFormState = {
  image: string;
  bannerImage: string;
};

type VendorProductFormState = {
  categorySlug: string;
  subcategorySlug: string;
  productName: string;
  shortDescription: string;
  description: string;
  image: string;
  heroImage: string;
  subcategoryImage: string;
  galleryText: string;
  price: string;
  oldPrice: string;
  inventory: string;
  moq: string;
  badge: string;
  brand: string;
  sellerName: string;
  vendorSource: string;
  rating: string;
  reviews: string;
  deliveryByText: string;
  shippingLabel: string;
  shippingTimeline: string;
  isCancellable: boolean;
  isReturnable: boolean;
  highlightsText: string;
  keyAttributesText: string;
  specificationsText: string;
  tagsText: string;
  variantDataText: string;
  status: VendorProductRecord["status"];
  storePlacement: "none" | "featured" | "trending";
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Products", icon: ClipboardList },
  { label: "Calls", icon: PhoneCall },
  { label: "Orders", icon: ShoppingBag },
  { label: "Shop", icon: ImagePlus },
  { label: "Enquiries", icon: MessageSquare },
  { label: "Reviews", icon: Star },
  { label: "Posts", icon: Megaphone },
  { label: "Settings", icon: Settings },
];

const MOBILE_BAR_ITEMS: Array<{
  label: "Overview" | "Enquiries" | "Calls" | "Shop" | "Products" | "Settings";
  icon: SidebarItem["icon"];
}> = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Enquiries", icon: MessageSquare },
  { label: "Calls", icon: PhoneCall },
  { label: "Shop", icon: ImagePlus },
  { label: "Products", icon: ClipboardList },
  { label: "Settings", icon: Settings },
];

const SECTION_META: Record<SidebarLabel, { title: string; subtitle: string }> = {
  Overview: {
    title: "Overview",
    subtitle: "",
  },
  Enquiries: {
    title: "Enquiries",
    subtitle: "",
  },
  Calls: {
    title: "Calls",
    subtitle: "",
  },
  Reviews: {
    title: "Reviews",
    subtitle: "",
  },
  Orders: {
    title: "Orders",
    subtitle: "",
  },
  Posts: {
    title: "Posts",
    subtitle: "",
  },
  Shop: {
    title: "Shop Profile",
    subtitle: "",
  },
  Products: {
    title: "Products",
    subtitle: "",
  },
  Settings: {
    title: "Settings",
    subtitle: "",
  },
};

const getNavLabel = (label: SidebarLabel, isRestaurantVendor: boolean): string => {
  if (label === "Products" && isRestaurantVendor) {
    return "Menu";
  }

  return label;
};

const MAIN_WEBSITE_URL = process.env.NEXT_PUBLIC_MAIN_WEBSITE_URL || "http://localhost:3000";
const VENDOR_REGISTRATION_URL = `${MAIN_WEBSITE_URL.replace(/\/$/, "")}/vendor-register`;
const DEFAULT_VENDOR_AVATAR =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=400&q=60";
const DEFAULT_VENDOR_BANNER =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=60";
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const NOTIFICATION_READ_STORAGE_KEY_PREFIX = "winkget_vendor_notification_reads";
const NOTIFICATION_DISMISS_STORAGE_KEY_PREFIX = "winkget_vendor_notification_dismissed";
const MAX_NOTIFICATIONS_IN_POPUP = 20;
const MEDIA_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const VENDOR_PRODUCT_STATUSES: VendorProductRecord["status"][] = ["draft", "pending", "live", "rejected", "archived"];
const PRODUCT_VARIANT_LINE_HINT = "size|color|mrp|sellingPrice|stock|image";
const STORE_PLACEMENT_OPTIONS: Array<{ value: VendorProductFormState["storePlacement"]; label: string }> = [
  { value: "none", label: "None" },
  { value: "featured", label: "Featured Product" },
  { value: "trending", label: "Trending Product" },
];
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

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

const EMPTY_VENDOR_ORDER_SNAPSHOT: VendorOrderSnapshot = {
  summary: {
    total: 0,
    pending: 0,
    completed: 0,
    disputed: 0,
    revenue: 0,
  },
  orders: [],
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

function resolveBusinessStatus(vendor: VendorSession): VendorBusinessStatus {
  const mode = vendor.storeStatusMode === "manual" ? "manual" : "auto";
  const manualStatus =
    vendor.manualStoreStatus === "open" || vendor.manualStoreStatus === "closed"
      ? vendor.manualStoreStatus
      : null;

  if (vendor.vendorStatus !== "approved") {
    return {
      isOpen: false,
      source: "vendor-status",
      mode,
      manualStatus,
    };
  }

  if (typeof vendor.isStoreOpen === "boolean") {
    const source =
      vendor.storeStatusSource === "manual" ||
      vendor.storeStatusSource === "schedule" ||
      vendor.storeStatusSource === "unknown" ||
      vendor.storeStatusSource === "vendor-status"
        ? vendor.storeStatusSource
        : mode === "manual" && manualStatus
          ? "manual"
          : "schedule";

    return {
      isOpen: vendor.isStoreOpen,
      source,
      mode,
      manualStatus,
    };
  }

  if (mode === "manual" && manualStatus) {
    return {
      isOpen: manualStatus === "open",
      source: "manual",
      mode,
      manualStatus,
    };
  }

  const opening = parseTimeToMinutes(String(vendor.shopOpeningTime || ""));
  const closing = parseTimeToMinutes(String(vendor.shopClosingTime || ""));
  if (opening === null || closing === null) {
    return {
      isOpen: null,
      source: "unknown",
      mode,
      manualStatus,
    };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (opening === closing) {
    return {
      isOpen: true,
      source: "schedule",
      mode,
      manualStatus,
    };
  }

  if (opening < closing) {
    return {
      isOpen: nowMinutes >= opening && nowMinutes < closing,
      source: "schedule",
      mode,
      manualStatus,
    };
  }

  return {
    isOpen: nowMinutes >= opening || nowMinutes < closing,
    source: "schedule",
    mode,
    manualStatus,
  };
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

function isRestaurantVendorProfile(vendor: VendorSession | null): boolean {
  if (!vendor) {
    return false;
  }

  const categoryTokens = [
    String(vendor.businessCategory?.name || "").trim(),
    String(vendor.businessSubcategory?.name || "").trim(),
    ...(Array.isArray(vendor.serviceTags) ? vendor.serviceTags : []),
  ];

  return categoryTokens.some((token) =>
    /(restaurant|food|cafe|dining|kitchen|bakery|meal|snack|biryani|pizza|burger|coffee|tea)/i.test(
      String(token || "")
    )
  );
}

function buildInquirySummary(inquiries: VendorInquiry[]): VendorInquirySnapshot["summary"] {
  return inquiries.reduce(
    (accumulator, inquiry) => {
      accumulator.total += 1;
      if (inquiry.status === "Open") accumulator.open += 1;
      if (inquiry.status === "In Progress") accumulator.inProgress += 1;
      if (inquiry.status === "Closed") accumulator.closed += 1;
      return accumulator;
    },
    { total: 0, open: 0, inProgress: 0, closed: 0 }
  );
}

function buildVendorOrderSummary(orders: VendorOrderRecord[]): VendorOrderSnapshot["summary"] {
  return orders.reduce(
    (accumulator, order) => {
      accumulator.total += 1;
      accumulator.revenue += Math.max(0, Number(order.amount || 0));

      if (order.status === "Pending") accumulator.pending += 1;
      if (order.status === "Completed") accumulator.completed += 1;
      if (order.status === "Disputed") accumulator.disputed += 1;
      return accumulator;
    },
    {
      total: 0,
      pending: 0,
      completed: 0,
      disputed: 0,
      revenue: 0,
    }
  );
}

function buildSettingsForm(vendor: VendorSession | null): SettingsFormState {
  return {
    name: String(vendor?.name || ""),
    email: String(vendor?.email || ""),
    phone: String(vendor?.phone || ""),
    businessEmail: String(vendor?.businessEmail || ""),
    businessPhone: String(vendor?.businessPhone || ""),
    city: String(vendor?.city || ""),
    sublocality: String(vendor?.sublocality || ""),
    state: String(vendor?.state || ""),
    shopOpeningTime: String(vendor?.shopOpeningTime || ""),
    shopClosingTime: String(vendor?.shopClosingTime || ""),
    serviceTagsText: Array.isArray(vendor?.serviceTags) ? vendor.serviceTags.join(", ") : "",
  };
}

function buildShopProfileForm(vendor: VendorSession | null): ShopProfileFormState {
  const cleanedGallery = Array.isArray(vendor?.shopGallery)
    ? vendor.shopGallery
        .map((item) => String(item || "").trim())
        .filter((item) => MEDIA_URL_REGEX.test(item) || IMAGE_DATA_URL_REGEX.test(item))
    : [];

  return {
    image: String(vendor?.image || "").trim(),
    shopBannerImage: String(vendor?.shopBannerImage || "").trim(),
    shopGalleryText: cleanedGallery.join("\n"),
    businessAddress: String(vendor?.businessAddress || "").trim(),
    website: String(vendor?.website || "").trim(),
    businessDescription: String(vendor?.businessDescription || "").trim(),
    instagramUrl: String(vendor?.instagramUrl || "").trim(),
    facebookUrl: String(vendor?.facebookUrl || "").trim(),
    youtubeUrl: String(vendor?.youtubeUrl || "").trim(),
  };
}

function buildMyStoreMediaForm(vendor: VendorSession | null): MyStoreMediaFormState {
  return {
    image: String(vendor?.myStoreImage || "").trim(),
    bannerImage: String(vendor?.myStoreBannerImage || "").trim(),
  };
}

function parseShopGalleryInput(value: string): string[] {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const byLine = raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const expanded = byLine.flatMap((item) => {
    // Keep data URLs intact. They always contain a comma after the mime prefix.
    if (IMAGE_DATA_URL_REGEX.test(item)) {
      return [item];
    }

    return item
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  });

  return Array.from(
    new Set(
      expanded.filter((item) => MEDIA_URL_REGEX.test(item) || IMAGE_DATA_URL_REGEX.test(item))
    )
  );
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
    <main className="relative min-h-screen overflow-x-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-white" />
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

function ShopStoreSwitch({
  active,
  onChange,
}: {
  active: "Shop" | "MyStore";
  onChange: (value: "Shop" | "MyStore") => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("Shop")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          active === "Shop" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        Shop
      </button>
      <button
        type="button"
        onClick={() => onChange("MyStore")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          active === "MyStore" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        MyStore
      </button>
    </div>
  );
}

function MyStorePreviewSection({
  businessName,
  profileImage,
  bannerImage,
  address,
  description,
  savingField,
  message,
  error,
  onUpload,
  onRemove,
}: {
  businessName: string;
  profileImage: string;
  bannerImage: string;
  address: string;
  description: string;
  savingField: "image" | "banner" | null;
  message: string | null;
  error: string | null;
  onUpload: (field: "image" | "banner", files: FileList | null) => void;
  onRemove: (field: "image" | "banner") => void;
}) {
  const displayBanner = String(bannerImage || "").trim() || DEFAULT_VENDOR_BANNER;
  const displayAvatar = String(profileImage || "").trim() || DEFAULT_VENDOR_AVATAR;
  const hasCustomProfileImage = Boolean(String(profileImage || "").trim());
  const hasCustomBannerImage = Boolean(String(bannerImage || "").trim());

  return (
    <section className="space-y-4">
      <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="relative h-44 sm:h-52 lg:h-60">
          <img src={displayBanner} alt={`${businessName} banner`} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-gray-900/25 to-transparent" />

          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <div className="h-[96px] w-[96px] overflow-hidden rounded-full border-2 border-white bg-white shadow sm:h-[104px] sm:w-[104px] lg:h-[116px] lg:w-[116px]">
              <img src={displayAvatar} alt={`${businessName} dp`} className="h-full w-full object-cover" loading="lazy" />
            </div>

            <div className="text-white">
              <p className="text-lg font-semibold leading-tight">{businessName}</p>
              <p className="text-xs text-white/90">{address || "Address not updated yet"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
              <p className="text-[11px] font-semibold text-gray-600">MyStore DP</p>
              <div className="mt-2 h-[116px] w-[116px] overflow-hidden rounded-full border-2 border-white bg-white shadow-sm lg:h-[126px] lg:w-[126px]">
                <img src={displayAvatar} alt="MyStore DP preview" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 ${
                    savingField === "image" ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      onUpload("image", event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onRemove("image")}
                  disabled={savingField === "image" || !hasCustomProfileImage}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {savingField === "image" ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
              <p className="text-[11px] font-semibold text-gray-600">MyStore Banner</p>
              <div className="mt-2 h-44 overflow-hidden rounded-xl bg-gray-100 sm:h-52 lg:h-60">
                <img src={displayBanner} alt="MyStore banner preview" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 ${
                    savingField === "banner" ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      onUpload("banner", event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onRemove("banner")}
                  disabled={savingField === "banner" || !hasCustomBannerImage}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {savingField === "banner" ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>

          {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
          {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
        </div>
      </article>
    </section>
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

const OVERVIEW_STAT_CARD_STYLES: Record<
  StatCardItem["label"],
  {
    card: string;
    icon: string;
    chip: string;
  }
> = {
  Enquiries: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-100 shadow-sm",
    icon: "bg-blue-600 text-white shadow-sm shadow-blue-200",
    chip: "bg-blue-600/90 text-white",
  },
  "Call Leads": {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100 shadow-sm",
    icon: "bg-emerald-600 text-white shadow-sm shadow-emerald-200",
    chip: "bg-emerald-600/90 text-white",
  },
  Reviews: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 shadow-sm",
    icon: "bg-amber-500 text-white shadow-sm shadow-amber-200",
    chip: "bg-amber-500/90 text-white",
  },
  Orders: {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 shadow-sm",
    icon: "bg-violet-600 text-white shadow-sm shadow-violet-200",
    chip: "bg-violet-600/90 text-white",
  },
};

function DashboardSummaryCards({
  stats,
  onStatClick,
}: {
  stats: StatCardItem[];
  onStatClick: (label: StatCardItem["label"]) => void;
}) {
  return (
    <section className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;
        const cardStyle = OVERVIEW_STAT_CARD_STYLES[item.label];
        const mobileLabel =
          item.label === "Enquiries"
            ? "Enq"
            : item.label === "Call Leads"
              ? "Calls"
              : item.label;

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onStatClick(item.label)}
            className={`group rounded-2xl border p-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${cardStyle.card}`}
          >
            <div className="flex items-center justify-between sm:items-start">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${cardStyle.icon}`}>
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
              </span>
              <span
                className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex ${
                  item.trendPositive ? cardStyle.chip : "bg-white/85 text-gray-600 ring-1 ring-gray-200"
                }`}
              >
                {item.trend}
              </span>
            </div>
            <p className="mt-2 text-[9px] font-semibold uppercase text-gray-700 sm:hidden">{mobileLabel}</p>
            <p className="mt-4 hidden text-xs font-semibold uppercase tracking-wide text-gray-600 sm:block">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-gray-900 sm:mt-1 sm:text-3xl">{item.value}</p>
            <p className="mt-1 hidden text-xs text-gray-600 sm:block">{item.hint}</p>
          </button>
        );
      })}
    </section>
  );
}

function OverviewSection({
  leadSources,
  servicePerformance,
  recentInquiries,
  recentReviews,
}: {
  leadSources: Array<{ label: string; value: number }>;
  servicePerformance: Array<{ label: string; value: number }>;
  recentInquiries: VendorInquiry[];
  recentReviews: VendorReview[];
}) {
  return (
    <section className="space-y-6">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-gray-900">Lead Sources</h3>
            <BarChart3 className="h-[18px] w-[18px] text-blue-600" aria-hidden="true" />
          </div>
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
  statusDraftById,
  onStatusDraftChange,
  onStatusSave,
  updatingInquiryId,
  actionMessage,
  actionError,
}: {
  summary: VendorInquirySnapshot["summary"];
  inquiries: VendorInquiry[];
  statusFilter: InquiryStatusFilter;
  setStatusFilter: (value: InquiryStatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  statusDraftById: Record<string, InquiryStatus>;
  onStatusDraftChange: (inquiryId: string, value: InquiryStatus) => void;
  onStatusSave: (inquiryId: string) => void;
  updatingInquiryId: string | null;
  actionMessage: string | null;
  actionError: string | null;
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
          {actionMessage ? <p className="text-xs font-medium text-emerald-700">{actionMessage}</p> : null}
          {actionError ? <p className="text-xs font-medium text-red-700">{actionError}</p> : null}

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

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Update status
                    <select
                      value={statusDraftById[inquiry.id] || inquiry.status}
                      onChange={(event) =>
                        onStatusDraftChange(inquiry.id, event.target.value as InquiryStatus)
                      }
                      className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => onStatusSave(inquiry.id)}
                    disabled={updatingInquiryId === inquiry.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    {updatingInquiryId === inquiry.id ? "Saving..." : "Save"}
                  </button>
                </div>
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
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm text-gray-600">
          Calls from users :
        </h3>
      </article>

      {callLeads.length === 0 ? (
        <EmptyState
          title="No call leads yet"
          body="New call requests from users will appear here."
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

function OrdersSection({
  summary,
  orders,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  statusDraftById,
  onStatusDraftChange,
  onStatusSave,
  updatingOrderId,
  actionMessage,
  actionError,
  loading,
  error,
}: {
  summary: VendorOrderSnapshot["summary"];
  orders: VendorOrderRecord[];
  statusFilter: "All" | VendorOrderStatus;
  setStatusFilter: (value: "All" | VendorOrderStatus) => void;
  search: string;
  setSearch: (value: string) => void;
  statusDraftById: Record<string, VendorOrderStatus>;
  onStatusDraftChange: (orderId: string, status: VendorOrderStatus) => void;
  onStatusSave: (orderId: string) => void;
  updatingOrderId: string | null;
  actionMessage: string | null;
  actionError: string | null;
  loading: boolean;
  error: string | null;
}) {
  const formatCurrency = (value: number) => `Rs ${Math.max(0, Math.round(value || 0)).toLocaleString("en-IN")}`;
  const statusOptions: VendorOrderStatus[] = ["Pending", "Completed", "Disputed"];

  const toStatusBadgeClass = (status: VendorOrderStatus) => {
    if (status === "Completed") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "Disputed") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <article className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-1 text-xl font-semibold text-amber-800">{summary.pending}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-700">Completed</p>
          <p className="mt-1 text-xl font-semibold text-emerald-800">{summary.completed}</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-rose-700">Disputed</p>
          <p className="mt-1 text-xl font-semibold text-rose-800">{summary.disputed}</p>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] uppercase tracking-wide text-blue-700">Revenue</p>
          <p className="mt-1 text-xl font-semibold text-blue-800">{formatCurrency(summary.revenue)}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Pending", "Completed", "Disputed"] as Array<"All" | VendorOrderStatus>).map((status) => (
            <button
              key={`order-filter-${status}`}
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
            placeholder="Search order no, customer or item"
            className="ml-auto w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 sm:w-80"
          />
        </div>

        {actionMessage ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

        {actionError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}

          {loading ? (
            <p className="text-sm text-gray-600">Loading orders...</p>
          ) : orders.length === 0 ? (
            <EmptyState
              title="No order records available"
              body="New customer orders will appear here automatically."
            />
          ) : (
            orders.map((order) => {
              const leadItem = order.items[0] || null;
              const statusDraft = statusDraftById[order.id] || order.status;
              const hasStatusChange = statusDraft !== order.status;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[#dbe7ff] bg-white p-4 shadow-[0_10px_22px_rgba(30,64,175,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="mt-0.5 text-l font-bold text-slate-900">{order.customer}</p>
                      <p className="text-xs font-semibold tracking-wide text-slate-700">{order.orderNo}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{formatDateTime(order.createdAt)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-extrabold text-blue-800">{formatCurrency(order.amount)}</p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${toStatusBadgeClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-blue-100 bg-[#f4f8ff] p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-blue-200 bg-white">
                        {leadItem?.image ? (
                          <img src={leadItem.image} alt={leadItem.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-blue-50 text-xs font-bold text-blue-700">
                            {leadItem?.name?.slice(0, 1).toUpperCase() || "P"}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{leadItem?.name || "Order Items"}</p>
                      </div>
                    </div>

                    {order.items.length > 1 ? (
                      <div className="mt-2 border-t border-blue-100 pt-2 space-y-1">
                        {order.items.slice(1, 4).map((item) => (
                          <p key={`${order.id}-${item.id}-${item.name}`} className="text-xs font-medium text-slate-700">
                            {item.name} x {item.quantity}
                          </p>
                        ))}
                        {order.items.length > 4 ? (
                          <p className="text-xs font-medium text-slate-500">+{order.items.length - 4} more items</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Items: {order.itemCount}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Payment: {order.paymentMethod}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      Payment Status: {order.paymentStatus}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Update Status</span>
                    <select
                      value={statusDraft}
                      onChange={(event) => onStatusDraftChange(order.id, event.target.value as VendorOrderStatus)}
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                    >
                      {statusOptions.map((status) => (
                        <option key={`order-status-${order.id}-${status}`} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => onStatusSave(order.id)}
                      disabled={!hasStatusChange || updatingOrderId === order.id}
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingOrderId === order.id ? "Updating..." : hasStatusChange ? "Save" : "Saved"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </article>
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
  onRemoveImage,
  onRemoveGalleryItem,
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
  onRemoveImage: (field: "image" | "shopBannerImage") => void;
  onRemoveGalleryItem: (value: string) => void;
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
      <article className="rounded-2xl bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live Shop Preview</p>

        <div className="mt-3 overflow-hidden rounded-2xl bg-gray-50">
          <div className="vendor-shop-preview-banner relative w-full overflow-hidden bg-gray-100">
            <img src={bannerImage} alt="Shop banner" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-black/5" />
            <div className="absolute inset-x-3 bottom-3 flex items-end gap-3">
              <div className="vendor-shop-preview-avatar overflow-hidden rounded-full bg-white">
                <img src={avatarImage} alt={businessName} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1 pb-1 text-white">
                <p className="truncate text-sm font-semibold">{businessName}</p>
                <p className="truncate text-xs text-white/90">{form.businessAddress || "Address not set"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {form.instagramUrl ? (
            <a
              href={form.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 font-semibold text-pink-700"
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
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700"
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
              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700"
            >
              <Youtube className="h-3.5 w-3.5" aria-hidden="true" />
              YouTube
            </a>
          ) : null}
        </div>
      </article>

      <form onSubmit={onSubmit} className="space-y-4">
        <article className="rounded-2xl bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-gray-900">Shop Profile</h3>
          

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-600">Shop Display Photo</p>
              <div className="mt-2 h-[116px] w-[116px] overflow-hidden rounded-full border-2 border-white bg-white shadow-sm lg:h-[126px] lg:w-[126px]">
                <img src={avatarImage} alt="Shop display" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <button
                type="button"
                onClick={() => onRemoveImage("image")}
                className="mt-2 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Remove DP
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-600">Shop Banner</p>
              <div className="mt-2 h-44 overflow-hidden rounded-xl bg-white sm:h-52 lg:h-60">
                <img src={bannerImage} alt="Shop banner" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <button
                type="button"
                onClick={() => onRemoveImage("shopBannerImage")}
                className="mt-2 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Remove Banner
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
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

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
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

          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
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

          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600">Shop Photos</p>

            {galleryItems.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">No photos uploaded yet.</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {galleryItems.map((url) => (
                  <div key={url} className="relative overflow-hidden rounded-xl bg-white">
                    <img src={url} alt="Shop gallery" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => onRemoveGalleryItem(url)}
                      className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Address</span>
              <input
                type="text"
                value={form.businessAddress}
                onChange={(event) => onChange("businessAddress", event.target.value)}
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Website URL</span>
              <input
                type="url"
                value={form.website}
                onChange={(event) => onChange("website", event.target.value)}
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://..."
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Shop Description</span>
              <textarea
                value={form.businessDescription}
                onChange={(event) => onChange("businessDescription", event.target.value)}
                className="min-h-[100px] w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">Premium feature</p>
            <p className="mt-1">Social media links are locked. Upgrade to Premium to unlock editing.</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
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
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
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
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
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
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
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

function VendorProductsSection({
  form,
  sellerName,
  isRestaurantVendor,
  vendorCategoryId,
  vendorCategoryName,
  vendorSubcategoryId,
  vendorSubcategoryName,
  categories,
  products,
  editingProduct,
  productsLoading,
  productsError,
  actionMessage,
  actionError,
  saving,
  editingProductId,
  deletingProductId,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onFormChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
  onRefresh,
  onQuickUpsert,
}: {
  form: VendorProductFormState;
  sellerName: string;
  isRestaurantVendor: boolean;
  vendorCategoryId?: string;
  vendorCategoryName?: string;
  vendorSubcategoryId?: string;
  vendorSubcategoryName?: string;
  categories: VendorCatalogCategory[];
  products: VendorProductRecord[];
  editingProduct: VendorProductRecord | null;
  productsLoading: boolean;
  productsError: string | null;
  actionMessage: string | null;
  actionError: string | null;
  saving: boolean;
  editingProductId: string | null;
  deletingProductId: string | null;
  search: string;
  statusFilter: VendorProductRecord["status"] | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: VendorProductRecord["status"] | "all") => void;
  onFormChange: (field: keyof VendorProductFormState, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (product: VendorProductRecord) => void;
  onCancelEdit: () => void;
  onDelete: (productId: string) => void;
  onRefresh: () => void;
  onQuickUpsert: (payload: VendorProductUpsertInput, productId?: string | null) => Promise<void>;
}) {
  const [showProductForm, setShowProductForm] = useState(false);
  const isProductFormVisible = showProductForm || Boolean(editingProductId);
  const productEntityLabel = isRestaurantVendor ? "Menu" : "Products";
  const addActionLabel = isRestaurantVendor ? "Add Menu Item" : "Add Product";

  const lockedCategory = useMemo(() => {
    if (!isRestaurantVendor || !Array.isArray(categories) || categories.length === 0) {
      return null;
    }

    const normalizedCategoryId = String(vendorCategoryId || "").trim();
    const normalizedCategoryName = String(vendorCategoryName || "").trim().toLowerCase();
    const normalizedSubcategoryId = String(vendorSubcategoryId || "").trim();
    const normalizedSubcategoryName = String(vendorSubcategoryName || "").trim().toLowerCase();

    const categoryById = normalizedCategoryId
      ? categories.find((category) => String(category.id || "").trim() === normalizedCategoryId)
      : null;
    const categoryByName = !categoryById && normalizedCategoryName
      ? categories.find((category) => String(category.name || "").trim().toLowerCase() === normalizedCategoryName)
      : null;
    const resolvedCategory = categoryById || categoryByName || null;

    if (!resolvedCategory) {
      return null;
    }

    const queue = [...(resolvedCategory.subcategories || [])];
    let resolvedSubcategory: VendorCatalogCategory["subcategories"][number] | null = null;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const matchesById = normalizedSubcategoryId
        ? String(current.id || "").trim() === normalizedSubcategoryId
        : false;
      const matchesByName = !matchesById && normalizedSubcategoryName
        ? String(current.name || "").trim().toLowerCase() === normalizedSubcategoryName
        : false;

      if (matchesById || matchesByName) {
        resolvedSubcategory = current;
        break;
      }

      if (Array.isArray(current.childSubcategories) && current.childSubcategories.length > 0) {
        queue.push(...current.childSubcategories);
      }
    }

    return {
      categorySlug: String(resolvedCategory.slug || "").trim(),
      categoryLabel: String(resolvedCategory.name || "").trim(),
      subcategorySlug: String(resolvedSubcategory?.slug || "").trim(),
      subcategoryLabel: String(resolvedSubcategory?.name || "").trim(),
    };
  }, [categories, isRestaurantVendor, vendorCategoryId, vendorCategoryName, vendorSubcategoryId, vendorSubcategoryName]);

  const handleOpenCreateForm = () => {
    onCancelEdit();
    setShowProductForm(true);
  };

  const handleCloseProductForm = () => {
    onCancelEdit();
    setShowProductForm(false);
  };

  const selectedCategory = categories.find((category) => category.slug === form.categorySlug) || null;
  const subcategories = selectedCategory ? selectedCategory.subcategories : [];

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-gray-900">{`My ${productEntityLabel}`}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isProductFormVisible ? handleCloseProductForm : handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              {isProductFormVisible ? `Close ${addActionLabel}` : addActionLabel}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reload
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={isRestaurantVendor ? "Search menu items" : "Search products"}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 sm:w-72"
          />

          {(["all", ...VENDOR_PRODUCT_STATUSES] as Array<VendorProductRecord["status"] | "all">).map((status) => (
            <button
              key={`status-filter-${status}`}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-blue-100 text-blue-700"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {productsLoading ? (
            <p className="text-sm text-gray-600">Loading products...</p>
          ) : productsError ? (
            <p className="text-sm text-red-700">{productsError}</p>
          ) : products.length === 0 ? (
            <EmptyState
              title={isRestaurantVendor ? "No menu items found" : "No products found"}
              body={isRestaurantVendor ? "Click Add Menu Item to create your first dish." : "Click Add Product to create your first item."}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => {
                const thumbnail = product.image || product.heroImage || product.subcategoryImage || product.gallery?.[0] || "";
                const price = Number(product.price || 0);
                const mrp = Number(product.oldPrice || 0);
                const hasDiscount = Number.isFinite(price) && Number.isFinite(mrp) && mrp > 0 && price > 0 && mrp > price;
                const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

                return (
                  <div
                    key={product.id}
                    className="group overflow-hidden rounded-xl border border-[#dbe1ea] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(30,64,175,0.12)]"
                  >
                    <div className="relative h-28 border-b border-[#e6ebf2] bg-[linear-gradient(160deg,#f8fbff,#eef4ff)] p-2.5">
                      {thumbnail ? (
                        <img src={thumbnail} alt={product.productName} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-[#cbd5e1] text-xs text-gray-400">
                          No image
                        </div>
                      )}

                      <div className="absolute right-2.5 top-2.5 flex flex-wrap items-center justify-end gap-1">
                        {product.storePlacement ? (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {product.storePlacement}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                          {product.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xl font-semibold leading-tight text-gray-900">{product.productName}</p>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-end gap-2">
                        <p className="text-2xl font-bold leading-none text-blue-700">₹{Math.max(0, price).toLocaleString("en-IN")}</p>
                        {hasDiscount ? <p className="text-xs text-gray-400 line-through">₹{mrp.toLocaleString("en-IN")}</p> : null}
                        {hasDiscount ? <span className="text-xs font-semibold text-emerald-600">{discountPercent}% off</span> : null}
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                        <p className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700">
                          Stock: <span className="font-semibold">{product.inventory}</span>
                        </p>
                        <p className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700">
                          MOQ: <span className="font-semibold">{product.moq}</span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(product);
                            setShowProductForm(true);
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(product.id)}
                          disabled={deletingProductId === product.id}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                          {deletingProductId === product.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>

      {isProductFormVisible ? (
        <section
          className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-gray-900/40 p-0"
          aria-label="Product form popup"
        >
          <button
            type="button"
            onClick={handleCloseProductForm}
            className="absolute inset-0"
            aria-label="Close product form popup"
          />

          {false ? (
          <form
            onSubmit={onSubmit}
            className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl"
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-3 border-b border-gray-100 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-gray-900">{editingProductId ? "Edit Product" : "Add Product"}</h3>
                </div>

                <button
                  type="button"
                  onClick={handleCloseProductForm}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  {editingProductId ? "Cancel Edit" : "Close"}
                </button>
              </div>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Category</span>
            <select
              value={form.categorySlug}
              onChange={(event) => onFormChange("categorySlug", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Subcategory</span>
            <select
              value={form.subcategorySlug}
              onChange={(event) => onFormChange("subcategorySlug", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              disabled={!selectedCategory}
            >
              <option value="">Select subcategory</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Status</span>
            <select
              value={form.status}
              onChange={(event) => onFormChange("status", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {VENDOR_PRODUCT_STATUSES.map((status) => (
                <option key={`form-status-${status}`} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">MyStore Placement (optional)</span>
            <select
              value={form.storePlacement}
              onChange={(event) => onFormChange("storePlacement", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {STORE_PLACEMENT_OPTIONS.map((option) => (
                <option key={`placement-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Product Name</span>
            <input
              type="text"
              value={form.productName}
              onChange={(event) => onFormChange("productName", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Vitamin C Face Wash"
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Short Description</span>
            <input
              type="text"
              value={form.shortDescription}
              onChange={(event) => onFormChange("shortDescription", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Quick one-line summary"
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onFormChange("description", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Detailed product description"
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Primary Image URL</span>
            <input
              type="url"
              value={form.image}
              onChange={(event) => onFormChange("image", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => onFormChange("price", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Old Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.oldPrice}
              onChange={(event) => onFormChange("oldPrice", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Inventory</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.inventory}
              onChange={(event) => onFormChange("inventory", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">MOQ</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.moq}
              onChange={(event) => onFormChange("moq", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Brand</span>
            <input
              type="text"
              value={form.brand}
              onChange={(event) => onFormChange("brand", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Seller Name</span>
            <input
              type="text"
              value={form.sellerName}
              onChange={(event) => onFormChange("sellerName", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Badge</span>
            <input
              type="text"
              value={form.badge}
              onChange={(event) => onFormChange("badge", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Delivery By</span>
            <input
              type="text"
              value={form.deliveryByText}
              onChange={(event) => onFormChange("deliveryByText", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Mon, 18 March"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Shipping Label</span>
            <input
              type="text"
              value={form.shippingLabel}
              onChange={(event) => onFormChange("shippingLabel", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Shipping Timeline</span>
            <input
              type="text"
              value={form.shippingTimeline}
              onChange={(event) => onFormChange("shippingTimeline", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Hero Image URL</span>
            <input
              type="url"
              value={form.heroImage}
              onChange={(event) => onFormChange("heroImage", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Subcategory Image URL</span>
            <input
              type="url"
              value={form.subcategoryImage}
              onChange={(event) => onFormChange("subcategoryImage", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Rating (0-5)</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(event) => onFormChange("rating", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Review Count</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.reviews}
              onChange={(event) => onFormChange("reviews", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Gallery URLs (one per line)</span>
            <textarea
              value={form.galleryText}
              onChange={(event) => onFormChange("galleryText", event.target.value)}
              className="min-h-[80px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Highlights (one per line)</span>
            <textarea
              value={form.highlightsText}
              onChange={(event) => onFormChange("highlightsText", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Cruelty free"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Key Attributes (Label: Value)</span>
            <textarea
              value={form.keyAttributesText}
              onChange={(event) => onFormChange("keyAttributesText", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Skin Type: All"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Specifications (Label: Value)</span>
            <textarea
              value={form.specificationsText}
              onChange={(event) => onFormChange("specificationsText", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Weight: 100ml"
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Variant Data (one per line)</span>
            <textarea
              value={form.variantDataText}
              onChange={(event) => onFormChange("variantDataText", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder={PRODUCT_VARIANT_LINE_HINT}
            />
          </label>

          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Tags (comma separated)</span>
            <input
              type="text"
              value={form.tagsText}
              onChange={(event) => onFormChange("tagsText", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="skincare, facewash"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={form.isCancellable}
              onChange={(event) => onFormChange("isCancellable", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Cancellable
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={form.isReturnable}
              onChange={(event) => onFormChange("isReturnable", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Returnable
          </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--vendor-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving..." : editingProductId ? "Update Product" : "Add Product"}
            </button>

            {actionMessage ? <p className="text-xs font-medium text-emerald-700">{actionMessage}</p> : null}
            {actionError ? <p className="text-xs font-medium text-red-700">{actionError}</p> : null}
          </div>
          </form>
          ) : (
            <VendorAddProductForm
              key={editingProduct?.id ? `edit-${editingProduct.id}` : "create-product"}
              mode={editingProduct ? "edit" : "create"}
              initialProduct={editingProduct}
              categories={categories}
              lockedCategory={lockedCategory}
              sellerName={sellerName}
              compactMode={isRestaurantVendor}
              saving={saving}
              actionMessage={actionMessage}
              actionError={actionError}
              onSubmitProduct={(payload) => onQuickUpsert(payload, editingProduct?.id || null)}
              onClose={handleCloseProductForm}
            />
          )}
        </section>
      ) : null}
    </section>
  );
}

function SettingsSection({
  form,
  cities,
  states,
  onChange,
  onCityChange,
  onSubmit,
  saving,
  message,
  error,
  cityLoadError,
}: {
  form: SettingsFormState;
  cities: VendorCity[];
  states: string[];
  onChange: (field: keyof SettingsFormState, value: string) => void;
  onCityChange: (city: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  message: string | null;
  error: string | null;
  cityLoadError: string | null;
}) {
  const selectedCity = cities.find((cityOption) => cityOption.name === form.city) || null;
  const cityLocalities = selectedCity ? selectedCity.localities : [];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-gray-900">Profile Settings</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Owner Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Personal Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Personal Phone</span>
            <input
              type="text"
              value={form.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Business Email</span>
            <input
              type="email"
              value={form.businessEmail}
              onChange={(event) => onChange("businessEmail", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Business Phone</span>
            <input
              type="text"
              value={form.businessPhone}
              onChange={(event) => onChange("businessPhone", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">City</span>
            <select
              value={form.city}
              onChange={(event) => onCityChange(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              disabled={cities.length === 0}
            >
              <option value="">Select city</option>
              {cities.length === 0 ? <option value="">No cities available</option> : null}
              {form.city && !cities.some((cityOption) => cityOption.name === form.city) ? (
                <option value={form.city}>{form.city}</option>
              ) : null}
              {cities.map((cityOption) => (
                <option key={cityOption.id} value={cityOption.name}>
                  {cityOption.name}
                </option>
              ))}
            </select>
            {cityLoadError ? <p className="mt-1 text-[11px] text-red-600">{cityLoadError}</p> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Sublocality</span>
            <select
              value={form.sublocality}
              onChange={(event) => onChange("sublocality", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              disabled={cityLocalities.length === 0}
            >
              <option value="">Select sublocality</option>
              {cityLocalities.length === 0 ? <option value="">No localities available</option> : null}
              {form.sublocality && !cityLocalities.some((locality) => locality.name === form.sublocality) ? (
                <option value={form.sublocality}>{form.sublocality}</option>
              ) : null}
              {cityLocalities.map((locality) => (
                <option key={locality.id} value={locality.name}>
                  {locality.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">State</span>
            <select
              value={form.state}
              onChange={(event) => onChange("state", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select state</option>
              {form.state && !states.includes(form.state) ? <option value={form.state}>{form.state}</option> : null}
              {states.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Opening Time (HH:MM)</span>
            <input
              type="text"
              value={form.shopOpeningTime}
              onChange={(event) => onChange("shopOpeningTime", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Closing Time (HH:MM)</span>
            <input
              type="text"
              value={form.shopClosingTime}
              onChange={(event) => onChange("shopClosingTime", event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
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
  const [vendorOrderData, setVendorOrderData] = useState<VendorOrderSnapshot>(EMPTY_VENDOR_ORDER_SNAPSHOT);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(false);
  const [vendorOrdersError, setVendorOrdersError] = useState<string | null>(null);
  const [vendorOrderStatusFilter, setVendorOrderStatusFilter] = useState<"All" | VendorOrderStatus>("All");
  const [vendorOrderSearch, setVendorOrderSearch] = useState("");
  const [vendorOrderStatusDraftById, setVendorOrderStatusDraftById] = useState<Record<string, VendorOrderStatus>>({});
  const [updatingVendorOrderId, setUpdatingVendorOrderId] = useState<string | null>(null);
  const [vendorOrderActionMessage, setVendorOrderActionMessage] = useState<string | null>(null);
  const [vendorOrderActionError, setVendorOrderActionError] = useState<string | null>(null);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<InquiryStatusFilter>("All");
  const [inquirySearch, setInquirySearch] = useState("");
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() => buildSettingsForm(null));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [shopProfileForm, setShopProfileForm] = useState<ShopProfileFormState>(() => buildShopProfileForm(null));
  const [myStoreMediaForm, setMyStoreMediaForm] = useState<MyStoreMediaFormState>(() => buildMyStoreMediaForm(null));
  const [myStoreMediaSavingField, setMyStoreMediaSavingField] = useState<"image" | "banner" | null>(null);
  const [myStoreMediaMessage, setMyStoreMediaMessage] = useState<string | null>(null);
  const [myStoreMediaError, setMyStoreMediaError] = useState<string | null>(null);
  const [shopProfileSaving, setShopProfileSaving] = useState(false);
  const [shopProfileMessage, setShopProfileMessage] = useState<string | null>(null);
  const [shopProfileError, setShopProfileError] = useState<string | null>(null);
  const [storeStatusSaving, setStoreStatusSaving] = useState(false);
  const [storeStatusMessage, setStoreStatusMessage] = useState<string | null>(null);
  const [storeStatusError, setStoreStatusError] = useState<string | null>(null);
  const [shopTabMode, setShopTabMode] = useState<"Shop" | "MyStore">("Shop");
  const [cityOptions, setCityOptions] = useState<VendorCity[]>([]);
  const [cityOptionsError, setCityOptionsError] = useState<string | null>(null);
  const [inquiryStatusDraftById, setInquiryStatusDraftById] = useState<Record<string, InquiryStatus>>({});
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);
  const [inquiryActionMessage, setInquiryActionMessage] = useState<string | null>(null);
  const [inquiryActionError, setInquiryActionError] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsFilter, setAlertsFilter] = useState<NotificationFilter>("All");
  const [notificationReadMap, setNotificationReadMap] = useState<Record<string, boolean>>({});
  const [notificationDismissMap, setNotificationDismissMap] = useState<Record<string, boolean>>({});
  const [postTitle, setPostTitle] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [postCta, setPostCta] = useState("Contact Now");
  const [postNotice, setPostNotice] = useState<string | null>(null);
  const [vendorCategories, setVendorCategories] = useState<VendorCatalogCategory[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProductRecord[]>([]);
  const [vendorProductsLoading, setVendorProductsLoading] = useState(false);
  const [vendorProductsLoaded, setVendorProductsLoaded] = useState(false);
  const [vendorProductsError, setVendorProductsError] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<VendorProductFormState>(() => getDefaultProductForm(null));
  const [productFormSaving, setProductFormSaving] = useState(false);
  const [productFormMessage, setProductFormMessage] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState<VendorProductRecord["status"] | "all">("all");

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setLoading(true);
      const [session, cities] = await Promise.all([fetchVendorSession(), fetchVendorCities()]);
      if (!active) return;

      setCityOptions(cities);
      setCityOptionsError(cities.length === 0 ? "No city/locality data found. Ask admin to configure cities." : null);
      setVendor(session);
      setSettingsForm(buildSettingsForm(session));
      setShopProfileForm(buildShopProfileForm(session));
      setMyStoreMediaForm(buildMyStoreMediaForm(session));
      setProductForm(getDefaultProductForm(session));

      if (!session?.id) {
        setReviews(EMPTY_REVIEW_SNAPSHOT);
        setInquiryData(EMPTY_INQUIRY_SNAPSHOT);
        setVendorOrderData(EMPTY_VENDOR_ORDER_SNAPSHOT);
        setVendorOrderStatusDraftById({});
        setVendorOrderActionMessage(null);
        setVendorOrderActionError(null);
        setVendorCategories([]);
        setVendorProducts([]);
        setVendorProductsLoaded(false);
        setVendorOrdersLoading(false);
        setVendorOrdersError(null);
        setLoading(false);
        return;
      }

      setVendorOrdersLoading(true);
      const [reviewSnapshot, inquiriesSnapshot, ordersSnapshot, categoriesSnapshot, productsSnapshot] = await Promise.all([
        fetchVendorReviewSnapshot(session.id),
        fetchVendorInquiries({ limit: 200 }),
        fetchVendorOrders({ limit: 300 }),
        fetchVendorCategories(),
        fetchVendorProducts({ limit: 300 }),
      ]);

      if (!active) return;
      setReviews(reviewSnapshot);
      setInquiryData(inquiriesSnapshot);
      setVendorOrderData(ordersSnapshot);
      setVendorOrdersError(null);
      setVendorOrdersLoading(false);
      setVendorCategories(categoriesSnapshot);
      setVendorProducts(productsSnapshot);
      setVendorProductsLoaded(true);
      setVendorProductsError(null);
      setLoading(false);
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setInquiryStatusDraftById((current) => {
      const next: Record<string, InquiryStatus> = {};
      inquiryData.inquiries.forEach((inquiry) => {
        next[inquiry.id] = current[inquiry.id] || inquiry.status;
      });
      return next;
    });
  }, [inquiryData.inquiries]);

  useEffect(() => {
    setVendorOrderStatusDraftById((current) => {
      const next: Record<string, VendorOrderStatus> = {};
      vendorOrderData.orders.forEach((order) => {
        next[order.id] = current[order.id] || order.status;
      });
      return next;
    });
  }, [vendorOrderData.orders]);

  useEffect(() => {
    const vendorId = String(vendor?.id || "").trim();
    if (!vendorId) {
      setNotificationReadMap({});
      setNotificationDismissMap({});
      return;
    }

    try {
      const storageKey = `${NOTIFICATION_READ_STORAGE_KEY_PREFIX}:${vendorId}`;
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setNotificationReadMap(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setNotificationReadMap({});
    }

    try {
      const dismissStorageKey = `${NOTIFICATION_DISMISS_STORAGE_KEY_PREFIX}:${vendorId}`;
      const rawDismissed = window.localStorage.getItem(dismissStorageKey);
      const parsedDismissed = rawDismissed ? JSON.parse(rawDismissed) : {};
      setNotificationDismissMap(parsedDismissed && typeof parsedDismissed === "object" ? parsedDismissed : {});
    } catch {
      setNotificationDismissMap({});
    }
  }, [vendor?.id]);

  useEffect(() => {
    const vendorId = String(vendor?.id || "").trim();
    if (!vendorId) return;

    try {
      const storageKey = `${NOTIFICATION_READ_STORAGE_KEY_PREFIX}:${vendorId}`;
      window.localStorage.setItem(storageKey, JSON.stringify(notificationReadMap));
    } catch {
      // Ignore localStorage failures in restricted browser contexts.
    }
  }, [notificationReadMap, vendor?.id]);

  useEffect(() => {
    const vendorId = String(vendor?.id || "").trim();
    if (!vendorId) return;

    try {
      const dismissStorageKey = `${NOTIFICATION_DISMISS_STORAGE_KEY_PREFIX}:${vendorId}`;
      window.localStorage.setItem(dismissStorageKey, JSON.stringify(notificationDismissMap));
    } catch {
      // Ignore localStorage failures in restricted browser contexts.
    }
  }, [notificationDismissMap, vendor?.id]);

  const refreshDashboardData = async () => {
    if (!vendor?.id || refreshing) return;

    setRefreshing(true);
    setVendorOrdersLoading(true);
    setVendorOrdersError(null);
    try {
      const [reviewSnapshot, inquiriesSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
        fetchVendorReviewSnapshot(vendor.id),
        fetchVendorInquiries({ limit: 200 }),
        fetchVendorOrders({ limit: 300 }),
        fetchVendorProducts({ limit: 300 }),
      ]);

      setReviews(reviewSnapshot);
      setInquiryData(inquiriesSnapshot);
      setVendorOrderData(ordersSnapshot);
      setVendorOrderActionMessage(null);
      setVendorOrderActionError(null);
      setVendorProducts(productsSnapshot);
      setVendorProductsLoaded(true);
      setVendorProductsError(null);
    } catch {
      setVendorProductsError("Could not refresh products right now.");
      setVendorOrdersError("Could not refresh orders right now.");
    } finally {
      setRefreshing(false);
      setVendorOrdersLoading(false);
    }
  };

  const loadVendorProducts = async (includeCategories = false) => {
    if (!vendor?.id) return;

    setVendorProductsLoading(true);
    setVendorProductsError(null);

    try {
      const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        fetchVendorProducts({ limit: 300 }),
        includeCategories ? fetchVendorCategories() : Promise.resolve([] as VendorCatalogCategory[]),
      ]);

      setVendorProducts(productsSnapshot);
      if (includeCategories && categoriesSnapshot.length > 0) {
        setVendorCategories(categoriesSnapshot);
      }
    } catch {
      setVendorProductsError("Failed to load vendor products.");
    } finally {
      setVendorProductsLoading(false);
      setVendorProductsLoaded(true);
    }
  };

  useEffect(() => {
    if (activeNav !== "Products" || !vendor?.id || vendorProductsLoading || vendorProductsLoaded) {
      return;
    }

    void loadVendorProducts(vendorCategories.length === 0);
  }, [
    activeNav,
    loadVendorProducts,
    vendor?.id,
    vendorCategories.length,
    vendorProductsLoaded,
    vendorProductsLoading,
  ]);

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

  const enquiryItems = useMemo(
    () => inquiryData.inquiries.filter((inquiry) => inquiry.channel !== "Phone"),
    [inquiryData.inquiries]
  );

  const filteredInquiries = useMemo(() => {
    const query = inquirySearch.trim().toLowerCase();

    return enquiryItems.filter((inquiry) => {
      if (inquiryStatusFilter !== "All" && inquiry.status !== inquiryStatusFilter) {
        return false;
      }

      if (!query) return true;

      return [inquiry.subject, inquiry.name, inquiry.phone, inquiry.email || "", inquiry.message]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [enquiryItems, inquirySearch, inquiryStatusFilter]);

  const filteredVendorOrders = useMemo(() => {
    const query = vendorOrderSearch.trim().toLowerCase();

    return vendorOrderData.orders.filter((order) => {
      if (vendorOrderStatusFilter !== "All" && order.status !== vendorOrderStatusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const itemNames = order.items.map((item) => item.name).join(" ");

      return [order.orderNo, order.customer, order.paymentMethod, order.paymentStatus, itemNames]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [vendorOrderData.orders, vendorOrderSearch, vendorOrderStatusFilter]);

  const callLeads = useMemo(
    () =>
      inquiryData.inquiries.filter(
        (inquiry) => inquiry.channel === "Phone" && Boolean(String(inquiry.phone || "").trim() || inquiry.email)
      ),
    [inquiryData.inquiries]
  );

  const enquirySummary = useMemo(() => buildInquirySummary(enquiryItems), [enquiryItems]);

  const stats = useMemo<StatCardItem[]>(() => {
    const reviewCount = Number.isFinite(Number(reviews.summary.reviews)) ? Number(reviews.summary.reviews) : 0;
    const enquiryCount = enquiryItems.length;
    const openEnquiries = enquirySummary.open;

    return [
      {
        label: "Enquiries",
        value: enquiryCount,
        trend: `Open ${openEnquiries}`,
        hint: "",
        icon: MessageSquare,
        trendPositive: openEnquiries > 0,
      },
      {
        label: "Call Leads",
        value: callLeads.length,
        trend: callLeads.length > 0 ? `+${callLeads.length}` : "+0",
        hint: "",
        icon: PhoneCall,
        trendPositive: callLeads.length > 0,
      },
      {
        label: "Reviews",
        value: reviewCount,
        trend: `Avg ${formatRating(reviews.summary.rating)}`,
        hint: "",
        icon: Star,
        trendPositive: reviewCount > 0,
      },
      {
        label: "Orders",
        value: vendorOrderData.summary.total,
        trend: `Pending ${vendorOrderData.summary.pending}`,
        hint: "",
        icon: ClipboardList,
        trendPositive: vendorOrderData.summary.total > 0,
      },
    ];
  }, [
    callLeads.length,
    enquiryItems.length,
    enquirySummary.open,
    reviews.summary.rating,
    reviews.summary.reviews,
    vendorOrderData.summary.pending,
    vendorOrderData.summary.total,
  ]);

  const currentStoreStatus = useMemo<VendorBusinessStatus>(() => {
    if (!vendor) {
      return {
        isOpen: null,
        source: "unknown",
        mode: "auto",
        manualStatus: null,
      };
    }

    return resolveBusinessStatus(vendor);
  }, [vendor]);

  const storeStatusLabel =
    currentStoreStatus.isOpen === true
      ? "Open"
      : currentStoreStatus.isOpen === false
        ? "Closed"
        : "Hours unavailable";
  const storeStatusSourceLabel =
    currentStoreStatus.source === "manual"
      ? "Manual"
      : currentStoreStatus.source === "schedule"
        ? "Schedule"
        : currentStoreStatus.source === "vendor-status"
          ? "Vendor status"
          : "Unknown";

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

  const isRestaurantVendor = useMemo(() => isRestaurantVendorProfile(vendor), [vendor]);

  const notifications = useMemo<VendorNotification[]>(() => {
    const inquiryNotifications = inquiryData.inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      nav: inquiry.channel === "Phone" ? ("Calls" as const) : ("Enquiries" as const),
      title: inquiry.channel === "Phone" ? "New call request" : "New enquiry",
      detail: `${inquiry.name} - ${inquiry.subject}`,
      createdAt: String(inquiry.updatedAt || inquiry.createdAt || ""),
    }));

    const reviewNotifications = reviews.reviews.map((review) => ({
      id: `review-${review.id}`,
      nav: "Reviews" as const,
      title: "New review",
      detail: `${review.author} rated ${formatRating(review.rating)} star`,
      createdAt: String(review.createdAt || ""),
    }));

    const orderNotifications = vendorOrderData.orders.map((order) => ({
      id: `order-${order.id}`,
      nav: "Orders" as const,
      title: "New order",
      detail: `${order.orderNo} from ${order.customer}`,
      createdAt: String(order.createdAt || ""),
    }));

    return [...inquiryNotifications, ...reviewNotifications, ...orderNotifications].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });
  }, [inquiryData.inquiries, reviews.reviews, vendorOrderData.orders]);

  const activeNotifications = useMemo(
    () => notifications.filter((notification) => !notificationDismissMap[notification.id]),
    [notificationDismissMap, notifications]
  );

  useEffect(() => {
    setNotificationDismissMap((current) => {
      const validKeys = new Set(notifications.map((notification) => notification.id));
      const next: Record<string, boolean> = {};

      Object.entries(current).forEach(([key, value]) => {
        if (validKeys.has(key) && value) {
          next[key] = true;
        }
      });

      if (Object.keys(next).length === Object.keys(current).length) {
        return current;
      }

      return next;
    });
  }, [notifications]);

  useEffect(() => {
    setNotificationReadMap((current) => {
      const validKeys = new Set(activeNotifications.map((notification) => notification.id));
      const next: Record<string, boolean> = {};

      Object.entries(current).forEach(([key, value]) => {
        if (validKeys.has(key) && value) {
          next[key] = true;
        }
      });

      if (Object.keys(next).length === Object.keys(current).length) {
        return current;
      }

      return next;
    });
  }, [activeNotifications]);

  const notificationsWithRead = useMemo(
    () => activeNotifications.map((notification) => ({ ...notification, read: Boolean(notificationReadMap[notification.id]) })),
    [activeNotifications, notificationReadMap]
  );

  const unreadAlertsCount = useMemo(
    () => notificationsWithRead.filter((notification) => !notification.read).length,
    [notificationsWithRead]
  );

  const filteredNotifications = useMemo(() => {
    const matchingNotifications = notificationsWithRead.filter((notification) => {
      if (alertsFilter === "Unread") return !notification.read;
      if (alertsFilter === "Read") return notification.read;
      return true;
    });

    const ordered = matchingNotifications.sort((left, right) => {
      if (left.read !== right.read) {
        return left.read ? 1 : -1;
      }

      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });

    return ordered.slice(0, MAX_NOTIFICATIONS_IN_POPUP);
  }, [alertsFilter, notificationsWithRead]);

  const navUnreadCounts = useMemo(() => {
    const counts: Record<SidebarLabel, number> = {
      Overview: 0,
      Enquiries: 0,
      Calls: 0,
      Reviews: 0,
      Orders: 0,
      Posts: 0,
      Shop: 0,
      Products: 0,
      Settings: 0,
    };

    notificationsWithRead.forEach((notification) => {
      if (notification.read) return;
      counts[notification.nav] += 1;
    });

    return counts;
  }, [notificationsWithRead]);

  const sectionMeta = SECTION_META[activeNav];
  const shouldShowQuickAnalytics = activeNav !== "Products";
  const businessName = String(vendor?.businessName || "Your Business").trim() || "Your Business";
  const vendorName = String(vendor?.name || "Vendor").trim() || "Vendor";
  const location = [vendor?.city, vendor?.state].filter(Boolean).join(", ") || "Location not set";
  const sidebarAvatar = String(vendor?.image || DEFAULT_VENDOR_AVATAR).trim() || DEFAULT_VENDOR_AVATAR;

  const handleSettingsChange = (field: keyof SettingsFormState, value: string) => {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSettingsCityChange = (cityName: string) => {
    const selectedCity = cityOptions.find((cityOption) => cityOption.name === cityName) || null;
    const localities = selectedCity ? selectedCity.localities : [];

    setSettingsForm((current) => {
      const nextSublocality =
        localities.some((locality) => locality.name === current.sublocality) && current.sublocality
          ? current.sublocality
          : localities[0]?.name || "";

      return {
        ...current,
        city: cityName,
        sublocality: nextSublocality,
        state: selectedCity?.state || current.state,
      };
    });
  };

  const buildVendorBaselineProfilePayload = (): VendorProfileUpdateInput => {
    const pickFirstNonEmpty = (...values: Array<string | null | undefined>) => {
      for (const value of values) {
        const normalized = String(value || "").trim();
        if (normalized) {
          return normalized;
        }
      }

      return undefined;
    };

    const settingsServiceTags = settingsForm.serviceTagsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 100);
    const vendorServiceTags = Array.isArray(vendor?.serviceTags)
      ? vendor.serviceTags.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const resolvedServiceTags = settingsServiceTags.length > 0 ? settingsServiceTags : vendorServiceTags;

    return {
      name: pickFirstNonEmpty(settingsForm.name, vendor?.name),
      email: pickFirstNonEmpty(settingsForm.email, vendor?.email),
      phone: pickFirstNonEmpty(settingsForm.phone, vendor?.phone),
      businessEmail: pickFirstNonEmpty(settingsForm.businessEmail, vendor?.businessEmail),
      businessPhone: pickFirstNonEmpty(settingsForm.businessPhone, vendor?.businessPhone),
      city: pickFirstNonEmpty(settingsForm.city, vendor?.city),
      sublocality: pickFirstNonEmpty(settingsForm.sublocality, vendor?.sublocality),
      state: pickFirstNonEmpty(settingsForm.state, vendor?.state),
      shopOpeningTime: pickFirstNonEmpty(settingsForm.shopOpeningTime, vendor?.shopOpeningTime),
      shopClosingTime: pickFirstNonEmpty(settingsForm.shopClosingTime, vendor?.shopClosingTime),
      businessCategoryId: pickFirstNonEmpty(vendor?.businessCategory?.id),
      businessSubcategoryId: pickFirstNonEmpty(vendor?.businessSubcategory?.id),
      gstNumber: pickFirstNonEmpty(vendor?.gstNumber),
      gstDocument: pickFirstNonEmpty(vendor?.gstDocument),
      serviceTags: resolvedServiceTags.length > 0 ? resolvedServiceTags : undefined,
    };
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
        businessEmail: settingsForm.businessEmail,
        businessPhone: settingsForm.businessPhone,
        city: settingsForm.city,
        sublocality: settingsForm.sublocality,
        state: settingsForm.state,
        shopOpeningTime: settingsForm.shopOpeningTime,
        shopClosingTime: settingsForm.shopClosingTime,
        serviceTags,
      });

      setVendor(updatedVendor);
      setSettingsForm(buildSettingsForm(updatedVendor));
      setShopProfileForm(buildShopProfileForm(updatedVendor));
      setMyStoreMediaForm(buildMyStoreMediaForm(updatedVendor));
      setSettingsMessage("Settings updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      setSettingsError(message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleInquiryStatusDraftChange = (inquiryId: string, value: InquiryStatus) => {
    setInquiryStatusDraftById((current) => ({
      ...current,
      [inquiryId]: value,
    }));
  };

  const handleInquiryStatusSave = async (inquiryId: string) => {
    if (!inquiryId || updatingInquiryId) return;

    const nextStatus = inquiryStatusDraftById[inquiryId];
    if (!nextStatus) return;

    setInquiryActionMessage(null);
    setInquiryActionError(null);
    setUpdatingInquiryId(inquiryId);

    try {
      const updatedInquiry = await updateVendorInquiryStatus(inquiryId, nextStatus);

      setInquiryData((current) => {
        const nextInquiries = current.inquiries.map((inquiry) =>
          inquiry.id === inquiryId ? { ...inquiry, ...updatedInquiry } : inquiry
        );

        return {
          ...current,
          inquiries: nextInquiries,
          summary: buildInquirySummary(nextInquiries),
        };
      });

      setInquiryActionMessage("Enquiry status updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update enquiry status";
      setInquiryActionError(message);
    } finally {
      setUpdatingInquiryId(null);
    }
  };

  const handleVendorOrderStatusDraftChange = (orderId: string, value: VendorOrderStatus) => {
    setVendorOrderStatusDraftById((current) => ({
      ...current,
      [orderId]: value,
    }));
  };

  const handleVendorOrderStatusSave = async (orderId: string) => {
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedOrderId || updatingVendorOrderId) return;

    const currentOrder = vendorOrderData.orders.find((order) => order.id === normalizedOrderId);
    if (!currentOrder) return;

    const nextStatus = vendorOrderStatusDraftById[normalizedOrderId] || currentOrder.status;
    if (nextStatus === currentOrder.status) {
      return;
    }

    const previousSnapshot = vendorOrderData;
    const optimisticOrders = vendorOrderData.orders.map((order) =>
      order.id === normalizedOrderId ? { ...order, status: nextStatus } : order
    );

    setVendorOrderData({
      summary: buildVendorOrderSummary(optimisticOrders),
      orders: optimisticOrders,
    });

    setVendorOrderActionMessage(null);
    setVendorOrderActionError(null);
    setUpdatingVendorOrderId(normalizedOrderId);

    try {
      const updatedOrder = await updateVendorOrderStatus(normalizedOrderId, nextStatus);

      setVendorOrderData((current) => {
        const mergedOrders = current.orders.map((order) =>
          order.id === normalizedOrderId ? { ...order, ...updatedOrder } : order
        );

        return {
          summary: buildVendorOrderSummary(mergedOrders),
          orders: mergedOrders,
        };
      });

      setVendorOrderStatusDraftById((current) => ({
        ...current,
        [normalizedOrderId]: updatedOrder.status,
      }));
      setVendorOrderActionMessage(`Order ${updatedOrder.orderNo} marked ${updatedOrder.status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update order status";
      setVendorOrderData(previousSnapshot);
      setVendorOrderStatusDraftById((current) => ({
        ...current,
        [normalizedOrderId]: currentOrder.status,
      }));
      setVendorOrderActionError(message);
    } finally {
      setUpdatingVendorOrderId(null);
    }
  };

  const setNotificationReadState = (notificationId: string, value: boolean) => {
    setNotificationReadMap((current) => ({
      ...current,
      [notificationId]: value,
    }));
  };

  const markAllNotifications = (value: boolean) => {
    setNotificationReadMap(() => {
      const next: Record<string, boolean> = {};
      activeNotifications.forEach((notification) => {
        next[notification.id] = value;
      });
      return next;
    });
  };

  const deleteNotification = (notificationId: string) => {
    setNotificationDismissMap((current) => ({
      ...current,
      [notificationId]: true,
    }));

    setNotificationReadMap((current) => {
      if (!(notificationId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[notificationId];
      return next;
    });
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

    try {
      const uploadedGallery = await Promise.all(validImageFiles.map((file) => fileToDataUrl(file)));
      const mergedGallery = filterShopGalleryItems(
        [...sanitizedExistingGallery, ...uploadedGallery],
        shopProfileForm.image,
        shopProfileForm.shopBannerImage
      );

      setShopProfileForm((current) => ({
        ...current,
        shopGalleryText: mergedGallery.join("\n"),
      }));
      setShopProfileMessage(`${uploadedGallery.length} shop photo${uploadedGallery.length === 1 ? "" : "s"} added.`);
    } catch {
      setShopProfileError("Could not process one or more photos. Please try again.");
    }
  };

  const handleShopProfileRemoveImage = (field: "image" | "shopBannerImage") => {
    setShopProfileForm((current) => ({
      ...current,
      [field]: "",
    }));
    setShopProfileMessage(field === "image" ? "Shop DP removed." : "Shop banner removed.");
    setShopProfileError(null);
  };

  const handleShopProfileRemoveGalleryItem = (itemToRemove: string) => {
    const nextGallery = parseShopGalleryInput(shopProfileForm.shopGalleryText).filter((item) => item !== itemToRemove);
    setShopProfileForm((current) => ({
      ...current,
      shopGalleryText: nextGallery.join("\n"),
    }));
    setShopProfileMessage("Shop photo removed.");
    setShopProfileError(null);
  };

  const handleShopProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor || shopProfileSaving) return;

    setShopProfileMessage(null);
    setShopProfileError(null);
    setShopProfileSaving(true);

    try {
      const baselinePayload = buildVendorBaselineProfilePayload();
      if (!baselinePayload.city || !baselinePayload.sublocality) {
        setShopProfileError("Please set city and sublocality in Settings before saving Shop Profile.");
        setShopProfileSaving(false);
        return;
      }

      const updatedVendor = await updateVendorProfile({
        ...baselinePayload,
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
      setMyStoreMediaForm(buildMyStoreMediaForm(updatedVendor));
      setSettingsForm(buildSettingsForm(updatedVendor));
      setShopProfileMessage("Shop profile updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update shop profile";
      setShopProfileError(message);
    } finally {
      setShopProfileSaving(false);
    }
  };

  const persistMyStoreMedia = async (field: "image" | "banner", nextImage: string, nextBannerImage: string) => {
    if (!vendor) return;

    setMyStoreMediaSavingField(field);
    setMyStoreMediaMessage(null);
    setMyStoreMediaError(null);

    try {
      const baselinePayload = buildVendorBaselineProfilePayload();
      if (!baselinePayload.city || !baselinePayload.sublocality) {
        setMyStoreMediaError("Please set city and sublocality in Settings before updating MyStore media.");
        return;
      }

      const updatedVendor = await updateVendorProfile({
        ...baselinePayload,
        myStoreImage: nextImage,
        myStoreBannerImage: nextBannerImage,
      });

      setVendor(updatedVendor);
      setMyStoreMediaForm(buildMyStoreMediaForm(updatedVendor));
      setShopProfileForm(buildShopProfileForm(updatedVendor));
      setSettingsForm(buildSettingsForm(updatedVendor));
      const wasRemoved = field === "image" ? !nextImage : !nextBannerImage;
      if (field === "image") {
        setMyStoreMediaMessage(wasRemoved ? "MyStore DP removed successfully." : "MyStore DP updated successfully.");
      } else {
        setMyStoreMediaMessage(wasRemoved ? "MyStore banner removed successfully." : "MyStore banner updated successfully.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update MyStore media";
      setMyStoreMediaForm(buildMyStoreMediaForm(vendor));
      setMyStoreMediaError(message);
    } finally {
      setMyStoreMediaSavingField(null);
    }
  };

  const handleMyStoreMediaUpload = async (field: "image" | "banner", files: FileList | null) => {
    if (!vendor || !files?.length || myStoreMediaSavingField) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setMyStoreMediaMessage(null);
      setMyStoreMediaError("Please upload an image file only.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setMyStoreMediaMessage(null);
      setMyStoreMediaError("Image is too large. Please keep each upload under 2MB.");
      return;
    }

    try {
      const imageData = await fileToDataUrl(file);
      const nextImage = field === "image" ? imageData : String(myStoreMediaForm.image || "").trim();
      const nextBannerImage = field === "banner" ? imageData : String(myStoreMediaForm.bannerImage || "").trim();

      setMyStoreMediaForm({
        image: nextImage,
        bannerImage: nextBannerImage,
      });

      await persistMyStoreMedia(field, nextImage, nextBannerImage);
    } catch {
      setMyStoreMediaMessage(null);
      setMyStoreMediaError("Could not process image file. Please try again.");
    }
  };

  const handleMyStoreMediaRemove = async (field: "image" | "banner") => {
    if (!vendor || myStoreMediaSavingField) return;

    const nextImage = field === "image" ? "" : String(myStoreMediaForm.image || "").trim();
    const nextBannerImage = field === "banner" ? "" : String(myStoreMediaForm.bannerImage || "").trim();

    setMyStoreMediaForm({
      image: nextImage,
      bannerImage: nextBannerImage,
    });

    await persistMyStoreMedia(field, nextImage, nextBannerImage);
  };

  const handleVendorStoreStatusChange = async (
    nextMode: "auto" | "manual",
    nextManualStatus?: "open" | "closed"
  ) => {
    if (!vendor || storeStatusSaving) return;

    setStoreStatusSaving(true);
    setStoreStatusMessage(null);
    setStoreStatusError(null);

    try {
      const updatedStatus = await updateVendorStoreStatus({
        storeStatusMode: nextMode,
        manualStoreStatus: nextMode === "manual" ? nextManualStatus : undefined,
      });

      setVendor((current) => {
        if (!current) return current;

        return {
          ...current,
          ...updatedStatus,
        };
      });

      if (nextMode === "auto") {
        setStoreStatusMessage("Store status now follows shop schedule.");
      } else {
        setStoreStatusMessage(nextManualStatus === "open" ? "Store marked as open." : "Store marked as closed.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update store status";
      setStoreStatusError(message);
    } finally {
      setStoreStatusSaving(false);
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

  const handleOverviewStatClick = (label: StatCardItem["label"]) => {
    if (label === "Enquiries") {
      setActiveNav("Enquiries");
      return;
    }

    if (label === "Call Leads") {
      setActiveNav("Calls");
      return;
    }

    if (label === "Reviews") {
      setActiveNav("Reviews");
      return;
    }

    if (label === "Orders") {
      setActiveNav("Orders");
    }
  };

  const filteredVendorProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return vendorProducts.filter((product) => {
      if (productStatusFilter !== "all" && product.status !== productStatusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        product.productName,
        product.categoryLabel,
        product.categorySlug,
        product.subcategoryName,
        product.subcategorySlug,
        product.brand || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [productSearch, productStatusFilter, vendorProducts]);

  const handleProductFormChange = (field: keyof VendorProductFormState, value: string | boolean) => {
    setProductForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "categorySlug") {
        return {
          ...next,
          subcategorySlug: "",
        };
      }

      return next;
    });
  };

  const handleVendorProductCancelEdit = () => {
    setEditingProductId(null);
    setProductForm(getDefaultProductForm(vendor));
    setProductFormMessage(null);
    setProductFormError(null);
  };

  const handleVendorProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor || productFormSaving) return;

    const payload = buildVendorProductPayload(productForm, vendorCategories, vendor);
    if (!payload.categorySlug || !payload.productName || !payload.image) {
      setProductFormError("Category, product name, and image are required.");
      setProductFormMessage(null);
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      setProductFormError("Price must be greater than 0.");
      setProductFormMessage(null);
      return;
    }

    setProductFormSaving(true);
    setProductFormMessage(null);
    setProductFormError(null);

    try {
      if (editingProductId) {
        const updated = await updateVendorProduct(editingProductId, payload);
        setVendorProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
        setProductFormMessage("Product updated successfully.");
      } else {
        const created = await createVendorProduct(payload);
        setVendorProducts((current) => [created, ...current]);
        setProductFormMessage("Product added successfully.");
      }

      setEditingProductId(null);
      setProductForm(getDefaultProductForm(vendor));
      await loadVendorProducts(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save product";
      setProductFormError(message);
    } finally {
      setProductFormSaving(false);
    }
  };

  const handleVendorProductQuickUpsert = async (payload: VendorProductUpsertInput, productId?: string | null) => {
    if (!vendor || productFormSaving) {
      throw new Error(isRestaurantVendor ? "Unable to save menu item right now" : "Unable to save product right now");
    }

    if (!payload.categorySlug || !payload.productName || !payload.image) {
      setProductFormError("Category, product name, and image are required.");
      setProductFormMessage(null);
      throw new Error("Validation failed");
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      setProductFormError("Price must be greater than 0.");
      setProductFormMessage(null);
      throw new Error("Validation failed");
    }

    setProductFormSaving(true);
    setProductFormMessage(null);
    setProductFormError(null);

    try {
      if (productId) {
        const updated = await updateVendorProduct(productId, payload);
        setVendorProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
        setProductFormMessage(isRestaurantVendor ? "Menu item updated successfully." : "Product updated successfully.");
      } else {
        const created = await createVendorProduct(payload);
        setVendorProducts((current) => [created, ...current]);
        setProductFormMessage(isRestaurantVendor ? "Menu item added successfully." : "Product added successfully.");
      }

      setEditingProductId(null);
      setProductForm(getDefaultProductForm(vendor));
      await loadVendorProducts(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : isRestaurantVendor ? "Failed to save menu item" : "Failed to save product";
      setProductFormError(message);
      throw error;
    } finally {
      setProductFormSaving(false);
    }
  };

  const handleVendorProductEdit = (product: VendorProductRecord) => {
    setEditingProductId(product.id);
    setProductForm(toProductFormState(product, vendor));
    setProductFormMessage(null);
    setProductFormError(null);
  };

  const handleVendorProductDelete = async (productId: string) => {
    const normalizedId = String(productId || "").trim();
    if (!normalizedId || deletingProductId) return;

    setDeletingProductId(normalizedId);
    setProductFormMessage(null);
    setProductFormError(null);

    try {
      await deleteVendorProduct(normalizedId);
      setVendorProducts((current) => current.filter((product) => product.id !== normalizedId));
      if (editingProductId === normalizedId) {
        setEditingProductId(null);
        setProductForm(getDefaultProductForm(vendor));
      }
      setProductFormMessage(isRestaurantVendor ? "Menu item deleted successfully." : "Product deleted successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : isRestaurantVendor ? "Failed to delete menu item" : "Failed to delete product";
      setProductFormError(message);
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleVendorProductsRefresh = () => {
    void loadVendorProducts(vendorCategories.length === 0);
  };

  const renderActiveSection = () => {
    if (!vendor) return null;

    if (activeNav === "Overview") {
      return (
        <OverviewSection
          leadSources={leadSources}
          servicePerformance={servicePerformance}
          recentInquiries={enquiryItems.slice(0, 4)}
          recentReviews={reviews.reviews.slice(0, 4)}
        />
      );
    }

    if (activeNav === "Enquiries") {
      return (
        <EnquiriesSection
          summary={enquirySummary}
          inquiries={filteredInquiries}
          statusFilter={inquiryStatusFilter}
          setStatusFilter={setInquiryStatusFilter}
          search={inquirySearch}
          setSearch={setInquirySearch}
          statusDraftById={inquiryStatusDraftById}
          onStatusDraftChange={handleInquiryStatusDraftChange}
          onStatusSave={handleInquiryStatusSave}
          updatingInquiryId={updatingInquiryId}
          actionMessage={inquiryActionMessage}
          actionError={inquiryActionError}
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
      return (
        <OrdersSection
          summary={vendorOrderData.summary}
          orders={filteredVendorOrders}
          statusFilter={vendorOrderStatusFilter}
          setStatusFilter={setVendorOrderStatusFilter}
          search={vendorOrderSearch}
          setSearch={setVendorOrderSearch}
          statusDraftById={vendorOrderStatusDraftById}
          onStatusDraftChange={handleVendorOrderStatusDraftChange}
          onStatusSave={handleVendorOrderStatusSave}
          updatingOrderId={updatingVendorOrderId}
          actionMessage={vendorOrderActionMessage}
          actionError={vendorOrderActionError}
          loading={vendorOrdersLoading}
          error={vendorOrdersError}
        />
      );
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
        <section className="space-y-4">
          <ShopStoreSwitch
            active={shopTabMode}
            onChange={setShopTabMode}
          />

          {shopTabMode === "Shop" ? (
            <ShopProfileSection
              form={shopProfileForm}
              businessName={businessName}
              onChange={handleShopProfileChange}
              onSubmit={handleShopProfileSubmit}
              onUploadSingle={handleShopProfileSingleUpload}
              onUploadGallery={handleShopProfileGalleryUpload}
              onRemoveImage={handleShopProfileRemoveImage}
              onRemoveGalleryItem={handleShopProfileRemoveGalleryItem}
              saving={shopProfileSaving}
              message={shopProfileMessage}
              error={shopProfileError}
            />
          ) : (
            <MyStorePreviewSection
              businessName={businessName}
              profileImage={myStoreMediaForm.image}
              bannerImage={myStoreMediaForm.bannerImage}
              address={shopProfileForm.businessAddress}
              description={shopProfileForm.businessDescription}
              savingField={myStoreMediaSavingField}
              message={myStoreMediaMessage}
              error={myStoreMediaError}
              onUpload={handleMyStoreMediaUpload}
              onRemove={handleMyStoreMediaRemove}
            />
          )}
        </section>
      );
    }

    if (activeNav === "Products") {
      const editingProduct = editingProductId
        ? vendorProducts.find((product) => product.id === editingProductId) || null
        : null;

      return (
        <VendorProductsSection
          form={productForm}
          sellerName={String(vendor.businessName || vendor.name || "").trim()}
          isRestaurantVendor={isRestaurantVendor}
          vendorCategoryId={vendor.businessCategory?.id}
          vendorCategoryName={vendor.businessCategory?.name}
          vendorSubcategoryId={vendor.businessSubcategory?.id}
          vendorSubcategoryName={vendor.businessSubcategory?.name}
          categories={vendorCategories}
          products={filteredVendorProducts}
          editingProduct={editingProduct}
          productsLoading={vendorProductsLoading}
          productsError={vendorProductsError}
          actionMessage={productFormMessage}
          actionError={productFormError}
          saving={productFormSaving}
          editingProductId={editingProductId}
          deletingProductId={deletingProductId}
          search={productSearch}
          statusFilter={productStatusFilter}
          onSearchChange={setProductSearch}
          onStatusFilterChange={setProductStatusFilter}
          onFormChange={handleProductFormChange}
          onSubmit={handleVendorProductSubmit}
          onEdit={handleVendorProductEdit}
          onCancelEdit={handleVendorProductCancelEdit}
          onDelete={handleVendorProductDelete}
          onRefresh={handleVendorProductsRefresh}
          onQuickUpsert={handleVendorProductQuickUpsert}
        />
      );
    }

    return (
      <SettingsSection
        form={settingsForm}
        cities={cityOptions}
        states={Array.from(INDIAN_STATES)}
        onChange={handleSettingsChange}
        onCityChange={handleSettingsCityChange}
        onSubmit={handleSettingsSubmit}
        saving={settingsSaving}
        message={settingsMessage}
        error={settingsError}
        cityLoadError={cityOptionsError}
      />
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!vendor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto h-9 w-9 text-[var(--vendor-primary)]" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-gray-900">Vendor session required</h1>
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
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_10%_5%,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_90%_0%,rgba(30,64,175,0.16),transparent_45%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#e7f0ff_100%)] text-[var(--vendor-text-primary)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.58),rgba(239,246,255,0.42),rgba(219,234,254,0.3))]" />
        <div className="relative mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div
          className={`grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] ${
            shouldShowQuickAnalytics ? "xl:grid-cols-[248px_minmax(0,1fr)_320px]" : ""
          }`}
        >
          <aside className="hidden h-[calc(100vh-3rem)] flex-col rounded-3xl border-r border-blue-100/80 bg-white/72 p-4 backdrop-blur-md lg:flex">
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
                const unreadCount = navUnreadCounts[item.label] || 0;
                const navLabel = getNavLabel(item.label, isRestaurantVendor);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveNav(item.label)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-blue-50/70 hover:text-gray-900"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{navLabel}</span>
                    {unreadCount > 0 ? (
                      <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 space-y-5">
            <article className="rounded-2xl border border-blue-100/80 bg-white/78 p-4 shadow-sm backdrop-blur-md xl:hidden">
              <h3 className="font-display text-lg font-semibold text-gray-900">Quick Controls</h3>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={refreshDashboardData}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                  {refreshing ? "Refreshing" : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={() => setAlertsOpen((current) => !current)}
                  className="relative inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  Alerts
                  {unreadAlertsCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                      {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  {loggingOut ? "Signing out" : "Logout"}
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div
                    className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2 text-xs font-semibold ${
                      currentStoreStatus.isOpen === true
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : currentStoreStatus.isOpen === false
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-gray-300 bg-gray-100 text-gray-700"
                    }`}
                  >
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                    {storeStatusLabel}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleVendorStoreStatusChange("auto")}
                    disabled={storeStatusSaving}
                    className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                      currentStoreStatus.mode === "auto"
                        ? "border-blue-200 bg-blue-100 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    } disabled:opacity-60`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVendorStoreStatusChange("manual", "open")}
                    disabled={storeStatusSaving}
                    className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                      currentStoreStatus.mode === "manual" && currentStoreStatus.manualStatus === "open"
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    } disabled:opacity-60`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVendorStoreStatusChange("manual", "closed")}
                    disabled={storeStatusSaving}
                    className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                      currentStoreStatus.mode === "manual" && currentStoreStatus.manualStatus === "closed"
                        ? "border-rose-200 bg-rose-100 text-rose-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    } disabled:opacity-60`}
                  >
                    Close
                  </button>
                </div>

                {storeStatusMessage ? <p className="text-xs text-emerald-700">{storeStatusMessage}</p> : null}
                {storeStatusError ? <p className="text-xs text-red-700">{storeStatusError}</p> : null}
              </div>
            </article>

            <header className="rounded-2xl border border-blue-100/80 bg-white/78 p-4 shadow-sm backdrop-blur-md">
              <DashboardSummaryCards stats={stats} onStatClick={handleOverviewStatClick} />
            </header>

            <div className="min-w-0">{renderActiveSection()}</div>
          </section>

          {shouldShowQuickAnalytics ? (
            <aside className="hidden space-y-4 xl:block">
              <article className="rounded-2xl border border-blue-100/70 bg-white/62 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-semibold text-gray-900">Quick Controls</h3>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={refreshDashboardData}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                    {refreshing ? "Refreshing" : "Refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertsOpen((current) => !current)}
                    className="relative inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    Alerts
                    {unreadAlertsCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                        {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    {loggingOut ? "Signing out" : "Logout"}
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div
                      className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2 text-xs font-semibold ${
                        currentStoreStatus.isOpen === true
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : currentStoreStatus.isOpen === false
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-gray-300 bg-gray-100 text-gray-700"
                      }`}
                    >
                      <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                      {storeStatusLabel}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleVendorStoreStatusChange("auto")}
                      disabled={storeStatusSaving}
                      className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                        currentStoreStatus.mode === "auto"
                          ? "border-blue-200 bg-blue-100 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-60`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleVendorStoreStatusChange("manual", "open")}
                      disabled={storeStatusSaving}
                      className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                        currentStoreStatus.mode === "manual" && currentStoreStatus.manualStatus === "open"
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-60`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleVendorStoreStatusChange("manual", "closed")}
                      disabled={storeStatusSaving}
                      className={`inline-flex h-9 items-center justify-center rounded-xl border px-2 text-[11px] font-semibold transition ${
                        currentStoreStatus.mode === "manual" && currentStoreStatus.manualStatus === "closed"
                          ? "border-rose-200 bg-rose-100 text-rose-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-60`}
                    >
                      Close
                    </button>
                  </div>

                  {storeStatusMessage ? <p className="text-xs text-emerald-700">{storeStatusMessage}</p> : null}
                  {storeStatusError ? <p className="text-xs text-red-700">{storeStatusError}</p> : null}
                </div>
              </article>

              <article className="rounded-2xl border border-blue-100/70 bg-white/62 p-5 backdrop-blur-md">
                <h3 className="font-display text-lg font-semibold text-gray-900">Quick Analytics</h3>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                    <p className="text-xs text-blue-700">Enquiries</p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">{enquirySummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-3">
                    <p className="text-xs text-emerald-700">Call Leads</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-900">{callLeads.length}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-3">
                    <p className="text-xs text-amber-700">Average rating</p>
                    <p className="mt-1 text-sm font-semibold text-amber-900">{formatRating(reviews.summary.rating)} / 5</p>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-3">
                    <p className="text-xs text-violet-700">Section</p>
                    <p className="mt-1 text-sm font-semibold text-violet-900">{sectionMeta.title}</p>
                  </div>
                </div>
              </article>
            </aside>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Mobile quick actions"
        className="fixed inset-x-4 bottom-3 z-40 rounded-2xl border border-blue-100/80 bg-white/88 p-2 shadow-lg backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-6 gap-1">
          {MOBILE_BAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            const unreadCount = navUnreadCounts[item.label] || 0;
            const navLabel = getNavLabel(item.label, isRestaurantVendor);

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
                  <span className="inline-flex items-center gap-1">
                    {navLabel}
                    {unreadCount > 0 ? (
                      <span className="inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {alertsOpen ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4" aria-label="Alerts popup">
          <button
            type="button"
            onClick={() => setAlertsOpen(false)}
            className="absolute inset-0"
            aria-label="Close alerts popup"
          />

          <article className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notifications</p>
              </div>

              <button
                type="button"
                onClick={() => setAlertsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                aria-label="Close alerts"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["All", "Unread", "Read"] as NotificationFilter[]).map((filter) => (
                <button
                  key={`notification-filter-${filter}`}
                  type="button"
                  onClick={() => setAlertsFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    alertsFilter === filter
                      ? "bg-blue-100 text-blue-700"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {filter}
                </button>
              ))}

              <button
                type="button"
                onClick={() => markAllNotifications(true)}
                className="ml-auto rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => markAllNotifications(false)}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
              >
                Unread all
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {filteredNotifications.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">No notifications for this filter.</p>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border p-2 ${
                      notification.read ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav(notification.nav);
                        setAlertsOpen(false);
                      }}
                      className="w-full text-left"
                    >
                      <p className="text-xs font-semibold text-gray-800">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{notification.detail}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">{formatDateTime(notification.createdAt)}</p>
                    </button>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setNotificationReadState(notification.id, !notification.read)}
                        className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        Mark as {notification.read ? "unread" : "read"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteNotification(notification.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}
      </main>
    </>
  );
}

function splitLineItems(value: string): string[] {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAttributeLines(value: string): Array<{ label: string; value: string }> {
  return splitLineItems(value)
    .map((line) => {
      const dividerIndex = line.indexOf(":");
      if (dividerIndex < 1) {
        return null;
      }

      const label = line.slice(0, dividerIndex).trim();
      const attrValue = line.slice(dividerIndex + 1).trim();
      if (!label || !attrValue) {
        return null;
      }

      return { label, value: attrValue };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function parseVariantLines(value: string): VendorProductUpsertInput["variantData"] {
  return splitLineItems(value)
    .map((line) => {
      const [size, color, mrpToken, sellingToken, stockToken, image] = line.split("|").map((part) => part.trim());
      if (!size || !color) {
        return null;
      }

      const mrp = Number(mrpToken);
      const sellingPrice = Number(sellingToken);
      const stock = Number(stockToken);

      return {
        size,
        color,
        mrp: Number.isFinite(mrp) ? mrp : 0,
        sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        image: String(image || "").trim(),
      };
    })
    .filter((item): item is NonNullable<VendorProductUpsertInput["variantData"]>[number] => Boolean(item));
}

function getDefaultProductForm(vendor: VendorSession | null): VendorProductFormState {
  return {
    categorySlug: "",
    subcategorySlug: "",
    productName: "",
    shortDescription: "",
    description: "",
    image: "",
    heroImage: "",
    subcategoryImage: "",
    galleryText: "",
    price: "",
    oldPrice: "",
    inventory: "",
    moq: "1",
    badge: "",
    brand: "",
    sellerName: String(vendor?.businessName || "").trim(),
    vendorSource: "vendor_panel",
    rating: "0",
    reviews: "0",
    deliveryByText: "",
    shippingLabel: "",
    shippingTimeline: "",
    isCancellable: true,
    isReturnable: true,
    highlightsText: "",
    keyAttributesText: "",
    specificationsText: "",
    tagsText: "",
    variantDataText: "",
    status: "draft",
    storePlacement: "none",
  };
}

function toProductFormState(product: VendorProductRecord, vendor: VendorSession | null): VendorProductFormState {
  const placementInput = String(product.storePlacement || "").trim().toLowerCase();
  const storePlacement =
    placementInput === "featured" || placementInput === "trending" ? placementInput : "none";

  return {
    categorySlug: product.categorySlug,
    subcategorySlug: product.subcategorySlug,
    productName: product.productName,
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    image: product.image || "",
    heroImage: product.heroImage || "",
    subcategoryImage: product.subcategoryImage || "",
    galleryText: Array.isArray(product.gallery) ? product.gallery.join("\n") : "",
    price: String(product.price || ""),
    oldPrice: String(product.oldPrice || ""),
    inventory: String(product.inventory || ""),
    moq: String(product.moq || "1"),
    badge: product.badge || "",
    brand: product.brand || "",
    sellerName: product.sellerName || String(vendor?.businessName || "").trim(),
    vendorSource: product.vendorSource || "vendor_panel",
    rating: String(product.rating || 0),
    reviews: String(product.reviews || 0),
    deliveryByText: product.deliveryByText || "",
    shippingLabel: product.shippingLabel || "",
    shippingTimeline: product.shippingTimeline || "",
    isCancellable: Boolean(product.isCancellable),
    isReturnable: Boolean(product.isReturnable),
    highlightsText: Array.isArray(product.highlights) ? product.highlights.join("\n") : "",
    keyAttributesText: Array.isArray(product.keyAttributes)
      ? product.keyAttributes.map((item) => `${item.label}: ${item.value}`).join("\n")
      : "",
    specificationsText: Array.isArray(product.specifications)
      ? product.specifications.map((item) => `${item.label}: ${item.value}`).join("\n")
      : "",
    tagsText: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    variantDataText: Array.isArray(product.variantData)
      ? product.variantData
          .map((variant) => `${variant.size}|${variant.color}|${variant.mrp}|${variant.sellingPrice}|${variant.stock}|${variant.image || ""}`)
          .join("\n")
      : "",
    status: product.status,
    storePlacement,
  };
}

function buildVendorProductPayload(
  form: VendorProductFormState,
  categories: VendorCatalogCategory[],
  vendor: VendorSession | null
): VendorProductUpsertInput {
  const selectedCategory = categories.find((category) => category.slug === form.categorySlug) || null;
  const selectedSubcategory = selectedCategory?.subcategories.find((item) => item.slug === form.subcategorySlug) || null;

  const price = Number(form.price);
  const oldPrice = Number(form.oldPrice);
  const inventory = Number(form.inventory);
  const moq = Number(form.moq);
  const rating = Number(form.rating);
  const reviews = Number(form.reviews);
  const placementInput = String(form.storePlacement || "").trim().toLowerCase();
  const storePlacement = placementInput === "featured" || placementInput === "trending" ? placementInput : undefined;

  return {
    categorySlug: form.categorySlug,
    categoryLabel: selectedCategory?.name || form.categorySlug,
    subcategorySlug: form.subcategorySlug,
    subcategoryName: selectedSubcategory?.name || form.subcategorySlug,
    productName: form.productName,
    shortDescription: String(form.shortDescription || "").trim(),
    description: String(form.description || "").trim(),
    image: String(form.image || "").trim(),
    heroImage: String(form.heroImage || "").trim(),
    subcategoryImage: String(form.subcategoryImage || "").trim(),
    gallery: splitLineItems(form.galleryText),
    price: Number.isFinite(price) ? Math.max(0, price) : 0,
    oldPrice: Number.isFinite(oldPrice) ? Math.max(0, oldPrice) : 0,
    inventory: Number.isFinite(inventory) ? Math.max(0, inventory) : 0,
    moq: Number.isFinite(moq) ? Math.max(1, moq) : 1,
    badge: String(form.badge || "").trim(),
    brand: String(form.brand || "").trim(),
    sellerName: String(form.sellerName || vendor?.businessName || "").trim(),
    vendorSource: String(form.vendorSource || "vendor_panel").trim() || "vendor_panel",
    rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
    reviews: Number.isFinite(reviews) ? Math.max(0, Math.floor(reviews)) : 0,
    deliveryByText: String(form.deliveryByText || "").trim(),
    shippingLabel: String(form.shippingLabel || "").trim(),
    shippingTimeline: String(form.shippingTimeline || "").trim(),
    isCancellable: Boolean(form.isCancellable),
    isReturnable: Boolean(form.isReturnable),
    highlights: splitLineItems(form.highlightsText),
    keyAttributes: parseAttributeLines(form.keyAttributesText),
    specifications: parseAttributeLines(form.specificationsText),
    tags: String(form.tagsText || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    variantData: parseVariantLines(form.variantDataText),
    status: form.status,
    storePlacement,
    sourcePlatform: "winkget_vendor",
  };
}