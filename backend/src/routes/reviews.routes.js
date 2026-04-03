const express = require("express");
const jwt = require("jsonwebtoken");
const Review = require("../models/Review");
const User = require("../models/User");

const router = express.Router();

const AUTH_COOKIE_NAME = "winkget_auth";
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const BUSINESS_KEY_REGEX = /^[a-zA-Z0-9:_-]{1,120}$/;

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const resolveTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
};

const normalizeBusinessId = (value) => String(value || "").trim();

const isValidBusinessId = (value) => BUSINESS_KEY_REGEX.test(value) || OBJECT_ID_REGEX.test(value);

const toAuthorName = (user, preferredName) => {
  const fromInput = String(preferredName || "").trim();
  if (fromInput) return fromInput.slice(0, 120);

  const fallback = String(
    user?.name || user?.businessName || user?.email || user?.phone || "Winkget User"
  ).trim();

  return fallback.slice(0, 120);
};

const roundRating = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(2));
};

const toReviewPayload = (review) => ({
  id: String(review._id),
  businessId: review.businessKey,
  reviewerId: review.reviewer ? String(review.reviewer._id || review.reviewer) : "",
  author: review.authorName,
  rating: Number(review.rating || 0),
  comment: review.comment,
  createdAt: review.createdAt,
});

const getBusinessSummary = async (businessId) => {
  const rows = await Review.aggregate([
    {
      $match: {
        businessKey: businessId,
        isVisible: true,
      },
    },
    {
      $group: {
        _id: "$businessKey",
        reviews: { $sum: 1 },
        rating: { $avg: "$rating" },
      },
    },
  ]);

  if (!rows[0]) {
    return { rating: 0, reviews: 0 };
  }

  return {
    rating: roundRating(rows[0].rating),
    reviews: Number(rows[0].reviews || 0),
  };
};

const resolveAuthenticatedUser = async (req) => {
  const token = resolveTokenFromRequest(req);
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id role name businessName email phone");
    return user || null;
  } catch {
    return null;
  }
};

const requireAuth = async (req, res, next) => {
  const user = await resolveAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: "Please login to continue" });
  }

  req.authUser = user;
  return next();
};

router.get("/reviews", async (req, res) => {
  try {
    const businessId = normalizeBusinessId(req.query.businessId);
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 200);

    if (!businessId || !isValidBusinessId(businessId)) {
      return res.status(400).json({ ok: false, message: "Invalid business id" });
    }

    const [reviews, summary, viewer] = await Promise.all([
      Review.find({
        businessKey: businessId,
        isVisible: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("_id businessKey reviewer authorName rating comment createdAt"),
      getBusinessSummary(businessId),
      resolveAuthenticatedUser(req),
    ]);

    let viewerHasReviewed = false;
    if (viewer?._id) {
      viewerHasReviewed = Boolean(
        await Review.exists({
          businessKey: businessId,
          reviewer: viewer._id,
        })
      );
    }

    return res.status(200).json({
      ok: true,
      summary,
      viewerHasReviewed,
      reviews: reviews.map(toReviewPayload),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load reviews", error: error.message });
  }
});

router.post("/reviews", requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser;
    const businessId = normalizeBusinessId(req.body?.businessId);
    const rating = Number(req.body?.rating || 0);
    const comment = String(req.body?.comment || "").trim();
    const authorName = toAuthorName(authUser, req.body?.authorName);

    if (!businessId || !isValidBusinessId(businessId)) {
      return res.status(400).json({ ok: false, message: "Invalid business id" });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, message: "Rating must be between 1 and 5" });
    }

    if (!comment || comment.length < 5) {
      return res.status(400).json({ ok: false, message: "Please write a meaningful review" });
    }

    let vendorId;
    if (OBJECT_ID_REGEX.test(businessId)) {
      const vendor = await User.findOne({
        _id: businessId,
        role: "vendor",
        vendorStatus: "approved",
      }).select("_id");

      if (!vendor) {
        return res.status(404).json({ ok: false, message: "Business not found" });
      }

      vendorId = vendor._id;
    }

    const review = await Review.create({
      businessKey: businessId,
      vendor: vendorId,
      reviewer: authUser._id,
      authorName,
      rating,
      comment,
      isVisible: true,
    });

    const summary = await getBusinessSummary(businessId);

    return res.status(201).json({
      ok: true,
      message: "Review submitted successfully",
      review: toReviewPayload(review),
      summary,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "You have already reviewed this business" });
    }

    return res.status(500).json({ ok: false, message: "Failed to submit review", error: error.message });
  }
});

module.exports = router;
