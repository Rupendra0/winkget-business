const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FailureLog = require("../models/FailureLog");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createToken = (user) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
    secret,
    { expiresIn: "3d" }
  );
};

router.post("/auth/signup", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const emailInput = String(req.body?.email || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");
    const email = emailInput ? emailInput.toLowerCase() : "";

    if (!name || !password) {
      return res.status(400).json({ ok: false, message: "Name and password are required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "Email or phone is required" });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    const duplicateChecks = [];
    if (email) duplicateChecks.push({ email });
    if (phone) duplicateChecks.push({ phone });

    const existing = duplicateChecks.length > 0 ? await User.findOne({ $or: duplicateChecks }) : null;
    if (existing) {
      return res.status(409).json({ ok: false, message: "Account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      passwordHash,
      role: "customer",
      provider: "credentials",
    });

    const token = createToken(user);

    return res.status(201).json({
      ok: true,
      message: "Signup successful",
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    await FailureLog.create({
      source: "backend-auth-signup",
      type: "failure",
      message: "Signup failed",
      role: "customer",
      metadata: { error: error.message },
    });

    return res.status(500).json({ ok: false, message: "Signup failed", error: error.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Identifier and password are required" });
    }

    const normalized = identifier.toLowerCase();
    const user = await User.findOne({ $or: [{ email: normalized }, { phone: identifier }] });

    if (!user || !user.passwordHash) {
      await FailureLog.create({
        source: "backend-auth-login",
        type: "failure",
        message: "Login failed: user not found",
        metadata: { identifier },
      });
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await FailureLog.create({
        source: "backend-auth-login",
        type: "failure",
        message: "Login failed: invalid password",
        role: user.role,
        metadata: { identifier },
      });
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const token = createToken(user);

    return res.status(200).json({
      ok: true,
      message: "Login successful",
      token,
      user: {
        id: String(user._id),
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    await FailureLog.create({
      source: "backend-auth-login",
      type: "failure",
      message: "Login failed: internal error",
      metadata: { error: error.message },
    });

    return res.status(500).json({ ok: false, message: "Login failed", error: error.message });
  }
});

router.post("/auth/vendor/signup", async (req, res) => {
  try {
    const businessName = String(req.body?.businessName || "").trim();
    const ownerName = String(req.body?.ownerName || "").trim();
    const emailInput = String(req.body?.email || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");
    const email = emailInput ? emailInput.toLowerCase() : "";

    if (!businessName || !ownerName || !password) {
      return res.status(400).json({ ok: false, message: "Business name, owner name and password are required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "Email or phone is required" });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    const duplicateChecks = [];
    if (email) duplicateChecks.push({ email });
    if (phone) duplicateChecks.push({ phone });
    const existing = duplicateChecks.length > 0 ? await User.findOne({ $or: duplicateChecks }) : null;

    if (existing) {
      return res.status(409).json({ ok: false, message: "Account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: ownerName,
      businessName,
      email: email || undefined,
      phone: phone || undefined,
      passwordHash,
      provider: "credentials",
      role: "vendor",
    });

    return res.status(201).json({
      ok: true,
      message: "Vendor registered successfully",
      user: {
        id: String(user._id),
        name: user.name,
        businessName: user.businessName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    await FailureLog.create({
      source: "backend-vendor-signup",
      type: "failure",
      message: "Vendor signup failed",
      role: "vendor",
      metadata: { error: error.message },
    });

    return res.status(500).json({ ok: false, message: "Vendor signup failed", error: error.message });
  }
});

router.post("/auth/vendor/login", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Identifier and password are required" });
    }

    const normalized = identifier.toLowerCase();
    const user = await User.findOne({
      role: "vendor",
      $or: [{ email: normalized }, { phone: identifier }],
    });

    if (!user || !user.passwordHash) {
      await FailureLog.create({
        source: "backend-vendor-login",
        type: "failure",
        message: "Vendor login failed: user not found",
        role: "vendor",
        metadata: { identifier },
      });
      return res.status(401).json({ ok: false, message: "Invalid vendor credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await FailureLog.create({
        source: "backend-vendor-login",
        type: "failure",
        message: "Vendor login failed: invalid password",
        role: "vendor",
        metadata: { identifier },
      });
      return res.status(401).json({ ok: false, message: "Invalid vendor credentials" });
    }

    const token = createToken(user);

    return res.status(200).json({
      ok: true,
      message: "Vendor login successful",
      token,
      user: {
        id: String(user._id),
        name: user.name,
        businessName: user.businessName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    await FailureLog.create({
      source: "backend-vendor-login",
      type: "failure",
      message: "Vendor login failed: internal error",
      role: "vendor",
      metadata: { error: error.message },
    });

    return res.status(500).json({ ok: false, message: "Vendor login failed", error: error.message });
  }
});

module.exports = router;
