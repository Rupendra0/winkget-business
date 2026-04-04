import StorePage from "@/components/StorePage";
import { categoryPages } from "@/data/categoryData";
import {
  buildFallbackProfile,
  listingProfiles,
  storePages,
  type ListingProfile,
  type StorePageData,
} from "@/data/listingData";
import { fetchVendorById, toListingProfileFromVendor } from "@/lib/catalogClient";
import { notFound } from "next/navigation";

const findListing = (id: string) => {
  for (const category of categoryPages) {
    const listing = category.listings.find((item) => item.id === id);
    if (listing) return listing;
  }
  return null;
};

const toStoreDataFromProfile = (profile: ListingProfile, idFallback: string): StorePageData => {
  const storeId = String(profile.storeId || profile.id || idFallback || "store").trim();
  const profileName = String(profile.name || "Business Store").trim();
  const categoryLabel = String(profile.category || "Business").trim() || "Business";
  const imageUrl = String(profile.coverImage || profile.logoImage || "").trim();
  const addressLabel = [profile.address, profile.city].filter(Boolean).join(", ") || "Address unavailable";

  return {
    id: storeId,
    storeName: profileName,
    tagline: "Shop by category",
    bannerImage: imageUrl,
    logoImage: String(profile.logoImage || imageUrl || "").trim(),
    rating: Number(profile.rating || 0),
    reviews: Number(profile.reviews || 0),
    address: addressLabel,
    categories: [categoryLabel, "Deals", "Top Rated", "New"],
    filters: [
      { label: "Price", options: ["Under ₹1,000", "₹1,000 - ₹10,000", "₹10,000+"] },
      { label: "Brand", options: ["Top Brands", "Budget", "Premium"] },
      { label: "Availability", options: ["In stock", "Pre-order"] },
    ],
    products: [
      {
        id: `${storeId}-product-1`,
        name: `${profileName} Featured Product`,
        price: "₹1,999",
        category: categoryLabel,
        imageUrl,
      },
      {
        id: `${storeId}-product-2`,
        name: `${profileName} Bestseller`,
        price: "₹2,499",
        category: categoryLabel,
        imageUrl,
      },
    ],
    featured: {
      title: "Featured Products",
      subtitle: "Handpicked for you",
      productIds: [`${storeId}-product-1`],
    },
    trending: {
      title: "Trending Products",
      subtitle: "Most popular",
      productIds: [`${storeId}-product-2`],
    },
    aboutTitle: "About",
    aboutBody:
      "Explore verified products with trusted delivery and support from our marketplace.",
  };
};

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolvedId = String(id || "").trim();
  if (!resolvedId) {
    notFound();
  }

  const store = storePages[resolvedId];
  if (store) {
    return <StorePage data={store} />;
  }


  const liveVendor = await fetchVendorById(resolvedId);
  if (liveVendor) {
    const profile = toListingProfileFromVendor(liveVendor);
    return <StorePage data={toStoreDataFromProfile(profile, resolvedId)} />;
  }

  const listing = findListing(resolvedId);
  if (listing) {
    const profile = listingProfiles[resolvedId] ?? buildFallbackProfile(listing);
    const mappedStore = profile.storeId ? storePages[profile.storeId] : undefined;
    if (mappedStore) {
      return <StorePage data={mappedStore} />;
    }
    return <StorePage data={toStoreDataFromProfile(profile, resolvedId)} />;
  }

  notFound();
}
