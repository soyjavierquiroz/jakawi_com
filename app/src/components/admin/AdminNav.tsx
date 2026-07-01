"use client";

import { BarChart3, HandCoins, Network, Store, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const adminNavItems = [
  { label: "Dashboard", href: "/app/admin", icon: BarChart3 },
  { label: "Tiendas", href: "/app/admin/stores", icon: Store },
  { label: "Referidos", href: "/app/admin/referrals", icon: Network },
  { label: "Partners", href: "/app/admin/partners", icon: UsersRound },
  { label: "Comisiones", icon: HandCoins, disabled: true, hint: "Pronto" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de superadmin" className="rounded-lg border border-brand-border bg-brand-paper p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href : false;
          const className = cn(
            "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition",
            active ? "bg-brand-dark text-white shadow-sm" : "bg-white text-brand-dark hover:bg-brand-muted",
            item.disabled && "cursor-not-allowed border border-dashed border-brand-border bg-white/60 text-neutral-500 hover:bg-white/60",
          );

          if (item.disabled) {
            return (
              <span key={item.label} className={className} aria-disabled="true" title="Próximamente">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                <span className="hidden rounded-full bg-brand-muted px-2 py-0.5 text-[10px] uppercase text-neutral-500 xl:inline">{item.hint}</span>
              </span>
            );
          }

          const href = item.href;
          if (!href) return null;

          return (
            <Link key={item.label} href={href} className={className} aria-current={active ? "page" : undefined}>
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
