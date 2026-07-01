"use client";

import { BarChart3, Eye, Handshake, LogOut, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { brandConfig } from "@/config/brand";
import { navigationConfig } from "@/config/navigation";
import { logoutAction } from "@/lib/actions";
import { cn } from "@/lib/ui";

export function DashboardNav({ publicUrl, hasPartnerPortal = false }: { publicUrl?: string; hasPartnerPortal?: boolean }) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const partnerItem = { href: "/app/partner", label: "Partner", icon: Handshake };
  const desktopItems = hasPartnerPortal ? [...navigationConfig.dashboard, partnerItem] : navigationConfig.dashboard;
  const mainItems = navigationConfig.dashboard.filter((item) => ["Inicio", "Mi espacio", "Productos", "Seller AI"].includes(item.label));
  const ownerMoreItems = navigationConfig.dashboard.filter((item) => ["Categorías", "WhatsApp", "Clientes", "Referidos", "Plan"].includes(item.label));
  const moreItems = hasPartnerPortal ? [...ownerMoreItems, partnerItem] : ownerMoreItems;
  const isActive = (href: string) => (href === "/app" ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-brand-border bg-brand-paper/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex h-11 items-center justify-between gap-3">
          <BrandLogo href="/app" className="min-w-0 text-lg text-brand-dark [&>span]:size-9" />
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-black text-white transition hover:bg-brand"
            >
              <Eye className="size-4" />
              Ver tienda
            </a>
          ) : null}
        </div>
      </header>

      <aside className="hidden min-h-dvh flex-col bg-brand-dark px-4 py-5 text-white md:fixed md:inset-y-0 md:left-0 md:flex md:w-72">
        <BrandLogo href="/app" className="px-2 text-white" />

        <nav className="mt-8 space-y-1">
          {desktopItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white",
                isActive(item.href) && "bg-brand-lime text-brand-dark shadow-sm shadow-black/10 hover:bg-brand-lime hover:text-brand-dark",
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#052E24] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgb(0_0_0/0.22)] md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mainItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black text-emerald-100/75 transition hover:text-brand-lime",
                isActive(item.href) && "bg-white/12 text-brand-lime ring-1 ring-brand-lime/25",
              )}
            >
              <item.icon className="size-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black text-emerald-100/75 transition hover:text-brand-lime",
              moreItems.some((item) => isActive(item.href)) && "bg-white/12 text-brand-lime ring-1 ring-brand-lime/25",
            )}
          >
            <MoreHorizontal className="size-5" />
            Más
          </button>
        </div>
      </nav>

      {isMoreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button type="button" aria-label="Cerrar menú" onClick={() => setIsMoreOpen(false)} className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] rounded-lg bg-brand-paper p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-black text-brand-dark">Más</p>
              <button type="button" aria-label="Cerrar más opciones" onClick={() => setIsMoreOpen(false)} className="grid size-10 place-items-center rounded-md border border-brand-border bg-white text-brand-dark">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark",
                    isActive(item.href) && "border-brand bg-brand-soft",
                  )}
                >
                  <item.icon className="size-5 text-brand" />
                  {item.label}
                </Link>
              ))}
            </div>
            <form action={logoutAction} className="mt-3">
              <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-black text-white">
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
