require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "winkget_business";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  const email = String(process.env.ADMIN_EMAIL || "admin@winkget.com").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "Admin@12345");
  const name = String(process.env.ADMIN_NAME || "Winkget Admin").trim();

  if (!email || !password || !name) {
    throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME must be non-empty");
  }

  await mongoose.connect(mongoUri, { dbName, serverSelectionTimeoutMS: 5000 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        provider: "credentials",
        role: "admin",
        vendorStatus: "approved",
        passwordHash,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  // Keep output machine and human readable for quick confirmation.
  // Password is shown intentionally because this script is for bootstrap only.
  // Change it after first login.
  // eslint-disable-next-line no-console
  console.log(
    "ADMIN_READY",
    JSON.stringify({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      password,
    })
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("ADMIN_CREATE_FAILED", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect failures during error handling.
  }
  process.exit(1);
});
