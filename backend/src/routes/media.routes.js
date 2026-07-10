const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary explicitly if keys are in environment
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "ltfszo2a";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "588355263527471";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "5NszZl14g05wNqv3J4MtSDhJPSk";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

router.get('/media/upload-signature', (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = req.query.folder || 'winkget_general';

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, CLOUDINARY_API_SECRET);

    return res.status(200).json({
      ok: true,
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to generate signature',
      error: err.message,
    });
  }
});

module.exports = router;
