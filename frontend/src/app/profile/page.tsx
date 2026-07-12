"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Mail, 
  Phone, 
  LogOut, 
  UserRound, 
  Building2, 
  BadgeCheck, 
  MapPin, 
  Globe, 
  ChevronRight, 
  ChevronLeft,
  Package, 
  Wallet, 
  FolderHeart, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { AUTH_BACKEND_URL, fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import { 
  readAddresses, 
  saveAddress, 
  deleteAddress, 
  seedAddressFromUserProfile, 
  type SavedAddress, 
  type AddressDraft 
} from "@/lib/checkoutStore";
import { 
  readWishlist, 
  toggleWishlist, 
  type StorefrontStoredProduct 
} from "@/lib/shopStorage";

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  tag: "Home",
};

const MOCK_COUPONS = [
  { title: "Get products at Re.1", desc: "Get products at Re.1 (Valid till: 11:59 PM, 30 Jun)", expiry: "30 Jun, 2026" },
  { title: "Additional 9% OFF on GLM_500-1", desc: "Additional 9% OFF on GLM_500-1000 (Valid till: 11:59 PM, 30 Jun)", expiry: "30 Jun, 2026" },
  { title: "Additional 15% OFF MarQ trimme", desc: "Additional 15% OFF MarQ trimmer (Valid till: 11:59 PM, 21 Jun)", expiry: "21 Jun, 2026" },
  { title: "Additional 3% OFF on GLM_300-5", desc: "Additional 3% OFF on GLM_300-500 (Valid till: 11:59 PM, 30 Jun)", expiry: "30 Jun, 2026" },
  { title: "Additional 9% OFF on GLM Strip", desc: "Additional 9% OFF on GLM Strip (Valid till: 11:59 PM, 30 Jun)", expiry: "30 Jun, 2026" }
];

interface CustomWishlistItem extends StorefrontStoredProduct {
  assured?: boolean;
  available?: boolean;
  discount?: string;
}

const SEED_WISHLIST_ITEMS: CustomWishlistItem[] = [
  {
    id: "wish-macbook",
    storeId: "store-electronics",
    name: "Apple MacBook AIR M2 - (16 GB/256 GB SSD/macOS Sequoia) MC7X4HN/A",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=70",
    price: 83990,
    oldPrice: 85900,
    priceText: "₹83,990",
    oldPriceText: "₹85,900",
    sellerName: "Winkget Retail",
    categoryLabel: "Laptops",
    href: "/product/macbook-air-m2",
    assured: true,
    available: false,
    discount: "2% off"
  },
  {
    id: "wish-iphone13",
    storeId: "store-electronics",
    name: "Apple iPhone 13 (Starlight, 128 GB)",
    image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=400&q=70",
    price: 49900,
    oldPrice: 49900,
    priceText: "₹49,900",
    oldPriceText: "₹49,900",
    sellerName: "Winkget Retail",
    categoryLabel: "Mobiles",
    href: "/product/iphone-13",
    assured: true,
    available: true,
    discount: ""
  },
  {
    id: "wish-perfume",
    storeId: "store-fashion",
    name: "PARK AVENUE Amazon Woods Eau de Parfum - 120 ml",
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=70",
    price: 174,
    oldPrice: 349,
    priceText: "₹174",
    oldPriceText: "₹349",
    sellerName: "Fashion Outlet",
    categoryLabel: "Perfumes",
    href: "/product/park-avenue-woods",
    assured: true,
    available: true,
    discount: "50% off"
  },
  {
    id: "wish-belt",
    storeId: "store-fashion",
    name: "PETER ENGLAND Men Black Synthetic Reversible Belt",
    image: "https://images.unsplash.com/photo-1624222247344-550fb8ecfbd4?auto=format&fit=crop&w=400&q=70",
    price: 329,
    oldPrice: 999,
    priceText: "₹329",
    oldPriceText: "₹999",
    sellerName: "Peter England Store",
    categoryLabel: "Accessories",
    href: "/product/peter-england-reversible-belt",
    assured: true,
    available: true,
    discount: "67% off"
  }
];

const MOCK_CARDS = [
  { id: "card-1", type: "Visa", last4: "4321", name: "RUPENDRA GANGWAR", expiry: "12/29" },
  { id: "card-2", type: "Mastercard", last4: "8765", name: "RUPENDRA GANGWAR", expiry: "08/30" }
];

const MOCK_UPI_LIST = [
  { id: "upi-1", provider: "Phonepe UPI", vpa: "9105158840@ibl" },
  { id: "upi-2", provider: "Google Pay UPI", vpa: "rupendragangwar@okaxis" }
];

const MOCK_PAN = {
  number: "ABCDE1234F",
  name: "RUPENDRA GANGWAR",
  status: "Verified"
};

const MOCK_NOTIFICATIONS = [
  { id: "notif-1", title: "Order Placed", body: "Your order #WG-78902 has been successfully placed.", date: "Today, 10:30 AM" },
  { id: "notif-2", title: "Discount Coupon Received!", body: "Use coupon WINKGETNEW10 to get 10% off your next service.", date: "Yesterday" }
];

interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  href?: string;
  extra?: string;
}

interface MenuGroup {
  group: string;
  icon?: any;
  items: MenuItem[];
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout states
  const [activeTab, setActiveTab] = useState<string>("profile-info");
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(true);

  // Edit / Save states for Profile
  const [editPersonal, setEditPersonal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Male");

  const [editEmail, setEditEmail] = useState(false);
  const [emailVal, setEmailVal] = useState("");

  const [editMobile, setEditMobile] = useState(false);
  const [phoneVal, setPhoneVal] = useState("");

  // Address states
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  // Interactive mock states
  const [upiList, setUpiList] = useState(MOCK_UPI_LIST);
  const [newUpi, setNewUpi] = useState("");
  const [cardList, setCardList] = useState(MOCK_CARDS);
  const [panDetails, setPanDetails] = useState(MOCK_PAN);
  const [editPan, setEditPan] = useState(false);
  const [panNumberInput, setPanNumberInput] = useState(MOCK_PAN.number);
  const [panNameInput, setPanNameInput] = useState(MOCK_PAN.name);

  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [gcNumber, setGcNumber] = useState("");
  const [gcPin, setGcPin] = useState("");
  const [gcApplyMessage, setGcApplyMessage] = useState<string | null>(null);
  const [buyGcEmail, setBuyGcEmail] = useState("");
  const [buyGcName, setBuyGcName] = useState("");
  const [buyGcValue, setBuyGcValue] = useState("1000");
  const [buyGcCount, setBuyGcCount] = useState("1");
  const [buyGcGifter, setBuyGcGifter] = useState("");
  const [buyGcSuccess, setBuyGcSuccess] = useState<string | null>(null);

  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<CustomWishlistItem[]>([]);

  // Session notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const businessLocation = [user?.businessAddress, user?.sublocality, user?.city, user?.state, user?.postalCode]
    .filter(Boolean)
    .join(", ");
  const businessTags = Array.isArray(user?.serviceTags) ? user.serviceTags.filter(Boolean) : [];
  const hasBusinessDetails = Boolean(
    user?.businessName ||
      user?.businessCategory?.name ||
      user?.businessSubcategory?.name ||
      user?.businessAddress ||
      user?.businessPhone ||
      user?.businessEmail ||
      businessTags.length > 0 ||
      user?.businessDescription
  );

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ authContext: "customer" }),
      });
    } catch {
      // Ignore logout API failures in UI flow.
    }

    window.dispatchEvent(new Event("auth:changed"));
    router.refresh();
  };

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        if (currentUser.image) {
          setProfileImage(currentUser.image);
        } else {
          const savedImage = localStorage.getItem(`winkget:profile:image:${currentUser.id}`);
          if (savedImage) {
            setProfileImage(savedImage);
          }
        }

        // Initialize edit fields
        const nameParts = (currentUser.name || "").trim().split(/\s+/);
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setEmailVal(currentUser.email || "");
        setPhoneVal(currentUser.phone || "");

        // Seed addresses
        await seedAddressFromUserProfile(currentUser);
        const nextAddressState = await readAddresses(currentUser.id);
        setAddresses(nextAddressState.addresses);
        setSelectedAddressId(nextAddressState.selectedAddressId || "");
      }
      setLoading(false);
    };

    void loadSession();

    const handleAuthChange = () => {
      void loadSession();
    };
    window.addEventListener("auth:changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth:changed", handleAuthChange);
    };
  }, [pathname]);

  // Keep address book refreshed when switching to addresses tab
  useEffect(() => {
    const fetchAddr = async () => {
      if (user && activeTab === "addresses") {
        const nextAddressState = await readAddresses(user.id);
        setAddresses(nextAddressState.addresses);
      }
    };
    void fetchAddr();
  }, [user, activeTab]);

  // Clean messages after a few seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Wishlist sync effect
  useEffect(() => {
    if (user) {
      const currentWish = readWishlist() as CustomWishlistItem[];
      setWishlistItems(currentWish);
    }
  }, [user, activeTab]);

  const handleDeleteWishlistItem = (item: StorefrontStoredProduct) => {
    toggleWishlist(item);
    setWishlistItems(readWishlist() as CustomWishlistItem[]);
    setSuccessMessage(`Removed from wishlist`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        if (user?.id) {
          try {
            setSuccessMessage(null);
            setErrorMessage(null);
            const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: base64String }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
              throw new Error(payload.message || "Failed to upload profile picture");
            }
            localStorage.setItem(`winkget:profile:image:${user.id}`, base64String);
            setSuccessMessage("Profile picture updated successfully");
            window.dispatchEvent(new Event("auth:changed"));
            const updatedUser = await fetchCurrentUser();
            if (updatedUser) setUser(updatedUser);
          } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to upload profile picture");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    setProfileImage(null);
    if (user?.id) {
      try {
        setSuccessMessage(null);
        setErrorMessage(null);
        const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: "" }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to remove profile picture");
        }
        localStorage.removeItem(`winkget:profile:image:${user.id}`);
        setSuccessMessage("Profile picture removed");
        window.dispatchEvent(new Event("auth:changed"));
        const updatedUser = await fetchCurrentUser();
        if (updatedUser) setUser(updatedUser);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to remove profile picture");
      }
    }
  };

  // Profile Save Handlers
  const handleSavePersonal = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    if (!firstName.trim()) {
      setErrorMessage("First Name is required");
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update profile");
      }
      setSuccessMessage("Personal Information updated successfully");
      window.dispatchEvent(new Event("auth:changed"));
      const updatedUser = await fetchCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setEditPersonal(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError("Please enter current and new passwords");
      return;
    }
    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update password");
      }

      setPasswordMessage(payload.message || "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    }
  };

  const handleSaveEmail = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    const emailNormalized = emailVal.trim().toLowerCase();
    if (!emailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      setErrorMessage("Invalid email format");
      return;
    }
    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalized }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update email");
      }
      setSuccessMessage("Email address updated successfully");
      window.dispatchEvent(new Event("auth:changed"));
      const updatedUser = await fetchCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setEditEmail(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update email");
    }
  };

  const handleSaveMobile = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    const phoneNormalized = phoneVal.replace(/\D/g, "").slice(0, 10);
    if (!/^[0-9]{10}$/.test(phoneNormalized)) {
      setErrorMessage("Phone must be exactly 10 digits");
      return;
    }
    try {
      const response = await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNormalized }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Failed to update mobile number");
      }
      setSuccessMessage("Mobile number updated successfully");
      window.dispatchEvent(new Event("auth:changed"));
      const updatedUser = await fetchCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setEditMobile(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update mobile number");
    }
  };

  // Address Handlers
  const handleEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressDraft({
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      landmark: addr.landmark || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      tag: addr.tag || "Home",
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async () => {
    setAddressError("");
    if (!user) return;
    if (
      !addressDraft.fullName.trim() ||
      !addressDraft.phone.trim() ||
      !addressDraft.line1.trim() ||
      !addressDraft.city.trim() ||
      !addressDraft.state.trim() ||
      !addressDraft.postalCode.trim()
    ) {
      setAddressError("Please fill all required fields");
      return;
    }
    setSavingAddress(true);
    try {
      const saved = await saveAddress(user.id, addressDraft, { addressId: editingAddressId || undefined });
      if (saved) {
        const nextAddressState = await readAddresses(user.id);
        setAddresses(nextAddressState.addresses);
        setShowAddressForm(false);
        setEditingAddressId("");
        setAddressDraft(EMPTY_ADDRESS_DRAFT);
        setSuccessMessage("Address saved successfully");
      } else {
        setAddressError("Failed to save address. Please check input formats.");
      }
    } catch (err) {
      setAddressError("Error saving address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!user) return;
    const nextState = await deleteAddress(user.id, addrId);
    setAddresses(nextState.addresses);
    setSuccessMessage("Address deleted successfully");
  };

  // Mock UPI handlers
  const handleAddUpi = () => {
    if (!newUpi.trim()) return;
    if (!newUpi.includes("@")) {
      setErrorMessage("Invalid UPI ID format (must contain @)");
      return;
    }
    const nextUpi = {
      id: `upi-${Date.now()}`,
      provider: newUpi.split("@")[1].toUpperCase() + " UPI",
      vpa: newUpi.trim().toLowerCase()
    };
    setUpiList([...upiList, nextUpi]);
    setNewUpi("");
    setSuccessMessage("UPI ID added successfully");
  };

  const handleDeleteUpi = (id: string) => {
    setUpiList(upiList.filter(item => item.id !== id));
    setSuccessMessage("UPI ID removed");
  };

  // Mock Card handlers
  const handleAddCard = () => {
    const nextCard = {
      id: `card-${Date.now()}`,
      type: "Visa",
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      name: (user?.name || "RUPENDRA GANGWAR").toUpperCase(),
      expiry: "09/31"
    };
    setCardList([...cardList, nextCard]);
    setSuccessMessage("New card saved successfully");
  };

  const handleDeleteCard = (id: string) => {
    setCardList(cardList.filter(item => item.id !== id));
    setSuccessMessage("Saved card removed");
  };

  // Mock Gift Card Handlers
  const handleApplyGiftCard = () => {
    setGcApplyMessage(null);
    if (!gcNumber || !gcPin) {
      setGcApplyMessage("Please enter card number and PIN");
      return;
    }
    setGiftCardBalance(prev => prev + 1000);
    setGcApplyMessage("₹1,000 added to your Gift Card balance!");
    setGcNumber("");
    setGcPin("");
  };

  const handleBuyGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyGcEmail || !buyGcName) {
      setErrorMessage("Please fill all required fields");
      return;
    }
    setBuyGcSuccess(`Gift card order placed! Code sent to ${buyGcEmail}`);
    setBuyGcEmail("");
    setBuyGcName("");
    setBuyGcGifter("");
  };

  // Mock PAN card handlers
  const handleSavePan = () => {
    if (!panNumberInput.trim() || !panNameInput.trim()) {
      setErrorMessage("Please fill all required fields");
      return;
    }
    setPanDetails({
      number: panNumberInput.toUpperCase(),
      name: panNameInput.toUpperCase(),
      status: "Submitted (Verification Pending)"
    });
    setEditPan(false);
    setSuccessMessage("PAN Card details updated successfully");
  };

  // Clipboard copy coupon helper
  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(null), 2000);
    });
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-4 pt-2 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="animate-pulse bg-white rounded-xl h-48" />
          <div className="animate-pulse bg-white rounded-xl h-[450px]" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl text-center">
          <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-900 mb-4">
            <UserRound size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Login to view profile</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Please log in to manage your personal details, saved delivery addresses, and account security.
          </p>
          <Link
            href={buildAuthHref(pathname || "/profile")}
            className="inline-flex w-full items-center justify-center bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-blue-700 transition"
          >
            Login to Account
          </Link>
        </div>
      </main>
    );
  }

  // Sidebar Menu Items
  const menuGroups: MenuGroup[] = [
    {
      group: "MY ORDERS",
      items: [
        { id: "orders", label: "My Orders", icon: Package, href: "/orders" }
      ]
    },
    {
      group: "ACCOUNT SETTINGS",
      icon: UserRound,
      items: [
        { id: "profile-info", label: "Profile Information" },
        { id: "addresses", label: "Manage Addresses" },
        { id: "pan-card", label: "PAN Card Information" },
        ...(user.role === "vendor" || hasBusinessDetails ? [{ id: "business-profile", label: "Business Profile" }] : [])
      ]
    },
    {
      group: "PAYMENTS",
      icon: Wallet,
      items: [
        { id: "gift-cards", label: "Gift Cards", extra: `₹${giftCardBalance}` },
        { id: "saved-upi", label: "Saved UPI" },
        { id: "saved-cards", label: "Saved Cards" }
      ]
    },
    {
      group: "MY STUFF",
      icon: FolderHeart,
      items: [
        { id: "coupons", label: "My Coupons" },
        { id: "reviews", label: "My Reviews & Ratings" },
        { id: "notifications", label: "All Notifications" },
        { id: "wishlist", label: "My Wishlist" }
      ]
    }
  ];

  // Helper to change tabs and toggle mobile/desktop layout state
  const handleTabClick = (tabId: string, href?: string) => {
    if (href) {
      router.push(href);
      return;
    }
    setActiveTab(tabId);
    setShowMobileMenu(false);
  };

  // Avatar Initials
  const userInitials = (user.name || "U")
    .split(/\s+/)
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-white pt-2 pb-6 px-2 sm:px-4 md:px-8">
      {/* Mobile-only Header with Back Button */}
      <header className="lg:hidden bg-white border-b border-slate-200/60 py-3 flex items-center gap-2 sticky top-0 z-40 mb-4 -mx-2 px-4">
        <button
          type="button"
          onClick={() => {
            if (showMobileMenu) {
              router.back();
            } else {
              setShowMobileMenu(true);
            }
          }}
          className="text-[#0e3961] hover:opacity-85 p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Back"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-base font-bold text-slate-800 truncate">
          {showMobileMenu ? "My Account" : menuGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || "Account details"}
        </h1>
      </header>

      {/* Notifications Alert Container */}
      <div className="max-w-7xl mx-auto mb-4">
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2 animate-enter">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2 animate-enter">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className={`space-y-4 lg:block ${showMobileMenu ? "block" : "hidden"}`}>
          {/* Unified Greeting & Navigation Container */}
          <div className="bg-white rounded-xl overflow-hidden border border-slate-200/50 divide-y divide-slate-100">
            {/* User greetings */}
            <div className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-sm border border-slate-200 shrink-0">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-tr from-[#124676] to-[#2182dd] text-white flex items-center justify-center font-bold text-sm">
                    {userInitials}
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Hello,</div>
                <h2 className="text-base font-bold text-slate-800 truncate" title={user.name}>{user.name || "Valued User"}</h2>
              </div>
            </div>

            {/* Navigation menu */}
            <nav className="divide-y divide-slate-100">
              {menuGroups.map((group, groupIdx) => {
                const GroupIcon = group.icon;
                
                // If group is My Orders, it is styled differently as a single link row
                if (group.group === "MY ORDERS") {
                  const orderItem = group.items[0];
                  return (
                    <Link
                      key={groupIdx}
                      href={orderItem.href || ""}
                      className="flex items-center justify-between p-4 text-slate-700 hover:bg-slate-50 transition-colors font-bold text-sm uppercase tracking-wide group-hover:text-blue-600"
                    >
                      <span className="flex items-center gap-3">
                        <Package size={18} className="text-[#0e3961]" />
                        <span>My Orders</span>
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </Link>
                  );
                }

                return (
                  <div key={groupIdx} className="py-3">
                    {/* Header Row */}
                    <div className="px-4 py-2 flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {GroupIcon && <GroupIcon size={16} className="text-[#0e3961]/80" />}
                      <span>{group.group}</span>
                    </div>

                    {/* Sub-items */}
                    <div className="mt-1 space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleTabClick(item.id, item.href)}
                            className={`w-full text-left px-11 py-2 text-sm transition-all flex items-center justify-between ${
                              isActive
                                ? "bg-blue-50/50 text-[#0e3961] font-bold border-r-4 border-[#0e3961]"
                                : "text-slate-600 hover:bg-slate-50/60 hover:text-slate-800"
                            }`}
                          >
                            <span>{item.label}</span>
                            {item.extra && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                isActive ? "bg-[#0e3961] text-white" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {item.extra}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Logout button */}
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-semibold transition-colors"
                >
                  <LogOut size={18} className="text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* ================= RIGHT DETAIL PANEL ================= */}
        <section className={`lg:block ${!showMobileMenu ? "block" : "hidden"}`}>

          <div className="bg-white rounded-xl p-4 sm:p-6 min-h-[450px]">
            
            {/* 1. PROFILE INFORMATION TAB */}
            {activeTab === "profile-info" && (
              <div className="space-y-6">
                
                {/* Personal Information */}
                <div>
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-800">Personal Information</h3>
                    <button
                      type="button"
                      onClick={() => setEditPersonal(!editPersonal)}
                      className="text-xs text-[#0e3961] font-bold hover:underline"
                    >
                      {editPersonal ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  {/* Profile Picture Upload Options */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 pt-2">
                    <div className="relative h-20 w-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-tr from-[#124676] to-[#2182dd] text-white flex items-center justify-center font-bold text-lg">
                          {userInitials}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <label className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition active:scale-95">
                        <span>Upload Picture</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      {profileImage && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="block text-xs text-red-500 font-semibold hover:underline mt-1.5 mx-auto sm:mx-0"
                        >
                          Remove Picture
                        </button>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">Allowed formats: JPG, PNG. Max size 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">First Name</label>
                      <input
                        type="text"
                        disabled={!editPersonal}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all bg-white disabled:bg-white ${
                          editPersonal 
                            ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                            : "border-slate-100 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Last Name</label>
                      <input
                        type="text"
                        disabled={!editPersonal}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all bg-white disabled:bg-white ${
                          editPersonal 
                            ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                            : "border-slate-100 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Your Gender</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          disabled={!editPersonal}
                          checked={gender === "Male"}
                          onChange={() => setGender("Male")}
                          className="text-[#0e3961] focus:ring-[#0e3961]"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          disabled={!editPersonal}
                          checked={gender === "Female"}
                          onChange={() => setGender("Female")}
                          className="text-[#0e3961] focus:ring-[#0e3961]"
                        />
                        <span>Female</span>
                      </label>
                    </div>
                  </div>

                  {editPersonal && (
                    <button
                      type="button"
                      onClick={handleSavePersonal}
                      className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold tracking-wide shadow-sm"
                    >
                      Save Personal Info
                    </button>
                  )}
                </div>

                {/* Email Address */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-800">Email Address</h3>
                    <button
                      type="button"
                      onClick={() => setEditEmail(!editEmail)}
                      className="text-xs text-[#0e3961] font-bold hover:underline"
                    >
                      {editEmail ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="email"
                        disabled={!editEmail}
                        value={emailVal}
                        onChange={(e) => setEmailVal(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all bg-white disabled:bg-white ${
                          editEmail 
                            ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                            : "border-slate-100 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                  </div>

                  {editEmail && (
                    <button
                      type="button"
                      onClick={handleSaveEmail}
                      className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold tracking-wide shadow-sm"
                    >
                      Save Email
                    </button>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-800">Mobile Number</h3>
                    <button
                      type="button"
                      onClick={() => setEditMobile(!editMobile)}
                      className="text-xs text-[#0e3961] font-bold hover:underline"
                    >
                      {editMobile ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="tel"
                        maxLength={10}
                        disabled={!editMobile}
                        value={phoneVal}
                        onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, ""))}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all bg-white disabled:bg-white ${
                          editMobile 
                            ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                            : "border-slate-100 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                  </div>

                  {editMobile && (
                    <button
                      type="button"
                      onClick={handleSaveMobile}
                      className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold tracking-wide shadow-sm"
                    >
                      Save Mobile
                    </button>
                  )}
                </div>

                {/* FAQ Content Block */}
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider text-xs">FAQs</h3>
                  <div className="space-y-4 text-sm text-slate-600">
                    <div>
                      <h4 className="font-bold text-slate-800">What happens when I update my email address (or mobile number)?</h4>
                      <p className="mt-1">Your login email id (or mobile number) changes, likewise. You'll receive all account-related communication on your updated email address (or mobile number).</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">When will my account be updated with the new email address (or mobile number)?</h4>
                      <p className="mt-1">It happens instantly as soon as you save the changes on your profile screen.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">What happens to my existing account when I update my email address (or mobile number)?</h4>
                      <p className="mt-1">Updating details doesn't invalidate your account. Your account remains fully functional. You'll continue seeing your booking history, saved information, and personal details.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Does my Seller/Vendor account get affected when I update my email address?</h4>
                      <p className="mt-1">Winkget has a single sign-on policy. Any profile modifications will automatically reflect in your associated Seller/Vendor accounts.</p>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Change Password</h3>
                  {passwordMessage && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 mb-3">
                      {passwordMessage}
                    </div>
                  )}
                  {passwordError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 mb-3">
                      {passwordError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Current Password</label>
                      <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0e3961]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">New Password</label>
                      <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0e3961]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordUpdate}
                    className="mt-4 rounded-xl border border-slate-300 bg-white text-slate-800 px-5 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Update Password
                  </button>
                </div>

                {/* Account Actions */}
                <div className="pt-6 border-t border-slate-100 text-xs font-semibold space-y-2">
                  <button type="button" className="text-blue-600 hover:underline cursor-pointer block">Deactivate Account</button>
                  <button type="button" className="text-red-600 hover:underline cursor-pointer block">Delete Account</button>
                </div>
              </div>
            )}

            {/* 2. MANAGE ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-4 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Manage Addresses</h3>
                </div>

                {/* Add new address trigger card */}
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddressId("");
                      setAddressDraft(EMPTY_ADDRESS_DRAFT);
                      setShowAddressForm(true);
                    }}
                    className="w-full border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 text-[#0e3961] rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer font-bold transition-all text-sm shadow-sm"
                  >
                    <Plus size={16} />
                    <span>ADD A NEW ADDRESS</span>
                  </button>
                )}

                {/* Add / Edit Address Form */}
                {showAddressForm && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                      {editingAddressId ? "Edit Address" : "Add New Address"}
                    </h4>
                    {addressError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                        {addressError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={addressDraft.fullName}
                        onChange={(e) => setAddressDraft({ ...addressDraft, fullName: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit Phone Number"
                        value={addressDraft.phone}
                        onChange={(e) => setAddressDraft({ ...addressDraft, phone: e.target.value.replace(/\D/g, "") })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        placeholder="Pincode / Postal Code"
                        value={addressDraft.postalCode}
                        onChange={(e) => setAddressDraft({ ...addressDraft, postalCode: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        placeholder="Locality / Line 2"
                        value={addressDraft.line2}
                        onChange={(e) => setAddressDraft({ ...addressDraft, line2: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        placeholder="Address (Area and Street)"
                        value={addressDraft.line1}
                        onChange={(e) => setAddressDraft({ ...addressDraft, line1: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full sm:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="City / District"
                        value={addressDraft.city}
                        onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={addressDraft.state}
                        onChange={(e) => setAddressDraft({ ...addressDraft, state: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        placeholder="Landmark (Optional)"
                        value={addressDraft.landmark}
                        onChange={(e) => setAddressDraft({ ...addressDraft, landmark: e.target.value })}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full sm:col-span-2"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Address Type</span>
                      <div className="flex gap-4">
                        {["Home", "Work", "Other"].map((tagOption) => (
                          <label key={tagOption} className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-700">
                            <input
                              type="radio"
                              name="addressTag"
                              value={tagOption}
                              checked={addressDraft.tag === tagOption}
                              onChange={() => setAddressDraft({ ...addressDraft, tag: tagOption as any })}
                              className="text-[#0e3961] focus:ring-[#0e3961]"
                            />
                            <span>{tagOption}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={savingAddress}
                        onClick={handleSaveAddress}
                        className="rounded-xl bg-[#0e3961] hover:bg-[#0b2c4b] text-white px-5 py-2 text-sm font-semibold shadow-sm"
                      >
                        {savingAddress ? "Saving..." : "Save Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId("");
                          setAddressDraft(EMPTY_ADDRESS_DRAFT);
                        }}
                        className="rounded-xl border border-slate-300 bg-white text-slate-700 px-5 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Addresses List */}
                <div className="space-y-3 mt-4">
                  {addresses.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">
                      No saved addresses found. Add an address above.
                    </div>
                  ) : (
                    addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="rounded-xl bg-white p-4 relative group flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 text-[10px] rounded uppercase tracking-wide">
                              {addr.tag || "Home"}
                            </span>
                            {addr.id === selectedAddressId && (
                              <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 text-[10px] rounded uppercase tracking-wide">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-sm text-slate-800">
                            {addr.fullName} <span className="text-slate-400 ml-2 font-normal">{addr.phone}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                            {addr.landmark ? ` (Landmark: ${addr.landmark})` : ""}
                            , {addr.city}, {addr.state} - <span className="font-semibold text-slate-800">{addr.postalCode}</span>
                          </p>
                        </div>

                        {/* Address Actions */}
                        <div className="flex items-center gap-3 self-end sm:self-start shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditAddress(addr)}
                            className="text-xs text-[#0e3961] font-bold hover:underline flex items-center gap-1"
                          >
                            <Edit3 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. PAN CARD INFORMATION */}
            {activeTab === "pan-card" && (
              <div className="space-y-6 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">PAN Card Information</h3>
                </div>

                <div className="rounded-xl bg-[#edf5fc] p-4 text-xs text-[#124676] flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle size={16} className="text-[#0e3961] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Why verify your PAN Card?</span> Verification protects account security, completes RBI-regulated wallet compliances, and enables seamless payment transaction checks.
                  </div>
                </div>

                <div className="max-w-md space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">PAN Card Number</label>
                    <input
                      type="text"
                      disabled={!editPan}
                      maxLength={10}
                      value={panNumberInput}
                      onChange={(e) => setPanNumberInput(e.target.value.toUpperCase())}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all uppercase bg-white disabled:bg-white ${
                        editPan 
                          ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                          : "border-slate-100 text-slate-500 cursor-not-allowed"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Full Name on PAN Card</label>
                    <input
                      type="text"
                      disabled={!editPan}
                      value={panNameInput}
                      onChange={(e) => setPanNameInput(e.target.value)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all uppercase bg-white disabled:bg-white ${
                        editPan 
                          ? "border-slate-200 text-slate-900 focus:border-[#0e3961]" 
                          : "border-slate-100 text-slate-500 cursor-not-allowed"
                      }`}
                    />
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                    <span className="font-bold block text-slate-700 mb-0.5">Verification Status:</span>
                    <span className={`font-semibold ${panDetails.status.includes("Verified") ? "text-emerald-700" : "text-amber-700"}`}>
                      {panDetails.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {editPan ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSavePan}
                          className="rounded-xl bg-[#0e3961] hover:bg-[#0b2c4b] text-white px-5 py-2 text-sm font-semibold shadow-sm"
                        >
                          Save PAN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditPan(false);
                            setPanNumberInput(panDetails.number);
                            setPanNameInput(panDetails.name);
                          }}
                          className="rounded-xl border border-slate-300 bg-white text-slate-700 px-5 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditPan(true)}
                        className="rounded-xl bg-[#0e3961] hover:bg-[#0b2c4b] text-white px-5 py-2 text-sm font-semibold shadow-sm"
                      >
                        Update PAN Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. BUSINESS PROFILE (CONDITIONAL VENDOR TAB) */}
            {activeTab === "business-profile" && (
              <div className="space-y-6 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Business Profile</h3>
                </div>

                {hasBusinessDetails ? (
                  <div className="space-y-5">
                    {/* Business identity */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Building2 size={14} className="text-[#0e3961]" />
                        <span>Business Information</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-800">
                        <div>
                          <span className="text-slate-400 block text-xs">Business Name</span>
                          <span className="font-semibold text-slate-800 text-base">{user.businessName || "Not provided"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Vendor Status</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mt-1 capitalize">
                            <BadgeCheck size={12} />
                            {user.vendorStatus || "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Category</span>
                          <span className="font-medium text-slate-800">{user.businessCategory?.name || "Not selected"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Subcategory</span>
                          <span className="font-medium text-slate-800">{user.businessSubcategory?.name || "Not selected"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Globe size={14} className="text-[#0e3961]" />
                        <span>Business Contact & Web</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-800">
                        <div>
                          <span className="text-slate-400 block text-xs">Business Phone</span>
                          <span className="font-medium">{user.businessPhone || "Not provided"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Business Email</span>
                          <span className="font-medium">{user.businessEmail || "Not provided"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Alt Contact Phone</span>
                          <span className="font-medium">{user.businessAlternatePhone || "Not provided"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs">Website URL</span>
                          {user.website ? (
                            <a href={user.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                              {user.website}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No website added</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location & Tags */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#0e3961]" />
                        <span>Location & Services Info</span>
                      </div>
                      <div className="space-y-3 text-sm text-slate-800">
                        <div>
                          <span className="text-slate-400 block text-xs mb-0.5">Physical Store Address</span>
                          <span className="font-medium leading-relaxed">{businessLocation || "No location details provided"}</span>
                        </div>
                        {businessTags.length > 0 && (
                          <div>
                            <span className="text-slate-400 block text-xs mb-1.5">Service Keywords / Tags</span>
                            <div className="flex flex-wrap gap-1.5">
                              {businessTags.map((tag) => (
                                <span key={tag} className="rounded-full bg-white px-3 py-0.5 text-xs text-slate-700 border border-slate-200 font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.businessDescription && (
                          <div>
                            <span className="text-slate-400 block text-xs mb-0.5">Description / Bio</span>
                            <p className="text-slate-700 leading-relaxed">{user.businessDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No Business Profile registry found for this account.
                  </div>
                )}
              </div>
            )}

            {/* 5. GIFT CARDS */}
            {activeTab === "gift-cards" && (
              <div className="space-y-6 animate-enter">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Gift Cards</h3>
                  <span className="text-sm font-bold text-[#0e3961] bg-blue-50 px-3 py-1 rounded-lg">
                    Balance: ₹{giftCardBalance}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add Gift Card Card */}
                  <div className="bg-slate-50/50 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Add a Gift Card</h4>
                    {gcApplyMessage && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                        {gcApplyMessage}
                      </div>
                    )}
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Gift Card Number"
                        value={gcNumber}
                        onChange={(e) => setGcNumber(e.target.value.replace(/\D/g, ""))}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="password"
                        placeholder="Gift Card PIN"
                        value={gcPin}
                        maxLength={6}
                        onChange={(e) => setGcPin(e.target.value.replace(/\D/g, ""))}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <button
                        type="button"
                        onClick={handleApplyGiftCard}
                        className="w-full rounded-xl bg-[#0e3961] hover:bg-[#0b2c4b] text-white py-2 text-sm font-semibold shadow-sm"
                      >
                        Apply Card to Balance
                      </button>
                    </div>
                  </div>

                  {/* Buy Gift Card Form */}
                  <form onSubmit={handleBuyGiftCard} className="bg-white rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Buy a Gift Card</h4>
                    {buyGcSuccess && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                        {buyGcSuccess}
                      </div>
                    )}
                    <div className="space-y-3">
                      <input
                        type="email"
                        required
                        placeholder="Receiver's Email ID"
                        value={buyGcEmail}
                        onChange={(e) => setBuyGcEmail(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Receiver's Name"
                        value={buyGcName}
                        onChange={(e) => setBuyGcName(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={buyGcValue}
                          onChange={(e) => setBuyGcValue(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                        >
                          <option value="500">Value: ₹500</option>
                          <option value="1000">Value: ₹1,000</option>
                          <option value="2500">Value: ₹2,500</option>
                          <option value="5000">Value: ₹5,000</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder="No. of Cards"
                          value={buyGcCount}
                          onChange={(e) => setBuyGcCount(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Gifter's Name (Optional)"
                        value={buyGcGifter}
                        onChange={(e) => setBuyGcGifter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-3 py-2 text-sm outline-none focus:border-[#0e3961] w-full"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-semibold shadow-sm"
                      >
                        Purchase Gift Card
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 6. SAVED UPI TAB */}
            {activeTab === "saved-upi" && (
              <div className="space-y-6 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Manage Saved UPI</h3>
                </div>

                {/* Add new UPI box */}
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Enter UPI VPA (e.g. mobile@ybl)"
                    value={newUpi}
                    onChange={(e) => setNewUpi(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white disabled:bg-white px-4 py-2 text-sm outline-none focus:border-[#0e3961] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddUpi}
                    className="rounded-xl bg-[#0e3961] hover:bg-[#0b2c4b] text-white px-5 py-2 text-sm font-semibold shadow-sm"
                  >
                    Add
                  </button>
                </div>

                {/* UPI lists */}
                <div className="space-y-3 mt-4 max-w-xl">
                  {upiList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No saved UPI ID entries found.
                    </div>
                  ) : (
                    upiList.map((upi) => (
                      <div
                        key={upi.id}
                        className="rounded-xl bg-white p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase font-sans border border-indigo-100">
                            {upi.provider[0]}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-700 block">{upi.provider}</span>
                            <span className="text-xs text-slate-500">{upi.vpa}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUpi(upi.id)}
                          className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* FAQ details */}
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-400 mb-3">UPI FAQs</h4>
                  <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-700">Why is my UPI ID saved?</h5>
                      <p className="mt-0.5">Saving your UPI ID speeds up the checkout flow. You will not need to type the full address every time, reducing payments entry errors.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-700">Is it safe to save my UPI VPA details?</h5>
                      <p className="mt-0.5">Yes. Save operations register only the public virtual payment addresses (e.g. mobile@upi). Security PINs or credentials are never stored by our platform.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. SAVED CARDS TAB */}
            {activeTab === "saved-cards" && (
              <div className="space-y-6 animate-enter">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Saved Credit / Debit Cards</h3>
                  <button
                    type="button"
                    onClick={handleAddCard}
                    className="text-xs text-[#0e3961] font-bold hover:underline flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    <Plus size={14} />
                    <span>Save New Card</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cardList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm md:col-span-2">
                      No saved card entries found. Use the button to save a card.
                    </div>
                  ) : (
                    cardList.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-xl bg-gradient-to-tr from-slate-800 to-slate-950 p-5 text-white flex flex-col justify-between h-44 border border-slate-800 relative group overflow-hidden"
                      >
                        {/* Chip graphic ornament */}
                        <div className="absolute top-4 right-4 text-slate-600/50 uppercase tracking-widest text-[9px] font-sans font-bold select-none">
                          {card.type} CARD
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-7 rounded bg-amber-400/80 border border-amber-300/40 relative" />
                          <CreditCard size={28} className="text-slate-400" />
                        </div>

                        <div className="space-y-2.5">
                          <div className="text-base font-mono tracking-widest">
                            •••• •••• •••• {card.last4}
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-400">
                            <div>
                              <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-wide">Card Holder</span>
                              <span className="text-white truncate max-w-[150px] inline-block">{card.name}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-wide font-sans">Expiry</span>
                              <span className="text-white font-mono">{card.expiry}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card hover action */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="absolute bottom-4 right-4 bg-red-600/90 text-white rounded-full p-2 hover:bg-red-700 transition-colors shadow-md"
                          title="Delete Card"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. MY COUPONS */}
            {activeTab === "coupons" && (
              <div className="space-y-4 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Available Coupons</h3>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl overflow-hidden bg-white">
                  {MOCK_COUPONS.map((coupon, idx) => (
                    <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-emerald-600 font-bold text-base sm:text-lg">
                          {coupon.title}
                        </div>
                        <p className="text-slate-500 text-sm">{coupon.desc}</p>
                      </div>
                      <div className="flex flex-col sm:items-end justify-between h-full shrink-0">
                        <span className="text-slate-400 text-xs sm:text-sm font-medium whitespace-nowrap">
                          Valid till {coupon.expiry}
                        </span>
                        <button
                          type="button"
                          className="text-[#0e3961] font-bold text-xs uppercase hover:underline mt-2 sm:mt-4 self-start sm:self-auto"
                        >
                          View T&C
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. REVIEWS & RATINGS */}
            {activeTab === "reviews" && (
              <div className="space-y-4 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">My Reviews & Ratings</h3>
                </div>

                <div className="text-center py-12 px-4 max-w-lg mx-auto">
                  {/* Laptop Warning SVG Illustration */}
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6">
                    {/* Triangles behind */}
                    <path d="M40 90 L55 65 L70 90 Z" fill="#FFC107" opacity="0.8" />
                    <path d="M25 90 L32 78 L40 90 Z" fill="#FF9800" opacity="0.6" />
                    <path d="M130 90 L155 55 L180 90 Z" fill="#2196F3" opacity="0.8" />
                    {/* Laptop Screen */}
                    <rect x="55" y="40" width="90" height="52" rx="4" fill="#374151" stroke="#4B5563" strokeWidth="2" />
                    <rect x="59" y="44" width="82" height="44" rx="2" fill="#F9FAFB" />
                    {/* Base */}
                    <path d="M40 92 L160 92 L170 102 C170 104 168 106 165 106 L35 106 C32 106 30 104 30 102 Z" fill="#9CA3AF" stroke="#D1D5DB" strokeWidth="1" />
                    <line x1="88" y1="102" x2="112" y2="102" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
                    {/* Warning circle */}
                    <circle cx="100" cy="66" r="12" fill="#EF4444" />
                    <rect x="98.5" y="60" width="3" height="7" rx="1.5" fill="#FFFFFF" />
                    <circle cx="100" cy="71.5" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <h4 className="font-bold text-slate-800 text-lg">No Reviews & Ratings</h4>
                  <p className="text-sm text-slate-500 mt-2">You have not rated or reviewed any product yet!</p>
                </div>
              </div>
            )}

            {/* 10. ALL NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-4 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">All Notifications</h3>
                </div>

                <div className="text-center py-12 px-4 max-w-lg mx-auto">
                  {/* Mail Envelope SVG Illustration */}
                  <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6">
                    <line x1="20" y1="125" x2="200" y2="125" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
                    <path d="M120 20 C110 20 102 28 102 38 C102 48 112 58 120 62 C128 58 138 48 138 38 C138 28 130 20 120 20 Z" fill="#EF4444" />
                    <path d="M120 62 L120 100" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
                    <path d="M117 62 L123 62 L120 65 Z" fill="#EF4444" />
                    <path d="M110 125 L125 90 L140 125 Z" fill="#3B82F6" opacity="0.8" />
                    <path d="M140 125 L160 100 L180 125 Z" fill="#EF4444" opacity="0.8" />
                    <rect x="50" y="70" width="100" height="60" rx="6" fill="#F1F5F9" />
                    <rect x="55" y="75" width="90" height="50" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                    <rect x="65" y="58" width="70" height="45" rx="3" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
                    <rect x="75" y="68" width="50" height="20" rx="2" fill="#3B82F6" />
                    <path d="M94 77 L98 81 L106 73" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M55 125 L100 95 L145 125" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                    <path d="M55 75 L100 105 L145 75" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="115" cy="85" r="3" fill="#FFC107" />
                    <circle cx="165" cy="50" r="4.5" fill="#FFC107" />
                    <circle cx="165" cy="50" r="1.5" fill="#FF9800" />
                    <path d="M45 50 L47 45 L52 47 L48 50 L50 55 L45 52 L40 55 L42 50 L38 47 L43 45 Z" fill="#FFC107" opacity="0.7" />
                  </svg>
                  <h4 className="font-bold text-slate-800 text-lg">All caught up!</h4>
                  <p className="text-sm text-slate-500 mt-2">There are no new notifications for you.</p>
                </div>
              </div>
            )}

            {/* 11. MY WISHLIST */}
            {activeTab === "wishlist" && (
              <div className="space-y-4 animate-enter">
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">My Wishlist ({wishlistItems.length})</h3>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl overflow-hidden bg-white">
                  {wishlistItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Your wishlist is empty
                    </div>
                  ) : (
                    wishlistItems.map((item) => (
                      <div key={item.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/20 transition-all animate-enter">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="max-h-full max-w-full object-contain rounded"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-semibold text-slate-800 text-sm sm:text-base leading-snug hover:text-blue-600 cursor-pointer">
                              {item.name}
                            </h4>
                            
                            {item.assured && (
                              <div className="inline-flex items-center gap-1 bg-blue-50 text-[#0e3961] text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-blue-100/50">
                                <span className="text-[#2182dd]">✓</span> Assured
                              </div>
                            )}

                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="font-bold text-slate-900 text-base sm:text-lg">
                                {item.priceText || `₹${item.price.toLocaleString("en-IN")}`}
                              </span>
                              {item.oldPrice > item.price && (
                                <>
                                  <span className="line-through text-slate-400 text-xs sm:text-sm">
                                    {item.oldPriceText || `₹${item.oldPrice.toLocaleString("en-IN")}`}
                                  </span>
                                  <span className="text-emerald-600 text-xs sm:text-sm font-bold">
                                    {item.discount}
                                  </span>
                                </>
                              )}
                            </div>

                            {item.available === false && (
                              <div className="text-red-500 text-xs font-bold mt-1">
                                Currently unavailable
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWishlistItem(item)}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0"
                          title="Remove from Wishlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </section>

      </div>
    </main>
  );
}
