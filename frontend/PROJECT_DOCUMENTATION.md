# Winkget Business - Modern Service Marketplace

A beautiful, responsive Next.js website for finding and booking local services. Built with glass morphism design, Tailwind CSS, and modern React components.

## 🚀 Features

- **Glass Morphism UI** - Modern frosted glass effect using backdrop blur and transparency
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Service Categories** - 23+ business categories with custom icons
- **Hero Section** - Interactive search bar with location and service filters
- **Featured Services** - Popular services showcase with ratings and time estimates
- **Features Section** - Key value propositions displayed elegantly
- **Navbar** - Sticky navigation with search, location selector, and CTA buttons

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with navbar
│   ├── page.tsx            # Home page with all sections
│   └── globals.css         # Global styles with glass morphism animations
├── components/
│   ├── Navbar.tsx          # Navigation bar component
│   ├── HeroSection.tsx     # Hero section with search
│   ├── CategoryGrid.tsx    # Business categories grid
│   ├── FeaturesSection.tsx # Key features display
│   └── FeaturedServices.tsx # Popular services showcase
```

## 🎨 Design Features

### Glass Morphism
- **Backdrop blur** effects for depth
- **Semi-transparent backgrounds** with `bg-white/20` to `bg-white/40`
- **Border styling** with `border-white/20` to `border-white/60`
- **Smooth transitions** and hover effects

### Color Scheme
- **Primary**: Orange (#FF8C00 - #FF7600)
- **Accents**: Multiple gradient combinations for category icons
- **Background**: Soft gradient from white to light purple/orange
- **Text**: Dark gray (#1F2937) for main text, lighter grays for secondary

### Animations
- **Pulse animation** on background blobs
- **Hover effects** with scale and translate transforms
- **Smooth transitions** on all interactive elements
- **Float animations** for floating elements (if used)

## 🛠️ Technology Stack

- **Framework**: Next.js 16.1.7
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Language**: TypeScript
- **Font**: Geist Sans & Mono (Google Fonts)

## 📦 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 🎯 Component Details

### 1. **Navbar** (`Navbar.tsx`)
- Sticky navigation bar with glass morphism
- Location selector with dropdown
- Search bar across services
- CTA buttons (Explore, Winkget, Login)
- Mobile-responsive menu toggle
- White/20% transparency with backdrop blur

### 2. **HeroSection** (`HeroSection.tsx`)
- Animated background blobs with gradients
- Hero heading with gradient text
- Dual input search (location + service)
- Popular search tags
- Mobile-optimized layout

### 3. **CategoryGrid** (`CategoryGrid.tsx`)
- 23 business categories with icons
- Hover effects showing gradient overlay
- Responsive grid (2-6 columns based on screen size)
- Color-coded category icons
- "View All Categories" button

### 4. **FeaturesSection** (`FeaturesSection.tsx`)
- 4 key value propositions
- Icon-based layout
- Responsive grid layout
- Hover animations on cards

### 5. **FeaturedServices** (`FeaturedServices.tsx`)
- Service cards with images/emojis
- Rating display with stars
- Service time estimates
- Provider names
- 1-3 column responsive grid

## 🎪 Category List

```
Hotel, Tour & Travels, Restaurants, Real Estate, Car Repairing, Caterers,
Contractor, Dentists, Doctor, Education, Event Planner, Beauty & Spa,
Home Service, Hospital, Interior Design, Jewellery Showrooms, Gym,
Lawyers, Pet Care, Home Decor, Software & Website, Coaching,
Computer Institute
```

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (2-column grid for categories)
- **Tablet**: 640px - 1024px (3-4 column grid)
- **Desktop**: > 1024px (6-column category grid)

## 🎨 Tailwind CSS Custom Utilities

```css
.glass-effect     /* Backdrop blur with white/30 background */
.glass-effect-sm  /* Smaller glass effect with white/20 */
.animate-float    /* Floating animation */
```

## ✨ Future Enhancements

- Add user authentication
- Implement filtering and search functionality
- Add booking system
- Customer reviews and ratings
- Business profile pages
- Payment integration
- Admin dashboard

## 📄 License

This project is part of Winkget Business platform.

## 🌐 Original Website

https://winkget.com/?winkget=true

---

**Built with ❤️ using Next.js and Tailwind CSS**
