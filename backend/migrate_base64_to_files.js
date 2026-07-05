const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const VendorProduct = require('./src/models/VendorProduct');
const User = require('./src/models/User');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function isBase64(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.length > 50000;
}

function saveBase64ToFile(base64Str) {
  if (!isBase64(base64Str)) return base64Str;

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      return base64Str; // Return unchanged if it doesn't match format
    }
    
    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate a unique filename prefixed with 'migrated-'
    const uniqueName = `migrated-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved migrated image to disk: ${uniqueName} (${buffer.length} bytes)`);
    return `/uploads/${uniqueName}`;
  } catch (err) {
    console.error("Error saving base64 image:", err);
    return base64Str;
  }
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

  // 1. Migrate Products
  const products = await VendorProduct.find({});
  console.log(`Scanning ${products.length} products for base64 images...`);
  
  let migratedProductsCount = 0;
  
  for (const product of products) {
    let modified = false;

    // Main Image
    if (isBase64(product.image)) {
      product.image = saveBase64ToFile(product.image);
      modified = true;
    }

    // Hero Image
    if (isBase64(product.heroImage)) {
      product.heroImage = saveBase64ToFile(product.heroImage);
      modified = true;
    }

    // Subcategory Image
    if (isBase64(product.subcategoryImage)) {
      product.subcategoryImage = saveBase64ToFile(product.subcategoryImage);
      modified = true;
    }

    // Gallery
    if (Array.isArray(product.gallery)) {
      const nextGallery = product.gallery.map((img) => {
        if (isBase64(img)) {
          modified = true;
          return saveBase64ToFile(img);
        }
        return img;
      });
      product.gallery = nextGallery;
    }

    // Variant images
    if (Array.isArray(product.variantData)) {
      const nextVariants = product.variantData.map((variant) => {
        if (isBase64(variant.image)) {
          modified = true;
          const varObj = variant.toObject ? variant.toObject() : variant;
          return {
            ...varObj,
            image: saveBase64ToFile(variant.image)
          };
        }
        return variant;
      });
      product.variantData = nextVariants;
    }

    // Detailed description block images
    if (Array.isArray(product.detailedDescriptionBlocks)) {
      const nextBlocks = product.detailedDescriptionBlocks.map((block) => {
        if (isBase64(block.image)) {
          modified = true;
          const blockObj = block.toObject ? block.toObject() : block;
          return {
            ...blockObj,
            image: saveBase64ToFile(block.image)
          };
        }
        return block;
      });
      product.detailedDescriptionBlocks = nextBlocks;
    }

    if (modified) {
      await product.save();
      console.log(`Migrated images for product: ${product.productName}`);
      migratedProductsCount++;
    }
  }

  // 2. Migrate User Profiles (Vendors)
  const users = await User.find({ role: 'vendor' });
  console.log(`Scanning ${users.length} vendor profiles for base64 images...`);
  
  let migratedUsersCount = 0;
  
  for (const user of users) {
    let modified = false;

    if (isBase64(user.image)) {
      user.image = saveBase64ToFile(user.image);
      modified = true;
    }
    if (isBase64(user.shopBannerImage)) {
      user.shopBannerImage = saveBase64ToFile(user.shopBannerImage);
      modified = true;
    }
    if (isBase64(user.cardImage)) {
      user.cardImage = saveBase64ToFile(user.cardImage);
      modified = true;
    }
    if (isBase64(user.myStoreImage)) {
      user.myStoreImage = saveBase64ToFile(user.myStoreImage);
      modified = true;
    }
    if (isBase64(user.myStoreBannerImage)) {
      user.myStoreBannerImage = saveBase64ToFile(user.myStoreBannerImage);
      modified = true;
    }
    if (isBase64(user.paymentQrCode)) {
      user.paymentQrCode = saveBase64ToFile(user.paymentQrCode);
      modified = true;
    }

    if (Array.isArray(user.shopGallery)) {
      const nextGallery = user.shopGallery.map((img) => {
        if (isBase64(img)) {
          modified = true;
          return saveBase64ToFile(img);
        }
        return img;
      });
      user.shopGallery = nextGallery;
    }

    if (modified) {
      await user.save();
      console.log(`Migrated images for vendor profile: ${user.businessName || user.name}`);
      migratedUsersCount++;
    }
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Products migrated: ${migratedProductsCount}`);
  console.log(`Vendor profiles migrated: ${migratedUsersCount}`);
  
  await mongoose.disconnect();
  console.log("Disconnected from database.");
}

run().catch(console.error);
