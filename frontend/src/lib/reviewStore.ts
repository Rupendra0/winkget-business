export type BusinessReview = {
  id: string;
  businessId: string;
  reviewerId?: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type BusinessReviewSummary = {
  rating: number;
  reviews: number;
};

type SummaryCache = Record<string, BusinessReviewSummary>;

type FetchBusinessReviewsResult =
  | {
      ok: true;
      summary: BusinessReviewSummary;
      reviews: BusinessReview[];
      viewerHasReviewed: boolean;
    }
  | {
      ok: false;
      message: string;
      summary: BusinessReviewSummary;
      reviews: BusinessReview[];
      viewerHasReviewed: boolean;
    };

type SubmitBusinessReviewInput = {
  businessId: string;
  aliasBusinessIds?: string[];
  rating: number;
  comment: string;
  authorName?: string;
};

type SubmitBusinessReviewResult =
  | { ok: true; review: BusinessReview; summary: BusinessReviewSummary }
  | { ok: false; message: string };

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const SUMMARY_CACHE_KEY = "winkget_review_summary_cache_v1";
const UPDATE_EVENT = "winkget:reviews-updated";

const canUseStorage = () => typeof window !== "undefined";

const normalizeBusinessId = (value: string) => String(value || "").trim();

const roundRating = (value: number) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(2));
};

const normalizeBusinessIds = (businessIds: string[]) =>
  Array.from(new Set((businessIds || []).map(normalizeBusinessId).filter(Boolean)));

const readSummaryCache = (): SummaryCache => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(SUMMARY_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const cache: SummaryCache = {};
    for (const [businessId, summary] of Object.entries(parsed as Record<string, unknown>)) {
      if (!summary || typeof summary !== "object") continue;

      const payload = summary as Partial<BusinessReviewSummary>;
      const rating = roundRating(Number(payload.rating || 0));
      const reviews = Math.max(0, Number(payload.reviews || 0));

      cache[businessId] = { rating, reviews };
    }

    return cache;
  } catch {
    return {};
  }
};

const writeSummaryCache = (cache: SummaryCache) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

const cacheReviewSummary = (businessIds: string[], summary: BusinessReviewSummary) => {
  const ids = normalizeBusinessIds(businessIds);
  if (ids.length === 0 || !canUseStorage()) return;

  const cache = readSummaryCache();
  const normalized = {
    rating: roundRating(summary.rating),
    reviews: Math.max(0, Number(summary.reviews || 0)),
  };

  for (const businessId of ids) {
    cache[businessId] = normalized;
  }

  writeSummaryCache(cache);
};

const toApiErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || fallback;
  } catch {
    return fallback;
  }
};

export const getBusinessReviewAggregate = (
  businessId: string,
  baseRating: number,
  baseReviews: number
): BusinessReviewSummary => {
  const normalizedId = normalizeBusinessId(businessId);
  if (!normalizedId) {
    return {
      rating: roundRating(Number(baseRating || 0)),
      reviews: Math.max(0, Number(baseReviews || 0)),
    };
  }

  const cache = readSummaryCache();
  const cached = cache[normalizedId];
  if (cached) {
    return {
      rating: roundRating(cached.rating),
      reviews: Math.max(0, Number(cached.reviews || 0)),
    };
  }

  return {
    rating: roundRating(Number(baseRating || 0)),
    reviews: Math.max(0, Number(baseReviews || 0)),
  };
};

export const fetchBusinessReviews = async (
  businessId: string,
  limit = 50
): Promise<FetchBusinessReviewsResult> => {
  const normalizedBusinessId = normalizeBusinessId(businessId);
  if (!normalizedBusinessId) {
    return {
      ok: false,
      message: "Invalid business id",
      summary: { rating: 0, reviews: 0 },
      reviews: [],
      viewerHasReviewed: false,
    };
  }

  try {
    const query = new URLSearchParams({
      businessId: normalizedBusinessId,
      limit: String(Math.min(Math.max(limit, 1), 200)),
    });

    const response = await fetch(`${BACKEND_URL}/api/reviews?${query.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await toApiErrorMessage(response, "Failed to load reviews");
      return {
        ok: false,
        message,
        summary: { rating: 0, reviews: 0 },
        reviews: [],
        viewerHasReviewed: false,
      };
    }

    const payload = (await response.json()) as {
      ok: boolean;
      summary?: BusinessReviewSummary;
      reviews?: BusinessReview[];
      viewerHasReviewed?: boolean;
      message?: string;
    };

    if (!payload.ok) {
      return {
        ok: false,
        message: payload.message || "Failed to load reviews",
        summary: { rating: 0, reviews: 0 },
        reviews: [],
        viewerHasReviewed: false,
      };
    }

    const summary: BusinessReviewSummary = {
      rating: roundRating(Number(payload.summary?.rating || 0)),
      reviews: Math.max(0, Number(payload.summary?.reviews || 0)),
    };
    const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];

    cacheReviewSummary([normalizedBusinessId], summary);

    return {
      ok: true,
      summary,
      reviews,
      viewerHasReviewed: Boolean(payload.viewerHasReviewed),
    };
  } catch {
    return {
      ok: false,
      message: "Failed to load reviews",
      summary: { rating: 0, reviews: 0 },
      reviews: [],
      viewerHasReviewed: false,
    };
  }
};

export const submitBusinessReview = async (
  input: SubmitBusinessReviewInput
): Promise<SubmitBusinessReviewResult> => {
  const normalizedBusinessId = normalizeBusinessId(input.businessId);
  if (!normalizedBusinessId) {
    return { ok: false, message: "Business not found for review" };
  }

  const rating = Math.max(1, Math.min(5, Number(input.rating || 0)));
  const comment = String(input.comment || "").trim();

  if (!comment) {
    return { ok: false, message: "Please write your review" };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        businessId: normalizedBusinessId,
        rating,
        comment,
        authorName: input.authorName,
      }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      message?: string;
      review?: BusinessReview;
      summary?: BusinessReviewSummary;
    };

    if (!response.ok || !payload.ok || !payload.review || !payload.summary) {
      return { ok: false, message: payload.message || "Failed to submit review" };
    }

    const normalizedSummary: BusinessReviewSummary = {
      rating: roundRating(Number(payload.summary.rating || 0)),
      reviews: Math.max(0, Number(payload.summary.reviews || 0)),
    };

    cacheReviewSummary(
      [normalizedBusinessId, ...(input.aliasBusinessIds || [])],
      normalizedSummary
    );

    return {
      ok: true,
      review: payload.review,
      summary: normalizedSummary,
    };
  } catch {
    return { ok: false, message: "Failed to submit review" };
  }
};

export const subscribeReviewUpdates = (listener: () => void): (() => void) => {
  if (!canUseStorage()) {
    return () => undefined;
  }

  const onUpdate = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === SUMMARY_CACHE_KEY) {
      listener();
    }
  };

  window.addEventListener(UPDATE_EVENT, onUpdate);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, onUpdate);
    window.removeEventListener("storage", onStorage);
  };
};
