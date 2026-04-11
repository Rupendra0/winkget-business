import ListingProfilePage from "@/components/ListingProfilePage";
import { fetchVendorById, toListingProfileFromVendor } from "@/lib/catalogClient";
import { resolveStoreDataById } from "@/lib/storeCatalog";
import { notFound } from "next/navigation";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const liveVendor = await fetchVendorById(id);

  if (!liveVendor) {
    notFound();
  }

  const storeData = await resolveStoreDataById(id);
  const profile = toListingProfileFromVendor(liveVendor);

  // Prefer MyStore media for marketplace-style profile rendering.
  const profileWithStoreMedia = {
    ...profile,
    logoImage: String(liveVendor.myStoreImage || "").trim() || profile.logoImage,
    coverImage: String(liveVendor.myStoreBannerImage || "").trim() || profile.coverImage,
  };

  return <ListingProfilePage profile={profileWithStoreMedia} storeData={storeData} />;
}
