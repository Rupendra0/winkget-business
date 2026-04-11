"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { footerData } from "@/data/homeData";

type MobileSection = "categories" | "navigation" | "policies" | null;

const DESKTOP_CATEGORY_LIMIT = 8;
const MOBILE_CATEGORY_LIMIT = 5;
const QUICKLINK_LIMIT = 6;

const sectionTitleClass = "text-sm font-semibold text-slate-800";
const linkTextClass = "text-sm text-slate-600 transition-colors hover:text-slate-900";
const smallTextClass = "text-xs text-slate-500";

export default function Footer() {
  const [desktopCategoriesExpanded, setDesktopCategoriesExpanded] = useState(false);
  const [desktopQuickLinksExpanded, setDesktopQuickLinksExpanded] = useState(false);

  const [openMobileSection, setOpenMobileSection] = useState<MobileSection>("categories");
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);
  const [mobileQuickLinksExpanded, setMobileQuickLinksExpanded] = useState(false);

  const desktopCategories = useMemo(
    () =>
      desktopCategoriesExpanded
        ? footerData.categories
        : footerData.categories.slice(0, DESKTOP_CATEGORY_LIMIT),
    [desktopCategoriesExpanded]
  );

  const mobileCategories = useMemo(
    () =>
      mobileCategoriesExpanded
        ? footerData.categories
        : footerData.categories.slice(0, MOBILE_CATEGORY_LIMIT),
    [mobileCategoriesExpanded]
  );

  const desktopQuickLinks = useMemo(
    () =>
      desktopQuickLinksExpanded
        ? footerData.quickLinks
        : footerData.quickLinks.slice(0, QUICKLINK_LIMIT),
    [desktopQuickLinksExpanded]
  );

  const mobileQuickLinks = useMemo(
    () =>
      mobileQuickLinksExpanded
        ? footerData.quickLinks
        : footerData.quickLinks.slice(0, QUICKLINK_LIMIT),
    [mobileQuickLinksExpanded]
  );

  const hasMoreDesktopCategories = footerData.categories.length > DESKTOP_CATEGORY_LIMIT;
  const hasMoreMobileCategories = footerData.categories.length > MOBILE_CATEGORY_LIMIT;
  const hasMoreDesktopQuickLinks = footerData.quickLinks.length > QUICKLINK_LIMIT;
  const hasMoreMobileQuickLinks = footerData.quickLinks.length > QUICKLINK_LIMIT;

  const toggleMobileSection = (section: MobileSection) => {
    setOpenMobileSection((current) => (current === section ? null : section));
  };

  const renderSocial = () => (
    <div className="mt-3">
      <div className={`${sectionTitleClass} mb-2`}>Follow us on</div>
      <div className="flex items-center gap-2">
        {footerData.social.map((item) => (
          <a
            key={item.name}
            href={item.url}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white/90 text-[10px] font-semibold text-orange-600 shadow-sm"
          >
            {item.name.slice(0, 2).toUpperCase()}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <footer className="border-t border-orange-100/80 bg-white/70 backdrop-blur-md">
      <div className="w-full px-3 py-4 sm:px-4 lg:px-6 xl:px-8">
        <div className="hidden md:grid md:grid-cols-3 md:gap-8">
          <section>
            <div className={`${sectionTitleClass} mb-2`}>Categories</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {desktopCategories.map((item) => (
                <button key={item} type="button" className={`${linkTextClass} text-left`}>
                  {item}
                </button>
              ))}
            </div>
            {hasMoreDesktopCategories ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                onClick={() => setDesktopCategoriesExpanded((value) => !value)}
              >
                {desktopCategoriesExpanded ? "Show Less" : "View All"}
              </button>
            ) : null}
          </section>

          <section>
            <div className={`${sectionTitleClass} mb-2`}>Site Navigation</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {footerData.navigation.map((item) => (
                <button key={item} type="button" className={`${linkTextClass} text-left`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <div className={`${sectionTitleClass} mb-2`}>Quicklinks</div>
              <div className="grid grid-cols-3 gap-2">
                {desktopQuickLinks.map((item) => (
                  <button key={item} type="button" className={`${linkTextClass} text-left`}>
                    {item}
                  </button>
                ))}
              </div>
              {hasMoreDesktopQuickLinks ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                  onClick={() => setDesktopQuickLinksExpanded((value) => !value)}
                >
                  {desktopQuickLinksExpanded ? "Show Less" : "More"}
                </button>
              ) : null}
            </div>
          </section>

          <section>
            <div className={`${sectionTitleClass} mb-2`}>Policies</div>
            <div className="space-y-2">
              {footerData.policies.map((item) => (
                <button key={item} type="button" className={`${linkTextClass} block text-left`}>
                  {item}
                </button>
              ))}
            </div>
            {renderSocial()}
          </section>
        </div>

        <div className="divide-y divide-orange-100/80 md:hidden">
          <section>
            <button
              type="button"
              onClick={() => toggleMobileSection("categories")}
              className="flex w-full cursor-pointer items-center justify-between py-3 text-left font-medium text-slate-800"
            >
              <span className="text-sm font-semibold">Categories</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  openMobileSection === "categories" ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
                openMobileSection === "categories" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden pb-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {mobileCategories.map((item) => (
                    <button key={item} type="button" className={`${linkTextClass} text-left`}>
                      {item}
                    </button>
                  ))}
                </div>
                {hasMoreMobileCategories ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => setMobileCategoriesExpanded((value) => !value)}
                  >
                    {mobileCategoriesExpanded ? "Show Less" : "View All"}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <button
              type="button"
              onClick={() => toggleMobileSection("navigation")}
              className="flex w-full cursor-pointer items-center justify-between py-3 text-left font-medium text-slate-800"
            >
              <span className="text-sm font-semibold">Site Navigation</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  openMobileSection === "navigation" ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
                openMobileSection === "navigation" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden pb-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {footerData.navigation.map((item) => (
                    <button key={item} type="button" className={`${linkTextClass} text-left`}>
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <div className={`${sectionTitleClass} mb-2`}>Quicklinks</div>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileQuickLinks.map((item) => (
                      <button key={item} type="button" className={`${linkTextClass} text-left`}>
                        {item}
                      </button>
                    ))}
                  </div>
                  {hasMoreMobileQuickLinks ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setMobileQuickLinksExpanded((value) => !value)}
                    >
                      {mobileQuickLinksExpanded ? "Show Less" : "More"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section>
            <button
              type="button"
              onClick={() => toggleMobileSection("policies")}
              className="flex w-full cursor-pointer items-center justify-between py-3 text-left font-medium text-slate-800"
            >
              <span className="text-sm font-semibold">Policies</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  openMobileSection === "policies" ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
                openMobileSection === "policies" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden pb-3">
                <div className="space-y-2">
                  {footerData.policies.map((item) => (
                    <button key={item} type="button" className={`${linkTextClass} block text-left`}>
                      {item}
                    </button>
                  ))}
                </div>
                {renderSocial()}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 border-t border-orange-100/80 pt-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-600 md:gap-4 md:text-sm">
            {footerData.bottomLinks.map((item) => (
              <button key={item} type="button" className={`${linkTextClass} text-left`}>
                {item}
              </button>
            ))}
          </div>

          <div className={`mt-3 ${smallTextClass}`}>{footerData.copyright}</div>
        </div>
      </div>
    </footer>
  );
}
