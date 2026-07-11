const { uploadImage, isBase64 } = require("./mediaStorage");
const HomePlacement = require("../models/HomePlacement");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

async function migrateHomepageImages() {
  try {
    console.log("[Migration] Running Cloudinary migration for HomePlacements, Categories, and Subcategories...");

    // 1. Migrate HomePlacements
    const placements = await HomePlacement.find({});
    let placementsCount = 0;
    for (const placement of placements) {
      let isModified = false;

      // Slots left/middle/right
      if (placement.slots) {
        if (placement.slots.leftImage && isBase64(placement.slots.leftImage)) {
          placement.slots.leftImage = await uploadImage(placement.slots.leftImage);
          isModified = true;
        }
        if (placement.slots.middleImage && isBase64(placement.slots.middleImage)) {
          placement.slots.middleImage = await uploadImage(placement.slots.middleImage);
          isModified = true;
        }
        if (placement.slots.rightImage && isBase64(placement.slots.rightImage)) {
          placement.slots.rightImage = await uploadImage(placement.slots.rightImage);
          isModified = true;
        }
      }

      // Helper to migrate cards
      const migrateCards = async (cards) => {
        if (!Array.isArray(cards)) return false;
        let cardsModified = false;
        for (const card of cards) {
          if (card.image && isBase64(card.image)) {
            card.image = await uploadImage(card.image);
            cardsModified = true;
          }
        }
        return cardsModified;
      };

      if (await migrateCards(placement.promoCards)) {
        placement.markModified("promoCards");
        isModified = true;
      }
      if (await migrateCards(placement.exploreCards)) {
        placement.markModified("exploreCards");
        isModified = true;
      }
      if (await migrateCards(placement.wellnessCards)) {
        placement.markModified("wellnessCards");
        isModified = true;
      }
      if (await migrateCards(placement.sponsorCards)) {
        placement.markModified("sponsorCards");
        isModified = true;
      }

      if (placement.icon && isBase64(placement.icon)) {
        placement.icon = await uploadImage(placement.icon);
        isModified = true;
      }

      if (isModified) {
        if (placement.slots) {
          placement.markModified("slots");
        }
        await placement.save();
        placementsCount++;
      }
    }
    console.log(`[Migration] Migrated base64 images in ${placementsCount} HomePlacement documents.`);

    // 2. Migrate Categories
    const categories = await Category.find({});
    let categoriesCount = 0;
    for (const category of categories) {
      if (category.icon && isBase64(category.icon)) {
        category.icon = await uploadImage(category.icon);
        await category.save();
        categoriesCount++;
      }
    }
    console.log(`[Migration] Migrated base64 icons in ${categoriesCount} Category documents.`);

    // 3. Migrate Subcategories
    const subcategories = await Subcategory.find({});
    let subcategoriesCount = 0;
    for (const subcategory of subcategories) {
      let isModified = false;
      if (subcategory.icon && isBase64(subcategory.icon)) {
        subcategory.icon = await uploadImage(subcategory.icon);
        isModified = true;
      }
      if (subcategory.coverImage && isBase64(subcategory.coverImage)) {
        subcategory.coverImage = await uploadImage(subcategory.coverImage);
        isModified = true;
      }
      if (isModified) {
        await subcategory.save();
        subcategoriesCount++;
      }
    }
    console.log(`[Migration] Migrated base64 images in ${subcategoriesCount} Subcategory documents.`);

  } catch (error) {
    console.error("[Migration] Error migrating homepage/category images:", error);
  }
}

module.exports = { migrateHomepageImages };
