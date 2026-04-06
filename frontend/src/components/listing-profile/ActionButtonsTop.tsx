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
  storeHref,
}: ActionButtonsTopProps) {
  const callEnabled = hasValue(callHref);
  const whatsappEnabled = hasValue(whatsappHref);
  const emailEnabled = hasValue(emailHref);
  const storeEnabled = hasValue(storeHref);
  const baseButtonClass =
    "flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 w-full py-3 px-5 text-base md:w-auto md:py-2 md:px-4 md:text-sm md:hover:scale-105 md:hover:shadow-md";

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 md:gap-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:border-r md:border-slate-200 md:pr-4">
        {callEnabled ? (
          <a
            href={callHref}
            className={`${baseButtonClass} bg-blue-600 text-white shadow-md hover:bg-blue-700 focus-visible:ring-blue-500`}
          >
            <Phone size={16} />
            Call Now
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
          >
            <Phone size={16} />
            Call Unavailable
          </button>
        )}

        <EnquiryButton
          href={enquiryHref}
          label={enquiryLabel}
          fullWidth
          className={`${baseButtonClass} rounded-lg bg-indigo-600 text-white shadow-md hover:bg-indigo-700 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:border disabled:border-indigo-100 disabled:bg-indigo-50 disabled:text-indigo-300 md:hover:scale-105 md:hover:shadow-md`}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center md:border-r md:border-slate-200 md:pr-4">
        {whatsappEnabled ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} bg-green-500 text-white hover:bg-green-600 focus-visible:ring-green-500`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
          >
            <MessageCircle size={16} />
            WhatsApp Unavailable
          </button>
        )}

        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className={`${baseButtonClass} bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500`}
        >
          <Navigation size={16} />
          Get Directions
        </a>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        {emailEnabled ? (
          <a
            href={emailHref}
            className={`${baseButtonClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
          >
            <Mail size={15} />
            Email
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClass} border border-slate-200 bg-slate-100 text-slate-400 md:hover:scale-100 md:hover:shadow-none`}
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
          className={`${baseButtonClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
        >
          <Share2 size={15} />
          Share
        </button>

        {storeEnabled ? (
          <Link
            href={String(storeHref)}
            className={`${baseButtonClass} bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-slate-500`}
          >
            <Store size={15} />
            Visit Storefront
          </Link>
        ) : null}
      </div>
    </div>
  );
}