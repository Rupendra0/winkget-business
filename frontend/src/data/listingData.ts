import type { CategoryListing } from "@/data/categoryData";

export type ListingReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
};

export type ListingProfile = {
  id: string;
  storeId?: string;
  createdAt?: string;
  businessType?: string;
  name: string;
  category: string;
  coverImage: string;
  logoImage: string;
  paymentQrCode?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  rating: number;
  reviews: number;
  priceRange: string;
  badges: string[];
  tags: string[];
  address: string;
  city: string;
  sublocality?: string;
  phone: string;
  email: string;
  whatsapp: string;
  businessAlternatePhone?: string;
  website?: string;
  state?: string;
  postalCode?: string;
  gstNumber?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  storeStatusMode?: "auto" | "manual";
  manualStoreStatus?: "open" | "closed";
  isStoreOpen?: boolean | null;
  storeStatusSource?: "manual" | "schedule" | "unknown" | "vendor-status";
  ctaLabel: string;
  description: string;
  highlights: string[];
  services: string[];
  amenities: string[];
  hours: { day: string; time: string }[];
  gallery: string[];
  menuImage?: string;
  menuItems?: {
    id: string;
    name: string;
    price: string;
    category: string;
    imageUrl: string;
    badge?: string;
  }[];
  reviewsList: ListingReview[];
  mapImage: string;
  suggestionTitle: string;
  suggestions: { name: string; detail: string }[];
};

export type StoreProduct = {
  id: string;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
  badge?: string;
  categorySlug?: string;
  categoryLabel?: string;
  subcategoryName?: string;
  shortDescription?: string;
  description?: string;
  detailedDescription?: string;
  gallery?: string[];
  oldPriceValue?: number;
  inventory?: number;
  moq?: number;
  originCountry?: string;
  supplierName?: string;
  sellerName?: string;
  vendorSource?: string;
  rating?: number;
  reviews?: number;
  shippingLabel?: string;
  deliveryByText?: string;
  shippingTimeline?: string;
  isCancellable?: boolean;
  isReturnable?: boolean;
  highlights?: string[];
  keyAttributes?: Array<{ label: string; value: string }>;
  specifications?: Array<{ label: string; value: string }>;
  tags?: string[];
  descriptionPoints?: Array<{ heading?: string; content?: string }>;
  detailedDescriptionBlocks?: Array<{ image?: string; headline?: string; text?: string }>;
  variantData?: Array<{
    size?: string;
    color?: string;
    mrp?: number;
    sellingPrice?: number;
    stock?: number;
    image?: string;
    customFields?: Record<string, string>;
  }>;
  showDeliveryBadge?: boolean;
  showTopBrand?: boolean;
  showFreeDelivery?: boolean;
  showSecureTransaction?: boolean;
  showCashOnDelivery?: boolean;
  show7DaySupport?: boolean;
  showAssured?: boolean;
  storePlacement?: "featured" | "trending";
};

export type StoreSection = {
  title: string;
  subtitle?: string;
  productIds: string[];
};

export type StoreCategoryBarItem = {
  id: string;
  label: string;
  iconImage?: string;
  filterLabels?: string[];
};

export type StorePageData = {
  id: string;
  storeName: string;
  createdAt?: string;
  tagline: string;
  bannerImage: string;
  logoImage: string;
  storeCategory?: string;
  isRestaurantMarketplace?: boolean;
  isServiceStore?: boolean;
  isStoreOpen?: boolean | null;
  contactPhone?: string;
  whatsappPhone?: string;
  deliveryTimeLabel?: string;
  priceForTwoLabel?: string;
  deliveryFeeLabel?: string;
  quickFilterChips?: string[];
  heroTitle?: string;
  heroSubtitle?: string;
  cuisineLabel?: string;
  rating: number;
  reviews: number;
  address: string;
  city?: string;
  sublocality?: string;
  establishmentYear?: number;
  categories: string[];
  categoryBarItems?: StoreCategoryBarItem[];
  filters: { label: string; options: string[] }[];
  products: StoreProduct[];
  featured: StoreSection;
  trending: StoreSection;
  aboutTitle: string;
  aboutBody: string;
  gallery?: string[];
};

export const listingProfiles: Record<string, ListingProfile> = {
  "rest-1": {
    id: "rest-1",
    name: "Black Horse",
    category: "Restaurant",
    coverImage:
      "https://images.unsplash.com/photo-1421622548261-c45bfe178854?auto=format&fit=crop&w=1600&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=300&q=60",
    rating: 4.6,
    reviews: 148,
    priceRange: "Starts from ₹99",
    badges: ["Premium", "Trending"],
    tags: ["Rooftop", "Live Music", "Couple Friendly"],
    address: "Vijay Chowk, Gomti Nagar",
    city: "Lucknow",
    phone: "+91 98765 43210",
    email: "hello@blackhorse.in",
    whatsapp: "+91 98765 43210",
    ctaLabel: "Reserve a table",
    description:
      "Black Horse is a signature rooftop dining lounge with curated menus, live acoustics, and warm ambient interiors. Ideal for date nights, team dinners, and celebrations.",
    highlights: [
      "Signature grill menu with chef specials",
      "Live music every weekend",
      "Private events and curated wine pairing",
    ],
    services: ["Dining", "Events", "Catering", "Rooftop Seating"],
    amenities: ["Valet Parking", "Free Wi-Fi", "Family Friendly", "Live Music"],
    hours: [
      { day: "Mon - Thu", time: "12:00 PM - 11:00 PM" },
      { day: "Fri - Sat", time: "12:00 PM - 12:30 AM" },
      { day: "Sunday", time: "12:00 PM - 11:30 PM" },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80",
    ],
    menuImage:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    menuItems: [
      {
        id: "menu-1",
        name: "PC Rice Bowlz Reg Pepsi",
        price: "₹239",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1604908554168-08b2a74b0b3a?auto=format&fit=crop&w=600&q=70",
        badge: "Save 37%",
      },
      {
        id: "menu-2",
        name: "Roll Combo - Medium",
        price: "₹198",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1604908554203-c1f76d9b7c3f?auto=format&fit=crop&w=600&q=70",
        badge: "Save 37%",
      },
      {
        id: "menu-3",
        name: "Longer Combo - Large",
        price: "₹248",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=70",
        badge: "Save 32%",
      },
      {
        id: "menu-4",
        name: "Veg Rice Bowlz Reg Pepsi",
        price: "₹208",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=70",
      },
      {
        id: "menu-5",
        name: "Veg Rice Bowlz Reg Pepsi",
        price: "₹208",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=70",
      },
      {
        id: "menu-6",
        name: "Paneer Tikka Wrap",
        price: "₹219",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1604908554203-c1f76d9b7c3f?auto=format&fit=crop&w=600&q=70",
        badge: "Chef's pick",
      },
      {
        id: "menu-7",
        name: "Grilled Chicken Bowl",
        price: "₹269",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=70",
      },
      {
        id: "menu-8",
        name: "Classic Veg Burger",
        price: "₹189",
        category: "Food",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=70",
        badge: "Best seller",
      },
    ],
    reviewsList: [
      {
        id: "rev-1",
        author: "Harshita Singh",
        rating: 4.8,
        date: "Nov 18, 2025",
        comment: "Loved the ambience and live music. Great service and curated menu.",
      },
      {
        id: "rev-2",
        author: "Arjun Verma",
        rating: 4.4,
        date: "Oct 06, 2025",
        comment: "Perfect for celebrations. The dessert platter was outstanding.",
      },
    ],
    mapImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60",
    suggestionTitle: "Suggestions",
    suggestions: [
      { name: "Caribbean Blu", detail: "Fine dine with family" },
      { name: "Sugar Rush", detail: "Dessert lounge" },
      { name: "Bunker's Adda", detail: "Cafe & co-working" },
    ],
  },
  diyaratech: {
    id: "diyaratech",
    storeId: "diyaratech",
    name: "Diyaratech Software",
    category: "Electronics",
    coverImage:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=60",
    rating: 4.8,
    reviews: 128,
    priceRange: "Starts from ₹99",
    badges: ["Premium", "Top Rated"],
    tags: ["Electronics", "Gadgets", "Home Appliances"],
    address: "Golghar",
    city: "Gorakhpur",
    phone: "+91 90000 11111",
    email: "support@diyaratech.in",
    whatsapp: "+91 90000 11111",
    ctaLabel: "Visit store",
    description:
      "Diyaratech Software offers curated electronics, appliances, and smart gadgets with verified warranties and doorstep delivery.",
    highlights: ["Verified electronics store", "Fast delivery", "Assured warranty"],
    services: ["Electronics", "Appliances", "Accessories"],
    amenities: ["Customer Support", "Warranty", "Easy Returns"],
    hours: [
      { day: "Monday - Sunday", time: "10:00 AM - 9:00 PM" },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    ],
    reviewsList: [],
    mapImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60",
    suggestionTitle: "Suggestions",
    suggestions: [],
  },
};

export const storePages: Record<string, StorePageData> = {
  diyaratech: {
    id: "diyaratech",
    storeName: "Diyaratech Software",
    tagline: "Unlimited Possibilities",
    bannerImage:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=60",
    rating: 4.8,
    reviews: 128,
    address: "Golghar, Gorakhpur",
    categories: [
      "Washing Machine",
      "Mobile",
      "Tablet",
      "Microwave",
      "Headphone",
      "Oppo",
      "Fan",
      "Laptop",
      "Heater",
      "Realme",
    ],
    filters: [
      { label: "Price", options: ["Under ₹1,000", "₹1,000 - ₹10,000", "₹10,000+"] },
      { label: "Brand", options: ["Sony", "Samsung", "Lenovo", "Boat", "Philips"] },
      { label: "Availability", options: ["In stock", "Pre-order", "Coming soon"] },
    ],
    products: [
      {
        id: "prod-1",
        name: "Panasonic 20L Solo Microwave",
        price: "₹6,440",
        category: "Electronics",
        imageUrl:
          "https://images.unsplash.com/photo-1585238342028-4ce1f2f53b16?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-2",
        name: "Lenovo IdeaPad 11 Laptop",
        price: "₹26,999",
        category: "Laptop",
        imageUrl:
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-3",
        name: "Zebronics Thunder Headset",
        price: "₹799",
        category: "Audio",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-4",
        name: "Lenovo Tab M11 with Pen",
        price: "₹16,999",
        category: "Tablet",
        imageUrl:
          "https://images.unsplash.com/photo-1525203135335-74d272fc8d9c?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-5",
        name: "OnePlus Pad Go 28",
        price: "₹16,999",
        category: "Tablet",
        imageUrl:
          "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-6",
        name: "Boat 2025 Launch",
        price: "₹1,099",
        category: "Audio",
        imageUrl:
          "https://images.unsplash.com/photo-1518441902117-fb1c5ed0f2e3?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-7",
        name: "Orient Electric Comfort Heater",
        price: "₹9,300",
        category: "Home Appliances",
        imageUrl:
          "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-8",
        name: "Pigeon Amaze Plus Kettle",
        price: "₹549",
        category: "Home Appliances",
        imageUrl:
          "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=500&q=80",
      },
      {
        id: "prod-9",
        name: "Oppo F31 Pro 5G",
        price: "₹28,999",
        category: "Mobile",
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
      },
    ],
    featured: {
      title: "Featured Products",
      subtitle: "Top picks with best value",
      productIds: ["prod-1", "prod-2", "prod-3", "prod-4", "prod-5", "prod-6"],
    },
    trending: {
      title: "Trending Products",
      subtitle: "Most loved this week",
      productIds: ["prod-9", "prod-7", "prod-8", "prod-3", "prod-6", "prod-5"],
    },
    aboutTitle: "About",
    aboutBody:
      "We curate verified electronics and home essentials with transparent pricing, fast delivery, and service assurance. Our store specialists help you choose the right product and warranty.",
  },
};

export const buildFallbackProfile = (listing: CategoryListing): ListingProfile => {
  return {
    id: listing.id,
    name: listing.name,
    category: listing.subcategory,
    coverImage: listing.imageUrl,
    logoImage: listing.imageUrl,
    heroTitle: listing.name,
    heroSubtitle: listing.subcategory ? `${listing.subcategory} - Trusted by Thousands` : "Trusted by Thousands",
    rating: listing.rating,
    reviews: listing.reviews,
    priceRange: listing.priceRange ?? "Starts from ₹99",
    badges: listing.badges ?? ["Featured"],
    tags: listing.tags ?? ["Popular"],
    address: listing.address,
    city: listing.city,
    phone: "+91 90000 00000",
    email: "hello@winkget.in",
    whatsapp: "+91 90000 00000",
    ctaLabel: listing.ctaLabel ?? "Enquiry",
    description:
      "This business is verified and curated by Winkget. Contact the vendor to get offers, availability, and booking details.",
    highlights: ["Verified listing", "Responsive support", "Trusted vendor"],
    services: [listing.subcategory, "Consultation", "Booking"],
    amenities: ["Customer Support", "Verified Reviews"],
    hours: [
      { day: "Monday - Sunday", time: "10:00 AM - 10:00 PM" },
    ],
    gallery: [listing.imageUrl],
    reviewsList: [],
    mapImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60",
    suggestionTitle: "Suggestions",
    suggestions: [],
  };
};
