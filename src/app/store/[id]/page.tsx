import StorePage from "@/components/StorePage";
import { categoryPages } from "@/data/categoryData";
import { buildFallbackProfile, listingProfiles, storePages } from "@/data/listingData";

const findListing = (id: string) => {
  for (const category of categoryPages) {
    const listing = category.listings.find((item) => item.id === id);
    if (listing) return listing;
  }
  return null;
};

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = storePages[id];

  if (store) {
    return <StorePage data={store} />;
  }

  const listing = findListing(id);
  if (listing) {
    const profile = listingProfiles[id] ?? buildFallbackProfile(listing);
    const mappedStore = profile.storeId ? storePages[profile.storeId] : undefined;
    if (mappedStore) {
      return <StorePage data={mappedStore} />;
    }
    return (
      <StorePage
        data={{
          id,
          storeName: profile.name,
          tagline: "Shop by category",
          bannerImage: profile.coverImage,
          logoImage: profile.logoImage,
          rating: profile.rating,
          reviews: profile.reviews,
          address: `${profile.address}, ${profile.city}`,
          categories: [profile.category, "Deals", "Top Rated", "New"],
          filters: [
            { label: "Price", options: ["Under ₹1,000", "₹1,000 - ₹10,000", "₹10,000+"] },
            { label: "Brand", options: ["Top Brands", "Budget", "Premium"] },
            { label: "Availability", options: ["In stock", "Pre-order"] },
          ],
          products: [
            {
              id: `${id}-product-1`,
              name: `${profile.name} Featured Product`,
              price: "₹1,999",
              category: profile.category,
              imageUrl: profile.coverImage,
            },
            {
              id: `${id}-product-2`,
              name: `${profile.name} Bestseller`,
              price: "₹2,499",
              category: profile.category,
              imageUrl: profile.coverImage,
            },
          ],
          featured: {
            title: "Featured Products",
            subtitle: "Handpicked for you",
            productIds: [`${id}-product-1`],
          },
          trending: {
            title: "Trending Products",
            subtitle: "Most popular",
            productIds: [`${id}-product-2`],
          },
          aboutTitle: "About",
          aboutBody:
            "Explore verified products with trusted delivery and support from our marketplace.",
        }}
      />
    );
  }

  return <StorePage data={storePages["rest-1"]} />;
}
