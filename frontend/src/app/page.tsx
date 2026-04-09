import CategoryGrid from "@/components/CategoryGrid";
import BannerSection from "@/components/BannerSection";
import CityStrip from "@/components/CityStrip";
import ExploreWellnessSections from "@/components/ExploreWellnessSections";
import PromoBanners from "@/components/PromoBanners";
import PartnersSection from "@/components/PartnersSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="w-full space-y-4 overflow-x-hidden bg-white sm:space-y-5">
      <BannerSection />
      <CategoryGrid />
      <PromoBanners />
      <CityStrip />
      <ExploreWellnessSections />
      <PartnersSection />
      <Footer />
    </main>
  );
}
