const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const City = require("../models/City");
const FailureLog = require("../models/FailureLog");
const {
  GSTIN_REGEX,
  AADHAAR_REGEX,
  DOCUMENT_DATA_URL_REGEX,
  MAX_DOCUMENT_DATA_LENGTH,
  isValidEstablishmentYear,
} = require("../lib/vendorValidation");
const {
  sanitizeCustomFormFields,
  resolveEffectiveCustomForm,
  validateCustomFormData,
} = require("../lib/customForm");
const {
  MANUAL_STORE_STATUS_VALUES,
  STORE_STATUS_MODE_VALUES,
  toStoreStatusSummary,
} = require("../lib/storeStatus");
const { emitVendorStoreStatus } = require("../lib/realtime");
const { scheduleVendorIndex } = require("../lib/search/indexer");
const {
  normalizeAuthContext,
  setAuthCookie,
  clearAuthCookie,
  resolveTokenFromRequest,
} = require("../lib/authCookies");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const POSTAL_REGEX = /^[0-9]{5,10}$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ID_PROOF_TYPES = new Set(["aadhaar", "pan", "driving_license", "passport", "voter_id", "other"]);
const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_MEDIA_VALUE_LENGTH = 3000000;

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toExactRegex = (value) => new RegExp(`^${escapeRegex(value)}$`, "i");
const normalizeMediaValue = (value) => String(value || "").trim();

const { uploadImage } = require("../lib/mediaStorage");

const resolveUserProfileImages = async (payload) => {
  if (payload.imageInput) payload.imageInput = await uploadImage(payload.imageInput);
  if (payload.shopBannerImageInput) payload.shopBannerImageInput = await uploadImage(payload.shopBannerImageInput);
  if (payload.cardImageInput) payload.cardImageInput = await uploadImage(payload.cardImageInput);
  if (payload.myStoreImageInput) payload.myStoreImageInput = await uploadImage(payload.myStoreImageInput);
  if (payload.myStoreBannerImageInput) payload.myStoreBannerImageInput = await uploadImage(payload.myStoreBannerImageInput);
  if (payload.paymentQrCodeInput) payload.paymentQrCodeInput = await uploadImage(payload.paymentQrCodeInput);
  
  if (Array.isArray(payload.shopGalleryInput)) {
    payload.shopGalleryInput = await Promise.all(payload.shopGalleryInput.map((img) => uploadImage(img)));
  }
  
  return payload;
};

const isValidMediaValue = (value) => {
  const normalized = normalizeMediaValue(value);
  if (!normalized) return true;
  if (normalized.length > MAX_MEDIA_VALUE_LENGTH) return false;
  if (normalized.startsWith("/uploads/")) return true;
  return URL_REGEX.test(normalized) || IMAGE_DATA_URL_REGEX.test(normalized);
};

const toCustomFormSummary = (entity) => {
  const customFormFields = sanitizeCustomFormFields(entity?.customFormFields);
  const customFormEnabled = Boolean(entity?.customFormEnabled) && customFormFields.length > 0;

  return {
    customFormEnabled,
    customFormTitle: customFormEnabled ? String(entity?.customFormTitle || "").trim() || undefined : undefined,
    customFormFields,
  };
};

const toCategoryReference = (category) => {
  if (!category) return undefined;

  const categoryId = category._id || category.id || category;
  if (!categoryId) return undefined;

  return {
    id: String(categoryId),
    name: category.name,
    ...toCustomFormSummary(category),
  };
};

const toSubcategoryReference = (subcategory) => {
  if (!subcategory) return undefined;

  const subcategoryId = subcategory._id || subcategory.id || subcategory;
  if (!subcategoryId) return undefined;

  return {
    id: String(subcategoryId),
    name: subcategory.name,
    ...toCustomFormSummary(subcategory),
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

//This is route to singup of users/custimers, Vendors ,Admins etc etc.....
//Here we demai]nding alll things like name email phone and password
//also checking that those fields like phone number and email are not already exists or present
//Here er also following the format regex thing which wioll validate the format of email and password
//We also created thing as duplicate params which willprevent the duplicacy of emails and phone numbers

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

    const existing =
      duplicateChecks.length > 0
        ? await User.findOne({ $or: duplicateChecks }).select("_id").lean()
        : null;
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
    setAuthCookie(res, token, "customer");

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
        image: user.image,
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

// Router to logged in for user/vendor/admin on different dashboard or platforms
// This also validate the login of vendor , admin on theri respextive playforms

router.post("/auth/login", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    const password = String(req.body?.password || "");
    const authContext = normalizeAuthContext(req.body?.authContext, "customer");

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Identifier and password are required" });
    }

    const normalized = identifier.toLowerCase();
    const normalizedPhone = normalizePhone(identifier);
    const user = await User.findOne({
      $or: [{ email: normalized }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])],
    })
      .select("_id name email phone role vendorStatus passwordHash")
      .lean();

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

    if (authContext === "admin" && user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admin account required" });
    }

    if (authContext === "customer" && user.role !== "customer") {
      return res.status(403).json({ ok: false, message: "Customer account required. Use the vendor or admin panel for staff access." });
    }

    const token = createToken(user);
    setAuthCookie(res, token, authContext);

    return res.status(200).json({
      ok: true,
      message: "Login successful",
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
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


//route to signup of vendor 
router.post("/auth/vendor/signup", async (req, res) => {
  try {
    const businessName = String(req.body?.businessName || "").trim();
    const businessTypeInput = String(req.body?.businessType || "").trim().toLowerCase();

    if (businessTypeInput && !["restaurant", "store", "service"].includes(businessTypeInput)) {
      return res.status(400).json({ ok: false, message: "Invalid business type selected" });
    }
    const businessType = businessTypeInput || "store";

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
    const sublocality = String(req.body?.sublocality || "").trim();
    const state = String(req.body?.state || "").trim();
    const postalCode = String(req.body?.postalCode || "").trim();
    const gstNumber = String(req.body?.gstNumber || "").trim();
    const gstDocument = String(req.body?.gstDocument || "").trim();
    const website = String(req.body?.website || "").trim();
    const shopOpeningTime = String(req.body?.shopOpeningTime || "").trim();
    const shopClosingTime = String(req.body?.shopClosingTime || "").trim();
    const businessDescription = String(req.body?.businessDescription || "").trim();
    const idProofType = String(req.body?.idProofType || "").trim().toLowerCase();
    const idProofNumber = String(req.body?.idProofNumber || "").trim();
    const idProofDocument = String(req.body?.idProofDocument || "").trim();
    const serviceTagsInput = Array.isArray(req.body?.serviceTags) ? req.body.serviceTags : [];
    const customFormDataInput = req.body?.customFormData;
    const establishmentYearInput = req.body?.establishmentYear;
    const marketingOptIn = Boolean(req.body?.marketingOptIn);
    const yearsInBusinessInput = req.body?.yearsInBusiness;
    const password = String(req.body?.password || "");
    const personalEmail = personalEmailInput ? personalEmailInput.toLowerCase() : "";
    const personalPhone = normalizePhone(personalPhoneInput);
    const personalAlternatePhone = normalizePhone(personalAlternatePhoneInput);
    const businessEmail = businessEmailInput ? businessEmailInput.toLowerCase() : "";
    const businessPhone = normalizePhone(businessPhoneInput);
    const businessAlternatePhone = normalizePhone(businessAlternatePhoneInput);
    const establishmentYear =
      establishmentYearInput === undefined || establishmentYearInput === null || establishmentYearInput === ""
        ? undefined
        : Number(establishmentYearInput);
    const yearsInBusiness =
      yearsInBusinessInput === undefined || yearsInBusinessInput === null || yearsInBusinessInput === ""
        ? undefined
        : Number(yearsInBusinessInput);
    const serviceTags = serviceTagsInput
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 100);
    const uniqueServiceTags = Array.from(new Set(serviceTags));

    if (!businessName || !ownerName || !password) {
      return res.status(400).json({ ok: false, message: "Business name, owner name and password are required" });
    }

    if (!personalEmail || !personalPhone) {
      return res.status(400).json({ ok: false, message: "Personal email and personal phone are required" });
    }

    if (!businessEmail || !businessPhone) {
      return res.status(400).json({ ok: false, message: "Business email and business phone are required" });
    }

    if (!businessCategoryId || !businessAddress || !city || !sublocality || !postalCode) {
      return res.status(400).json({
        ok: false,
        message: "Business category, address, city, sublocality and postal code are required",
      });
    }

    if (!shopOpeningTime || !shopClosingTime) {
      return res.status(400).json({ ok: false, message: "Shop opening and closing time are required" });
    }

    if (!gstNumber) {
      return res.status(400).json({ ok: false, message: "GSTIN number is required" });
    }

    if (!gstDocument) {
      return res.status(400).json({ ok: false, message: "GST document is required" });
    }

    if (uniqueServiceTags.length === 0) {
      return res.status(400).json({ ok: false, message: "Add at least one service tag" });
    }

    if (!idProofType || !idProofNumber || !idProofDocument) {
      return res.status(400).json({ ok: false, message: "ID proof type, number and document are required" });
    }

    if (!ID_PROOF_TYPES.has(idProofType)) {
      return res.status(400).json({ ok: false, message: "Invalid ID proof type" });
    }

    if (idProofType === "aadhaar" && !AADHAAR_REGEX.test(idProofNumber)) {
      return res.status(400).json({ ok: false, message: "Aadhaar number must be exactly 12 digits" });
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

    if (!TIME_REGEX.test(shopOpeningTime) || !TIME_REGEX.test(shopClosingTime)) {
      return res.status(400).json({ ok: false, message: "Shop timings must be in HH:MM format" });
    }

    if (!GSTIN_REGEX.test(gstNumber)) {
      return res.status(400).json({ ok: false, message: "GSTIN must be a valid 15-character value" });
    }

    if (!OBJECT_ID_REGEX.test(businessCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business category" });
    }

    if (businessSubcategoryId && !OBJECT_ID_REGEX.test(businessSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
    }

    if (!isValidEstablishmentYear(establishmentYear)) {
      return res.status(400).json({ ok: false, message: "Invalid establishment year" });
    }

    if (yearsInBusiness !== undefined && (Number.isNaN(yearsInBusiness) || yearsInBusiness < 0 || yearsInBusiness > 80)) {
      return res.status(400).json({ ok: false, message: "Invalid years in business" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    const isUrlOrUploadPath = (str) => {
      if (typeof str !== 'string') return false;
      return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/uploads/');
    };

    if (!DOCUMENT_DATA_URL_REGEX.test(idProofDocument) && !isUrlOrUploadPath(idProofDocument)) {
      return res.status(400).json({ ok: false, message: "ID proof document must be image, PDF, DOC, DOCX or a valid URL" });
    }

    if (!isUrlOrUploadPath(idProofDocument) && idProofDocument.length > MAX_DOCUMENT_DATA_LENGTH) {
      return res.status(400).json({ ok: false, message: "ID proof document is too large" });
    }

    if (!DOCUMENT_DATA_URL_REGEX.test(gstDocument) && !isUrlOrUploadPath(gstDocument)) {
      return res.status(400).json({ ok: false, message: "GST document must be image, PDF, DOC, DOCX or a valid URL" });
    }

    if (!isUrlOrUploadPath(gstDocument) && gstDocument.length > MAX_DOCUMENT_DATA_LENGTH) {
      return res.status(400).json({ ok: false, message: "GST document is too large" });
    }

    const category = await Category.findOne({ _id: businessCategoryId, isActive: true }).select(
      "_id name customFormEnabled customFormTitle customFormFields"
    );
    if (!category) {
      return res.status(400).json({ ok: false, message: "Selected business category is invalid or inactive" });
    }

    let subcategory = null;
    if (businessSubcategoryId) {
      subcategory = await Subcategory.findOne({
        _id: businessSubcategoryId,
        category: category._id,
        isActive: true,
      }).select("_id name customFormEnabled customFormTitle customFormFields");

      if (!subcategory) {
        return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid or inactive" });
      }
    }

    const cityRecord = await City.findOne({ name: toExactRegex(city), isActive: true }).select("name state localities");
    if (!cityRecord) {
      return res.status(400).json({ ok: false, message: "Selected city is invalid or inactive" });
    }

    const matchedLocality = (Array.isArray(cityRecord.localities) ? cityRecord.localities : []).find(
      (locality) => locality.isActive !== false && toExactRegex(sublocality).test(String(locality.name || ""))
    );

    if (!matchedLocality) {
      return res.status(400).json({ ok: false, message: "Selected sublocality is invalid for the selected city" });
    }

    const resolvedState = state || String(cityRecord.state || "").trim();
    if (!resolvedState) {
      return res.status(400).json({ ok: false, message: "State is required for selected city" });
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

    const effectiveCustomForm = resolveEffectiveCustomForm({
      category,
      subcategory,
    });

    const customDataValidation = validateCustomFormData(customFormDataInput, effectiveCustomForm.fields);
    if (!customDataValidation.ok) {
      return res.status(400).json({ ok: false, message: customDataValidation.message || "Invalid custom form data" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: ownerName,
      businessName,
      businessType,
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
      city: cityRecord.name,
      sublocality: matchedLocality.name,
      state: resolvedState,
      postalCode,
      gstNumber,
      gstDocument,
      website: website || undefined,
      shopOpeningTime,
      shopClosingTime,
      establishmentYear,
      yearsInBusiness,
      serviceTags: uniqueServiceTags,
      businessDescription: businessDescription || undefined,
      idProofType,
      idProofNumber,
      idProofDocument,
      marketingOptIn,
      customFormData:
        Object.keys(customDataValidation.data).length > 0 ? customDataValidation.data : undefined,
    });

    return res.status(201).json({
      ok: true,
      message: "Vendor registered successfully",
      user: {
        id: String(user._id),
        name: user.name,
        businessName: user.businessName,
        businessType: user.businessType || "store",
        email: user.email,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        city: user.city,
        sublocality: user.sublocality,
        state: user.state,
        gstNumber: user.gstNumber,
        gstDocument: user.gstDocument,
        shopOpeningTime: user.shopOpeningTime,
        shopClosingTime: user.shopClosingTime,
        establishmentYear: user.establishmentYear,
        serviceTags: user.serviceTags || [],
        customFormData: user.customFormData && typeof user.customFormData === "object" ? user.customFormData : {},
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

//Route for vendor login
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
      .select(
        "_id name businessName businessType email phone alternatePhone businessEmail businessPhone businessAlternatePhone city sublocality state shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt customFormData role vendorStatus passwordHash businessCategory businessSubcategory"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields")
      .lean();

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
    setAuthCookie(res, token, "vendor");

    return res.status(200).json({
      ok: true,
      message: "Vendor login successful",
      token,
      user: {
        id: String(user._id),
        name: user.name,
        businessName: user.businessName,
        businessType: user.businessType || "store",
        email: user.email,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        city: user.city,
        sublocality: user.sublocality,
        state: user.state,
        shopOpeningTime: user.shopOpeningTime,
        shopClosingTime: user.shopClosingTime,
        ...toStoreStatusSummary(user),
        customFormData: user.customFormData && typeof user.customFormData === "object" ? user.customFormData : {},
        effectiveCustomForm: resolveEffectiveCustomForm({
          category: user.businessCategory,
          subcategory: user.businessSubcategory,
        }),
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

//route to check validatuion where we need auth and authorisation to visit the user/admin/vendor
//This is injected where we need some kind of validation of any kind of auth
router.get("/auth/me", async (req, res) => {
  try {
    const authContext = normalizeAuthContext(req.query?.context || req.headers["x-auth-context"], "customer");
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
      .select(
        "_id name email phone alternatePhone businessName businessType role vendorStatus businessCategory businessSubcategory businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt establishmentYear yearsInBusiness serviceTags businessDescription image shopBannerImage cardImage myStoreImage myStoreBannerImage shopGallery instagramUrl facebookUrl youtubeUrl idProofType idProofNumber idProofDocument marketingOptIn customFormData paymentQrCode"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields")
      .lean();

    if (!user) {
      clearAuthCookie(res, authContext);
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
        businessType: user.businessType || "store",
        role: user.role,
        vendorStatus: user.vendorStatus,
        businessCategory: toCategoryReference(user.businessCategory),
        businessSubcategory: toSubcategoryReference(user.businessSubcategory),
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessAlternatePhone: user.businessAlternatePhone,
        businessAddress: user.businessAddress,
        city: user.city,
        sublocality: user.sublocality,
        state: user.state,
        postalCode: user.postalCode,
        gstNumber: user.gstNumber,
        gstDocument: user.gstDocument,
        website: user.website,
        shopOpeningTime: user.shopOpeningTime,
        shopClosingTime: user.shopClosingTime,
        ...(user.role === "vendor" ? toStoreStatusSummary(user) : {}),
        establishmentYear: user.establishmentYear,
        yearsInBusiness: user.yearsInBusiness,
        serviceTags: user.serviceTags || [],
        businessDescription: user.businessDescription,
        image: user.image,
        shopBannerImage: user.shopBannerImage,
        cardImage: user.cardImage,
        myStoreImage: user.myStoreImage,
        paymentQrCode: user.paymentQrCode,
        myStoreBannerImage: user.myStoreBannerImage,
        shopGallery: Array.isArray(user.shopGallery) ? user.shopGallery : [],
        instagramUrl: user.instagramUrl,
        facebookUrl: user.facebookUrl,
        youtubeUrl: user.youtubeUrl,
        idProofType: user.idProofType,
        idProofNumber: user.idProofNumber,
        idProofDocument: user.idProofDocument,
        marketingOptIn: user.marketingOptIn,
        customFormData: user.customFormData && typeof user.customFormData === "object" ? user.customFormData : {},
        effectiveCustomForm:
          user.role === "vendor"
            ? resolveEffectiveCustomForm({
                category: user.businessCategory,
                subcategory: user.businessSubcategory,
              })
            : { source: "none", title: "", fields: [] },
      },
    });
  } catch (_error) {
    clearAuthCookie(res, normalizeAuthContext(req.query?.context || req.headers["x-auth-context"], "customer"));
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
});

//Route to logout the user/admin/vendor from their respective dashboards or platforms
router.post("/auth/logout", async (req, res) => {
  const authContext = req.body?.authContext || req.query?.context || req.headers["x-auth-context"];
  const resolvedAuthContext = authContext ? normalizeAuthContext(authContext, "customer") : "customer";
  const token = resolveTokenFromRequest(req, resolvedAuthContext);

  if (token) {
    const { blacklistToken } = require("../lib/redis");
    try {
      const payload = verifyToken(token);
      if (payload && payload.exp) {
        const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
        if (remainingSeconds > 0) {
          await blacklistToken(token, remainingSeconds);
        }
      }
    } catch (err) {
      // Ignore verification error (already expired or invalid)
    }
  }

  clearAuthCookie(res, resolvedAuthContext);
  return res.status(200).json({ ok: true, message: "Logged out successfully" });
});


router.put("/auth/me", async (req, res) => {
  try {
    const authContext = normalizeAuthContext(req.body?.authContext || req.query?.context || req.headers["x-auth-context"], "customer");
    const token = resolveTokenFromRequest(req, authContext);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      clearAuthCookie(res, authContext);
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
    const businessAddressInput =
      req.body?.businessAddress !== undefined ? String(req.body.businessAddress || "").trim() : user.businessAddress || "";
    const websiteInput = req.body?.website !== undefined ? String(req.body.website || "").trim() : user.website || "";
    const businessDescriptionInput =
      req.body?.businessDescription !== undefined
        ? String(req.body.businessDescription || "").trim()
        : user.businessDescription || "";
    const imageInput = req.body?.image !== undefined ? normalizeMediaValue(req.body.image) : normalizeMediaValue(user.image);
    const shopBannerImageInput =
      req.body?.shopBannerImage !== undefined
        ? normalizeMediaValue(req.body.shopBannerImage)
        : normalizeMediaValue(user.shopBannerImage);
    const cardImageInput =
      req.body?.cardImage !== undefined
        ? normalizeMediaValue(req.body.cardImage)
        : normalizeMediaValue(user.cardImage);
    const myStoreImageInput =
      req.body?.myStoreImage !== undefined
        ? normalizeMediaValue(req.body.myStoreImage)
        : normalizeMediaValue(user.myStoreImage);
    const paymentQrCodeInput =
      req.body?.paymentQrCode !== undefined
        ? normalizeMediaValue(req.body.paymentQrCode)
        : normalizeMediaValue(user.paymentQrCode);
    const myStoreBannerImageInput =
      req.body?.myStoreBannerImage !== undefined
        ? normalizeMediaValue(req.body.myStoreBannerImage)
        : normalizeMediaValue(user.myStoreBannerImage);
    const shopGalleryInput = Array.isArray(req.body?.shopGallery)
      ? req.body.shopGallery.map((item) => normalizeMediaValue(item)).filter(Boolean)
      : Array.isArray(user.shopGallery)
        ? user.shopGallery
        : [];
    const instagramUrlInput =
      req.body?.instagramUrl !== undefined ? String(req.body.instagramUrl || "").trim() : user.instagramUrl || "";
    const facebookUrlInput =
      req.body?.facebookUrl !== undefined ? String(req.body.facebookUrl || "").trim() : user.facebookUrl || "";
    const youtubeUrlInput =
      req.body?.youtubeUrl !== undefined ? String(req.body.youtubeUrl || "").trim() : user.youtubeUrl || "";
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
    const cityInput = req.body?.city !== undefined ? String(req.body.city || "").trim() : user.city || "";
    const sublocalityInput =
      req.body?.sublocality !== undefined ? String(req.body.sublocality || "").trim() : user.sublocality || "";
    const stateInput = req.body?.state !== undefined ? String(req.body.state || "").trim() : user.state || "";
    const postalCodeInput =
      req.body?.postalCode !== undefined ? String(req.body.postalCode || "").trim() : user.postalCode || "";
    const idProofDocumentInput =
      req.body?.idProofDocument !== undefined ? String(req.body.idProofDocument || "").trim() : user.idProofDocument || "";
    const idProofTypeInput =
      req.body?.idProofType !== undefined ? String(req.body.idProofType || "").trim().toLowerCase() : user.idProofType || "";
    const idProofNumberInput =
      req.body?.idProofNumber !== undefined ? String(req.body.idProofNumber || "").trim() : user.idProofNumber || "";
    const gstNumberInput =
      req.body?.gstNumber !== undefined ? String(req.body.gstNumber || "").trim() : user.gstNumber || "";
    const gstDocumentInput =
      req.body?.gstDocument !== undefined ? String(req.body.gstDocument || "").trim() : user.gstDocument || "";
    const shopOpeningTimeInput =
      req.body?.shopOpeningTime !== undefined ? String(req.body.shopOpeningTime || "").trim() : user.shopOpeningTime || "";
    const shopClosingTimeInput =
      req.body?.shopClosingTime !== undefined ? String(req.body.shopClosingTime || "").trim() : user.shopClosingTime || "";
    const storeStatusModeInput =
      req.body?.storeStatusMode !== undefined
        ? String(req.body.storeStatusMode || "").trim().toLowerCase()
        : String(user.storeStatusMode || "auto").trim().toLowerCase();
    const manualStoreStatusInput =
      req.body?.manualStoreStatus !== undefined
        ? String(req.body.manualStoreStatus || "").trim().toLowerCase()
        : String(user.manualStoreStatus || "").trim().toLowerCase();
    const establishmentYearInput = req.body?.establishmentYear !== undefined ? req.body.establishmentYear : user.establishmentYear;
    const serviceTagsInput = Array.isArray(req.body?.serviceTags)
      ? req.body.serviceTags
      : Array.isArray(user.serviceTags)
        ? user.serviceTags
        : [];
    const customFormDataInput = req.body?.customFormData !== undefined ? req.body.customFormData : user.customFormData || {};

    if (!name) {
      return res.status(400).json({ ok: false, message: "Name is required" });
    }

    const email = emailInput ? emailInput.toLowerCase() : "";
    const phone = normalizePhone(phoneInput);
    const alternatePhone = normalizePhone(alternatePhoneInput);
    const businessEmail = businessEmailInput ? businessEmailInput.toLowerCase() : "";
    const businessPhone = normalizePhone(businessPhoneInput);
    const businessAlternatePhone = normalizePhone(businessAlternatePhoneInput);
    const establishmentYear =
      establishmentYearInput === undefined || establishmentYearInput === null || establishmentYearInput === ""
        ? undefined
        : Number(establishmentYearInput);
    const serviceTags = serviceTagsInput
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 100);
    const uniqueServiceTags = Array.from(new Set(serviceTags));
    const shopGallery = shopGalleryInput
      .map((value) => normalizeMediaValue(value))
      .filter(Boolean);

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

    if (websiteInput && !URL_REGEX.test(websiteInput)) {
      return res.status(400).json({ ok: false, message: "Website must be a valid URL" });
    }

    if (instagramUrlInput && !URL_REGEX.test(instagramUrlInput)) {
      return res.status(400).json({ ok: false, message: "Instagram URL must be valid" });
    }

    if (facebookUrlInput && !URL_REGEX.test(facebookUrlInput)) {
      return res.status(400).json({ ok: false, message: "Facebook URL must be valid" });
    }

    if (youtubeUrlInput && !URL_REGEX.test(youtubeUrlInput)) {
      return res.status(400).json({ ok: false, message: "YouTube URL must be valid" });
    }

    if (!isValidMediaValue(imageInput)) {
      return res.status(400).json({ ok: false, message: "Profile image must be a valid URL or image data" });
    }

    if (!isValidMediaValue(shopBannerImageInput)) {
      return res.status(400).json({ ok: false, message: "Shop banner must be a valid URL or image data" });
    }

    if (!isValidMediaValue(cardImageInput)) {
      return res.status(400).json({ ok: false, message: "Card image must be a valid URL or image data" });
    }

    if (!isValidMediaValue(myStoreImageInput)) {
      return res.status(400).json({ ok: false, message: "MyStore DP must be a valid URL or image data" });
    }

    if (!isValidMediaValue(paymentQrCodeInput)) {
      return res.status(400).json({ ok: false, message: "Payment QR must be a valid URL or image data" });
    }
    if (!isValidMediaValue(myStoreBannerImageInput)) {
      return res.status(400).json({ ok: false, message: "MyStore banner must be a valid URL or image data" });
    }

    const invalidGalleryImage = shopGallery.find((value) => !isValidMediaValue(value));
    if (invalidGalleryImage) {
      return res.status(400).json({ ok: false, message: "Each shop gallery image must be a valid URL or image data" });
    }

    if (shopOpeningTimeInput && !TIME_REGEX.test(shopOpeningTimeInput)) {
      return res.status(400).json({ ok: false, message: "Shop opening time must be in HH:MM format" });
    }

    if (shopClosingTimeInput && !TIME_REGEX.test(shopClosingTimeInput)) {
      return res.status(400).json({ ok: false, message: "Shop closing time must be in HH:MM format" });
    }

    if (!STORE_STATUS_MODE_VALUES.has(storeStatusModeInput)) {
      return res.status(400).json({ ok: false, message: "Store status mode must be either auto or manual" });
    }

    if (manualStoreStatusInput && !MANUAL_STORE_STATUS_VALUES.has(manualStoreStatusInput)) {
      return res.status(400).json({ ok: false, message: "Manual store status must be either open or closed" });
    }

    if (storeStatusModeInput === "manual" && !manualStoreStatusInput) {
      return res.status(400).json({ ok: false, message: "Manual store status is required when mode is manual" });
    }

    if (businessCategoryId && !OBJECT_ID_REGEX.test(businessCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business category" });
    }

    if (businessSubcategoryId && !OBJECT_ID_REGEX.test(businessSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
    }

    const cityWasProvided = req.body?.city !== undefined;
    const sublocalityWasProvided = req.body?.sublocality !== undefined;
    const stateWasProvided = req.body?.state !== undefined;

    if (gstNumberInput && !GSTIN_REGEX.test(gstNumberInput)) {
      return res.status(400).json({ ok: false, message: "GSTIN must be a valid 15-character value" });
    }

    if (!isValidEstablishmentYear(establishmentYear)) {
      return res.status(400).json({ ok: false, message: "Invalid establishment year" });
    }

    if (idProofTypeInput && !ID_PROOF_TYPES.has(idProofTypeInput)) {
      return res.status(400).json({ ok: false, message: "Invalid ID proof type" });
    }

    if (idProofTypeInput === "aadhaar" && !AADHAAR_REGEX.test(idProofNumberInput)) {
      return res.status(400).json({ ok: false, message: "Aadhaar number must be exactly 12 digits" });
    }

    const isUrlOrUploadPath = (str) => {
      if (typeof str !== 'string') return false;
      return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/uploads/');
    };

    if (idProofDocumentInput) {
      if (!DOCUMENT_DATA_URL_REGEX.test(idProofDocumentInput) && !isUrlOrUploadPath(idProofDocumentInput)) {
        return res.status(400).json({ ok: false, message: "ID proof document must be image, PDF, DOC, DOCX or a valid URL" });
      }

      if (!isUrlOrUploadPath(idProofDocumentInput) && idProofDocumentInput.length > MAX_DOCUMENT_DATA_LENGTH) {
        return res.status(400).json({ ok: false, message: "ID proof document is too large" });
      }
    }

    if (gstDocumentInput) {
      if (!DOCUMENT_DATA_URL_REGEX.test(gstDocumentInput) && !isUrlOrUploadPath(gstDocumentInput)) {
        return res.status(400).json({ ok: false, message: "GST document must be image, PDF, DOC, DOCX or a valid URL" });
      }

      if (!isUrlOrUploadPath(gstDocumentInput) && gstDocumentInput.length > MAX_DOCUMENT_DATA_LENGTH) {
        return res.status(400).json({ ok: false, message: "GST document is too large" });
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
    let locationState = null;
    if (user.role === "vendor") {
      if (!gstNumberInput) {
        return res.status(400).json({ ok: false, message: "GSTIN number is required" });
      }

      if (!gstDocumentInput) {
        return res.status(400).json({ ok: false, message: "GST document is required" });
      }

      if (!shopOpeningTimeInput || !shopClosingTimeInput) {
        return res.status(400).json({ ok: false, message: "Shop opening and closing time are required" });
      }

      if (uniqueServiceTags.length === 0) {
        return res.status(400).json({ ok: false, message: "Add at least one service tag" });
      }

      category = await Category.findOne({ _id: businessCategoryId, isActive: true }).select(
        "_id name customFormEnabled customFormTitle customFormFields"
      );
      if (!category) {
        return res.status(400).json({ ok: false, message: "Selected business category is invalid or inactive" });
      }

      if (businessSubcategoryId) {
        subcategory = await Subcategory.findOne({
          _id: businessSubcategoryId,
          category: category._id,
          isActive: true,
        }).select("_id name customFormEnabled customFormTitle customFormFields");

        if (!subcategory) {
          return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid or inactive" });
        }
      }

      const locationNeedsValidation = cityWasProvided || sublocalityWasProvided || !user.city || !user.sublocality;
      if (locationNeedsValidation) {
        if (!cityInput || !sublocalityInput) {
          return res.status(400).json({ ok: false, message: "City and sublocality are required" });
        }

        const cityRecord = await City.findOne({ name: toExactRegex(cityInput), isActive: true }).select(
          "name state localities"
        );
        if (!cityRecord) {
          return res.status(400).json({ ok: false, message: "Selected city is invalid or inactive" });
        }

        const matchedLocality = (Array.isArray(cityRecord.localities) ? cityRecord.localities : []).find(
          (locality) => locality.isActive !== false && toExactRegex(sublocalityInput).test(String(locality.name || ""))
        );

        if (!matchedLocality) {
          return res.status(400).json({ ok: false, message: "Selected sublocality is invalid for the selected city" });
        }

        const resolvedState = stateInput || String(cityRecord.state || "").trim();
        if (!resolvedState) {
          return res.status(400).json({ ok: false, message: "State is required for selected city" });
        }

        locationState = {
          city: cityRecord.name,
          sublocality: matchedLocality.name,
          state: resolvedState,
        };
      }

      const effectiveCustomForm = resolveEffectiveCustomForm({
        category,
        subcategory,
      });

      const customDataValidation = validateCustomFormData(customFormDataInput, effectiveCustomForm.fields);
      if (!customDataValidation.ok) {
        return res.status(400).json({ ok: false, message: customDataValidation.message || "Invalid custom form data" });
      }

      user.customFormData =
        Object.keys(customDataValidation.data).length > 0 ? customDataValidation.data : undefined;
    }

    user.name = name;
    user.email = email || undefined;
    user.phone = phone || undefined;
    user.alternatePhone = alternatePhone || undefined;

    if (user.role === "vendor") {
      user.businessEmail = businessEmail;
      user.businessPhone = businessPhone;
      user.businessAlternatePhone = businessAlternatePhone || undefined;
      user.businessAddress = businessAddressInput || undefined;
      user.website = websiteInput || undefined;
      user.businessDescription = businessDescriptionInput || undefined;

      const resolvedImages = await resolveUserProfileImages({
        imageInput,
        shopBannerImageInput,
        cardImageInput,
        myStoreImageInput,
        myStoreBannerImageInput,
        paymentQrCodeInput,
        shopGalleryInput: shopGallery,
      });

      user.image = resolvedImages.imageInput || undefined;
      user.shopBannerImage = resolvedImages.shopBannerImageInput || undefined;
      user.cardImage = resolvedImages.cardImageInput || undefined;
      user.myStoreImage = resolvedImages.myStoreImageInput || undefined;
      user.myStoreBannerImage = resolvedImages.myStoreBannerImageInput || undefined;
      user.paymentQrCode = resolvedImages.paymentQrCodeInput || undefined;
      user.shopGallery = resolvedImages.shopGalleryInput || [];
      user.instagramUrl = instagramUrlInput || undefined;
      user.facebookUrl = facebookUrlInput || undefined;
      user.youtubeUrl = youtubeUrlInput || undefined;
      user.businessCategory = category?._id;
      user.businessSubcategory = subcategory?._id;
      if (locationState) {
        user.city = locationState.city;
        user.sublocality = locationState.sublocality;
        user.state = locationState.state;
      } else if (stateWasProvided) {
        user.state = stateInput || undefined;
      }
      user.gstNumber = gstNumberInput || undefined;
      user.gstDocument = gstDocumentInput || undefined;
      user.shopOpeningTime = shopOpeningTimeInput || undefined;
      user.shopClosingTime = shopClosingTimeInput || undefined;
      const nextStoreStatusMode = storeStatusModeInput;
      const nextManualStoreStatus = nextStoreStatusMode === "manual" ? manualStoreStatusInput : undefined;
      const previousStoreStatusMode = String(user.storeStatusMode || "auto").trim().toLowerCase();
      const previousManualStoreStatus = String(user.manualStoreStatus || "").trim().toLowerCase();

      user.storeStatusMode = nextStoreStatusMode;
      user.manualStoreStatus = nextManualStoreStatus;
      if (
        previousStoreStatusMode !== nextStoreStatusMode ||
        previousManualStoreStatus !== String(nextManualStoreStatus || "")
      ) {
        user.manualStoreStatusUpdatedAt = new Date();
      }
      user.establishmentYear = establishmentYear;
      user.serviceTags = uniqueServiceTags;
      user.idProofType = idProofTypeInput || user.idProofType;
      user.idProofNumber = idProofNumberInput || user.idProofNumber;
      user.idProofDocument = idProofDocumentInput || user.idProofDocument;
    } else if (user.role === "customer") {
      user.businessAddress = businessAddressInput || undefined;
      user.city = cityInput || undefined;
      user.sublocality = sublocalityInput || undefined;
      user.state = stateInput || undefined;
      user.postalCode = postalCodeInput || undefined;

      const resolvedImages = await resolveUserProfileImages({
        imageInput,
      });
      user.image = resolvedImages.imageInput || undefined;
    }

    await user.save();

    if (user.role === "vendor") {
      scheduleVendorIndex(String(user._id));
      const { clearCatalogCache } = require("../lib/redis");
      await clearCatalogCache();
    }

    const updatedUser = await User.findById(user._id)
      .select(
        "_id name email phone alternatePhone businessName role vendorStatus businessCategory businessSubcategory businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website businessDescription image shopBannerImage cardImage myStoreImage myStoreBannerImage shopGallery instagramUrl facebookUrl youtubeUrl shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt establishmentYear serviceTags customFormData paymentQrCode"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields");

    if (updatedUser?.role === "vendor") {
      emitVendorStoreStatus(updatedUser);
    }

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
        businessAddress: updatedUser.businessAddress,
        city: updatedUser.city,
        sublocality: updatedUser.sublocality,
        state: updatedUser.state,
        postalCode: updatedUser.postalCode,
        gstNumber: updatedUser.gstNumber,
        gstDocument: updatedUser.gstDocument,
        website: updatedUser.website,
        businessDescription: updatedUser.businessDescription,
        image: updatedUser.image,
        shopBannerImage: updatedUser.shopBannerImage,
        cardImage: updatedUser.cardImage,
        myStoreImage: updatedUser.myStoreImage,
        paymentQrCode: updatedUser.paymentQrCode,
        myStoreBannerImage: updatedUser.myStoreBannerImage,
        shopGallery: Array.isArray(updatedUser.shopGallery) ? updatedUser.shopGallery : [],
        instagramUrl: updatedUser.instagramUrl,
        facebookUrl: updatedUser.facebookUrl,
        youtubeUrl: updatedUser.youtubeUrl,
        shopOpeningTime: updatedUser.shopOpeningTime,
        shopClosingTime: updatedUser.shopClosingTime,
        ...(updatedUser.role === "vendor" ? toStoreStatusSummary(updatedUser) : {}),
        establishmentYear: updatedUser.establishmentYear,
        serviceTags: updatedUser.serviceTags || [],
        customFormData:
          updatedUser.customFormData && typeof updatedUser.customFormData === "object"
            ? updatedUser.customFormData
            : {},
        effectiveCustomForm:
          updatedUser.role === "vendor"
            ? resolveEffectiveCustomForm({
                category: updatedUser.businessCategory,
                subcategory: updatedUser.businessSubcategory,
              })
            : { source: "none", title: "", fields: [] },
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update profile", error: error.message });
  }
});

//this is status of vendor controlled by socket.io on live trail form 
//Here vendor can update his status open/close beyon dthe default schedule of shop opening and closing 
router.patch("/vendor/store-status", async (req, res) => {
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
    const user = await User.findById(payload.sub).select(
      "_id role vendorStatus shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt"
    );

    if (!user) {
      clearAuthCookie(res, "vendor");
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    if (user.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor account required" });
    }

    const storeStatusModeInput =
      req.body?.storeStatusMode !== undefined
        ? String(req.body.storeStatusMode || "").trim().toLowerCase()
        : String(user.storeStatusMode || "auto").trim().toLowerCase();
    const manualStoreStatusInput =
      req.body?.manualStoreStatus !== undefined
        ? String(req.body.manualStoreStatus || "").trim().toLowerCase()
        : String(user.manualStoreStatus || "").trim().toLowerCase();

    if (!STORE_STATUS_MODE_VALUES.has(storeStatusModeInput)) {
      return res.status(400).json({ ok: false, message: "Store status mode must be either auto or manual" });
    }

    if (manualStoreStatusInput && !MANUAL_STORE_STATUS_VALUES.has(manualStoreStatusInput)) {
      return res.status(400).json({ ok: false, message: "Manual store status must be either open or closed" });
    }

    if (storeStatusModeInput === "manual" && !manualStoreStatusInput) {
      return res.status(400).json({ ok: false, message: "Manual store status is required when mode is manual" });
    }

    const nextManualStoreStatus = storeStatusModeInput === "manual" ? manualStoreStatusInput : undefined;
    const previousStoreStatusMode = String(user.storeStatusMode || "auto").trim().toLowerCase();
    const previousManualStoreStatus = String(user.manualStoreStatus || "").trim().toLowerCase();

    user.storeStatusMode = storeStatusModeInput;
    user.manualStoreStatus = nextManualStoreStatus;

    if (
      previousStoreStatusMode !== storeStatusModeInput ||
      previousManualStoreStatus !== String(nextManualStoreStatus || "")
    ) {
      user.manualStoreStatusUpdatedAt = new Date();
    }

    await user.save();

    scheduleVendorIndex(String(user._id));
    emitVendorStoreStatus(user);
    const { clearCatalogCache } = require("../lib/redis");
    await clearCatalogCache();

    return res.status(200).json({
      ok: true,
      message: "Store status updated",
      storeStatus: toStoreStatusSummary(user),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update store status", error: error.message });
  }
});


// Route to change the password opf authenticated user 
// Why this request is POST most genuine question ??
// Now since PATCH request is used to and small update like name update only on event while during  password change we have to 
// do multiple events :

// 1 -> Verify the current password which is existing in the data base
// 2 -> have to match the current pass with the help of bycrypt compare function
// 3 -> if sucessfull then we have to match the password regx demand 
// 4 -> Then we have to hash this new password and then save ot into database
// 5 -> Next time we will use this same hash to login or validation of user 
// since all these multiple events can be done only using POST request and 
// PATCH is only used to do an single updation event like name or number 
// lets say we have to update some thing that doesnot require validation or multiple events that must be done POST  request
router.post("/auth/change-password", async (req, res) => {
  try {
    const authContext = normalizeAuthContext(req.body?.authContext || req.query?.context || req.headers["x-auth-context"], "customer");
    const token = resolveTokenFromRequest(req, authContext);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      clearAuthCookie(res, authContext);
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
