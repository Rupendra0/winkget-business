require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDatabase } = require("./config/db");
const { attachRealtimeServer } = require("./lib/realtime");
const User = require("./models/User");
const Category = require("./models/Category");
const Subcategory = require("./models/Subcategory");
const Inquiry = require("./models/Inquiry");
const Review = require("./models/Review");
const City = require("./models/City");
const FailureLog = require("./models/FailureLog");
const VendorProduct = require("./models/VendorProduct");
const Order = require("./models/Order");

const PORT = Number(process.env.PORT || 5000);

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught exception:", error);
  process.exit(1);
});

async function startServer() {
  try {
    await connectDatabase();

    // Ensure DB indexes match current schema so parent-scoped subcategory uniqueness works.
    await User.syncIndexes();
    await Category.syncIndexes();
    await Subcategory.syncIndexes();
    await Inquiry.syncIndexes();
    await Review.syncIndexes();
    await City.syncIndexes();
    await FailureLog.syncIndexes();
    await VendorProduct.syncIndexes();
    await Order.syncIndexes();

    const envOrigins = String(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const devOrigins =
      process.env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
        : [];
    const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));

    const httpServer = http.createServer(app);
    attachRealtimeServer(httpServer, { allowedOrigins });

    httpServer.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
