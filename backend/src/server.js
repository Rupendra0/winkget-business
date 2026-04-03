require("dotenv").config();
const app = require("./app");
const { connectDatabase } = require("./config/db");
const Subcategory = require("./models/Subcategory");
const Review = require("./models/Review");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDatabase();

    // Ensure DB indexes match current schema so parent-scoped subcategory uniqueness works.
    await Subcategory.syncIndexes();
    await Review.syncIndexes();

    app.listen(PORT, () => {
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
