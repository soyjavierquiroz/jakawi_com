"use client";

import { BarChart3, Eye, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { brandConfig } from "@/config/brand";
import { navigationConfig } from "@/config/navigation";
import { logoutAction } from "@/lib/actions";
import { cn } from "@/lib/ui";

export function DashboardNav({ publicUrl }: { publicUrl?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-dvh w-full flex-col bg-brand-dark px-4 py-5 text-white md:fixed md:inset-y-0 md:left-0 md:w-72">
      <BrandLogo href="/app" className="px-2 text-white" />

      <nav className="mt-8 space-y-1">
        {navigationConfig.dashboard.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white",
              (item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href)) && "bg-brand-lime text-brand-dark shadow-sm shadow-black/10 hover:bg-brand-lime hover:text-brand-dark",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-8">
        {publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            className="flex items-center justify-center gap-2 rounded-md bg-brand-paper px-3 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-lime"
          >
            <Eye className="size-4" />
            Ver tienda pública
          </a>
        ) : null}
        <form action={logoutAction}>
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" />
            Salir
          </button>
        </form>
        <div className="flex items-center gap-2 px-2 text-xs text-white/45">
          <BarChart3 className="size-3" />
          {brandConfig.name} social commerce
        </div>
      </div>
    </aside>
  );
}
