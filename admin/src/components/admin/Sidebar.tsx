"use client";

import { useMemo, useState } from "react";
import type { SidebarSection } from "@/data/adminNavigation";

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
                  onClick={() =>
                    setOpenSections((prev) => ({
                      ...prev,
                      [section.id]: !(resolvedOpenSections[section.id] ?? true),
                    }))
                  }
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-medium transition ${
                    sectionActive ? "text-(--text-strong)" : "text-(--text-soft)"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                    <span className="truncate">{collapsed ? section.title.charAt(0) : section.title}</span>
                    {sectionBadgeCount > 0 && !collapsed ? (
                      <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {sectionBadgeCount}
                      </span>
                    ) : null}
                  </span>
                  {!collapsed ? <span>{sectionOpen ? "-" : "+"}</span> : null}
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
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
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
