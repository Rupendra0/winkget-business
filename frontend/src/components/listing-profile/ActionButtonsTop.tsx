"use client";

import React from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Store,
} from "lucide-react";
import EnquiryButton from "@/components/listing-profile/EnquiryButton";

type ActionButtonsTopProps = {
  callHref?: string;
  enquiryHref?: string;
  enquiryLabel?: string;
  whatsappHref?: string;
  directionsHref: string;
  emailHref?: string;
  onShare: () => void | Promise<void>;
  onCallClick?: () => void;
  storeHref?: string;
};

const hasValue = (value?: string) => Boolean(String(value || "").trim() && value !== "#");

export default function ActionButtonsTop({
  callHref,
  enquiryHref,
  enquiryLabel,
  whatsappHref,
  directionsHref,
  emailHref,
  onShare,
  onCallClick,
  storeHref,
}: ActionButtonsTopProps) {
  const callEnabled = hasValue(callHref);
  const whatsappEnabled = hasValue(whatsappHref);
  const emailEnabled = hasValue(emailHref);
  const storeEnabled = hasValue(storeHref);
  const mobilePrimaryClass =
    "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:w-auto md:rounded-lg md:px-4 md:py-2 md:text-sm md:hover:scale-105 md:hover:shadow-md";
  const mobileChipClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:min-h-0 md:rounded-lg md:px-4 md:py-2 md:text-sm md:hover:scale-105 md:hover:shadow-md";

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2.5 md:gap-4">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center md:border-r md:border-slate-200 md:pr-4">
        {callEnabled ? (
          <a
            href={callHref}
            onClick={() => {
              onCallClick?.();
            }}
            className={`${mobilePrimaryClass} bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500`}
          >
            <Phone size={16} />
            Call Now
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${mobilePrimaryClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
          >
            <Phone size={16} />
            Call Unavailable
          </button>
        )}

        <EnquiryButton
          href={enquiryHref}
          label={enquiryLabel}
          fullWidth
          className={`${mobilePrimaryClass} bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:border disabled:border-indigo-100 disabled:bg-indigo-50 disabled:text-indigo-300 md:hover:scale-105 md:hover:shadow-md`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center md:border-r md:border-slate-200 md:pr-4">
        {whatsappEnabled ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className={`${mobilePrimaryClass} bg-green-500 hover:bg-green-600 focus-visible:ring-green-500`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${mobilePrimaryClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
          >
            <MessageCircle size={16} />
            WhatsApp Unavailable
          </button>
        )}

        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className={`${mobilePrimaryClass} bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500`}
        >
          <Navigation size={16} />
          Get Directions
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:flex md:flex-row md:items-center">
        {emailEnabled ? (
          <a
            href={emailHref}
            className={`${mobileChipClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
          >
            <Mail size={15} />
            Email
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${mobileChipClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
          >
            <Mail size={15} />
            Email
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            void onShare();
          }}
          className={`${mobileChipClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
        >
          <Share2 size={15} />
          Share
        </button>

        {storeEnabled ? (
          <Link
            href={String(storeHref)}
            className={`${mobileChipClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
          >
            <Store size={15} />
            Visit Storefront
          </Link>
        ) : null}
      </div>
    </div>
  );
}