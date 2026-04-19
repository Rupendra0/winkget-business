"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { footerData } from "@/data/homeData";
import { fetchCategories, type CatalogCategory } from "@/lib/catalogClient";

const MIN_CATEGORY_COLUMN_COUNT = 3;
const MAX_CATEGORY_COLUMN_COUNT = 4;
const ITEMS_PER_COLUMN = 10;

const sectionTitleClass = "text-[0.95rem] font-semibold leading-tight text-[#1f2937]";
const linkTextClass = "text-[0.95rem] leading-[1.35] text-[#111827] transition-colors hover:text-[#111827]/80";

const footerRouteMap: Record<string, string> = {
  "My Account": "/profile",
  "My Order": "/orders",
  "Free Listing": "/vendor-register",
  "Add Your Business": "/vendor-register",
  B2B: "/vendor",
  Explore: "/",
  Payment: "/cart",
  "Pay Now": "/cart",
  "Become a partner": "/vendor-register",
  "Order your meal": "/search",
  "Find what you need": "/search",
};

const toCategorySlug = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

type FooterCategory = {
  id: string;
  name: string;
  slug: string;
};

const toFooterCategory = (category: CatalogCategory): FooterCategory | null => {
  const name = String(category?.name || "").trim();
  if (!name) {
    return null;
  }

  const slug = String(category.slug || "").trim() || toCategorySlug(name);
  if (!slug) {
    return null;
  }

  return {
    id: String(category.id || slug),
    name,
    slug,
  };
};

const renderMappedLink = (label: string, className: string) => {
  const href = footerRouteMap[label];
  if (!href) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
};

const padColumn = <T,>(items: T[], size: number): Array<T | null> => {
  const cappedItems = items.slice(0, size);
  if (cappedItems.length >= size) {
    return cappedItems;
  }

  return [...cappedItems, ...Array.from({ length: size - cappedItems.length }, () => null)];
};

export default function Footer() {
  const [dbCategories, setDbCategories] = useState<FooterCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      const categories = await fetchCategories();
      if (!active) {
        return;
      }

      const sortedCategories = [...categories].sort((left, right) => {
        const leftOrder = Number.isFinite(Number(left.sortOrder))
          ? Number(left.sortOrder)
          : Number.MAX_SAFE_INTEGER;
        const rightOrder = Number.isFinite(Number(right.sortOrder))
          ? Number(right.sortOrder)
          : Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      });

      const seenSlugs = new Set<string>();
      const nextCategories = sortedCategories
        .map(toFooterCategory)
        .filter((category: FooterCategory | null): category is FooterCategory => Boolean(category))
        .filter((category) => {
          const slugKey = category.slug.toLowerCase();
          if (seenSlugs.has(slugKey)) {
            return false;
          }

          seenSlugs.add(slugKey);
          return true;
        });

      setDbCategories(nextCategories);
      setIsLoadingCategories(false);
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const categoryColumnCount = useMemo(
    () =>
      dbCategories.length >= MAX_CATEGORY_COLUMN_COUNT * ITEMS_PER_COLUMN
        ? MAX_CATEGORY_COLUMN_COUNT
        : MIN_CATEGORY_COLUMN_COUNT,
    [dbCategories.length]
  );

  const categoryColumns = useMemo(() => {
    const totalCategorySlots = categoryColumnCount * ITEMS_PER_COLUMN;
    const visibleCategories = dbCategories.slice(0, totalCategorySlots);

    return Array.from({ length: categoryColumnCount }, (_, index) => {
      const start = index * ITEMS_PER_COLUMN;
      const columnItems = visibleCategories.slice(start, start + ITEMS_PER_COLUMN);
      return padColumn(columnItems, ITEMS_PER_COLUMN);
    });
  }, [categoryColumnCount, dbCategories]);

  const footerGridColumnClass =
    categoryColumnCount === MAX_CATEGORY_COLUMN_COUNT ? "lg:grid-cols-6" : "lg:grid-cols-5";

  const siteNavigationItems = useMemo(
    () => padColumn([...footerData.navigation, ...footerData.policies, "Pay Now"], ITEMS_PER_COLUMN),
    []
  );

  const quickLinkItems = useMemo(() => padColumn(footerData.quickLinks, ITEMS_PER_COLUMN), []);

  return (
    <footer id="listing-footer" className="hidden border-t border-[#d5d7db] bg-white md:block">
      <div className="mx-auto w-full max-w-[1600px] px-8 py-10 lg:px-12">
        <div
          className={`grid border-b border-[#cfd4dc] pb-10 ${footerGridColumnClass} lg:divide-x lg:divide-[#cfd4dc]`}
        >
          {categoryColumns.map((column, columnIndex) => (
            <section key={`category-column-${columnIndex}`} className="px-6">
              {columnIndex === 0 ? (
                <h3 className={sectionTitleClass}>Categories</h3>
              ) : (
                <div className="h-[1.35rem]" aria-hidden />
              )}

              <div className="mt-4 space-y-2">
                {column.map((category, itemIndex) => {
                  if (isLoadingCategories && columnIndex === 0 && itemIndex === 0) {
                    return (
                      <p key="category-loading" className="text-[0.9rem] text-[#4b5563]">
                        Loading categories...
                      </p>
                    );
                  }

                  if (!isLoadingCategories && dbCategories.length === 0 && columnIndex === 0 && itemIndex === 0) {
                    return (
                      <p key="category-empty" className="text-[0.9rem] text-[#4b5563]">
                        No categories available.
                      </p>
                    );
                  }

                  if (!category) {
                    return (
                      <span
                        key={`category-empty-${columnIndex}-${itemIndex}`}
                        className="block h-[1.28rem] select-none opacity-0"
                        aria-hidden
                      >
                        .
                      </span>
                    );
                  }

                  return (
                      <Link
                        key={category.id}
                        href={`/category/${encodeURIComponent(category.slug || toCategorySlug(category.name))}`}
                        className={`${linkTextClass} block text-left`}
                      >
                        {category.name}
                      </Link>
                    );
                })}
              </div>
            </section>
          ))}

          <section className="px-6">
            <h3 className={sectionTitleClass}>Site Navigation :</h3>
            <div className="mt-4 space-y-2">
              {siteNavigationItems.map((item, index) =>
                item ? (
                  <div key={`site-item-${index}`}>{renderMappedLink(item, `${linkTextClass} block text-left`)}</div>
                ) : (
                  <span key={`site-item-empty-${index}`} className="block h-[1.28rem] select-none opacity-0" aria-hidden>
                    .
                  </span>
                )
              )}
            </div>
          </section>

          <section className="px-6">
            <h3 className={sectionTitleClass}>Quicklinks</h3>
            <div className="mt-4 space-y-2">
              {quickLinkItems.map((item, index) =>
                item ? (
                  <div key={`quick-item-${index}`}>{renderMappedLink(item, `${linkTextClass} block text-left`)}</div>
                ) : (
                  <span key={`quick-item-empty-${index}`} className="block h-[1.28rem] select-none opacity-0" aria-hidden>
                    .
                  </span>
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}
