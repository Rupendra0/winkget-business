export type AuthUser = {
  id: string;
  role: "admin" | "vendor" | "customer";
  name?: string;
  email?: string;
  phone?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me?context=vendor`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-Auth-Context": "vendor",
      },
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
