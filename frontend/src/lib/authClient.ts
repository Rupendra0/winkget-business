export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  role: "admin" | "vendor" | "customer";
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload.user || null;
  } catch {
    return null;
  }
}

export const AUTH_BACKEND_URL = BACKEND_URL;
