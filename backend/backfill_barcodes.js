const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const VendorProduct = require('./src/models/VendorProduct');

const isPhysicalProduct = (catLabel) => {
  const cat = String(catLabel || '').trim().toLowerCase();
  if (['restaurant', 'bars', 'food', 'beverages', 'bakery', 'cafe', 'meal', 'dinner', 'lunch', 'breakfast'].includes(cat)) {
    return false;
  }
  if (['home services', 'salon', 'beauty', 'health', 'fitness', 'education', 'classes', 'cleaning', 'repair', 'local services', 'services'].includes(cat)) {
    return false;
  }
  return true;
};

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'winkget_business';
  if (!uri) {
    console.error("MONGODB_URI is not set!");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName });
  console.log("Connected to database:", dbName);

  const products = await VendorProduct.find({ isDeleted: { $ne: true } });

  console.log(`Scanning ${products.length} active products...`);

  let parentUpdatedCount = 0;
  let variantUpdatedCount = 0;

  let sourcePlatformUpdatedCount = 0;

  for (const product of products) {
    let isModified = false;

    // 1. Backfill parent barcode if missing (physical products only)
    if (isPhysicalProduct(product.categoryLabel)) {
      if (!product.barcode || !product.barcode.trim()) {
        const tempBarcode = `TEMP-UPC-${product._id.toString().toUpperCase()}`;
        product.barcode = tempBarcode;
        isModified = true;
        parentUpdatedCount++;
      }

      // 2. Backfill variant barcodes if missing
      if (Array.isArray(product.variantData) && product.variantData.length > 0) {
        product.variantData.forEach((variant, index) => {
          if (!variant.barcode || !variant.barcode.trim()) {
            variant.barcode = `TEMP-VAR-${product._id.toString().toUpperCase()}-${index}`;
            isModified = true;
            variantUpdatedCount++;
          }
        });
        if (isModified) {
          product.markModified('variantData');
        }
      }
    }

    // 3. Update sourcePlatform from winkget_vendor to winkget_business for all items
    if (!product.sourcePlatform || product.sourcePlatform === "winkget_vendor") {
      product.sourcePlatform = "winkget_business";
      isModified = true;
      sourcePlatformUpdatedCount++;
    }

    if (isModified) {
      await product.save();
    }
  }

  console.log(`Successfully backfilled ${parentUpdatedCount} parent barcodes, ${variantUpdatedCount} variant barcodes, and updated sourcePlatform for ${sourcePlatformUpdatedCount} products.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
