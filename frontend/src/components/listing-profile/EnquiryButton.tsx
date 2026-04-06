"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";

type EnquiryButtonProps = {
  href?: string;
  onClick?: () => void | Promise<void>;
  label?: string;
  className?: string;
  fullWidth?: boolean;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export default function EnquiryButton({
  href,
  onClick,
  label = "Send Enquiry",
  className = "",
  fullWidth = false,
}: EnquiryButtonProps) {
  const trimmedHref = String(href || "").trim();
  const canUseLink = Boolean(trimmedHref && trimmedHref !== "#");
  const isDisabled = !canUseLink && !onClick;
  const baseClass = [
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (canUseLink) {
    return (
      <a
        href={trimmedHref}
        target={isHttpUrl(trimmedHref) ? "_blank" : undefined}
        rel={isHttpUrl(trimmedHref) ? "noreferrer" : undefined}
        className={baseClass}
      >
        <MessageSquareText size={16} />
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          void onClick();
        }
      }}
      className={baseClass}
      disabled={isDisabled}
    >
      <MessageSquareText size={16} />
      {label}
    </button>
  );
}