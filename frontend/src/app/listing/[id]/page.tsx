import ListingProfilePage from "@/components/ListingProfilePage";
import { fetchVendorById, toListingProfileFromVendor } from "@/lib/catalogClient";
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

  return <ListingProfilePage profile={toListingProfileFromVendor(liveVendor)} />;
}
