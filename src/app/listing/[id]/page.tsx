import ListingProfilePage from "@/components/ListingProfilePage";
import { categoryPages } from "@/data/categoryData";
import { buildFallbackProfile, listingProfiles } from "@/data/listingData";

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
  const profile = listingProfiles[id];
  const listing = findListing(id);

  if (profile) {
    return <ListingProfilePage profile={profile} />;
  }

  if (listing) {
    return <ListingProfilePage profile={buildFallbackProfile(listing)} />;
  }

  return (
    <ListingProfilePage
      profile={buildFallbackProfile({
        id,
        name: "Business Profile",
        rating: 4.3,
        reviews: 0,
        verified: false,
        address: "Your city",
        city: "",
        sublocality: "",
        subcategory: "Business",
        imageUrl:
          "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60",
        ctaLabel: "Enquiry",
        badges: ["Featured"],
        priceRange: "$$",
        tags: ["Verified"],
      })}
    />
  );
}
