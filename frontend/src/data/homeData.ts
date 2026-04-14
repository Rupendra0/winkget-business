export type CategoryItem = {
  name: string;
  iconKey: string;
  color: string;
  imageUrl: string;
  order: number;
  showOnHome: boolean;
};

export type QuickTile = {
  label: string;
  badge: string;
  imageUrl: string;
};

export type PromoCard = {
  title: string;
  subtitle: string;
  tone: string;
  imageUrl: string;
};

export type PromoBanner = {
  title: string;
  subtitle: string;
  button: string;
  tone: string;
  imageUrl: string;
};

export type HeroBanner = {
  title: string;
  subtitle: string;
  cta: string;
  tone: string;
  imageUrl: string;
};

export const heroQuickTiles: QuickTile[] = [
  {
    label: "B2B Services",
    badge: "Top Vendors",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=120&q=60",
  },
  {
    label: "Repairs & Services",
    badge: "Verified Pros",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=120&q=60",
  },
  {
    label: "Real Estate",
    badge: "Trusted Agents",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=120&q=60",
  },
  {
    label: "Doctors",
    badge: "Nearby Clinics",
    imageUrl: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=120&q=60",
  },
  {
    label: "Salon & Spa",
    badge: "Top Rated",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=120&q=60",
  },
  {
    label: "Home Cleaning",
    badge: "Best Value",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=120&q=60",
  },
];

export const categories: CategoryItem[] = [
  {
    name: "Hotel",
    iconKey: "Building2",
    color: "from-blue-600 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=240&q=60",
    order: 1,
    showOnHome: true,
  },
  {
    name: "Tour & Travels",
    iconKey: "Plane",
    color: "from-cyan-400 to-cyan-600",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=240&q=60",
    order: 2,
    showOnHome: true,
  },
  {
    name: "Restaurants",
    iconKey: "UtensilsCrossed",
    color: "from-teal-300 to-teal-500",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=240&q=60",
    order: 3,
    showOnHome: true,
  },
  {
    name: "Real Estate",
    iconKey: "Home",
    color: "from-sky-400 to-sky-600",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=240&q=60",
    order: 4,
    showOnHome: true,
  },
  {
    name: "Car Repairing",
    iconKey: "Wrench",
    color: "from-blue-700 to-blue-900",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=240&q=60",
    order: 5,
    showOnHome: true,
  },
  {
    name: "Caterers",
    iconKey: "ChefHat",
    color: "from-cyan-500 to-cyan-700",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=240&q=60",
    order: 6,
    showOnHome: true,
  },
  {
    name: "Contractor",
    iconKey: "Hammer",
    color: "from-teal-400 to-teal-600",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=240&q=60",
    order: 7,
    showOnHome: true,
  },
  {
    name: "Dentists",
    iconKey: "Smile",
    color: "from-sky-500 to-sky-700",
    imageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=240&q=60",
    order: 8,
    showOnHome: true,
  },
  {
    name: "Doctor",
    iconKey: "Stethoscope",
    color: "from-blue-700 to-blue-900",
    imageUrl: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=240&q=60",
    order: 9,
    showOnHome: true,
  },
  {
    name: "Education",
    iconKey: "BookOpen",
    color: "from-cyan-500 to-cyan-700",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=240&q=60",
    order: 10,
    showOnHome: true,
  },
  {
    name: "Event Planner",
    iconKey: "Sparkles",
    color: "from-teal-400 to-teal-600",
    imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=240&q=60",
    order: 11,
    showOnHome: true,
  },
  {
    name: "Beauty & Spa",
    iconKey: "Palette",
    color: "from-sky-500 to-sky-700",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=240&q=60",
    order: 12,
    showOnHome: true,
  },
  {
    name: "Electronics",
    iconKey: "Monitor",
    color: "from-blue-600 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=240&q=60",
    order: 13,
    showOnHome: true,
  },
  {
    name: "Home Service",
    iconKey: "MapPin",
    color: "from-blue-600 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=240&q=60",
    order: 14,
    showOnHome: false,
  },
  {
    name: "Hospital",
    iconKey: "Hospital",
    color: "from-cyan-400 to-cyan-600",
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=240&q=60",
    order: 15,
    showOnHome: false,
  },
  {
    name: "Interior Design",
    iconKey: "Sofa",
    color: "from-teal-300 to-teal-500",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=240&q=60",
    order: 16,
    showOnHome: false,
  },
  {
    name: "Jewellery Showrooms",
    iconKey: "Gem",
    color: "from-sky-400 to-sky-600",
    imageUrl: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=240&q=60",
    order: 17,
    showOnHome: false,
  },
  {
    name: "Gym",
    iconKey: "Dumbbell",
    color: "from-blue-700 to-blue-900",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=240&q=60",
    order: 18,
    showOnHome: false,
  },
  {
    name: "Lawyers",
    iconKey: "Scale",
    color: "from-cyan-500 to-cyan-700",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=240&q=60",
    order: 19,
    showOnHome: false,
  },
  {
    name: "Pet Care",
    iconKey: "PawPrint",
    color: "from-teal-400 to-teal-600",
    imageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=240&q=60",
    order: 20,
    showOnHome: false,
  },
  {
    name: "Home Decor",
    iconKey: "Lightbulb",
    color: "from-sky-500 to-sky-700",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=240&q=60",
    order: 21,
    showOnHome: false,
  },
  {
    name: "Software & Website",
    iconKey: "Code",
    color: "from-blue-700 to-blue-900",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=240&q=60",
    order: 22,
    showOnHome: false,
  },
  {
    name: "Coaching",
    iconKey: "Users",
    color: "from-cyan-500 to-cyan-700",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=240&q=60",
    order: 23,
    showOnHome: false,
  },
  {
    name: "Computer Institute",
    iconKey: "Monitor",
    color: "from-teal-400 to-teal-600",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=240&q=60",
    order: 24,
    showOnHome: false,
  },
];

export const promoBanner = {
  title: "Explore essentials",
  subtitle: "Discover the best local services with limited-time offers.",
  button: "Discover now",
  tone: "from-blue-950 to-blue-800",
  imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60",
};

export const heroBanners: HeroBanner[] = [
  {
    title: "Local business deals",
    subtitle: "Best offers from trusted vendors in your city.",
    cta: "Discover now",
    tone: "from-blue-950 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=60",
  },
  {
    title: "Home services made easy",
    subtitle: "Book verified professionals in minutes.",
    cta: "Explore services",
    tone: "from-slate-900 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=60",
  },
  {
    title: "Business growth partners",
    subtitle: "Get leads and grow your local business.",
    cta: "Get listed",
    tone: "from-indigo-900 to-blue-800",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60",
  },
];

export const promoCards: PromoCard[] = [
  {
    title: "B2B",
    subtitle: "Quick quotes",
    tone: "from-blue-700 to-blue-900",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=240&q=60",
  },
  {
    title: "Repairs & Services",
    subtitle: "Get nearby vendors",
    tone: "from-cyan-500 to-cyan-700",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=240&q=60",
  },
  {
    title: "Real Estate",
    subtitle: "Trusted agents",
    tone: "from-sky-500 to-sky-700",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=240&q=60",
  },
  {
    title: "Doctors",
    subtitle: "Book now",
    tone: "from-teal-400 to-teal-600",
    imageUrl: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=240&q=60",
  },
];

export const cities = [
  {
    name: "Chennai",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Delhi",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Ahmedabad",
    imageUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Hyderabad",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Pune",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Mumbai",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=200&q=60",
  },
  {
    name: "Kolkata",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=200&q=60",
  },
];

export const promoBanners: PromoBanner[] = [
  {
    title: "Wall Panels",
    subtitle: "Level up your walls",
    button: "Know more",
    tone: "from-blue-100 to-blue-200",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60",
  },
  {
    title: "Give your space the glow-up it deserves",
    subtitle: "Home painting",
    button: "Buy now",
    tone: "from-teal-100 to-teal-200",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60",
  },
  {
    title: "Appliance care plans",
    subtitle: "Protect your appliances",
    button: "View plans",
    tone: "from-blue-100 to-blue-200",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=60",
  },
  {
    title: "Festival decor",
    subtitle: "Make your home festive",
    button: "Shop now",
    tone: "from-teal-100 to-teal-200",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=60",
  },
];

export const heroMosaicImages = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=800&q=60",
];

export const brandPartners = [
  {
    name: "McDonalds",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    name: "Flipkart",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    name: "Amazon",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    name: "Meesho",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    name: "Myntra",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
];

export const localPartners = [
  {
    name: "GreenLeaf Cafe",
    logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=120&q=60",
  },
  {
    name: "FixIt Pro",
    logoUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=120&q=60",
  },
  {
    name: "Urban Salon",
    logoUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=120&q=60",
  },
  {
    name: "Happy Homes",
    logoUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=120&q=60",
  },
];

export const registerCta = {
  title: "Register your business here",
  subtitle: "Reach more customers and grow your business with Winkget",
  button: "Get listed",
  imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60",
};

export const footerData = {
  categories: [
    "Astrologers",
    "Beauty & Spa",
    "Car Repairing",
    "Caterers",
    "Chartered Accountant",
    "Coaching",
    "Computer Institute",
    "Contractor",
    "Courier Services",
    "Dentists",
    "Doctor",
    "Education",
    "Event Planner",
    "Fabricators",
    "Gym",
    "HR Service",
    "Hardware & Tools",
    "Hobbies",
    "Home Decor",
    "Home Service",
    "Hospital",
    "Hotel",
    "Interior Design",
    "Jewellery Showrooms",
    "Jobs",
    "Lawyers",
    "Loan",
    "Nursing Services",
    "Packers & Movers",
    "Painting Contractors",
  ],
  navigation: ["Plans", "My Account", "My Order", "FAQ", "Support"],
  policies: ["Return Policy", "Privacy Policy", "Terms & Conditions"],
  quickLinks: [
    "Feedback",
    "Free Listing",
    "Add Your Business",
    "Advertise",
    "Customer Care",
    "We’re Hiring",
    "Testimonials",
    "Blogs",
    "About Us",
    "Contact Us",
    "Our Vision",
    "B2B",
    "Explore",
  ],
  social: [
    { name: "Instagram", url: "#" },
    { name: "Facebook", url: "#" },
    { name: "Twitter", url: "#" },
    { name: "WhatsApp", url: "#" },
  ],
  bottomLinks: [
    "Payment",
    "Become a partner",
    "List a Job",
    "Order your meal",
    "Find what you need",
  ],
  copyright: "COPYRIGHT © ALL RIGHTS RESERVED BY RUPENDRA GANGWAR",
};
