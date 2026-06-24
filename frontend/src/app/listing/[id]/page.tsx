import ListingProfilePage from "@/components/ListingProfilePage";
import { fetchVendorPublicProfileById, toListingProfileFromVendor } from "@/lib/catalogClient";
import { resolveStoreDataById } from "@/lib/storeCatalog";
import { notFound } from "next/navigation";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const liveVendor = await fetchVendorPublicProfileById(id);

  if (!liveVendor) {
    notFound();
  }

  const profile = toListingProfileFromVendor(liveVendor);
  const shouldLoadStoreData = String(profile.category || "").trim().toLowerCase() === "restaurant";
  const storeData = shouldLoadStoreData ? await resolveStoreDataById(id) : null;

  // Listing profile should primarily reflect Shop media.
  // Use MyStore media only as fallback when Shop media is not set.
  const profileWithShopPriorityMedia = {
    ...profile,
    logoImage: profile.logoImage || String(liveVendor.myStoreImage || "").trim(),
    coverImage: profile.coverImage || String(liveVendor.myStoreBannerImage || "").trim(),
  };

  const storeDataWithShopPriorityMedia = storeData
    ? {
        ...storeData,
        logoImage: String(profileWithShopPriorityMedia.logoImage || storeData.logoImage || "").trim(),
        bannerImage: String(profileWithShopPriorityMedia.coverImage || storeData.bannerImage || "").trim(),
      }
    : storeData;

  return <ListingProfilePage profile={profileWithShopPriorityMedia} storeData={storeDataWithShopPriorityMedia} />;
}
