"use client";

type StatusTone = "neutral" | "success" | "warning" | "danger";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-(--border) bg-(--surface-muted) text-(--text-soft)",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}>{label}</span>;
}
