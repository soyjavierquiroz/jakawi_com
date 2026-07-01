"use client";

import { BarChart3, Gift, HandCoins, Network, Store, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const adminNavItems = [
  { label: "Dashboard", href: "/app/admin", icon: BarChart3 },
  { label: "Tiendas", href: "/app/admin/stores", icon: Store },
  { label: "Referidos", href: "/app/admin/referrals", icon: Network },
  { label: "Partners", href: "/app/admin/partners", icon: UsersRound },
  { label: "Comisiones", href: "/app/admin/commissions", icon: HandCoins },
  { label: "Recompensas", href: "/app/admin/rewards", icon: Gift },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de superadmin" className="rounded-lg border border-brand-border bg-brand-paper p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href : false;
          const className = cn(
            "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition",
            active ? "bg-brand-dark text-white shadow-sm" : "bg-white text-brand-dark hover:bg-brand-muted",
          );

          const href = item.href;

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
