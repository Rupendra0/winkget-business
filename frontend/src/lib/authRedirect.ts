const LAST_ROUTE_STORAGE_KEY = "winkget:last-route:v1";

const isBrowser = () => typeof window !== "undefined";

const normalizePath = (value: string | null | undefined) => {
  const trimmed = String(value || "").trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return "";
  }

  return trimmed;
};

export const buildAuthHref = (nextPath: string) => {
  const safeNext = normalizePath(nextPath) || "/";
  return `/auth?next=${encodeURIComponent(safeNext)}`;
};

export const rememberRoute = (nextPath: string) => {
  const safeNext = normalizePath(nextPath);
  if (!safeNext || !isBrowser()) {
    return;
  }

  // Do not treat auth pages as destination pages.
  if (safeNext.startsWith("/auth")) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, safeNext);
  } catch {
    // Ignore localStorage write failures.
  }
};

export const readRememberedRoute = () => {
  if (!isBrowser()) {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
    return normalizePath(raw);
  } catch {
    return "";
  }
};

export const resolvePostAuthRoute = (nextFromQuery: string | null | undefined) => {
  const queryPath = normalizePath(nextFromQuery);
  if (queryPath) {
    return queryPath;
  }

  const remembered = readRememberedRoute();
  if (remembered) {
    return remembered;
  }

  return "/";
};
