export type AuthReference = {
  id: string;
  name: string;
  slug?: string;
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
