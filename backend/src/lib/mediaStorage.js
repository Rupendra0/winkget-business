const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
const BACKEND_UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure local directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKEND_UPLOADS_DIR)) {
  fs.mkdirSync(BACKEND_UPLOADS_DIR, { recursive: true });
}

// Configure Cloudinary if keys are present (with code-level fallback for Render environment)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "ltfszo2a";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "588355263527471";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "5NszZl14g05wNqv3J4MtSDhJPSk";

const isCloudinaryConfigured = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  console.log("[MediaStorage] Cloudinary successfully configured.");
} else {
  console.log("[MediaStorage] Cloudinary credentials missing. Falling back to local disk storage.");
}

const isBase64 = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.length > 50000;
};

// Async function to upload a single image
const uploadImage = async (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (isBase64(normalized)) {
    if (isCloudinaryConfigured) {
      try {
        console.log("[MediaStorage] Uploading base64 image to Cloudinary...");
        const result = await cloudinary.uploader.upload(normalized, {
          folder: 'winkget_products',
        });
        console.log(`[MediaStorage] Cloudinary upload successful: ${result.secure_url}`);
        return result.secure_url;
      } catch (err) {
        console.error("[MediaStorage] Cloudinary upload failed, falling back to local storage:", err.message);
      }
    }

    // Local storage fallback
    try {
      const matches = normalized.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches || matches.length < 3) {
        return normalized;
      }
      
      const ext = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + ext;
      
      // Save to standard backend/uploads
      const filePath = path.join(BACKEND_UPLOADS_DIR, uniqueName);
      fs.writeFileSync(filePath, buffer);
      
      console.log(`[MediaStorage] Saved base64 image locally: ${uniqueName}`);
      return `/uploads/${uniqueName}`;
    } catch (err) {
      console.error("[MediaStorage] Error saving local image:", err);
      return normalized;
    }
  }

  return normalized;
};

module.exports = {
  uploadImage,
  isBase64,
};
