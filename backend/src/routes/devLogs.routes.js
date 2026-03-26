const express = require("express");
const FailureLog = require("../models/FailureLog");

const router = express.Router();

router.get("/dev-logs", async (_req, res) => {
  try {
    const logs = await FailureLog.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return res.status(200).json({ ok: true, logs });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
});

router.post("/dev-logs", async (req, res) => {
  try {
    const source = String(req.body?.source || "unknown");
    const type = req.body?.type === "warning" ? "warning" : "failure";
    const message = String(req.body?.message || "Unknown failure");
    const role = ["admin", "vendor", "customer"].includes(req.body?.role)
      ? req.body.role
      : undefined;

    const log = await FailureLog.create({
      source,
      type,
      message,
      role,
      metadata: req.body?.metadata,
    });

    return res.status(201).json({ ok: true, log });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create log",
      error: error.message,
    });
  }
});

module.exports = router;
