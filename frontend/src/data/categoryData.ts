export type CategoryListing = {
  id: string;
  name: string;
  businessName?: string;
  rating: number;
  reviews: number;
  verified: boolean;
  vendorStatus?: string;
  address: string;
  city: string;
  sublocality: string;
  subcategory: string;
  subcategoryId?: string;
  businessDescription?: string;
  businessPhone?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  establishmentYear?: number;
  imageUrl: string;
  ctaLabel?: string;
  badges?: string[];
  priceRange?: string;
  tags?: string[];
};

export type CategoryFilterOption = {
  id: string;
  label: string;
};

export type CategoryBanner = {
  title: string;
  subtitle: string;
  imageUrl: string;
  cta: string;
};

export type CategoryPageData = {
  categoryId?: string;
  slug: string;
  title: string;
  city: string;
  selectedCity?: string;
  selectedSublocality?: string;
  availableCities?: string[];
  localitiesByCity?: Record<string, string[]>;
  banner: CategoryBanner;
  subcategories: Array<string | CategoryFilterOption>;
  sublocalities: string[];
  listings: CategoryListing[];
  exploreTitle: string;
  exploreTiles: { label: string; imageUrl: string }[];
  exploreInsertAfter: number;
};

export const categoryPages: CategoryPageData[] = [
  {
    slug: "restaurants",
    title: "Restaurants",
    city: "Lucknow",
    banner: {
      title: "Restaurants in Lucknow",
      subtitle: "Discover top-rated cafes and dining spots near you.",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=60",
      cta: "Explore offers",
    },
    subcategories: ["Cafe", "Bakery", "Dinner", "Sweet", "Beverages", "Burger"],
    sublocalities: ["Gomti Nagar", "Hazratganj", "Indira Nagar", "Alambagh"],
    exploreTitle: "Explore",
    exploreInsertAfter: 6,
    exploreTiles: [
      {
        label: "Cafes",
        imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Dinner",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Chill",
        imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Pubs",
        imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "More",
        imageUrl: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=400&q=60",
      },
    ],
    listings: [
      {
        id: "rest-1",
        name: "Black Horse",
        rating: 4.6,
        reviews: 148,
        verified: true,
        address: "Vijay Chowk, Gomti Nagar",
        city: "Lucknow",
        sublocality: "Gomti Nagar",
        subcategory: "Cafe",
        imageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Reserve",
        badges: ["Premium", "Trending"],
        priceRange: "Starts from ₹99",
        tags: ["Rooftop", "Live Music", "Couple Friendly"],
      },
      {
        id: "rest-2",
        name: "Naina Dry Fruits",
        rating: 4.4,
        reviews: 92,
        verified: true,
        address: "Shahebganj Mandi, Hazratganj",
        city: "Lucknow",
        sublocality: "Hazratganj",
        subcategory: "Sweet",
        imageUrl: "https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Get quote",
        badges: ["Best Seller"],
        priceRange: "Starts from ₹149",
        tags: ["Gift Packs", "Same Day"],
      },
      {
        id: "rest-3",
        name: "Caribbean Blu",
        rating: 4.7,
        reviews: 206,
        verified: true,
        address: "Hari Om Nagar, Indira Nagar",
        city: "Lucknow",
        sublocality: "Indira Nagar",
        subcategory: "Dinner",
        imageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Book table",
        badges: ["Top Rated"],
        priceRange: "Starts from ₹499",
        tags: ["Fine Dine", "Family"],
      },
      {
        id: "rest-4",
        name: "Bunker\'s Adda",
        rating: 4.5,
        reviews: 131,
        verified: true,
        address: "GDA Tower, Alambagh",
        city: "Lucknow",
        sublocality: "Alambagh",
        subcategory: "Cafe",
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Call now",
        badges: ["New"],
        priceRange: "Starts from ₹199",
        tags: ["Co-working", "Events"],
      },
      {
        id: "rest-5",
        name: "The Oven Story",
        rating: 4.3,
        reviews: 76,
        verified: false,
        address: "Gomti Nagar Extension",
        city: "Lucknow",
        sublocality: "Gomti Nagar",
        subcategory: "Dinner",
        imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Order now",
        badges: ["Budget"],
        priceRange: "Starts from ₹129",
        tags: ["Delivery", "Late Night"],
      },
      {
        id: "rest-6",
        name: "Sugar Rush",
        rating: 4.8,
        reviews: 244,
        verified: true,
        address: "Hazratganj Market",
        city: "Lucknow",
        sublocality: "Hazratganj",
        subcategory: "Bakery",
        imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Visit store",
        badges: ["Premium", "Chef Special"],
        priceRange: "Starts from ₹249",
        tags: ["Custom Cakes", "Catering"],
      },
    ],
  },
  {
    slug: "salon-and-spa",
    title: "Salon & Spa",
    city: "Gorakhpur",
    banner: {
      title: "Salon & Spa in Gorakhpur",
      subtitle: "Book premium salons, grooming, and spa treatments nearby.",
      imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=60",
      cta: "Book now",
    },
    subcategories: ["Women", "Men", "Spa", "Makeup", "Hair Styling"],
    sublocalities: ["Golghar", "Basharatpur", "Civil Lines"],
    exploreTitle: "Explore",
    exploreInsertAfter: 6,
    exploreTiles: [
      {
        label: "Studios",
        imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Spa",
        imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Makeup",
        imageUrl: "https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Barber",
        imageUrl: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "More",
        imageUrl: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=400&q=60",
      },
    ],
    listings: [
      {
        id: "salon-1",
        name: "Urban Glow Studio",
        rating: 4.7,
        reviews: 214,
        verified: true,
        address: "Golghar Market",
        city: "Gorakhpur",
        sublocality: "Golghar",
        subcategory: "Women",
        imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Book now",
        badges: ["Premium", "Women Only"],
        priceRange: "Starts from ₹699",
        tags: ["Bridal", "Color"],
      },
      {
        id: "salon-2",
        name: "The Gentlemen\'s Club",
        rating: 4.5,
        reviews: 121,
        verified: true,
        address: "Civil Lines Road",
        city: "Gorakhpur",
        sublocality: "Civil Lines",
        subcategory: "Men",
        imageUrl: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Call now",
        badges: ["Grooming"],
        priceRange: "Starts from ₹199",
        tags: ["Haircut", "Shave"],
      },
      {
        id: "salon-3",
        name: "Serenity Spa",
        rating: 4.6,
        reviews: 98,
        verified: false,
        address: "Basharatpur",
        city: "Gorakhpur",
        sublocality: "Basharatpur",
        subcategory: "Spa",
        imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Book slot",
        badges: ["Relax"],
        priceRange: "Starts from ₹899",
        tags: ["Massage", "Detox"],
      },
    ],
  },
  {
    slug: "electronics",
    title: "Electronics",
    city: "Gorakhpur",
    banner: {
      title: "Electronics in Gorakhpur",
      subtitle: "Shop verified electronics, appliances, and gadgets near you.",
      imageUrl:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=60",
      cta: "View deals",
    },
    subcategories: ["Mobiles", "Laptops", "Appliances", "Accessories"],
    sublocalities: ["Golghar", "Civil Lines", "Basharatpur"],
    exploreTitle: "Explore",
    exploreInsertAfter: 6,
    exploreTiles: [
      {
        label: "Mobiles",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Laptops",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Audio",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "Appliances",
        imageUrl: "https://images.unsplash.com/photo-1585238342028-4ce1f2f53b16?auto=format&fit=crop&w=400&q=60",
      },
      {
        label: "More",
        imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=60",
      },
    ],
    listings: [
      {
        id: "diyaratech",
        name: "Diyaratech Software",
        rating: 4.8,
        reviews: 128,
        verified: true,
        address: "Golghar",
        city: "Gorakhpur",
        sublocality: "Golghar",
        subcategory: "Appliances",
        imageUrl:
          "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=60",
        ctaLabel: "Visit store",
        badges: ["Premium", "Top Rated"],
        priceRange: "Starts from ₹99",
        tags: ["Electronics", "Gadgets", "Warranty"],
      },
    ],
  },
];