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
  if (profile.businessType === "restaurant") {
    return <RestaurantListingPage profile={profile} storeData={storeData} />;
  }

  if (profile.businessType === "service") {
    return <ServiceListingPage profile={profile} storeData={storeData} />;
  }

  return <ProductListingPage profile={profile} storeData={storeData} />;
}
