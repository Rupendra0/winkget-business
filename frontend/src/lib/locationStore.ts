const LOCATION_CITY_STORAGE_KEY = "winkget:selected-city";
const LOCATION_EVENT = "winkget:location-changed";

export const readSelectedCity = () => {
  if (typeof window === "undefined") return "";
  return String(window.localStorage.getItem(LOCATION_CITY_STORAGE_KEY) || "").trim();
};

export const writeSelectedCity = (city: string) => {
  if (typeof window === "undefined") return;
  const normalized = String(city || "").trim();
  if (!normalized) {
    window.localStorage.removeItem(LOCATION_CITY_STORAGE_KEY);
  } else {
    window.localStorage.setItem(LOCATION_CITY_STORAGE_KEY, normalized);
  }

  window.dispatchEvent(new Event(LOCATION_EVENT));
};

export const subscribeLocationCity = (handler: (city: string) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onChange = () => {
    handler(readSelectedCity());
  };

  window.addEventListener(LOCATION_EVENT, onChange);
  return () => {
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
};
