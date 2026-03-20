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
  name: string;
  category: string;
  coverImage: string;
  logoImage: string;
  rating: number;
  reviews: number;
  priceRange: string;
  badges: string[];
  tags: string[];
  address: string;
  city: string;
  phone: string;
  email: string;
  whatsapp: string;
  ctaLabel: string;
  description: string;
  highlights: string[];
  services: string[];
  amenities: string[];
  hours: { day: string; time: string }[];
  gallery: string[];
  menuImage?: string;
  reviewsList: ListingReview[];
  mapImage: string;
  suggestionTitle: string;
  suggestions: { name: string; detail: string }[];
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
    priceRange: "$$$",
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
};

export const buildFallbackProfile = (listing: CategoryListing): ListingProfile => {
  return {
    id: listing.id,
    name: listing.name,
    category: listing.subcategory,
    coverImage: listing.imageUrl,
    logoImage: listing.imageUrl,
    rating: listing.rating,
    reviews: listing.reviews,
    priceRange: listing.priceRange ?? "$$",
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
