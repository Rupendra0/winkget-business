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

  const targetId = '69d9555641a04a5e6dc23a6e';
  const product = await VendorProduct.findById(targetId);

  if (!product) {
    console.error(`Product with ID ${targetId} not found in database!`);
    process.exit(1);
  }

  console.log(`Found product: ${product.productName}`);

  // 1. Seed variantData with realistic Macbook M2 configurations
  product.variantData = [
    {
      color: 'Midnight',
      size: '13.6-inch',
      mrp: 99900,
      sellingPrice: 86900,
      stock: 25,
      image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600'
    },
    {
      color: 'Space Gray',
      size: '13.6-inch',
      mrp: 98900,
      sellingPrice: 85900,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600'
    },
    {
      color: 'Silver',
      size: '13.6-inch',
      mrp: 97900,
      sellingPrice: 84900,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=600'
    },
    {
      color: 'Starlight',
      size: '13.6-inch',
      mrp: 100900,
      sellingPrice: 87900,
      stock: 10,
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=600'
    }
  ];

  // 2. Seed descriptionPoints
  product.descriptionPoints = [
    {
      heading: "Strikingly Thin Design",
      content: "The redesigned MacBook Air is more portable than ever and weighs just 2.7 pounds. It's the ultra-capable laptop that lets you work, play, or create just about anything — anywhere."
    },
    {
      heading: "Supercharged by M2 chip",
      content: "Get more done faster with a next-generation 8-core CPU, up to 10-core GPU, and up to 24GB of unified memory. Enjoy extreme performance while remaining completely fanless and silent."
    },
    {
      heading: "Up to 18 Hours of Battery Life",
      content: "Go all day and into the night, thanks to the power-efficient performance of the Apple M2 chip. Leave the charger behind with confidence."
    }
  ];

  // 3. Seed detailedDescriptionBlocks
  product.detailedDescriptionBlocks = [
    {
      image: "https://images.unsplash.com/photo-1504707748692-419802cf939d?auto=format&fit=crop&q=80&w=600",
      headline: "Liquid Retina Display",
      text: "The gorgeous 13.6-inch Liquid Retina display is the biggest and brightest ever on MacBook Air, supporting 1 billion colors. Text is super-sharp, and photos and movies are more vibrant and vivid."
    },
    {
      image: "https://images.unsplash.com/photo-1625766763788-95dcce9bf5ac?auto=format&fit=crop&q=80&w=600",
      headline: "Advanced Camera & Audio",
      text: "Look sharp and sound great with a 1080p FaceTime HD camera, a three-mic array, and a four-speaker sound system with Spatial Audio for immersive movie and music listening experiences."
    }
  ];

  // 4. Update specs
  product.specifications = [
    { label: "Processor", value: "Apple M2 Chip" },
    { label: "Screen Size", value: "13.6 inches" },
    { label: "Display Technology", value: "Liquid Retina Display" },
    { label: "Battery Life", value: "Up to 18 hours" },
    { label: "Weight", value: "2.7 pounds (1.24 kg)" },
    { label: "Audio", value: "4-speaker sound system with Spatial Audio" }
  ];

  // 5. Origin country
  product.originCountry = "USA";

  await product.save();
  console.log("Product updated successfully with realistic Macbook M2 configurations!");

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
