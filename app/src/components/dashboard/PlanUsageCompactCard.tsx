import { Bot, Boxes, Mic } from "lucide-react";
import { cn } from "@/lib/ui";

type PlanUsageCompactCardProps = {
  productUsageLabel: string;
  sellerAiUsageLabel: string;
  voiceNotesLabel: string;
  className?: string;
  title?: string;
};

const usageItems = [
  { key: "products", label: "Productos", icon: Boxes },
  { key: "sellerAi", label: "Seller AI", icon: Bot },
  { key: "voiceNotes", label: "Voz", icon: Mic },
] as const;

export function PlanUsageCompactCard({
  productUsageLabel,
  sellerAiUsageLabel,
  voiceNotesLabel,
  className,
  title = "Uso del plan",
}: PlanUsageCompactCardProps) {
  const values = {
    products: productUsageLabel,
    sellerAi: sellerAiUsageLabel,
    voiceNotes: voiceNotesLabel,
  };

  return (
    <section className={cn("rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm md:p-4", className)}>
      <p className="text-[13px] font-black leading-none text-brand-dark md:text-sm">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 md:gap-2">
        {usageItems.map((item) => (
          <div key={item.key} className="min-w-0 rounded-md bg-brand-muted px-1.5 py-2 text-center md:px-2.5 md:py-3">
            <item.icon className="mx-auto size-4 text-brand md:size-5" />
            <p className="mt-1 truncate text-[11px] font-black leading-4 text-neutral-500 md:text-xs">{item.label}</p>
            <p className="truncate text-lg font-black leading-6 text-brand-dark md:text-xl">{values[item.key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
