export type AuthReference = {
  id: string;
  name: string;
  slug?: string;
};

export type AuthCustomFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi-select"
  | "email"
  | "phone"
  | "url";

export type AuthCustomFormField = {
  key: string;
  label: string;
  type: AuthCustomFormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  span?: 6 | 12;
  sortOrder: number;
};

export type AuthEffectiveCustomForm = {
  source: "none" | "category" | "subcategory";
  title?: string;
  fields: AuthCustomFormField[];
};

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessName?: string;
  role: "admin" | "vendor" | "customer";
  vendorStatus?: "pending" | "approved" | "rejected";
  businessCategory?: AuthReference;
  businessSubcategory?: AuthReference;
  businessEmail?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessAddress?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  postalCode?: string;
  gstNumber?: string;
  gstDocument?: string;
  website?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  serviceTags?: string[];
  businessDescription?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofDocument?: string;
  marketingOptIn?: boolean;
  customFormData?: Record<string, string | number | string[]>;
  effectiveCustomForm?: AuthEffectiveCustomForm;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const AUTH_TOKEN_KEY = "winkget:auth:token:v1";
let currentUserRequest: Promise<AuthUser | null> | null = null;

export function getStoredAuthToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredAuthToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage write failures
  }
}

export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getStoredAuthToken();
  if (token) {
    return {
      ...headers,
      "Authorization": `Bearer ${token}`,
    };
  }
  return headers;
}

if (typeof window !== "undefined" && !(window as any).__winkget_fetch_intercepted__) {
  (window as any).__winkget_fetch_intercepted__ = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let urlString = "";
    if (typeof input === "string") {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input && typeof input === "object" && "url" in input) {
      urlString = (input as any).url || "";
    }

    if (urlString.includes("/api/auth/logout")) {
      setStoredAuthToken(null);
    }

    const isApiCall = urlString.includes("/api/") || urlString.startsWith("/api/");
    if (isApiCall) {
      const token = getStoredAuthToken();
      if (token) {
        const newInit = init ? { ...init } : {};
        const headers = new Headers(newInit.headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        newInit.headers = headers;

        try {
          const response = await originalFetch(input, newInit);
          if (response.status === 401) {
            setStoredAuthToken(null);
          }
          return response;
        } catch (err) {
          throw err;
        }
      }
    }

    try {
      const response = await originalFetch(input, init);
      if (response.status === 401 && isApiCall) {
        setStoredAuthToken(null);
      }
      return response;
    } catch (err) {
      throw err;
    }
  };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (currentUserRequest) {
    return currentUserRequest;
  }

  currentUserRequest = (async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store",
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return payload.user || null;
    } catch {
      return null;
    } finally {
      currentUserRequest = null;
    }
  })();

  return currentUserRequest;
}

export const AUTH_BACKEND_URL = BACKEND_URL;
