import { io, type Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export type VendorStoreStatusSocketPayload = {
  vendorId: string;
  storeStatusMode?: "auto" | "manual";
  manualStoreStatus?: "open" | "closed" | null;
  manualStoreStatusUpdatedAt?: string | null;
  isStoreOpen?: boolean | null;
  storeStatusSource?: "manual" | "schedule" | "unknown" | "vendor-status";
  emittedAt?: string;
};

let socketInstance: Socket | null = null;

const getSocket = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  return socketInstance;
};

export const subscribeVendorStoreStatus = (
  vendorId: string,
  onUpdate: (payload: VendorStoreStatusSocketPayload) => void
) => {
  const normalizedVendorId = String(vendorId || "").trim();
  if (!OBJECT_ID_REGEX.test(normalizedVendorId)) {
    return () => {};
  }

  const socket = getSocket();
  if (!socket) {
    return () => {};
  }

  const listener = (payload: VendorStoreStatusSocketPayload) => {
    if (!payload || String(payload.vendorId || "").trim() !== normalizedVendorId) {
      return;
    }

    onUpdate(payload);
  };

  socket.emit("vendor:subscribe", { vendorId: normalizedVendorId });
  socket.on("vendor:status-updated", listener);

  return () => {
    socket.off("vendor:status-updated", listener);
    socket.emit("vendor:unsubscribe", { vendorId: normalizedVendorId });
  };
};
