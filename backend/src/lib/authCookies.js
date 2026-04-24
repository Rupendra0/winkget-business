const AUTH_COOKIE_NAMES = {
  customer: "winkget_customer_auth",
  vendor: "winkget_vendor_auth",
  admin: "winkget_admin_auth",
  legacy: "winkget_auth",
};

const AUTH_CONTEXTS = new Set(["customer", "vendor", "admin"]);

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const normalizeAuthContext = (value, fallback = "customer") => {
  const context = String(value || "").trim().toLowerCase();
  return AUTH_CONTEXTS.has(context) ? context : fallback;
};

const setAuthCookie = (res, token, context = "customer") => {
  const normalizedContext = normalizeAuthContext(context);
  res.cookie(AUTH_COOKIE_NAMES[normalizedContext], token, getCookieOptions());
  res.clearCookie(AUTH_COOKIE_NAMES.legacy, { ...getCookieOptions(), maxAge: 0 });
};

const clearAuthCookie = (res, context) => {
  const clearOptions = {
    ...getCookieOptions(),
    maxAge: 0,
  };

  if (context) {
    const normalizedContext = normalizeAuthContext(context);
    res.clearCookie(AUTH_COOKIE_NAMES[normalizedContext], clearOptions);
  } else {
    Object.values(AUTH_COOKIE_NAMES).forEach((cookieName) => {
      res.clearCookie(cookieName, clearOptions);
    });
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
};

const resolveTokenFromRequest = (req, contexts = ["customer"]) => {
  const normalizedContexts = (Array.isArray(contexts) ? contexts : [contexts])
    .map((context) => normalizeAuthContext(context, ""))
    .filter(Boolean);

  for (const context of normalizedContexts) {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAMES[context]];
    if (cookieToken) return cookieToken;
  }

  return getBearerToken(req);
};

const hasScopedAuthCookie = (req, contexts = ["customer", "vendor", "admin"]) => {
  const normalizedContexts = (Array.isArray(contexts) ? contexts : [contexts])
    .map((context) => normalizeAuthContext(context, ""))
    .filter(Boolean);

  return normalizedContexts.some((context) => Boolean(req.cookies?.[AUTH_COOKIE_NAMES[context]]));
};

module.exports = {
  AUTH_COOKIE_NAMES,
  normalizeAuthContext,
  setAuthCookie,
  clearAuthCookie,
  resolveTokenFromRequest,
  hasScopedAuthCookie,
};
