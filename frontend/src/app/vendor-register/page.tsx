import { redirect } from "next/navigation";

export default function VendorRegisterRedirectPage() {
  const vendorPortalUrl = (process.env.NEXT_PUBLIC_VENDOR_WEBSITE_URL || "http://localhost:3002").replace(/\/$/, "");
  redirect(`${vendorPortalUrl}/register`);
}
