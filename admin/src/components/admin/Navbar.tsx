"use client";

import DropdownMenu from "@/components/admin/DropdownMenu";

type NavbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onToggleSidebar: () => void;
  onOpenPalette: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userLabel: string;
  onLogout: () => void;
};

export default function Navbar({
  searchQuery,
  onSearchQueryChange,
  onToggleSidebar,
  onOpenPalette,
  darkMode,
  onToggleDarkMode,
  userLabel,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-(--border) bg-(--surface)/95 px-3 py-2 backdrop-blur sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-1 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
        >
          Menu
        </button>

        <div className="relative min-w-[220px] flex-1">
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Global search"
            className="w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text-strong) outline-none focus:border-(--accent)"
          />
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="rounded-lg border border-(--border) bg-(--surface-muted) px-2.5 py-2 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
        >
          Ctrl + K
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="rounded-lg border border-(--border) bg-(--surface-muted) px-2.5 py-2 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
        >
          {darkMode ? "Light" : "Dark"}
        </button>

        <DropdownMenu
          trigger={
            <span className="inline-flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-muted) px-2.5 py-2 text-xs text-(--text-soft)">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--surface-hover) text-[10px] font-semibold text-(--text-strong)">
                {userLabel.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{userLabel}</span>
            </span>
          }
          actions={[
            {
              id: "logout",
              label: "Logout",
              onClick: onLogout,
            },
          ]}
        />
      </div>
    </header>
  );
}
