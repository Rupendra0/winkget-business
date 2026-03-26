const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/health", async (_req, res) => {
  const connection = mongoose.connection;

  return res.status(200).json({
    ok: true,
    message: "Backend is running",
    db: {
      host: connection.host || null,
      name: connection.name || null,
      readyState: connection.readyState,
    },
  });
});

module.exports = router;
