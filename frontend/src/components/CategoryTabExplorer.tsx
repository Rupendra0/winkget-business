"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight, Layers, Tag } from "lucide-react";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type CatalogSubcategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  coverImage?: string;
  category: {
    id: string;
    name: string;
  };
};

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
};

type CategoryApiResponse = {
  ok: boolean;
  categories?: CatalogCategory[];
};

type SubcategoryApiResponse = {
  ok: boolean;
  subcategories?: CatalogSubcategory[];
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Curated stock photos for category slugs to match Figma aesthetics
// Curated stock photos for category slugs to match Figma aesthetics
const getCategoryCoverImage = (catSlug: string, subName: string): string => {
  const slug = String(catSlug || "").toLowerCase();
  const name = String(subName || "").toLowerCase();

  // 1. Specific Subcategory Name Matches (Highest Priority for diversity)
  if (name.includes("apartment") || name.includes("flat") || name.includes("rent")) {
    return "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80"; // apartment interior
  }
  if (name.includes("villa") || name.includes("plots") || name.includes("land")) {
    return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80"; // luxury villa
  }
  if (name.includes("commercial") || name.includes("office") || name.includes("shop")) {
    return "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=80"; // office space
  }
  if (name.includes("modular kitchen") || name.includes("kitchen")) {
    return "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80"; // kitchen
  }
  if (name.includes("living room") || name.includes("bedroom") || name.includes("wall styling")) {
    return "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&auto=format&fit=crop&q=80"; // living room
  }
  if (name.includes("plumbing") || name.includes("plumber")) {
    return "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop&q=80"; // plumbing tools
  }
  if (name.includes("electrical") || name.includes("electrician")) {
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80"; // electrical wires/repairs
  }
  if (name.includes("carpentry") || name.includes("furniture") || name.includes("wood")) {
    return "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&auto=format&fit=crop&q=80"; // wood workshop
  }
  if (name.includes("packers") || name.includes("movers") || name.includes("shifting")) {
    return "https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?w=400&auto=format&fit=crop&q=80"; // cardboard boxes moving
  }
  if (name.includes("construction") || name.includes("masonry") || name.includes("renovation")) {
    return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80"; // construction worker
  }
  if (name.includes("apple") || name.includes("macbook") || name.includes("iphone")) {
    return "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&auto=format&fit=crop&q=80"; // iphone
  }
  if (name.includes("laptop") || name.includes("computers") || name.includes("asus")) {
    return "https://images.unsplash.com/photo-1496181130204-755241544e35?w=400&auto=format&fit=crop&q=80"; // laptop
  }
  if (name.includes("earphones") || name.includes("headphones") || name.includes("headset")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80"; // headphones
  }
  if (name.includes("speakers") || name.includes("audio") || name.includes("sound") || name.includes("music")) {
    return "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&auto=format&fit=crop&q=80"; // bluetooth speaker
  }
  if (name.includes("watch") || name.includes("wearable")) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80"; // smart watch
  }
  if (name.includes("hotel") || name.includes("resort") || name.includes("stay")) {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&auto=format&fit=crop&q=80"; // luxury hotel
  }
  if (name.includes("dining") || name.includes("restaurant") || name.includes("food")) {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=80"; // restaurant dining
  }
  if (name.includes("cafe") || name.includes("coffee") || name.includes("bakery")) {
    return "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80"; // cafe shop
  }
  if (name.includes("doctor") || name.includes("physician") || name.includes("clinic")) {
    return "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"; // doctor
  }
  if (name.includes("dentist") || name.includes("dental") || name.includes("teeth")) {
    return "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&auto=format&fit=crop&q=80"; // dentist chair
  }
  if (name.includes("beauty") || name.includes("spa") || name.includes("salon") || name.includes("hair")) {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&auto=format&fit=crop&q=80"; // hair salon
  }
  if (name.includes("gym") || name.includes("fitness") || name.includes("training") || name.includes("trainer")) {
    return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80"; // gym weight training
  }
  if (name.includes("lawyer") || name.includes("legal") || name.includes("court")) {
    return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80"; // scales of justice
  }

  // 2. Category Slug-based Fallbacks (If name doesn't match a specific theme)
  if (slug.includes("real-estate")) {
    return "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("interior") || slug.includes("decor")) {
    return "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("home-service") || slug.includes("contractor")) {
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("electronics")) {
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("caterers") || slug.includes("restaurant")) {
    return "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("doctor") || slug.includes("hospital") || slug.includes("dentist")) {
    return "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("education") || slug.includes("teacher")) {
    return "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("car") || slug.includes("automotive")) {
    return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("beauty") || slug.includes("spa") || slug.includes("gym")) {
    return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=80";
  }
  if (slug.includes("loan") || slug.includes("lawyer")) {
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&auto=format&fit=crop&q=80";
  }
  
  return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80";
};

// Generates a stable, realistic listing count based on subcategory name
const getListingCount = (name: string): string => {
  const prime = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const count = (prime * 17) % 19000 + 400; // stable count between 400 and 19,400
  return count.toLocaleString();
};

// Realistic mock subcategory lists mapped by category name
const MOCK_SUBCATEGORIES_MAP: Record<string, string[]> = {
  "Electronics": ["Mobile Phones", "Laptops", "Smart Watches", "Accessories", "Televisions", "Audio Systems"],
  "Hotels": ["Luxury Hotels", "Budget Stays", "Resorts", "Guesthouses", "Homestays", "Motels"],
  "Restaurant": ["Fine Dining", "Fast Food", "Cafes", "Bakeries", "Street Food", "Family Restaurants"],
  "Real Estate": ["Apartments", "Villas", "Commercial Shops", "Rental Homes", "Plots & Land", "Penthouses"],
  "Doctor": ["General Physicians", "Dentists", "Pediatricians", "Cardiologists", "Dermatologists", "Orthopedics"],
  "Contractor": ["Plumbing", "Electrical Work", "Carpentry", "Masonry", "Painting Services", "Home Renovation"],
  "Teacher": ["School Tutors", "Language Experts", "Music Teachers", "Coding Coaches", "Math Instructors", "Art Classes"],
  "Car Repairing": ["Engine Tuning", "Body Work", "Car Wash", "Tire Services", "Electrical Repair", "AC Servicing"],
  "Caterers": ["Wedding Catering", "Corporate Events", "Birthday Parties", "Buffet Services", "Food Trucks", "Party Planners"],
  "Dentists": ["Teeth Cleaning", "Root Canal", "Braces & Aligners", "Dental Implants", "Cosmetic Dentistry", "Oral Surgery"],
  "Education": ["Primary Tutoring", "High School Prep", "College Counselling", "Test Preparation", "Language Schools", "Skill Development"],
  "Beauty & Spa": ["Hair Styling", "Facials & Skincare", "Massage Therapy", "Nail Art", "Bridal Makeup", "Body Spa"],
  "Home Service": ["Deep Cleaning", "Pest Control", "Appliance Repair", "Packers & Movers", "Gardening", "Security Systems"],
  "Hospitals": ["Emergency Care", "Multispeciality", "Eye Clinics", "Diagnostic Labs", "Pharmacy Stores", "Nursing Homes"],
  "Interior Designs": ["Modular Kitchens", "Living Room Decor", "Office Space Design", "Bedroom Makeover", "Lighting Solutions", "Wall Styling"],
  "Loans": ["Home Loans", "Personal Loans", "Car Loans", "Education Loans", "Business Finance", "Gold Loans"],
  "Gym": ["Cardio Fitness", "Weight Training", "Yoga & Pilates", "Zumba Classes", "Personal Trainers", "Crossfit Boxes"],
  "Pet care": ["Veterinary Clinics", "Pet Grooming", "Pet Boarding", "Dog Training", "Pet Food Stores", "Pet Adoption"],
  "Home decor": ["Wall Paintings", "Carpets & Rugs", "Curtains & Blinds", "Decorative Lamps", "Furnitures", "Vases & Artifacts"],
  "Lawyers": ["Civil Disputes", "Corporate Law", "Criminal Defense", "Family Law", "Property Disputes", "Tax Consultants"],
  "Computer institute": ["Web Development", "Data Science", "Graphic Design", "Digital Marketing", "Cyber Security", "Basic Computers"],
  "Car Showroom": ["New Cars", "Pre-owned Cars", "Electric Vehicles", "Luxury Cars", "Commercial Vehicles", "Test Drives"],
  "Home tutors": ["Math Tutors", "Science Tutors", "English Speaking", "Exam Crackers", "Child Development", "Piano Classes"],
  "Apple stores": ["iPhone Series", "MacBook Laptops", "iPad Tablets", "Apple Watch", "AirPods Audio", "Apple Accessories"],
  "Fitness trainers": ["Yoga Instructors", "Gym Trainers", "Diet Planners", "Sports Coaches", "Physiotherapy", "Meditation Gurus"],
};

export default function CategoryTabExplorer() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpenAllModal, setIsOpenAllModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => {
      setSelectedCity(city);
    });
  }, []);

  // Fetch categories and subcategories
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        // Load categories
        const catRes = await fetch(`${BACKEND_URL}/api/categories`, { cache: "no-store" });
        const catPayload = (await catRes.json()) as CategoryApiResponse;

        if (!active || !catRes.ok || !catPayload.ok || !Array.isArray(catPayload.categories)) {
          return;
        }

        const sortedCats = catPayload.categories.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        // Load all subcategories at once to calculate tab counts in memory
        const subRes = await fetch(`${BACKEND_URL}/api/subcategories`, { cache: "no-store" });
        const subPayload = (await subRes.json()) as SubcategoryApiResponse;

        if (!active || !subRes.ok || !subPayload.ok || !Array.isArray(subPayload.subcategories)) {
          return;
        }

        setCategories(sortedCats);
        setSubcategories(subPayload.subcategories);
      } catch (err) {
        console.error("Error loading category explorer data:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  // Calculate subcategory counts per category ID in memory
  const subcategoryCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    subcategories.forEach((sub) => {
      const catId = sub.category?.id || sub.category || "";
      const idStr = typeof catId === "object" ? catId.id : String(catId);
      if (idStr) {
        counts[idStr] = (counts[idStr] || 0) + 1;
      }
    });
    return counts;
  }, [subcategories]);

  // Sort categories by subcategory count descending, and slice to exactly 7 for display
  const displayedCategories = useMemo(() => {
    return [...categories]
      .map((cat) => ({
        ...cat,
        count: subcategoryCountsMap[cat.id] || 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return (a.name || "").localeCompare(b.name || "");
      })
      .slice(0, 7);
  }, [categories, subcategoryCountsMap]);

  // Set first displayed category as active automatically
  useEffect(() => {
    if (displayedCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(displayedCategories[0].id);
    }
  }, [displayedCategories, activeCategoryId]);

  const activeCategory = useMemo(() => {
    return displayedCategories.find((cat) => cat.id === activeCategoryId);
  }, [displayedCategories, activeCategoryId]);

  // Filtered subcategories for the active tab (exactly 6 items)
  const activeSubcategories = useMemo(() => {
    if (!activeCategoryId) return [];
    
    // Find real database subcategories for active category
    const realSubs = subcategories.filter((sub) => {
      const catId = sub.category?.id || sub.category || "";
      const idStr = typeof catId === "object" ? catId.id : String(catId);
      return idStr === activeCategoryId;
    });

    if (realSubs.length >= 6) {
      return realSubs.slice(0, 6);
    }

    // Pad with realistic mock subcategories if count is less than 6
    const padded = [...realSubs];
    const cat = categories.find((c) => c.id === activeCategoryId);
    const catName = cat ? cat.name : "Category";

    const defaultMocks = ["Specialist 1", "Specialist 2", "Specialist 3", "Specialist 4", "Specialist 5", "Specialist 6"];
    const mockNames = MOCK_SUBCATEGORIES_MAP[catName] || MOCK_SUBCATEGORIES_MAP[catName.trim()] || defaultMocks;

    for (let i = padded.length; i < 6; i++) {
      const mockName = mockNames[i % mockNames.length];
      padded.push({
        id: `mock-${activeCategoryId}-${i}`,
        name: mockName,
        slug: mockName.toLowerCase().replace(/\s+/g, "-"),
        icon: "none",
        category: {
          id: activeCategoryId,
          name: catName,
        },
      });
    }

    return padded;
  }, [subcategories, activeCategoryId, categories]);

  const buildCategoryHref = (catSlug: string, subId?: string) => {
    const city = String(selectedCity || "").trim();
    const basePath = `/category/${catSlug}`;
    const params = new URLSearchParams();

    if (subId && !subId.startsWith("mock-")) {
      params.set("subcategoryId", subId);
    }
    if (city) {
      params.set("city", city);
    }

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [searchQuery, categories]);

  if (loading && categories.length === 0) {
    return (
      <section className="px-3 py-6 md:py-10">
        <div className="h-6 w-32 bg-slate-100 animate-pulse rounded mb-4" />
        <div className="h-10 w-64 bg-slate-100 animate-pulse rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[400px]">
          <div className="md:col-span-1 bg-slate-50 animate-pulse rounded-xl" />
          <div className="md:col-span-3 bg-slate-50 animate-pulse rounded-xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="px-3 py-6 md:py-8 lg:py-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-blue-600">Explore</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Browse Categories</h2>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">
            Explore categories and connect with the best businesses, providers, and services near you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpenAllModal(true)}
          className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50/50 transition self-start md:self-auto shrink-0"
        >
          View All Categories
        </button>
      </div>

      {/* Tabs Layout Container */}
      <div className="flex flex-col md:flex-row gap-[27px] items-stretch">
        {/* Left Category List (Sidebar on Desktop w=297px h=600px, Horizontal chips on Mobile) */}
        <div className="w-full md:w-[22%] md:min-w-[220px] md:max-w-[300px]">
          {/* Mobile chips bar */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-3 -mx-3 px-3 scrollbar-hide">
            {displayedCategories.map((cat) => {
              const active = cat.id === activeCategoryId;
              const count = Math.max(subcategoryCountsMap[cat.id] || 0, 6);

              return (
                <button
                  key={`mobile-tab-${cat.id}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                    active
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    active ? "bg-blue-700 text-blue-100" : "bg-slate-100 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop Tab list: Width 297px, Height 781px */}
          <div className="hidden md:flex flex-col bg-white rounded-[12px] border border-slate-200/80 shadow-sm h-[781px] min-h-[781px] max-h-[781px] overflow-y-auto overflow-x-hidden">
            {displayedCategories.map((cat) => {
              const active = cat.id === activeCategoryId;
              const count = Math.max(subcategoryCountsMap[cat.id] || 0, 6);

              return (
                <button
                  key={`desktop-tab-${cat.id}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex-1 flex items-center w-full px-5 border-b border-slate-100 last:border-b-0 border-l-4 transition-all text-left outline-none focus:outline-none focus-visible:outline-none select-none ${
                    active
                      ? "bg-[#EFF6FF] text-blue-600 border-l-blue-600"
                      : "bg-white text-slate-800 border-l-transparent hover:bg-slate-50/30"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 border border-slate-100/80 shadow-sm transition-all ${
                      active ? "bg-white text-blue-600" : "bg-white text-slate-500"
                    }`}>
                      {cat.icon && cat.icon !== "none" ? (
                        <img src={cat.icon} alt="" className="h-6 w-6 object-contain" />
                      ) : (
                        <Layers size={18} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate text-base font-bold transition-colors ${
                        active ? "text-blue-600" : "text-slate-900"
                      }`}>
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {count} Categories
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Subcategories Grid: Width 1050px, Height 781px to match Sidebar height exactly */}
        <div className="flex-1 w-full md:h-[781px] md:min-h-[781px] md:max-h-[781px]">
          {activeSubcategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[27px] h-full grid-rows-2">
              {activeSubcategories.map((sub) => {
                const coverImage = sub.coverImage || getCategoryCoverImage(activeCategory?.slug || "", sub.name);
                const listingCount = getListingCount(sub.name);

                return (
                  <Link
                    key={sub.id}
                    href={buildCategoryHref(activeCategory?.slug || "", sub.id)}
                    className="group flex flex-col relative overflow-hidden rounded-[12px] border border-slate-200/80 bg-white hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    {/* Image Area - Height 240px */}
                    <div className="relative h-[150px] md:h-[240px] w-full overflow-hidden bg-slate-100 rounded-t-[12px]">
                      <img
                        src={coverImage}
                        alt={sub.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Icon Badge Overlay: Overlaps image bottom and title top (centered vertically at top-[240px]) */}
                    <div className="absolute top-[150px] md:top-[240px] -translate-y-1/2 left-5 h-[72px] w-[72px] min-h-[72px] min-w-[72px] rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center z-10 overflow-hidden">
                      {sub.icon && sub.icon !== "none" ? (
                        <img src={sub.icon} alt="" className="h-[46px] w-[46px] object-contain" />
                      ) : (
                        <Tag size={30} className="text-blue-600" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Bottom Details Panel: Padding top adjusted to accommodate overlapping badge */}
                    <div className="flex flex-col justify-between flex-1 p-5 pt-10 md:pt-12 pb-5">
                      <div className="min-w-0">
                        <h3 className="font-bold text-[18px] text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {sub.name}
                        </h3>
                        <span className="text-xs font-semibold block mt-1" style={{ color: "#64748b" }}>
                          {listingCount} Listings
                        </span>
                      </div>
                      <div className="flex justify-end pr-1">
                        <ArrowRight size={20} className="text-slate-800 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <Layers size={36} className="text-slate-400 mb-3" />
              <p className="text-sm text-slate-500 font-semibold">No subcategories found for this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal - View All Categories */}
      {isOpenAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOpenAllModal(false)}
          />
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">All Categories</h3>
                <p className="text-xs text-slate-500 mt-0.5">Browse all business categories in Winkget</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenAllModal(false)}
                className="h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-550 hover:text-slate-705 transition font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal search */}
            <div className="mb-5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white transition"
              />
            </div>

            {/* Modal body list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const count = subcategoryCountsMap[cat.id] || 0;
                return (
                  <button
                    key={`modal-item-${cat.id}`}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setIsOpenAllModal(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      cat.id === activeCategoryId
                        ? "border-blue-500 bg-blue-50/30 text-blue-600 shadow-sm"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 text-slate-700"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                      {cat.icon && cat.icon !== "none" ? (
                        <img src={cat.icon} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <Layers size={14} className="text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold truncate leading-tight">{cat.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{count} Subcategories</span>
                    </div>
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  No categories match your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
