const { Server } = require("socket.io");
const { toStoreStatusSummary } = require("./storeStatus");

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

let ioInstance = null;

const toAllowedOrigins = (extraOrigins) => {
  const envOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devOrigins =
    process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
      : [];

  const passedOrigins = Array.isArray(extraOrigins)
    ? extraOrigins.map((origin) => String(origin || "").trim()).filter(Boolean)
    : [];

  return Array.from(new Set([...envOrigins, ...devOrigins, ...passedOrigins]));
};

const toVendorRoom = (vendorId) => `vendor:${String(vendorId || "").trim()}`;

const attachRealtimeServer = (httpServer, options = {}) => {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins = toAllowedOrigins(options.allowedOrigins);

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed"));
      },
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("vendor:subscribe", (payload) => {
      const vendorId = String(payload?.vendorId || "").trim();
      if (!OBJECT_ID_REGEX.test(vendorId)) {
        return;
      }

      socket.join(toVendorRoom(vendorId));
    });

    socket.on("vendor:unsubscribe", (payload) => {
      const vendorId = String(payload?.vendorId || "").trim();
      if (!OBJECT_ID_REGEX.test(vendorId)) {
        return;
      }

      socket.leave(toVendorRoom(vendorId));
    });
  });

  return ioInstance;
};

const emitVendorStoreStatus = (vendor) => {
  if (!ioInstance || !vendor?._id) {
    return;
  }

  const vendorId = String(vendor._id || "").trim();
  if (!OBJECT_ID_REGEX.test(vendorId)) {
    return;
  }

  ioInstance.to(toVendorRoom(vendorId)).emit("vendor:status-updated", {
    vendorId,
    ...toStoreStatusSummary(vendor),
    emittedAt: new Date().toISOString(),
  });
};

module.exports = {
  attachRealtimeServer,
  emitVendorStoreStatus,
};
