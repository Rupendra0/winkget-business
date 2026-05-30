import CategoryGrid from "@/components/CategoryGrid";
import BannerSection from "@/components/BannerSection";
import CityStrip from "@/components/CityStrip";
import ExploreWellnessSections from "@/components/ExploreWellnessSections";
import PromoBanners from "@/components/PromoBanners";
import PartnersSection from "@/components/PartnersSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="w-full space-y-0 overflow-x-hidden bg-white md:space-y-1">
      <BannerSection />
      <section id="mobile-home-categories">
        <CategoryGrid />
      </section>
      <CityStrip />
      <section id="mobile-home-shop">
        <PromoBanners />
      </section>
      <ExploreWellnessSections />
      <PartnersSection />
      <Footer />
    </main>
  );
}
