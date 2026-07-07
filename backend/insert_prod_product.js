const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');

// MONGODB CONNECTION DETAILS
require('dotenv').config({ path: path.join(__dirname, '.env') });
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'winkget_business';

async function run() {
  const logDir = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\ed7c96b6-30ea-4e3d-a61a-193c4066218f\\.system_generated\\logs';
  const transcriptPath = path.join(logDir, 'transcript_full.jsonl');

  if (!fs.existsSync(transcriptPath)) {
    console.error("Transcript file not found at:", transcriptPath);
    process.exit(1);
  }

  console.log("Reading transcript file:", transcriptPath);
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  
  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (step.type === 'USER_INPUT' && step.content && step.content.includes('69da7bbe4f6cf9c8f1f0b384')) {
        let contentText = step.content;
        let jsonStart = contentText.indexOf('{');
        let jsonEnd = contentText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const text = contentText.substring(jsonStart, jsonEnd + 1);
          matches.push(text);
        }
      }
    } catch (err) {
      // Skip invalid JSON lines
    }
  }

  if (matches.length === 0) {
    console.error("Could not find any product JSON containing ID 69da7bbe4f6cf9c8f1f0b384 in USER_INPUT steps!");
    process.exit(1);
  }

  // Sort matches by length descending
  matches.sort((a, b) => b.length - a.length);

  let productObj = null;
  for (const matchText of matches) {
    try {
      console.log("Attempting to parse match. Length:", matchText.length);
      console.log("Start:", matchText.substring(0, 200));
      console.log("End:", matchText.substring(matchText.length - 200));
      productObj = JSON.parse(matchText);
      console.log("Successfully parsed!");
      break;
    } catch (e) {
      console.error("Parse error:", e.message);
    }
  }

  if (!productObj) {
    console.error("Failed to parse any of the extracted JSON matches!");
    process.exit(1);
  }

  // Convert $oid / dates to native MongoDB types
  if (productObj._id && productObj._id.$oid) {
    productObj._id = new mongoose.Types.ObjectId(productObj._id.$oid);
  }
  if (productObj.vendor && productObj.vendor.$oid) {
    productObj.vendor = new mongoose.Types.ObjectId(productObj.vendor.$oid);
  }
  if (productObj.createdAt && productObj.createdAt.$date) {
    productObj.createdAt = new Date(productObj.createdAt.$date);
  }
  if (productObj.updatedAt && productObj.updatedAt.$date) {
    productObj.updatedAt = new Date(productObj.updatedAt.$date);
  }
  if (productObj.publishedAt && productObj.publishedAt.$date) {
    productObj.publishedAt = new Date(productObj.publishedAt.$date);
  }

  // Set defaults for missing fields if any
  productObj.status = productObj.status || 'live';
  productObj.isDeleted = productObj.isDeleted || false;

  console.log("Connecting to local MongoDB:", uri, "Database:", dbName);
  await mongoose.connect(uri, { dbName });
  console.log("Connected!");

  // Insert or update
  const collection = mongoose.connection.collection('vendorproducts');
  const result = await collection.updateOne(
    { _id: productObj._id },
    { $set: productObj },
    { upsert: true }
  );

  console.log("Successfully upserted product into local database!");
  console.log("Result:", result);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
