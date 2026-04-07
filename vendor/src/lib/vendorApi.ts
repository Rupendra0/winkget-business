const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

export type VendorSession = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessAddress?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  businessDescription?: string;
  image?: string;
  shopBannerImage?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  vendorStatus?: "pending" | "approved" | "rejected";
  shopOpeningTime?: string;
  shopClosingTime?: string;
  serviceTags?: string[];
};

export type InquiryStatus = "Open" | "In Progress" | "Closed";

export type VendorInquiry = {
  id: string;
  subject: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  channel: "Web" | "Email" | "Phone";
  status: InquiryStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorCityLocality = {
  id: string;
  name: string;
  slug: string;
};

export type VendorCity = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  localities: VendorCityLocality[];
};

export type VendorInquirySummary = {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
};

export type VendorInquirySnapshot = {
  summary: VendorInquirySummary;
  inquiries: VendorInquiry[];
};

export type VendorProfileUpdateInput = {
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessAddress?: string;
  website?: string;
  businessDescription?: string;
  image?: string;
  shopBannerImage?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  serviceTags?: string[];
};

export type VendorReviewSummary = {
  rating: number;
  reviews: number;
};

export type VendorReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type VendorReviewSnapshot = {
  summary: VendorReviewSummary;
  reviews: VendorReview[];
};

function normalizeVendorSession(user: VendorSession | null | undefined): VendorSession | null {
  if (!user || user.role !== "vendor") {
    return null;
  }

  return {
    ...user,
    serviceTags: Array.isArray(user.serviceTags)
      ? user.serviceTags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [],
    shopGallery: Array.isArray(user.shopGallery)
      ? user.shopGallery.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const method = init?.method || "GET";
  const headers = {
    Accept: "application/json",
    ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers || {}),
  };

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers,
    body: init?.body,
  });

  const payload = (await response.json().catch(() => ({ ok: false, message: "Invalid server response" }))) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function fetchVendorSession(): Promise<VendorSession | null> {
  try {
    const payload = await requestJson<{ user: VendorSession }>("/api/auth/me");
    return normalizeVendorSession(payload.user);
  } catch {
    return null;
  }
}

export async function loginVendor(identifier: string, password: string): Promise<VendorSession> {
  const payload = await requestJson<{ user: VendorSession }>("/api/auth/vendor/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

  const normalizedUser = normalizeVendorSession(payload.user);
  if (!normalizedUser) {
    throw new Error("Vendor account required");
  }

  return normalizedUser;
}

export async function logoutVendor(): Promise<void> {
  await requestJson<Record<string, never>>("/api/auth/logout", {
    method: "POST",
  });
}

export async function updateVendorProfile(input: VendorProfileUpdateInput): Promise<VendorSession> {
  const payload = await requestJson<{ user: VendorSession }>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  const normalizedUser = normalizeVendorSession(payload.user);
  if (!normalizedUser) {
    throw new Error("Vendor account required");
  }

  return normalizedUser;
}

export async function fetchVendorInquiries(
  options?: {
    status?: InquiryStatus;
    search?: string;
    limit?: number;
  }
): Promise<VendorInquirySnapshot> {
  const fallback: VendorInquirySnapshot = {
    summary: {
      total: 0,
      open: 0,
      inProgress: 0,
      closed: 0,
    },
    inquiries: [],
  };

  const queryParams = new URLSearchParams();
  const status = String(options?.status || "").trim();
  const search = String(options?.search || "").trim();
  const limit = Number.isFinite(Number(options?.limit)) ? Number(options?.limit) : 120;

  if (status) queryParams.set("status", status);
  if (search) queryParams.set("search", search);
  queryParams.set("limit", String(Math.max(1, Math.min(500, limit))));

  try {
    const payload = await requestJson<{
      summary?: Partial<VendorInquirySummary>;
      inquiries?: Array<Partial<VendorInquiry>>;
    }>(`/api/inquiries/vendor?${queryParams.toString()}`);

    const summaryInput = payload.summary || {};
    const inquiries = Array.isArray(payload.inquiries)
      ? payload.inquiries.map((inquiry, index) => {
          const statusValue = String(inquiry.status || "Open") as InquiryStatus;
          return {
            id: String(inquiry.id || `inquiry-${index}`),
            subject: String(inquiry.subject || "Inquiry").trim() || "Inquiry",
            name: String(inquiry.name || "Customer").trim() || "Customer",
            phone: String(inquiry.phone || "").trim(),
            email: String(inquiry.email || "").trim() || undefined,
            message: String(inquiry.message || "").trim(),
            channel: (inquiry.channel === "Phone" || inquiry.channel === "Email" ? inquiry.channel : "Web") as
              | "Web"
              | "Email"
              | "Phone",
            status:
              statusValue === "In Progress" || statusValue === "Closed" || statusValue === "Open"
                ? statusValue
                : "Open",
            adminNote: String(inquiry.adminNote || "").trim() || undefined,
            createdAt: String(inquiry.createdAt || ""),
            updatedAt: String(inquiry.updatedAt || ""),
          };
        })
      : [];

    return {
      summary: {
        total: Number.isFinite(Number(summaryInput.total)) ? Number(summaryInput.total) : inquiries.length,
        open: Number.isFinite(Number(summaryInput.open))
          ? Number(summaryInput.open)
          : inquiries.filter((inquiry) => inquiry.status === "Open").length,
        inProgress: Number.isFinite(Number(summaryInput.inProgress))
          ? Number(summaryInput.inProgress)
          : inquiries.filter((inquiry) => inquiry.status === "In Progress").length,
        closed: Number.isFinite(Number(summaryInput.closed))
          ? Number(summaryInput.closed)
          : inquiries.filter((inquiry) => inquiry.status === "Closed").length,
      },
      inquiries,
    };
  } catch {
    return fallback;
  }
}

export async function updateVendorInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<VendorInquiry> {
  const normalizedId = String(inquiryId || "").trim();
  if (!normalizedId) {
    throw new Error("Inquiry id is required");
  }

  const payload = await requestJson<{
    inquiry?: Partial<VendorInquiry>;
  }>(`/api/inquiries/vendor/${encodeURIComponent(normalizedId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  const inquiry = payload.inquiry;
  if (!inquiry) {
    throw new Error("Failed to update inquiry");
  }

  const statusValue = String(inquiry.status || "Open") as InquiryStatus;
  return {
    id: String(inquiry.id || normalizedId),
    subject: String(inquiry.subject || "Inquiry").trim() || "Inquiry",
    name: String(inquiry.name || "Customer").trim() || "Customer",
    phone: String(inquiry.phone || "").trim(),
    email: String(inquiry.email || "").trim() || undefined,
    message: String(inquiry.message || "").trim(),
    channel: (inquiry.channel === "Phone" || inquiry.channel === "Email" ? inquiry.channel : "Web") as
      | "Web"
      | "Email"
      | "Phone",
    status:
      statusValue === "In Progress" || statusValue === "Closed" || statusValue === "Open"
        ? statusValue
        : "Open",
    adminNote: String(inquiry.adminNote || "").trim() || undefined,
    createdAt: String(inquiry.createdAt || ""),
    updatedAt: String(inquiry.updatedAt || ""),
  };
}

export async function fetchVendorCities(): Promise<VendorCity[]> {
  try {
    const payload = await requestJson<{
      cities?: Array<
        Partial<VendorCity> & {
          localities?: Array<Partial<VendorCityLocality>>;
        }
      >;
    }>("/api/cities");

    if (!Array.isArray(payload.cities)) {
      return [];
    }

    const normalizedCities: VendorCity[] = [];

    payload.cities.forEach((city, cityIndex) => {
      const cityId = String(city.id || `city-${cityIndex}`);
      const cityName = String(city.name || "").trim();
      const citySlug = String(city.slug || "").trim();

      if (!cityName) {
        return;
      }

      const localities: VendorCityLocality[] = [];
      if (Array.isArray(city.localities)) {
        city.localities.forEach((locality, localityIndex) => {
          const localityName = String(locality.name || "").trim();
          if (!localityName) {
            return;
          }

          localities.push({
            id: String(locality.id || `${cityId}-locality-${localityIndex}`),
            name: localityName,
            slug:
              String(locality.slug || "").trim() ||
              localityName.toLowerCase().replace(/\s+/g, "-"),
          });
        });
      }

      normalizedCities.push({
        id: cityId,
        name: cityName,
        slug: citySlug || cityName.toLowerCase().replace(/\s+/g, "-"),
        state: String(city.state || "").trim() || undefined,
        localities,
      });
    });

    return normalizedCities;
  } catch {
    return [];
  }
}

export async function fetchVendorReviewSnapshot(businessId: string): Promise<VendorReviewSnapshot> {
  const fallback: VendorReviewSnapshot = {
    summary: {
      rating: 0,
      reviews: 0,
    },
    reviews: [],
  };

  const normalizedBusinessId = String(businessId || "").trim();
  if (!normalizedBusinessId) {
    return fallback;
  }

  try {
    const payload = await requestJson<{
      summary?: VendorReviewSummary;
      reviews?: Array<{
        id?: string;
        author?: string;
        rating?: number;
        comment?: string;
        createdAt?: string;
      }>;
    }>(`/api/reviews?businessId=${encodeURIComponent(normalizedBusinessId)}&limit=8`);

    const summary = payload.summary || fallback.summary;
    const reviews = Array.isArray(payload.reviews)
      ? payload.reviews.map((review, index) => ({
          id: String(review.id || `review-${index}`),
          author: String(review.author || "Winkget User").trim() || "Winkget User",
          rating: Number.isFinite(Number(review.rating)) ? Number(review.rating) : 0,
          comment: String(review.comment || "").trim(),
          createdAt: String(review.createdAt || ""),
        }))
      : [];

    return {
      summary: {
        rating: Number.isFinite(Number(summary.rating)) ? Number(summary.rating) : 0,
        reviews: Number.isFinite(Number(summary.reviews)) ? Number(summary.reviews) : 0,
      },
      reviews,
    };
  } catch {
    return fallback;
  }
}
