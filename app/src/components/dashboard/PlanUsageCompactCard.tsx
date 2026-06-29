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
  { key: "voiceNotes", label: "Notas de voz", icon: Mic },
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
    <section className={cn("rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm", className)}>
      <p className="text-sm font-black text-brand-dark">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 max-[380px]:grid-cols-2">
        {usageItems.map((item) => (
          <div key={item.key} className="min-w-0 rounded-md bg-brand-muted px-2.5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-neutral-500">
              <item.icon className="size-3.5 shrink-0 text-brand" />
              <span className="truncate">{item.label}</span>
            </div>
            <p className="mt-1 truncate text-base font-black text-brand-dark">{values[item.key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
