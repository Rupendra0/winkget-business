"use client";

import { useMemo, useState } from "react";
import type { SidebarSection } from "@/data/adminNavigation";

function SectionIcon({ sectionId, className }: { sectionId: string; className?: string }) {
  const classes = `h-5 w-5 ${className || ""}`.trim();

  switch (sectionId) {
    case "users-partners":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
          <circle cx="10" cy="8" r="3" />
          <path d="M20 19v-1.5a3 3 0 0 0-2.2-2.9" />
          <path d="M15.5 5.6a3 3 0 0 1 0 4.8" />
        </svg>
      );
    case "orders-management":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M7 9h10M7 13h7" />
        </svg>
      );
    case "categories-subcategories":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "layouts-templates":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
    case "promotions-alerts":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M12 3l2.2 4.4L19 8.1l-3.5 3.4.8 4.9-4.3-2.2-4.3 2.2.8-4.9L5 8.1l4.8-.7L12 3z" />
          <circle cx="19" cy="19" r="2" />
        </svg>
      );
    case "advertisement":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M8 15l3-3 2 2 3-3" />
          <circle cx="8" cy="9" r="1.3" />
        </svg>
      );
    case "data-statistics":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M4 19h16" />
          <rect x="6" y="11" width="3" height="6" rx="0.8" />
          <rect x="11" y="8" width="3" height="9" rx="0.8" />
          <rect x="16" y="5" width="3" height="12" rx="0.8" />
        </svg>
      );
    case "inquiries":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13z" />
          <path d="M7 8l5 4 5-4" />
        </svg>
      );
    case "products":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M4 8l8-4 8 4-8 4-8-4z" />
          <path d="M4 8v8l8 4 8-4V8" />
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M12 3l2.6 5.2 5.7.8-4.1 4 .9 5.7-5.1-2.7-5.1 2.7.9-5.7-4.1-4 5.7-.8L12 3z" />
        </svg>
      );
    case "employees":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <circle cx="12" cy="8" r="3" />
          <path d="M5 19a7 7 0 0 1 14 0" />
          <path d="M18 7h3M19.5 5.5v3" />
        </svg>
      );
    case "feedback-disputes":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <path d="M20 14a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8z" />
          <path d="M9 9h6M9 12h4" />
        </svg>
      );
    case "extra":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <circle cx="12" cy="12" r="2" />
          <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={classes} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
  }
}

type SidebarProps = {
  sections: SidebarSection[];
  pathname: string;
  activeItemId: string | null;
  collapsed: boolean;
  onNavigate: (route: string, itemId: string) => void;
};

export default function Sidebar({ sections, pathname, activeItemId, collapsed, onNavigate }: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const sectionBadgeTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    sections.forEach((section) => {
      totals[section.id] = section.items.reduce((count, item) => count + Math.max(0, Number(item.badgeCount || 0)), 0);
    });

    return totals;
  }, [sections]);

  const resolvedOpenSections = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    sections.forEach((section) => {
      defaults[section.id] = pathname.startsWith(section.route);
    });

    return { ...defaults, ...openSections };
  }, [openSections, pathname, sections]);

  return (
    <aside
      className={`h-screen shrink-0 border-r border-(--border) bg-(--surface) transition-all ${
        collapsed ? "w-[84px]" : "w-[280px]"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-(--border) px-3 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--border) bg-(--surface-muted) text-xs font-semibold text-(--text-strong)">
            WG
          </span>
          {!collapsed ? <p className="text-sm font-semibold text-(--text-strong)">Winkget Admin</p> : null}
        </div>

        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
          {sections.map((section) => {
            const sectionOpen = resolvedOpenSections[section.id] ?? true;
            const sectionActive = pathname.startsWith(section.route);
            const sectionBadgeCount = sectionBadgeTotals[section.id] || 0;

            return (
              <div key={section.id} className="rounded-xl border border-(--border) bg-(--surface-muted)/50">
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      const firstItem = section.items[0];
                      if (firstItem) onNavigate(firstItem.route, firstItem.id);
                      return;
                    }

                    setOpenSections((prev) => ({
                      ...prev,
                      [section.id]: !(resolvedOpenSections[section.id] ?? true),
                    }));
                  }}
                  title={section.title}
                  className={`flex w-full items-center ${collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2 px-2.5 py-2.5"} text-left text-base font-semibold transition ${
                    sectionActive ? "text-(--text-strong)" : "text-(--text-soft)"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--surface-hover)">
                      <SectionIcon sectionId={section.id} />
                    </span>
                    {!collapsed ? <span className="truncate">{section.title}</span> : null}
                    {sectionBadgeCount > 0 && !collapsed ? (
                      <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {sectionBadgeCount}
                      </span>
                    ) : null}
                  </span>
                  {!collapsed ? <span className="text-lg leading-none">{sectionOpen ? "-" : "+"}</span> : null}
                </button>

                {sectionOpen && !collapsed ? (
                  <div className="space-y-1 px-2 pb-2">
                    {section.items.map((item) => {
                      const itemActive = pathname.startsWith(item.route) && activeItemId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate(item.route, item.id)}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition ${
                            itemActive
                              ? "bg-(--accent-soft) text-(--accent-strong)"
                              : "text-(--text-soft) hover:bg-(--surface-hover)"
                          }`}
                        >
                          <span className="inline-flex w-full items-center justify-between gap-1.5">
                            <span className="truncate">{item.label}</span>
                            {Number(item.badgeCount || 0) > 0 ? (
                              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {item.badgeCount}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
