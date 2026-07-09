"use client";

import { BarChart3, CreditCard, Gift, Globe2, HandCoins, Network, ReceiptText, Store, TrendingUp, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const adminNavItems = [
  { label: "Dashboard", href: "/app/admin", icon: BarChart3 },
  { label: "Tiendas", href: "/app/admin/stores", icon: Store },
  { label: "Billing", href: "/app/admin/billing", icon: ReceiptText },
  { label: "Dominios", href: "/app/admin/domains", icon: Globe2 },
  { label: "Referidos", href: "/app/admin/referrals", icon: Network },
  { label: "Partners", href: "/app/admin/partners", icon: UsersRound },
  { label: "Comisiones", href: "/app/admin/commissions", icon: HandCoins },
  { label: "Recompensas", href: "/app/admin/rewards", icon: Gift },
  { label: "Pagos", href: "/app/admin/payments", icon: CreditCard },
  { label: "Revenue", href: "/app/admin/revenue", icon: TrendingUp },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de superadmin" className="overflow-hidden rounded-lg border border-brand-border bg-brand-paper p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5 xl:grid-cols-10">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href : false;
          const className = cn(
            "inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition sm:min-w-0",
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
