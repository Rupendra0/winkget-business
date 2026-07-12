const express = require("express");
const jwt = require("jsonwebtoken");
const Address = require("../models/Address");
const User = require("../models/User");
const { resolveTokenFromRequest } = require("../lib/authCookies");

const router = express.Router();

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const normalizeString = (value) => String(value || "").trim();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

const requireAuthenticated = (authContext) => async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, authContext);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select("_id role name email phone vendorStatus")
      .lean();

    if (!user) {
      return res.status(401).json({ ok: false, message: "Session expired" });
    }

    req.authUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

const requireCustomer = (req, res, next) => {
  if (!req.authUser || req.authUser.role !== "customer") {
    return res.status(403).json({ ok: false, message: "Customer access required" });
  }
  return next();
};

// GET /api/addresses
router.get("/addresses", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.authUser._id }).sort({ createdAt: -1 });
    return res.status(200).json({ ok: true, addresses });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to fetch addresses", error: error.message });
  }
});

// POST /api/addresses
router.post("/addresses", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const fullName = normalizeString(req.body?.fullName);
    const phone = normalizePhone(req.body?.phone);
    const line1 = normalizeString(req.body?.line1);
    const line2 = normalizeString(req.body?.line2) || undefined;
    const landmark = normalizeString(req.body?.landmark) || undefined;
    const city = normalizeString(req.body?.city);
    const state = normalizeString(req.body?.state);
    const postalCode = normalizeString(req.body?.postalCode);
    const tag = normalizeString(req.body?.tag) || "Home";

    if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
      return res.status(400).json({ ok: false, message: "Required address fields are missing" });
    }

    const address = await Address.create({
      user: req.authUser._id,
      fullName,
      phone,
      line1,
      line2,
      landmark,
      city,
      state,
      postalCode,
      tag
    });

    return res.status(201).json({ ok: true, message: "Address saved successfully", address });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to save address", error: error.message });
  }
});

// PUT /api/addresses/:id
router.put("/addresses/:id", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const fullName = normalizeString(req.body?.fullName);
    const phone = normalizePhone(req.body?.phone);
    const line1 = normalizeString(req.body?.line1);
    const line2 = normalizeString(req.body?.line2) || undefined;
    const landmark = normalizeString(req.body?.landmark) || undefined;
    const city = normalizeString(req.body?.city);
    const state = normalizeString(req.body?.state);
    const postalCode = normalizeString(req.body?.postalCode);
    const tag = normalizeString(req.body?.tag) || "Home";

    if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
      return res.status(400).json({ ok: false, message: "Required address fields are missing" });
    }

    const address = await Address.findOneAndUpdate(
      { _id: id, user: req.authUser._id },
      {
        fullName,
        phone,
        line1,
        line2,
        landmark,
        city,
        state,
        postalCode,
        tag
      },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ ok: false, message: "Address not found or unauthorized" });
    }

    return res.status(200).json({ ok: true, message: "Address updated successfully", address });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update address", error: error.message });
  }
});

// DELETE /api/addresses/:id
router.delete("/addresses/:id", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.authUser._id });

    if (!address) {
      return res.status(404).json({ ok: false, message: "Address not found or unauthorized" });
    }

    return res.status(200).json({ ok: true, message: "Address deleted successfully" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete address", error: error.message });
  }
});

module.exports = router;
