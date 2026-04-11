"use client";

import { useEffect } from "react";

const BLOCKED_SHORTCUT_KEYS = new Set(["s", "u"]);

const isProtectedMediaTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("img, [data-protect-media='true']"));
};

export default function ImageProtection() {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (isProtectedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    const handleDragStart = (event: DragEvent) => {
      if (isProtectedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = String(event.key || "").toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;
      if (hasModifier && BLOCKED_SHORTCUT_KEYS.has(key)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}