const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const healthRoutes = require("./routes/health.routes");
const devLogRoutes = require("./routes/devLogs.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const catalogRoutes = require("./routes/catalog.routes");
const inquiryRoutes = require("./routes/inquiries.routes");
const reviewRoutes = require("./routes/reviews.routes");

const app = express();
const envOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const devOrigins =
  process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    : [];
const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests and configured frontend origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(morgan("dev"));

app.use("/api", healthRoutes);
app.use("/api", devLogRoutes);
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", catalogRoutes);
app.use("/api", inquiryRoutes);
app.use("/api", reviewRoutes);

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Winkget backend service" });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({
    ok: false,
    message: "Unhandled server error",
    error: err.message,
  });
});

module.exports = app;
