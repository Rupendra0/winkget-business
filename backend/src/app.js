const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const healthRoutes = require("./routes/health.routes");
const devLogRoutes = require("./routes/devLogs.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", healthRoutes);
app.use("/api", devLogRoutes);
app.use("/api", authRoutes);

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
