"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import { findSidebarItem } from "@/data/adminNavigation";

type SectionPlaceholderProps = {
  title: string;
  subtitle: string;
};

export default function SectionPlaceholder(props: SectionPlaceholderProps) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <SectionPlaceholderContent {...props} />
    </Suspense>
  );
}

function SectionPlaceholderContent({ title, subtitle }: SectionPlaceholderProps) {
  const searchParams = useSearchParams();
  const activeItem = findSidebarItem(searchParams.get("view"));

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <PageLayout title={activeItem?.label || title} subtitle={subtitle}>
        <section className="rounded-xl border border-(--border) bg-(--surface-muted) p-4">
          <p className="text-sm text-(--text-soft)">
            This workspace is ready for API-driven modules and currently uses the shared page-based shell.
          </p>
        </section>
      </PageLayout>
    </AdminShell>
  );
}
