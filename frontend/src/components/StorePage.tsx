import FoodStorePage from "@/components/FoodStorePage";
import ProductStorePage from "@/components/ProductStorePage";
import ServiceStorePage from "@/components/ServiceStorePage";
import type { StorePageData } from "@/data/listingData";

export default function StorePage({ data }: { data: StorePageData }) {
  if (data.isRestaurantMarketplace) {
    return <FoodStorePage data={data} />;
  }

  if (data.isServiceStore) {
    return <ServiceStorePage data={data} />;
  }

  return <ProductStorePage data={data} />;
}
