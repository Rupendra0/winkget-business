"use client";

import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageLayout({ title, subtitle: _subtitle, actions, children }: PageLayoutProps) {
  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-strong)">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
