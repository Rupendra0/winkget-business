"use client";

import { useMemo, useState } from "react";
import type { SidebarSection } from "@/data/adminNavigation";

type CommandPaletteProps = {
  open: boolean;
  sections: SidebarSection[];
  onClose: () => void;
  onSelect: (route: string, itemId: string) => void;
};

export default function CommandPalette({ open, sections, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          sectionTitle: section.title,
        }))
      ),
    [sections]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      const haystack = `${item.label} ${item.sectionTitle} ${item.route}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-(--border) bg-(--surface) p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commands, pages, sections"
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text-strong) outline-none focus:border-(--accent)"
          autoFocus
        />

        <div className="mt-2 max-h-[360px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-sm text-(--text-soft)">No result</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.route, item.id);
                  onClose();
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-(--surface-hover)"
              >
                <span className="text-sm text-(--text-strong)">{item.label}</span>
                <span className="text-[11px] text-(--text-soft)">{item.sectionTitle}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
