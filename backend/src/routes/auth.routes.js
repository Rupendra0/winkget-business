const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const FailureLog = require("../models/FailureLog");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const POSTAL_REGEX = /^[0-9]{5,10}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ID_PROOF_TYPES = new Set(["aadhaar", "pan", "driving_license", "passport", "voter_id", "other"]);
const DOCUMENT_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp);base64,/i;
const MAX_DOCUMENT_DATA_LENGTH = 4 * 1024 * 1024;
const AUTH_COOKIE_NAME = "winkget_auth";

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const toCategoryReference = (category) => {
  if (!category) return undefined;

  const categoryId = category._id || category.id || category;
  if (!categoryId) return undefined;

  return {
    id: String(categoryId),
    name: category.name,
  };
};

const toSubcategoryReference = (subcategory) => {
  if (!subcategory) return undefined;

  const subcategoryId = subcategory._id || subcategory.id || subcategory;
  if (!subcategoryId) return undefined;

  return {
    id: String(subcategoryId),
    name: subcategory.name,
  };
};

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
    { expiresIn: "24h" }
  );
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  const clearOptions = {
    ...getCookieOptions(),
    maxAge: 0,
  };
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
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

router.post("/auth/signup", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const emailInput = String(req.body?.email || "").trim();
    const phoneInput = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");
    const email = emailInput ? emailInput.toLowerCase() : "";
    const phone = normalizePhone(phoneInput);

    if (!name || !password) {
      return res.status(400).json({ ok: false, message: "Name and password are required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "Email or phone is required" });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ ok: false, message: "Phone must be exactly 10 digits" });
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
      vendorStatus: "approved",
    });

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      ok: true,
      message: "Signup successful",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        vendorStatus: user.vendorStatus,
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
    const normalizedPhone = normalizePhone(identifier);
    const user = await User.findOne({
      $or: [{ email: normalized }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])],
    });

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
    setAuthCookie(res, token);

    return res.status(200).json({
      ok: true,
      message: "Login successful",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        vendorStatus: user.vendorStatus,
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
    const personalEmailInput = String(req.body?.personalEmail || req.body?.email || "").trim();
    const personalPhoneInput = String(req.body?.personalPhone || req.body?.phone || "").trim();
    const personalAlternatePhoneInput = String(req.body?.personalAlternatePhone || req.body?.alternatePhone || "").trim();
    const businessEmailInput = String(req.body?.businessEmail || "").trim();
    const businessPhoneInput = String(req.body?.businessPhone || "").trim();
    const businessAlternatePhoneInput = String(req.body?.businessAlternatePhone || "").trim();
    const businessCategoryId = String(req.body?.businessCategoryId || "").trim();
    const businessSubcategoryId = String(req.body?.businessSubcategoryId || "").trim();
    const businessAddress = String(req.body?.businessAddress || "").trim();
    const city = String(req.body?.city || "").trim();
    const state = String(req.body?.state || "").trim();
    const postalCode = String(req.body?.postalCode || "").trim();
    const gstNumber = String(req.body?.gstNumber || "").trim();
    const website = String(req.body?.website || "").trim();
    const businessDescription = String(req.body?.businessDescription || "").trim();
    const idProofType = String(req.body?.idProofType || "").trim().toLowerCase();
    const idProofNumber = String(req.body?.idProofNumber || "").trim();
    const idProofDocument = String(req.body?.idProofDocument || "").trim();
    const marketingOptIn = Boolean(req.body?.marketingOptIn);
    const yearsInBusinessInput = req.body?.yearsInBusiness;
    const password = String(req.body?.password || "");
    const personalEmail = personalEmailInput ? personalEmailInput.toLowerCase() : "";
    const personalPhone = normalizePhone(personalPhoneInput);
    const personalAlternatePhone = normalizePhone(personalAlternatePhoneInput);
    const businessEmail = businessEmailInput ? businessEmailInput.toLowerCase() : "";
    const businessPhone = normalizePhone(businessPhoneInput);
    const businessAlternatePhone = normalizePhone(businessAlternatePhoneInput);
    const yearsInBusiness =
      yearsInBusinessInput === undefined || yearsInBusinessInput === null || yearsInBusinessInput === ""
        ? undefined
        : Number(yearsInBusinessInput);

    if (!businessName || !ownerName || !password) {
      return res.status(400).json({ ok: false, message: "Business name, owner name and password are required" });
    }

    if (!personalEmail || !personalPhone) {
      return res.status(400).json({ ok: false, message: "Personal email and personal phone are required" });
    }

    if (!businessEmail || !businessPhone) {
      return res.status(400).json({ ok: false, message: "Business email and business phone are required" });
    }

    if (!businessCategoryId || !businessAddress || !city || !state || !postalCode) {
      return res.status(400).json({
        ok: false,
        message: "Business category, address, city, state and postal code are required",
      });
    }

    if (!idProofType || !idProofNumber || !idProofDocument) {
      return res.status(400).json({ ok: false, message: "ID proof type, number and document are required" });
    }

    if (!ID_PROOF_TYPES.has(idProofType)) {
      return res.status(400).json({ ok: false, message: "Invalid ID proof type" });
    }

    if (!EMAIL_REGEX.test(personalEmail)) {
      return res.status(400).json({ ok: false, message: "Invalid personal email format" });
    }

    if (!EMAIL_REGEX.test(businessEmail)) {
      return res.status(400).json({ ok: false, message: "Invalid business email format" });
    }

    if (!PHONE_REGEX.test(personalPhone)) {
      return res.status(400).json({ ok: false, message: "Personal phone must be exactly 10 digits" });
    }

    if (!PHONE_REGEX.test(businessPhone)) {
      return res.status(400).json({ ok: false, message: "Business phone must be exactly 10 digits" });
    }

    if (personalAlternatePhone && !PHONE_REGEX.test(personalAlternatePhone)) {
      return res.status(400).json({ ok: false, message: "Personal alternate phone must be exactly 10 digits" });
    }

    if (businessAlternatePhone && !PHONE_REGEX.test(businessAlternatePhone)) {
      return res.status(400).json({ ok: false, message: "Business alternate phone must be exactly 10 digits" });
    }

    if (!POSTAL_REGEX.test(postalCode)) {
      return res.status(400).json({ ok: false, message: "Invalid postal code" });
    }

    if (!OBJECT_ID_REGEX.test(businessCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business category" });
    }

    if (businessSubcategoryId && !OBJECT_ID_REGEX.test(businessSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
    }

    if (yearsInBusiness !== undefined && (Number.isNaN(yearsInBusiness) || yearsInBusiness < 0 || yearsInBusiness > 80)) {
      return res.status(400).json({ ok: false, message: "Invalid years in business" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    if (!DOCUMENT_DATA_URL_REGEX.test(idProofDocument)) {
      return res.status(400).json({ ok: false, message: "ID proof document must be an image" });
    }

    if (idProofDocument.length > MAX_DOCUMENT_DATA_LENGTH) {
      return res.status(400).json({ ok: false, message: "ID proof document is too large" });
    }

    const category = await Category.findOne({ _id: businessCategoryId, isActive: true }).select("_id name");
    if (!category) {
      return res.status(400).json({ ok: false, message: "Selected business category is invalid or inactive" });
    }

    let subcategory = null;
    if (businessSubcategoryId) {
      subcategory = await Subcategory.findOne({
        _id: businessSubcategoryId,
        category: category._id,
        isActive: true,
      }).select("_id name");

      if (!subcategory) {
        return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid or inactive" });
      }
    }

    const duplicateChecks = [];
    if (personalEmail) duplicateChecks.push({ email: personalEmail });
    if (personalPhone) duplicateChecks.push({ phone: personalPhone });
    if (businessEmail) duplicateChecks.push({ businessEmail });
    if (businessPhone) duplicateChecks.push({ businessPhone });
    const existing = duplicateChecks.length > 0 ? await User.findOne({ $or: duplicateChecks }) : null;

    if (existing) {
      return res.status(409).json({ ok: false, message: "Vendor account or contact details already exist" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: ownerName,
      businessName,
      email: personalEmail,
      phone: personalPhone,
      passwordHash,
      provider: "credentials",
      role: "vendor",
      vendorStatus: "pending",
      alternatePhone: personalAlternatePhone || undefined,
      businessCategory: category._id,
      businessSubcategory: subcategory?._id,
      businessEmail,
      businessPhone,
      businessAlternatePhone: businessAlternatePhone || undefined,
      businessAddress,
      city,
      state,
      postalCode,
      gstNumber: gstNumber || undefined,
      website: website || undefined,
      yearsInBusiness,
      businessDescription: businessDescription || undefined,
      idProofType,
      idProofNumber,
      idProofDocument,
      marketingOptIn,
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
        alternatePhone: user.alternatePhone,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        role: user.role,
        vendorStatus: user.vendorStatus,
        businessCategory: toCategoryReference(category),
        businessSubcategory: toSubcategoryReference(subcategory),
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
    const normalizedPhone = normalizePhone(identifier);
    const user = await User.findOne({
      role: "vendor",
      $or: [
        { email: normalized },
        { businessEmail: normalized },
        ...(normalizedPhone ? [{ phone: normalizedPhone }, { businessPhone: normalizedPhone }] : []),
      ],
    })
      .populate("businessCategory", "_id name")
      .populate("businessSubcategory", "_id name");

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

    const vendorStatus = user.vendorStatus || "approved";
    if (vendorStatus !== "approved") {
      return res.status(403).json({
        ok: false,
        message: vendorStatus === "pending" ? "Vendor account is pending admin approval" : "Vendor account has been rejected",
      });
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      ok: true,
      message: "Vendor login successful",
      user: {
        id: String(user._id),
        name: user.name,
        businessName: user.businessName,
        email: user.email,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        role: user.role,
        vendorStatus: user.vendorStatus,
        businessCategory: toCategoryReference(user.businessCategory),
        businessSubcategory: toSubcategoryReference(user.businessSubcategory),
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

router.get("/auth/me", async (req, res) => {
  try {
    const token = resolveTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select(
        "_id name email phone alternatePhone businessName role vendorStatus businessCategory businessSubcategory businessEmail businessPhone businessAlternatePhone businessAddress city state postalCode gstNumber website yearsInBusiness businessDescription idProofType idProofNumber idProofDocument marketingOptIn"
      )
      .populate("businessCategory", "_id name")
      .populate("businessSubcategory", "_id name");

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        businessName: user.businessName,
        role: user.role,
        vendorStatus: user.vendorStatus,
        businessCategory: toCategoryReference(user.businessCategory),
        businessSubcategory: toSubcategoryReference(user.businessSubcategory),
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        businessAddress: user.businessAddress,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        gstNumber: user.gstNumber,
        website: user.website,
        yearsInBusiness: user.yearsInBusiness,
        businessDescription: user.businessDescription,
        idProofType: user.idProofType,
        idProofNumber: user.idProofNumber,
        idProofDocument: user.idProofDocument,
        marketingOptIn: user.marketingOptIn,
      },
    });
  } catch (_error) {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true, message: "Logged out successfully" });
});

router.put("/auth/me", async (req, res) => {
  try {
    const token = resolveTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const name = req.body?.name !== undefined ? String(req.body.name || "").trim() : user.name || "";
    const emailInput = req.body?.email !== undefined ? String(req.body.email || "").trim() : user.email || "";
    const phoneInput = req.body?.phone !== undefined ? String(req.body.phone || "").trim() : user.phone || "";
    const alternatePhoneInput =
      req.body?.alternatePhone !== undefined ? String(req.body.alternatePhone || "").trim() : user.alternatePhone || "";
    const businessEmailInput =
      req.body?.businessEmail !== undefined ? String(req.body.businessEmail || "").trim() : user.businessEmail || "";
    const businessPhoneInput =
      req.body?.businessPhone !== undefined ? String(req.body.businessPhone || "").trim() : user.businessPhone || "";
    const businessAlternatePhoneInput =
      req.body?.businessAlternatePhone !== undefined
        ? String(req.body.businessAlternatePhone || "").trim()
        : user.businessAlternatePhone || "";
    const businessCategoryId =
      req.body?.businessCategoryId !== undefined
        ? String(req.body.businessCategoryId || "").trim()
        : user.businessCategory
          ? String(user.businessCategory)
          : "";
    const businessSubcategoryId =
      req.body?.businessSubcategoryId !== undefined
        ? String(req.body.businessSubcategoryId || "").trim()
        : user.businessSubcategory
          ? String(user.businessSubcategory)
          : "";
    const idProofDocumentInput =
      req.body?.idProofDocument !== undefined ? String(req.body.idProofDocument || "").trim() : user.idProofDocument || "";

    if (!name) {
      return res.status(400).json({ ok: false, message: "Name is required" });
    }

    const email = emailInput ? emailInput.toLowerCase() : "";
    const phone = normalizePhone(phoneInput);
    const alternatePhone = normalizePhone(alternatePhoneInput);
    const businessEmail = businessEmailInput ? businessEmailInput.toLowerCase() : "";
    const businessPhone = normalizePhone(businessPhoneInput);
    const businessAlternatePhone = normalizePhone(businessAlternatePhoneInput);

    if (user.role === "vendor") {
      if (!email || !phone) {
        return res.status(400).json({ ok: false, message: "Personal email and personal phone are required" });
      }

      if (!businessEmail || !businessPhone) {
        return res.status(400).json({ ok: false, message: "Business email and business phone are required" });
      }
    } else if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "Email or phone is required" });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ ok: false, message: "Phone must be exactly 10 digits" });
    }

    if (alternatePhone && !PHONE_REGEX.test(alternatePhone)) {
      return res.status(400).json({ ok: false, message: "Alternate phone must be exactly 10 digits" });
    }

    if (businessEmail && !EMAIL_REGEX.test(businessEmail)) {
      return res.status(400).json({ ok: false, message: "Invalid business email format" });
    }

    if (businessPhone && !PHONE_REGEX.test(businessPhone)) {
      return res.status(400).json({ ok: false, message: "Business phone must be exactly 10 digits" });
    }

    if (businessAlternatePhone && !PHONE_REGEX.test(businessAlternatePhone)) {
      return res.status(400).json({ ok: false, message: "Business alternate phone must be exactly 10 digits" });
    }

    if (businessCategoryId && !OBJECT_ID_REGEX.test(businessCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business category" });
    }

    if (businessSubcategoryId && !OBJECT_ID_REGEX.test(businessSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
    }

    if (idProofDocumentInput) {
      if (!DOCUMENT_DATA_URL_REGEX.test(idProofDocumentInput)) {
        return res.status(400).json({ ok: false, message: "ID proof document must be an image" });
      }

      if (idProofDocumentInput.length > MAX_DOCUMENT_DATA_LENGTH) {
        return res.status(400).json({ ok: false, message: "ID proof document is too large" });
      }
    }

    const duplicateChecks = [];
    if (email) duplicateChecks.push({ email });
    if (phone) duplicateChecks.push({ phone });
    if (businessEmail) duplicateChecks.push({ businessEmail });
    if (businessPhone) duplicateChecks.push({ businessPhone });

    if (duplicateChecks.length > 0) {
      const duplicateUser = await User.findOne({
        _id: { $ne: user._id },
        $or: duplicateChecks,
      });

      if (duplicateUser) {
        return res.status(409).json({ ok: false, message: "Email or phone already in use" });
      }
    }

    let category = null;
    let subcategory = null;
    if (user.role === "vendor") {
      category = await Category.findOne({ _id: businessCategoryId, isActive: true }).select("_id name");
      if (!category) {
        return res.status(400).json({ ok: false, message: "Selected business category is invalid or inactive" });
      }

      if (businessSubcategoryId) {
        subcategory = await Subcategory.findOne({
          _id: businessSubcategoryId,
          category: category._id,
          isActive: true,
        }).select("_id name");

        if (!subcategory) {
          return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid or inactive" });
        }
      }
    }

    user.name = name;
    user.email = email || undefined;
    user.phone = phone || undefined;
    user.alternatePhone = alternatePhone || undefined;

    if (user.role === "vendor") {
      user.businessEmail = businessEmail;
      user.businessPhone = businessPhone;
      user.businessAlternatePhone = businessAlternatePhone || undefined;
      user.businessCategory = category?._id;
      user.businessSubcategory = subcategory?._id;
      user.idProofDocument = idProofDocumentInput || user.idProofDocument;
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select(
        "_id name email phone alternatePhone businessName role vendorStatus businessCategory businessSubcategory businessEmail businessPhone businessAlternatePhone"
      )
      .populate("businessCategory", "_id name")
      .populate("businessSubcategory", "_id name");

    return res.status(200).json({
      ok: true,
      message: "Profile updated successfully",
      user: {
        id: String(updatedUser._id),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        alternatePhone: updatedUser.alternatePhone,
        businessName: updatedUser.businessName,
        role: updatedUser.role,
        vendorStatus: updatedUser.vendorStatus,
        businessCategory: toCategoryReference(updatedUser.businessCategory),
        businessSubcategory: toSubcategoryReference(updatedUser.businessSubcategory),
        businessEmail: updatedUser.businessEmail,
        businessPhone: updatedUser.businessPhone,
        businessAlternatePhone: updatedUser.businessAlternatePhone,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update profile", error: error.message });
  }
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const token = resolveTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ ok: false, message: "Password change is unavailable for this account" });
    }

    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, message: "New password must be at least 6 characters" });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({ ok: false, message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ ok: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to change password", error: error.message });
  }
});

module.exports = router;
