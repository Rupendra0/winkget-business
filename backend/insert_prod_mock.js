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

  const targetId = '69da7bbe4f6cf9c8f1f0b384';
  
  const productData = {
    _id: new mongoose.Types.ObjectId(targetId),
    vendor: new mongoose.Types.ObjectId('69d0fe069701c94e51418f35'),
    slug: 'apple-macbook-air-m2-16-gb-256-gb-ssd-macos-sequoia',
    categorySlug: 'electronics',
    categoryLabel: 'Electronics',
    subcategorySlug: 'mobiles',
    subcategoryName: 'Mobiles',
    productName: 'Apple MacBook AIR M2 - (16 GB/256 GB SSD/macOS Sequoia)',
    shortDescription: 'Apple MacBook AIR M2 - (16 GB/256 GB SSD/macOS Sequoia) MC7X4HN/A (13.6 Inch, Midnight, 1.24 kg)',
    description: 'Apple M2\nPowerful and efficient performance\n16 GB | 256 GB\nSmooth gaming and video editing experience\n13.6 Inch | Liquid Retina Display\nHigh resolution and wide color gamut.\n1.24 kg\nLightweight and easy to carry',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=600'
    ],
    variantData: [
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
    ],
    descriptionPoints: [
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
    ],
    detailedDescriptionBlocks: [
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
    ],
    specifications: [
      { label: "Processor", value: "Apple M2 Chip" },
      { label: "Screen Size", value: "13.6 inches" },
      { label: "Display Technology", value: "Liquid Retina Display" },
      { label: "Battery Life", value: "Up to 18 hours" },
      { label: "Weight", value: "2.7 pounds (1.24 kg)" },
      { label: "Audio", value: "4-speaker sound system with Spatial Audio" }
    ],
    originCountry: "USA",
    status: 'live',
    isDeleted: false
  };

  const result = await VendorProduct.updateOne(
    { _id: productData._id },
    { $set: productData },
    { upsert: true }
  );

  console.log("Upserted product successfully!");
  console.log("Result:", result);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
