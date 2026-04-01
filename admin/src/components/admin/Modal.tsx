"use client";

import { type ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
};

export default function Modal({ open, title, onClose, children, footer, panelClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-[2px] sm:p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-auto rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-2xl ring-1 ring-black/10 sm:max-h-[calc(100dvh-2rem)] ${
          panelClassName || ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-(--text-strong)">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-(--border) px-2 py-1 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">{children}</div>

        {footer ? <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </section>
    </div>
  );
}
