import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSupportMailto, supportConfig } from "@/config/support";
import { siteConfig } from "@/config/site";

export function PublicPageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-brand-border bg-brand-paper/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandLogo />
          <nav className="flex items-center gap-3">
            <Link href={siteConfig.routes.register} className="hidden text-sm font-bold text-neutral-700 hover:text-brand-dark sm:inline">
              Crear espacio
            </Link>
            <Link href="/precios" className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
              Precios
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-brand-dark">
          <ArrowLeft className="size-4" />
          Volver a inicio
        </Link>

        <div className="mt-8 rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm sm:p-8">
          <p className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-black text-brand-dark">{eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-8 text-neutral-700">{intro}</p>
          <p className="mt-4 rounded-md border border-brand-border bg-brand-muted px-4 py-3 text-sm font-semibold leading-6 text-neutral-700">
            Documento operativo inicial para pilotos privados. Debe ser revisado legalmente antes de lanzamiento publico masivo.
          </p>
        </div>

        <div className="mt-8 space-y-8 rounded-lg border border-brand-border bg-brand-paper p-6 leading-7 text-neutral-700 shadow-sm sm:p-8">
          {children}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-brand-border bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-brand-dark">Dudas o soporte</p>
            <p className="text-sm font-semibold text-neutral-700">
              {supportConfig.supportHours}. Mercado inicial: {supportConfig.market}.
            </p>
          </div>
          <a
            href={getSupportMailto("Consulta JAKAWI private beta")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark"
          >
            <Mail className="size-4" />
            Contactar soporte
          </a>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
