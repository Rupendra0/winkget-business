import HeroSection from "@/components/HeroSection";
import CategoryGrid from "@/components/CategoryGrid";
import PromoRow from "@/components/PromoRow";
import CityStrip from "@/components/CityStrip";
import PromoBanners from "@/components/PromoBanners";
import PartnersSection from "@/components/PartnersSection";
import RegisterBusiness from "@/components/RegisterBusiness";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="w-full">
      <HeroSection />
      <CategoryGrid />
      <PromoRow />
      <CityStrip />
      <PromoBanners />
      <PartnersSection />
      <RegisterBusiness />
      <Footer />
    </main>
  );
}
