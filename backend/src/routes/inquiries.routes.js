const express = require("express");
const jwt = require("jsonwebtoken");
const Inquiry = require("../models/Inquiry");
const User = require("../models/User");
const { resolveTokenFromRequest } = require("../lib/authCookies");

const router = express.Router();
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const INQUIRY_STATUS_VALUES = new Set(["Open", "In Progress", "Closed"]);
const INQUIRY_CHANNEL_VALUES = new Set(["Web", "Email", "Phone"]);

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireAdmin = async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, "admin");
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id role").lean();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    req.adminUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

const requireVendor = async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, "vendor");
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select("_id role vendorStatus businessName businessPhone city state")
      .lean();
    if (!user || user.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor access required" });
    }

    req.vendorUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

const toInquirySummary = (inquiry) => {
  const vendor = inquiry.vendor && typeof inquiry.vendor === "object" ? inquiry.vendor : null;
  return {
    id: String(inquiry._id),
    subject: inquiry.subject,
    name: inquiry.name,
    phone: inquiry.phone,
    email: inquiry.email,
    message: inquiry.message,
    channel: inquiry.channel,
    status: inquiry.status,
    adminNote: inquiry.adminNote,
    vendor: vendor
      ? {
          id: String(vendor._id),
          businessName: vendor.businessName,
          businessPhone: vendor.businessPhone,
          city: vendor.city,
          state: vendor.state,
        }
      : undefined,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
};

router.post("/inquiries", async (req, res) => {
  try {
    const vendorId = String(req.body?.vendorId || "").trim();
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    const emailInput = String(req.body?.email || "").trim();
    const message = String(req.body?.message || "").trim();
    const subjectInput = String(req.body?.subject || "").trim();
    const channelInput = String(req.body?.channel || "").trim();

    if (!OBJECT_ID_REGEX.test(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    if (!name) {
      return res.status(400).json({ ok: false, message: "Your name is required" });
    }

    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ ok: false, message: "Phone must be exactly 10 digits" });
    }

    if (emailInput && !EMAIL_REGEX.test(emailInput.toLowerCase())) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (channelInput && !INQUIRY_CHANNEL_VALUES.has(channelInput)) {
      return res.status(400).json({ ok: false, message: "Invalid inquiry channel" });
    }

    if (!message || message.length < 8) {
      return res.status(400).json({ ok: false, message: "Please enter a detailed enquiry" });
    }

    const vendor = await User.findOne({ _id: vendorId, role: "vendor", vendorStatus: "approved" }).select(
      "_id businessName"
    );

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    const inquiry = await Inquiry.create({
      vendor: vendor._id,
      subject: subjectInput || `Enquiry for ${vendor.businessName || "shop"}`,
      name,
      phone,
      email: emailInput ? emailInput.toLowerCase() : undefined,
      message,
      channel: channelInput || "Web",
      status: "Open",
    });

    return res.status(201).json({
      ok: true,
      message: "Enquiry sent successfully",
      inquiry: toInquirySummary({ ...inquiry.toObject(), vendor }),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to submit enquiry", error: error.message });
  }
});

router.get("/inquiries", requireAdmin, async (req, res) => {
  try {
    const statusInput = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 500);

    const query = {};
    if (statusInput) {
      if (!INQUIRY_STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid inquiry status" });
      }
      query.status = statusInput;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ subject: regex }, { name: regex }, { phone: regex }, { email: regex }, { message: regex }];
    }

    const inquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id vendor subject name phone email message channel status adminNote createdAt updatedAt")
      .populate("vendor", "_id businessName businessPhone city state")
      .lean();

    return res.status(200).json({
      ok: true,
      inquiries: inquiries.map(toInquirySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load inquiries", error: error.message });
  }
});

router.get("/inquiries/vendor", requireVendor, async (req, res) => {
  try {
    const statusInput = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 500);

    const query = {
      vendor: req.vendorUser._id,
    };

    if (statusInput) {
      if (!INQUIRY_STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid inquiry status" });
      }
      query.status = statusInput;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ subject: regex }, { name: regex }, { phone: regex }, { email: regex }, { message: regex }];
    }

    const inquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id vendor subject name phone email message channel status adminNote createdAt updatedAt")
      .populate("vendor", "_id businessName businessPhone city state")
      .lean();

    const summary = inquiries.reduce(
      (acc, inquiry) => {
        const status = String(inquiry.status || "");
        acc.total += 1;
        if (status === "Open") acc.open += 1;
        if (status === "In Progress") acc.inProgress += 1;
        if (status === "Closed") acc.closed += 1;
        return acc;
      },
      { total: 0, open: 0, inProgress: 0, closed: 0 }
    );

    return res.status(200).json({
      ok: true,
      summary,
      inquiries: inquiries.map(toInquirySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor inquiries", error: error.message });
  }
});

router.patch("/inquiries/vendor/:id", requireVendor, async (req, res) => {
  try {
    const inquiryId = String(req.params.id || "").trim();
    const statusInput = String(req.body?.status || "").trim();

    if (!OBJECT_ID_REGEX.test(inquiryId)) {
      return res.status(400).json({ ok: false, message: "Invalid inquiry id" });
    }

    if (!statusInput || !INQUIRY_STATUS_VALUES.has(statusInput)) {
      return res.status(400).json({ ok: false, message: "Invalid inquiry status" });
    }

    const inquiry = await Inquiry.findOneAndUpdate(
      { _id: inquiryId, vendor: req.vendorUser._id },
      { status: statusInput },
      { new: true }
    )
      .select("_id vendor subject name phone email message channel status adminNote createdAt updatedAt")
      .populate("vendor", "_id businessName businessPhone city state")
      .lean();

    if (!inquiry) {
      return res.status(404).json({ ok: false, message: "Inquiry not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Inquiry status updated",
      inquiry: toInquirySummary(inquiry),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update inquiry", error: error.message });
  }
});

router.patch("/inquiries/:id", requireAdmin, async (req, res) => {
  try {
    const inquiryId = String(req.params.id || "").trim();
    const statusInput = String(req.body?.status || "").trim();
    const adminNoteInput = String(req.body?.adminNote || "").trim();

    if (!OBJECT_ID_REGEX.test(inquiryId)) {
      return res.status(400).json({ ok: false, message: "Invalid inquiry id" });
    }

    const update = {};
    if (statusInput) {
      if (!INQUIRY_STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid inquiry status" });
      }
      update.status = statusInput;
    }

    if (req.body?.adminNote !== undefined) {
      update.adminNote = adminNoteInput || undefined;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, message: "No valid update fields provided" });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(inquiryId, update, { new: true })
      .select("_id vendor subject name phone email message channel status adminNote createdAt updatedAt")
      .populate("vendor", "_id businessName businessPhone city state")
      .lean();

    if (!inquiry) {
      return res.status(404).json({ ok: false, message: "Inquiry not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Inquiry updated",
      inquiry: toInquirySummary(inquiry),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update inquiry", error: error.message });
  }
});

module.exports = router;
