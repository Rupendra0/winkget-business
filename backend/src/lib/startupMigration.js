const path = require('path');
const fs = require('fs');
const VendorProduct = require('../models/VendorProduct');
const User = require('../models/User');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

function isBase64(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.length > 50000;
}

function saveBase64ToFile(base64Str) {
  if (!isBase64(base64Str)) return base64Str;

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      return base64Str;
    }
    
    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const uniqueName = `migrated-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    
    fs.writeFileSync(filePath, buffer);
    console.log(`[Migration] Saved image: ${uniqueName}`);
    return `/uploads/${uniqueName}`;
  } catch (err) {
    console.error("[Migration] Error saving base64 image:", err);
    return base64Str;
  }
}

async function runMigration() {
  console.log("[Migration] Checking directory...");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // 1. Products
  const products = await VendorProduct.find({});
  console.log(`[Migration] Scanning ${products.length} products...`);
  
  let migratedProductsCount = 0;
  for (const product of products) {
    let modified = false;

    if (isBase64(product.image)) {
      product.image = saveBase64ToFile(product.image);
      modified = true;
    }
    if (isBase64(product.heroImage)) {
      product.heroImage = saveBase64ToFile(product.heroImage);
      modified = true;
    }
    if (isBase64(product.subcategoryImage)) {
      product.subcategoryImage = saveBase64ToFile(product.subcategoryImage);
      modified = true;
    }

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
      console.log(`[Migration] Updated product: ${product.productName}`);
      migratedProductsCount++;
    }
  }

  // 2. Vendors
  const users = await User.find({ role: 'vendor' });
  console.log(`[Migration] Scanning ${users.length} vendor profiles...`);
  
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
      console.log(`[Migration] Updated vendor profile: ${user.businessName || user.name}`);
      migratedUsersCount++;
    }
  }

  console.log(`[Migration] Done. Products migrated: ${migratedProductsCount}, Vendors migrated: ${migratedUsersCount}`);
}

module.exports = { runMigration };
