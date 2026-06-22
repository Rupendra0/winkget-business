import CategoryTabExplorer from "@/components/CategoryTabExplorer";
import BannerSection from "@/components/BannerSection";
import CitiesSection from "@/components/CitiesSection";
import CityStrip from "@/components/CityStrip";
import ExploreWellnessSections from "@/components/ExploreWellnessSections";
import PromoBanners from "@/components/PromoBanners";
import PartnersSection from "@/components/PartnersSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="w-full space-y-0 overflow-x-hidden bg-white md:space-y-1">
      <BannerSection />
      <CategoryTabExplorer />
      <CityStrip />
      <section id="mobile-home-shop">
        <PromoBanners />
      </section>
      <ExploreWellnessSections />
      <CitiesSection />
      <PartnersSection />
      <Footer />
    </main>
  );
}
