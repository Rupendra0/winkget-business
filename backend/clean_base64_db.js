const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const VendorProduct = require('./src/models/VendorProduct');

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=600'
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600';

function isBase64(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.length > 50000;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'winkget_business';
  if (!uri) {
    console.error("MONGODB_URI is not set in backend/.env!");
    process.exit(1);
  }

  console.log("Connecting to:", uri, "Database:", dbName);
  await mongoose.connect(uri, { dbName });
  console.log("Connected!");

  const products = await VendorProduct.find({ isDeleted: { $ne: true } });
  console.log(`Found ${products.length} active products to check.`);

  let updatedCount = 0;

  for (const product of products) {
    let modified = false;

    // Check main image
    if (isBase64(product.image)) {
      product.image = DEFAULT_IMAGE;
      modified = true;
    }

    // Check heroImage
    if (isBase64(product.heroImage)) {
      product.heroImage = DEFAULT_IMAGE;
      modified = true;
    }

    // Check gallery
    if (Array.isArray(product.gallery)) {
      const nextGallery = product.gallery.map((img, idx) => {
        if (isBase64(img)) {
          modified = true;
          return PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length];
        }
        return img;
      });
      if (modified) {
        product.gallery = nextGallery;
      }
    }

    // Check variantData
    if (Array.isArray(product.variantData)) {
      const nextVariants = product.variantData.map((variant, idx) => {
        if (isBase64(variant.image)) {
          modified = true;
          return {
            ...variant.toObject ? variant.toObject() : variant,
            image: PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length]
          };
        }
        return variant;
      });
      if (modified) {
        product.variantData = nextVariants;
      }
    }

    // Check detailedDescriptionBlocks
    if (Array.isArray(product.detailedDescriptionBlocks)) {
      const nextBlocks = product.detailedDescriptionBlocks.map((block, idx) => {
        if (isBase64(block.image)) {
          modified = true;
          return {
            ...block.toObject ? block.toObject() : block,
            image: PLACEHOLDER_IMAGES[(idx + 2) % PLACEHOLDER_IMAGES.length]
          };
        }
        return block;
      });
      if (modified) {
        product.detailedDescriptionBlocks = nextBlocks;
      }
    }

    if (modified) {
      await product.save();
      console.log(`Updated product: ${product.productName}`);
      updatedCount++;
    }
  }

  console.log(`Successfully cleaned ${updatedCount} products in database.`);
  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
