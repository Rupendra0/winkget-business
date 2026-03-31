"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type DropdownAction = {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type DropdownMenuProps = {
  trigger: ReactNode;
  actions: DropdownAction[];
  align?: "left" | "right";
};

export default function DropdownMenu({ trigger, actions, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button type="button" onClick={() => setOpen((prev) => !prev)}>
        {trigger}
      </button>

      {open ? (
        <div
          className={`absolute top-8 z-40 min-w-40 rounded-xl border border-(--border) bg-(--surface) p-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-(--surface-hover) ${
                action.destructive ? "text-rose-600" : "text-(--text-soft)"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
