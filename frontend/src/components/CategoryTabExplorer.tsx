"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight, Layers, Tag, Flame } from "lucide-react";
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
  parentSubcategory?: {
    id: string;
    name?: string;
  };
};

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  sortOrder?: number;
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
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [trendingIcon, setTrendingIcon] = useState<string>("");
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

        const sortedCats = catPayload.categories.sort((a, b) => {
          const aOrder = a.sortOrder ?? 0;
          const bOrder = b.sortOrder ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.name || "").localeCompare(b.name || "");
        });

        // Load all subcategories at once to calculate tab counts in memory
        const subRes = await fetch(`${BACKEND_URL}/api/subcategories`, { cache: "no-store" });
        const subPayload = (await subRes.json()) as SubcategoryApiResponse;

        if (!active || !subRes.ok || !subPayload.ok || !Array.isArray(subPayload.subcategories)) {
          return;
        }

        // Load trending items
        const trendRes = await fetch(`${BACKEND_URL}/api/home-trending`, { cache: "no-store" });
        const trendPayload = await trendRes.json();
        if (active && trendRes.ok && trendPayload.ok) {
          if (Array.isArray(trendPayload.items)) {
            setTrendingItems(trendPayload.items);
          }
          setTrendingIcon(trendPayload.icon || "");
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

  // Calculate subcategory counts per category ID in memory (only count level 1 subcategories, unless level 1 count is < 8, then count total)
  const subcategoryCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    const catGroup: Record<string, { level1: number; total: number }> = {};

    subcategories.forEach((sub) => {
      const catId = sub.category?.id || sub.category || "";
      const idStr = typeof catId === "object" ? catId.id : String(catId);
      if (!idStr) return;

      if (!catGroup[idStr]) {
        catGroup[idStr] = { level1: 0, total: 0 };
      }

      const isLevel1 = !sub.parentSubcategory || !sub.parentSubcategory.id;
      if (isLevel1) {
        catGroup[idStr].level1++;
      }
      catGroup[idStr].total++;
    });

    Object.keys(catGroup).forEach((idStr) => {
      const { level1, total } = catGroup[idStr];
      counts[idStr] = level1 >= 8 ? level1 : total;
    });

    return counts;
  }, [subcategories]);

  // Sort categories by position/sortOrder ascending, rendering all categories for a scrollable sidebar
  const displayedCategories = useMemo(() => {
    return [...categories]
      .map((cat) => ({
        ...cat,
        count: subcategoryCountsMap[cat.id] || 0,
      }))
      .sort((a, b) => {
        const aOrder = a.sortOrder ?? 0;
        const bOrder = b.sortOrder ?? 0;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [categories, subcategoryCountsMap]);

  // Set first displayed category as active automatically (or Trending tab if items exist)
  useEffect(() => {
    if (trendingItems.length > 0 && !activeCategoryId) {
      setActiveCategoryId("trending");
    } else if (displayedCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(displayedCategories[0].id);
    }
  }, [displayedCategories, activeCategoryId, trendingItems]);

  const activeCategory = useMemo(() => {
    return displayedCategories.find((cat) => cat.id === activeCategoryId);
  }, [displayedCategories, activeCategoryId]);

  // Filtered subcategories for the active tab (exactly 8 items)
  const activeSubcategories = useMemo(() => {
    if (!activeCategoryId) return [];
    if (activeCategoryId === "trending") {
      return trendingItems;
    }
    
    // Find all database subcategories for active category
    const categorySubs = subcategories.filter((sub) => {
      const catId = sub.category?.id || sub.category || "";
      const idStr = typeof catId === "object" ? catId.id : String(catId);
      return idStr === activeCategoryId;
    });

    // Separate into level 1 and nested
    const level1Subs = categorySubs.filter((sub) => !sub.parentSubcategory || !sub.parentSubcategory.id);
    const nestedSubs = categorySubs.filter((sub) => sub.parentSubcategory && sub.parentSubcategory.id);

    // If we have 8 or more level-1 subcategories, display them exclusively
    if (level1Subs.length >= 8) {
      return level1Subs.slice(0, 8);
    }

    // Otherwise, fill up to 8 using nested subcategories
    const combined = [...level1Subs];
    for (const nested of nestedSubs) {
      if (combined.length >= 8) break;
      if (!combined.some((item) => item.id === nested.id)) {
        combined.push(nested);
      }
    }

    if (combined.length >= 8) {
      return combined;
    }

    // Pad with realistic mock subcategories if total count is still less than 8
    const padded = [...combined];
    const cat = categories.find((c) => c.id === activeCategoryId);
    const catName = cat ? cat.name : "Category";

    const defaultMocks = ["Specialist 1", "Specialist 2", "Specialist 3", "Specialist 4", "Specialist 5", "Specialist 6", "Specialist 7", "Specialist 8"];
    const mockNames = MOCK_SUBCATEGORIES_MAP[catName] || MOCK_SUBCATEGORIES_MAP[catName.trim()] || defaultMocks;

    for (let i = padded.length; i < 8; i++) {
      let mockName = mockNames[i % mockNames.length];
      if (padded.some((p) => p.name === mockName)) {
        mockName = `${mockName} Plus`;
      }
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
  }, [subcategories, activeCategoryId, categories, trendingItems]);

  const getTrendingItemHref = (item: any) => {
    const city = String(selectedCity || "").trim();
    const basePath = item.type === "category" 
      ? `/category/${item.slug}` 
      : `/category/${item.category?.slug || ""}`;
      
    const params = new URLSearchParams();
    if (item.type === "subcategory") {
      params.set("subcategoryId", item.id);
    }
    if (city) {
      params.set("city", city);
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

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
      <section className="px-3 pt-6 pb-2 md:pt-10 md:pb-4">
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
    <section className="px-3 pt-6 pb-2 md:pt-8 md:pb-3 lg:pt-10 lg:pb-4">
      {/* Header section */}
      <div className="flex flex-row items-end justify-between gap-4 mb-6 md:mb-8 pl-1 md:pl-2.5 pr-1">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-blue-600">Explore</span>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 truncate">Browse Categories</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-2xl truncate md:whitespace-normal">
            <span className="md:hidden">Find top local businesses and services near you.</span>
            <span className="hidden md:inline">Explore categories and connect with the best businesses, providers, and services near you.</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpenAllModal(true)}
          className="inline-flex items-center justify-center h-9 md:h-10 px-3 md:px-5 text-xs md:text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50/50 transition shrink-0"
        >
          <span className="md:hidden">View All</span>
          <span className="hidden md:inline">View All Categories</span>
        </button>
      </div>

      <div className="flex flex-row gap-2 md:gap-[16px] items-stretch">
        {/* Left Category List (Sidebar on Desktop, Sidebar-column on Mobile) */}
        <div className="w-[20%] min-w-[72px] sm:min-w-[120px] md:w-[18%] md:min-w-[180px] md:max-w-[250px]">
          {/* Category Tab list sidebar: Responsive height & styling */}
          <div className="flex flex-col bg-white rounded-[12px] border border-slate-200 h-[380px] sm:h-[500px] md:h-[580px] min-h-[380px] sm:min-h-[500px] md:min-h-[580px] max-h-[380px] sm:max-h-[500px] md:max-h-[580px] overflow-y-auto overflow-x-hidden no-scrollbar">
            {trendingItems.length > 0 && (
              <button
                key="trending-tab"
                onClick={() => setActiveCategoryId("trending")}
                className={`flex items-center w-full py-2.5 md:py-[13px] lg:py-[14px] px-1.5 md:px-3.5 border-b border-slate-200 border-l-2 md:border-l-4 transition-all text-left outline-none focus:outline-none focus-visible:outline-none select-none ${
                  activeCategoryId === "trending"
                    ? "bg-[#EFF6FF] text-blue-600 border-l-blue-600"
                    : "bg-white text-slate-800 border-l-transparent hover:bg-slate-50/30"
                }`}
              >
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2.5 min-w-0 w-full text-center md:text-left">
                  <div className={`h-9 w-9 sm:h-11 sm:w-11 md:h-[52px] md:w-[52px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                    activeCategoryId === "trending" ? "bg-white text-blue-600" : "bg-white text-slate-500"
                  }`}>
                    {trendingIcon ? (
                      <img src={trendingIcon} alt="" className="h-7 w-7 sm:h-9 sm:w-9 md:h-[46px] md:w-[46px] object-contain" />
                    ) : (
                      <Flame className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 fill-current" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 w-full">
                    <span className={`truncate text-[10px] sm:text-xs md:text-base font-medium transition-colors block ${
                      activeCategoryId === "trending" ? "text-blue-600" : "text-slate-700"
                    }`}>
                      Trending
                    </span>
                    <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-1">
                      8 Categories
                    </span>
                  </div>
                </div>
              </button>
            )}

            {displayedCategories.map((cat) => {
              const active = cat.id === activeCategoryId;
              const count = Math.max(subcategoryCountsMap[cat.id] || 0, 8);

              return (
                <button
                  key={`desktop-tab-${cat.id}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex items-center w-full py-2.5 md:py-[13px] lg:py-[14px] px-1.5 md:px-3.5 border-b border-slate-200 last:border-b-0 border-l-2 md:border-l-4 transition-all text-left outline-none focus:outline-none focus-visible:outline-none select-none ${
                    active
                      ? "bg-[#EFF6FF] text-blue-600 border-l-blue-600"
                      : "bg-white text-slate-800 border-l-transparent hover:bg-slate-50/30"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2.5 min-w-0 w-full text-center md:text-left">
                    <div className={`h-9 w-9 sm:h-11 sm:w-11 md:h-[52px] md:w-[52px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                      active ? "bg-white text-blue-600" : "bg-white text-slate-500"
                    }`}>
                      {cat.icon && cat.icon !== "none" ? (
                        <img src={cat.icon} alt="" className="h-7 w-7 sm:h-9 sm:w-9 md:h-[46px] md:w-[46px] object-contain" />
                      ) : (
                        <Layers className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 w-full">
                      <span className={`truncate text-[10px] sm:text-xs md:text-base font-medium transition-colors block ${
                        active ? "text-blue-600" : "text-slate-700"
                      }`}>
                        {cat.name}
                      </span>
                      <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-1">
                        {count} Categories
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Subcategories Grid: Height matched to Sidebar */}
        <div className="flex-1 w-full h-[380px] sm:h-[500px] md:h-[580px] min-h-[380px] sm:min-h-[500px] md:min-h-[580px] max-h-[380px] sm:max-h-[500px] md:max-h-[580px]">
          {activeSubcategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-[16px] h-full grid-rows-2">
              {activeSubcategories.map((sub, index) => {
                const coverImage = sub.coverImage || getCategoryCoverImage(sub.slug || activeCategory?.slug || "", sub.name);
                const listingCount = getListingCount(sub.name);
                const href = activeCategoryId === "trending"
                  ? getTrendingItemHref(sub)
                  : buildCategoryHref(activeCategory?.slug || "", sub.id);

                return (
                  <Link
                    key={sub.id}
                    href={href}
                    className={`group flex-col relative overflow-hidden rounded-[12px] border border-slate-200 bg-white hover:-translate-y-1 transition-all duration-300 h-full ${
                      index >= 4 ? "hidden md:flex" : "flex"
                    }`}
                  >
                    {/* Image Area - Height 160px (Desktop), 120px (Tablet), 85px (Mobile) */}
                    <div className="relative h-[85px] sm:h-[120px] md:h-[160px] w-full overflow-hidden bg-slate-100 rounded-t-[12px]">
                      <img
                        src={coverImage}
                        alt={sub.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Icon Badge Overlay: Overlaps image bottom and title top */}
                    <div className="absolute top-[85px] sm:top-[120px] md:top-[160px] -translate-y-1/2 left-2 md:left-5 h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 min-h-[36px] sm:min-h-[44px] md:min-h-[48px] min-w-[36px] sm:min-w-[44px] md:min-w-[48px] rounded-full border-2 md:border-4 border-white bg-white shadow-md flex items-center justify-center z-10 overflow-hidden">
                      {sub.icon && sub.icon !== "none" ? (
                        <img src={sub.icon} alt="" className="h-6 w-6 sm:h-8 sm:w-8 md:h-[36px] md:w-[36px] object-contain" />
                      ) : (
                        <Tag className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 text-blue-600" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Bottom Details Panel: Padding top adjusted to accommodate overlapping badge */}
                    <div className="flex flex-col justify-between flex-1 p-2 pt-5 pb-2 sm:p-3 sm:pt-6 sm:pb-3 md:p-4 md:pt-8 md:pb-3">
                      <div className="min-w-0">
                        <span className="font-medium text-xs sm:text-sm md:text-[18px] text-slate-700 group-hover:text-blue-600 transition-colors truncate block">
                          {sub.name}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium block mt-0.5 md:mt-1" style={{ color: "#64748b" }}>
                          {listingCount} Listings
                        </span>
                      </div>
                      <div className="flex justify-end pr-0.5 md:pr-1">
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-slate-800 group-hover:text-blue-600 transition-colors" />
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
        <div className="fixed inset-0 z-50 bg-white pt-4 px-6 pb-4 sm:pt-6 sm:px-10 sm:pb-8 md:pt-6 md:px-12 lg:pt-6 lg:px-16 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">All Categories</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Browse all business categories in Winkget</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenAllModal(false)}
              className="h-10 w-10 rounded-full border-[0.5px] border-slate-200 hover:bg-slate-50/50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition text-2xl font-normal leading-none"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          {/* Modal search */}
          <div className="mb-4 max-w-xl shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-xl border-[0.5px] border-slate-200 bg-transparent px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Modal body list */}
          <div className="flex-1 overflow-y-auto pr-1 pb-6 no-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredCategories.map((cat) => {
                return (
                  <button
                    key={`modal-item-${cat.id}`}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setIsOpenAllModal(false);
                    }}
                    className={`flex items-center gap-3.5 p-3 sm:p-4 rounded-xl border-[0.5px] text-left transition-all ${
                      cat.id === activeCategoryId
                        ? "border-blue-500 bg-transparent text-blue-600 font-semibold"
                        : "border-slate-200 bg-transparent hover:border-slate-350 text-slate-700"
                    }`}
                  >
                    <div className="h-11 w-11 rounded-lg bg-transparent flex items-center justify-center shrink-0">
                      {cat.icon && cat.icon !== "none" ? (
                        <img src={cat.icon} alt="" className="h-10 w-10 object-contain" />
                      ) : (
                        <Layers size={22} className="text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate leading-tight text-slate-700">{cat.name}</span>
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
