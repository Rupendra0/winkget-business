export interface IHero {
  name: string;
  title: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  isVerified: boolean;
  location: string;
  coverImage: string;
  profileImage: string;
  shortIntro: string;
  phone: string;
  whatsapp: string;
  email: string;
}

export interface IAbout {
  intro: string;
  experience: string;
  mission: string;
  whyChooseIntro: string;
}

export interface IWhyChooseItem {
  id: string;
  title: string;
  description: string;
  icon: string; // Key for SVG icons mapping
}

export interface IService {
  id: string;
  name: string;
  description: string;
  icon: string; // Key for SVG icons mapping
  learnMoreUrl?: string;
}

export interface ITimelineStep {
  id: string;
  number: number;
  title: string;
  description: string;
}

export interface IGalleryItem {
  id: string;
  url: string;
  caption: string;
  tag: 'Office' | 'Projects' | 'Certificates' | 'Team' | 'Work';
}

export interface ITestimonial {
  id: string;
  customerName: string;
  customerImage?: string;
  rating: number;
  reviewText: string;
  date?: string;
}

export interface IFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface IContact {
  address: string;
  phone: string;
  email: string;
  website: string;
  workingHours: Array<{ day: string; hours: string }>;
  mapPlaceholder: string;
}

export interface ICTA {
  title: string;
  description: string;
  buttonText: string;
}

export interface IThemeColors {
  primary: string;      // Tailwind class for primary color text/bg/border
  primaryHover: string; // Tailwind class for hover states
  accentBg: string;     // Tailwind background color capsule styling
  borderFocus: string;  // Tailwind focus states ring styling
  buttonBg: string;     // Tailwind background for primary CTA buttons
}

export interface IProviderData {
  id: string;
  category: 'Advocate' | 'Doctor' | 'Architect' | 'Chartered Accountant' | 'Interior Designer' | 'Electrician' | 'Tutor' | 'Consultant';
  themeColors: IThemeColors;
  hero: IHero;
  about: IAbout;
  whyChooseUs: IWhyChooseItem[];
  services: IService[];
  timeline: ITimelineStep[];
  gallery: IGalleryItem[];
  testimonials: ITestimonial[];
  faqs: IFAQ[];
  contact: IContact;
  cta: ICTA;
}
