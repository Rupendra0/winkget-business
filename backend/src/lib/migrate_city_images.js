const { uploadImage, isBase64 } = require("./mediaStorage");
const City = require("../models/City");

async function migrateCityImages() {
  try {
    console.log("[Migration] Running Cloudinary migration for City images...");

    const cities = await City.find({});
    let count = 0;
    for (const city of cities) {
      if (city.image && isBase64(city.image)) {
        console.log(`[Migration] Uploading city base64 image for: ${city.name}...`);
        city.image = await uploadImage(city.image);
        await city.save();
        count++;
      }
    }
    console.log(`[Migration] Successfully migrated ${count} City images to Cloudinary.`);
  } catch (error) {
    console.error("[Migration] Error migrating City images:", error);
  }
}

module.exports = { migrateCityImages };
