const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "winkget_business";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  await mongoose.connect(mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 5000,
  });

  return mongoose.connection;
}

module.exports = {
  connectDatabase,
};
