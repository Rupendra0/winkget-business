export type SidebarItem = {
  id: string;
  label: string;
  route: string;
};

export type SidebarSection = {
  id: string;
  title: string;
  route: string;
  items: SidebarItem[];
};

const makeItem = (id: string, label: string, route: string): SidebarItem => ({ id, label, route });

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "users-partners",
    title: "Users & Partners",
    route: "/users",
    items: [
      makeItem("manage-users", "Manage Users", "/users"),
      makeItem("manage-partners", "Manage Partners", "/users"),
      makeItem("manage-admins", "Manage Admins", "/users"),
      makeItem("verification-pending", "Verification Pending", "/users"),
    ],
  },
  {
    id: "orders-management",
    title: "Orders Management",
    route: "/orders",
    items: [
      makeItem("manage-orders", "Manage Orders", "/orders"),
      makeItem("pending-orders", "Pending Orders", "/orders"),
      makeItem("disputed-orders", "Disputed Orders", "/orders"),
    ],
  },
  {
    id: "categories-subcategories",
    title: "Categories & Subcategories",
    route: "/categories",
    items: [
      makeItem("category-explorer", "Category Explorer", "/categories"),
      makeItem("create-category", "Create Category", "/categories"),
      makeItem("create-subcategory", "Create Subcategory", "/categories"),
      makeItem("create-secondary-subcategory", "Create Secondary Subcategory", "/categories"),
      makeItem("manage-category", "Manage Category", "/categories"),
      makeItem("manage-subcategory", "Manage Subcategory", "/categories"),
      makeItem("manage-secondary-subcategory", "Manage Secondary Subcategory", "/categories"),
    ],
  },
  {
    id: "layouts-templates",
    title: "Layouts & Templates",
    route: "/layouts",
    items: [
      makeItem("b2b-layouts", "B2B Layouts", "/layouts"),
      makeItem("business-layouts", "Business Layouts", "/layouts"),
      makeItem("home-categories-selection", "Home Categories Selection", "/layouts"),
      makeItem("e-com-categories-selection", "E-com Categories Selection", "/layouts"),
      makeItem("partners-websites-layouts", "Partners Websites", "/layouts"),
      makeItem("templates-layouts", "Templates", "/layouts"),
    ],
  },
  {
    id: "promotions-alerts",
    title: "Promotions & Alerts",
    route: "/promotions",
    items: [
      makeItem("schedule-mails", "Schedule Mails", "/promotions"),
      makeItem("schedule-sms", "Schedule SMS", "/promotions"),
      makeItem("direct-mails", "Direct Mails", "/promotions"),
      makeItem("mail-inbox", "Mail Inbox", "/promotions"),
    ],
  },
  {
    id: "advertisement",
    title: "Advertisement",
    route: "/ads",
    items: [
      makeItem("home-placements", "Home Placements", "/ads"),
      makeItem("partners-promotions", "Partners Promotions", "/ads"),
      makeItem("product-promotions", "Product Promotions", "/ads"),
      makeItem("user-dashboard-placements", "User Dashboard Placements", "/ads"),
      makeItem("partners-dashboard-placements", "Partners Dashboard Placements", "/ads"),
    ],
  },
  {
    id: "data-statistics",
    title: "Data & Statistics",
    route: "/analytics",
    items: [
      makeItem("traffic-data", "Traffic Data", "/analytics"),
      makeItem("users-activities", "Users Activities", "/analytics"),
      makeItem("partners-websites-analytics", "Partners Websites", "/analytics"),
      makeItem("templates-analytics", "Templates", "/analytics"),
    ],
  },
  {
    id: "inquiries",
    title: "Inquiries",
    route: "/inquiries",
    items: [
      makeItem("general-inquiries", "General Inquiries", "/inquiries"),
      makeItem("partners-profile-inquiries", "Partner's Profile Inquiries", "/inquiries"),
    ],
  },
  {
    id: "products",
    title: "Products",
    route: "/products",
    items: [
      makeItem("manage-b2b-products", "Manage B2B Products", "/products"),
      makeItem("manage-business-products", "Manage Business Products", "/products"),
      makeItem("business-products", "Business Products", "/products"),
      makeItem("business-products-duplicate", "Business Products", "/products"),
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    route: "/reviews",
    items: [
      makeItem("product-reviews", "Product Reviews", "/reviews"),
      makeItem("partner-business-products", "Partner Business Products", "/reviews"),
    ],
  },
  {
    id: "employees",
    title: "Employees",
    route: "/employees",
    items: [
      makeItem("manage-employees", "Manage employees", "/employees"),
      makeItem("employee-attendance", "Employee attendance", "/employees"),
      makeItem("employee-reports", "Employee reports", "/employees"),
    ],
  },
  {
    id: "feedback-disputes",
    title: "Feedback & Disputes",
    route: "/feedback",
    items: [
      makeItem("manage-disputes", "Manage disputes", "/feedback"),
      makeItem("support-requests", "Support requests", "/feedback"),
      makeItem("feedbacks", "Feedbacks", "/feedback"),
    ],
  },
  {
    id: "extra",
    title: "Extra",
    route: "/extra",
    items: [makeItem("manage-cities", "Manage Cities", "/extra")],
  },
];

export const SIDEBAR_ITEM_INDEX = SIDEBAR_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionTitle: section.title,
  }))
);

export function findSidebarItem(itemId: string | null) {
  if (!itemId) return null;
  return SIDEBAR_ITEM_INDEX.find((item) => item.id === itemId) || null;
}

export function findSidebarSectionByPath(pathname: string) {
  return SIDEBAR_SECTIONS.find((section) => pathname.startsWith(section.route));
}
