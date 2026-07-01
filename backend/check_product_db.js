const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const VendorProduct = require('./src/models/VendorProduct');

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

  const products = await VendorProduct.find({ isDeleted: { $ne: true } }).lean();
  console.log(`Found ${products.length} active products/services:`);
  
  for (const p of products) {
    console.log(`\nProduct ID: ${p._id}`);
    console.log(`Name: ${p.productName}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Status: ${p.status}`);
    console.log(`Short Description: ${p.shortDescription}`);
    console.log(`Description: ${p.description}`);
    console.log(`DescriptionPoints:`, JSON.stringify(p.descriptionPoints, null, 2));
    console.log("-----------------------------------------");
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
