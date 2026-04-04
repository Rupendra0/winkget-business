const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type ListingAccentName = "blue" | "indigo" | "purple" | "emerald" | "rose";

export type ListingCardAccent = {
  name: ListingAccentName;
  tagClass: string;
  primaryButtonClass: string;
  secondaryButtonClass: string;
  subtleTextClass: string;
  iconClass: string;
  focusRingClass: string;
};

export type BusinessOpenStatus = {
  isOpen: boolean | null;
  label: string;
  schedule: string;
};

const ACCENT_ORDER: ListingAccentName[] = ["blue", "indigo", "purple", "emerald", "rose"];

const ACCENT_STYLE_MAP: Record<ListingAccentName, Omit<ListingCardAccent, "name">> = {
  blue: {
    tagClass: "bg-blue-50 text-blue-600",
    primaryButtonClass: "bg-blue-600 hover:bg-blue-700",
    secondaryButtonClass: "border border-blue-200 text-blue-600 hover:bg-blue-50",
    subtleTextClass: "text-blue-500",
    iconClass: "text-blue-500",
    focusRingClass: "focus-visible:ring-blue-500",
  },
  indigo: {
    tagClass: "bg-indigo-50 text-indigo-600",
    primaryButtonClass: "bg-indigo-600 hover:bg-indigo-700",
    secondaryButtonClass: "border border-indigo-200 text-indigo-600 hover:bg-indigo-50",
    subtleTextClass: "text-indigo-500",
    iconClass: "text-indigo-500",
    focusRingClass: "focus-visible:ring-indigo-500",
  },
  purple: {
    tagClass: "bg-purple-50 text-purple-600",
    primaryButtonClass: "bg-purple-600 hover:bg-purple-700",
    secondaryButtonClass: "border border-purple-200 text-purple-600 hover:bg-purple-50",
    subtleTextClass: "text-purple-500",
    iconClass: "text-purple-500",
    focusRingClass: "focus-visible:ring-purple-500",
  },
  emerald: {
    tagClass: "bg-emerald-50 text-emerald-600",
    primaryButtonClass: "bg-emerald-600 hover:bg-emerald-700",
    secondaryButtonClass: "border border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    subtleTextClass: "text-emerald-500",
    iconClass: "text-emerald-500",
    focusRingClass: "focus-visible:ring-emerald-500",
  },
  rose: {
    tagClass: "bg-rose-50 text-rose-600",
    primaryButtonClass: "bg-rose-600 hover:bg-rose-700",
    secondaryButtonClass: "border border-rose-200 text-rose-600 hover:bg-rose-50",
    subtleTextClass: "text-rose-500",
    iconClass: "text-rose-500",
    focusRingClass: "focus-visible:ring-rose-500",
  },
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const parseTimeToMinutes = (timeValue?: string) => {
  const normalized = String(timeValue || "").trim();
  const match = TIME_REGEX.exec(normalized);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

const toDisplayTime = (timeValue?: string) => {
  const normalized = String(timeValue || "").trim();
  const match = TIME_REGEX.exec(normalized);
  if (!match) {
    return "";
  }

  const hour24 = Number(match[1]);
  const minutes = Number(match[2]);
  const hour12 = ((hour24 + 11) % 12) + 1;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

export const normalizePhoneDigits = (value?: string) => String(value || "").replace(/\D/g, "");

export const getBusinessOpenStatus = (
  openingTime?: string,
  closingTime?: string,
  now = new Date()
): BusinessOpenStatus => {
  const openingMinutes = parseTimeToMinutes(openingTime);
  const closingMinutes = parseTimeToMinutes(closingTime);

  if (openingMinutes === null || closingMinutes === null) {
    return {
      isOpen: null,
      label: "Hours unavailable",
      schedule: "",
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const wrapsMidnight = openingMinutes > closingMinutes;
  const isOpen = wrapsMidnight
    ? currentMinutes >= openingMinutes || currentMinutes <= closingMinutes
    : currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;

  return {
    isOpen,
    label: isOpen ? "Open Now" : "Closed",
    schedule: `${toDisplayTime(openingTime)} - ${toDisplayTime(closingTime)}`,
  };
};

export const getListingCardAccent = (categoryKey?: string): ListingCardAccent => {
  const normalized = String(categoryKey || "").trim().toLowerCase();

  const hash = normalized ? hashString(normalized) : 0;
  const accentName = ACCENT_ORDER[hash % ACCENT_ORDER.length] || "blue";
  return {
    name: accentName,
    ...ACCENT_STYLE_MAP[accentName],
  };
};
