"use client";

import React from "react";
import { Phone } from "lucide-react";
import EnquiryButton from "@/components/listing-profile/EnquiryButton";

type ActionButtonsBottomProps = {
  callHref?: string;
  enquiryHref?: string;
  enquiryLabel?: string;
};

const isEnabled = (value?: string) => Boolean(String(value || "").trim() && value !== "#");

export default function ActionButtonsBottom({
  callHref,
  enquiryHref,
  enquiryLabel,
}: ActionButtonsBottomProps) {
  const callEnabled = isEnabled(callHref);

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-2 sm:gap-3">
      {callEnabled ? (
        <a
          href={callHref}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Phone size={16} />
          Call
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-5 py-3 text-base font-semibold text-slate-400"
        >
          <Phone size={16} />
          Call
        </button>
      )}

      <EnquiryButton
        href={enquiryHref}
        label={enquiryLabel}
        fullWidth
        className="rounded-lg bg-indigo-600 px-5 py-3 text-base text-white shadow-md hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-indigo-100 disabled:bg-indigo-50 disabled:text-indigo-300"
      />
    </div>
  );
}