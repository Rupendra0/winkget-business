const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const STORE_STATUS_MODE_VALUES = new Set(["auto", "manual"]);
const MANUAL_STORE_STATUS_VALUES = new Set(["open", "closed"]);

const parseTimeToMinutes = (value) => {
  const normalized = String(value || "").trim();
  const match = TIME_REGEX.exec(normalized);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

const normalizeStoreStatusMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return STORE_STATUS_MODE_VALUES.has(normalized) ? normalized : "auto";
};

const normalizeManualStoreStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return MANUAL_STORE_STATUS_VALUES.has(normalized) ? normalized : null;
};

const resolveStoreOpenState = (input, now = new Date()) => {
  const mode = normalizeStoreStatusMode(input?.storeStatusMode);
  const manualStatus = normalizeManualStoreStatus(input?.manualStoreStatus);
  const vendorStatus = String(input?.vendorStatus || "approved").trim().toLowerCase();

  if (vendorStatus !== "approved") {
    return {
      isOpen: false,
      source: "vendor-status",
    };
  }

  if (mode === "manual" && manualStatus) {
    return {
      isOpen: manualStatus === "open",
      source: "manual",
    };
  }

  const opening = parseTimeToMinutes(input?.shopOpeningTime);
  const closing = parseTimeToMinutes(input?.shopClosingTime);
  if (opening === null || closing === null) {
    return {
      isOpen: null,
      source: "unknown",
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (opening === closing) {
    return {
      isOpen: true,
      source: "schedule",
    };
  }

  if (opening < closing) {
    return {
      isOpen: nowMinutes >= opening && nowMinutes < closing,
      source: "schedule",
    };
  }

  return {
    isOpen: nowMinutes >= opening || nowMinutes < closing,
    source: "schedule",
  };
};

const toStoreStatusSummary = (input, now = new Date()) => {
  const mode = normalizeStoreStatusMode(input?.storeStatusMode);
  const manualStatus = normalizeManualStoreStatus(input?.manualStoreStatus);
  const resolved = resolveStoreOpenState(input, now);

  return {
    storeStatusMode: mode,
    manualStoreStatus: manualStatus,
    manualStoreStatusUpdatedAt: input?.manualStoreStatusUpdatedAt || null,
    isStoreOpen: resolved.isOpen,
    storeStatusSource: resolved.source,
  };
};

module.exports = {
  MANUAL_STORE_STATUS_VALUES,
  STORE_STATUS_MODE_VALUES,
  normalizeManualStoreStatus,
  normalizeStoreStatusMode,
  parseTimeToMinutes,
  resolveStoreOpenState,
  toStoreStatusSummary,
};
