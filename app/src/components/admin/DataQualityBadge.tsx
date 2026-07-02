import { getDataQualityDisplay, type DataQualityLabel } from "@/lib/data-quality";
import { cn } from "@/lib/ui";

const badgeClass: Record<DataQualityLabel, string> = {
  REAL: "bg-green-50 text-green-700",
  DEMO: "bg-blue-50 text-blue-800",
  QA: "bg-amber-50 text-amber-800",
  INTERNAL: "bg-neutral-900 text-white",
  NEEDS_REVIEW: "bg-red-50 text-red-700",
};

const sizeClass = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
} as const;

export function DataQualityBadge({
  label,
  reason,
  size = "md",
  className,
}: {
  label: DataQualityLabel;
  reason?: string;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const display = getDataQualityDisplay(label);
  return (
    <span title={reason ?? display.detail} className={cn("inline-flex rounded-full font-black uppercase", sizeClass[size], badgeClass[label], className)}>
      {display.label}
    </span>
  );
}
