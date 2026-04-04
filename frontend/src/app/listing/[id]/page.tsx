import ListingProfilePage from "@/components/ListingProfilePage";
import { categoryPages } from "@/data/categoryData";
import { buildFallbackProfile, listingProfiles } from "@/data/listingData";
import { fetchVendorById, toListingProfileFromVendor } from "@/lib/catalogClient";
import { notFound } from "next/navigation";

const findListing = (id: string) => {
  for (const category of categoryPages) {
    const listing = category.listings.find((item) => item.id === id);
    if (listing) return listing;
  }
  return null;
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const liveVendor = await fetchVendorById(id);

  if (liveVendor) {
    return <ListingProfilePage profile={toListingProfileFromVendor(liveVendor)} />;
  }

  const profile = listingProfiles[id];
  const listing = findListing(id);

  if (profile) {
    return <ListingProfilePage profile={profile} />;
  }

  if (listing) {
    return <ListingProfilePage profile={buildFallbackProfile(listing)} />;
  }

  notFound();
}
