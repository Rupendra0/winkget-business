"use client";

import type { ListingProfile, StorePageData } from "@/data/listingData";
import ProductListingPage from "./listing-profile/ProductListingPage";
import ServiceListingPage from "./listing-profile/ServiceListingPage";
import RestaurantListingPage from "./listing-profile/RestaurantListingPage";

export default function ListingProfilePage({
  profile,
  storeData,
}: {
  profile: ListingProfile;
  storeData?: StorePageData | null;
}) {
  const isRestaurant =
    profile.businessType === "restaurant" ||
    String(profile.category || "").trim().toLowerCase() === "restaurant" ||
    String(profile.category || "").trim().toLowerCase() === "restaurants" ||
    storeData?.isRestaurantMarketplace === true;

  if (isRestaurant) {
    return <RestaurantListingPage profile={profile} storeData={storeData} />;
  }

  if (profile.businessType === "service") {
    return <ServiceListingPage profile={profile} storeData={storeData} />;
  }

  return <ProductListingPage profile={profile} storeData={storeData} />;
}
