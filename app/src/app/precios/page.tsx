import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { PublicFooter } from "@/components/public/PublicFooter";
import { BrandLogo } from "@/components/BrandLogo";
import { brandConfig } from "@/config/brand";
import { storePlans, type StorePlanCode } from "@/config/plans";
import { getPlanPriceForCountry } from "@/config/regional-pricing";
import { siteConfig } from "@/config/site";
import { supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Precios | ${brandConfig.name}`,
  description: "Planes de JAKAWI para private beta con activacion manual durante Bolivia.",
};

const planOrder: StorePlanCode[] = ["TRIAL", "BASIC", "PRO", "PREMIUM"];

function planFeatures(planCode: StorePlanCode) {
  const plan = storePlans[planCode];
  return [
    `Hasta ${plan.productLimit} productos`,
    plan.sellerAiEnabled ? `${plan.sellerAiMonthlyConversations} conversaciones Seller AI/mes` : "Sin Seller AI",
    plan.directWhatsappEnabled ? "WhatsApp como canal de cierre" : "WhatsApp bot y seguimiento segun configuracion",
    plan.whatsappBotEnabled ? "WhatsApp bot incluido" : "Operacion comercial simple",
  ];
}

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-brand-border bg-brand-paper/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandLogo />
          <nav className="flex items-center gap-3">
            <Link href="/soporte" className="hidden text-sm font-bold text-neutral-700 hover:text-brand-dark sm:inline">
              Soporte
            </Link>
            <Link href={siteConfig.routes.register} className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
              Crear espacio
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-black text-brand-dark">
            Mercado inicial: {supportConfig.country}
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-foreground sm:text-6xl">Precios para pilotos privados</h1>
          <p className="mt-5 text-lg leading-8 text-neutral-700">
            Planes para negocios que venden por conversacion y cierran por WhatsApp. Durante la beta, la activacion de planes pagados puede
            realizarse de forma manual por el equipo de JAKAWI.
          </p>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-4">
          {planOrder.map((planCode) => {
            const plan = storePlans[planCode];
            const price = getPlanPriceForCountry(planCode, "BO");
            const highlighted = planCode === "PRO";

            return (
              <article
                key={planCode}
                className={
                  highlighted
                    ? "rounded-lg border-2 border-brand bg-brand-paper p-6 shadow-lg shadow-brand/10"
                    : "rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm"
                }
              >
                {highlighted ? (
                  <p className="mb-4 inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-black text-brand-dark">Piloto recomendado</p>
                ) : null}
                <h2 className="text-2xl font-black text-brand-dark">{plan.name}</h2>
                <p className="mt-4 text-3xl font-black text-foreground">{price.priceLabel}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-neutral-500">
                  {planCode === "TRIAL" ? storePlans.TRIAL.billingLabel : "Precio Bolivia"}
                </p>
                <div className="mt-6 space-y-3">
                  {planFeatures(planCode).map((feature) => (
                    <p key={feature} className="flex items-start gap-2 text-sm font-semibold text-neutral-700">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Link href={`${siteConfig.routes.register}?plan=${planCode}&country=BO`} className="mt-7 flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark">
                  Crear espacio
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6">
            <MessageCircle className="size-5 text-brand" />
            <h2 className="mt-3 text-2xl font-black text-brand-dark">Pago manual durante beta</h2>
            <p className="mt-3 font-semibold leading-7 text-neutral-700">
              No hay checkout automatico activo. El equipo confirma el plan, coordina el canal de pago y registra el pago en backoffice.
            </p>
            <Link href="/pago-manual" className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-background px-5 font-bold text-brand-dark transition hover:border-brand">
              Ver pago manual
            </Link>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6">
            <h2 className="text-2xl font-black text-brand-dark">Nota regional</h2>
            <p className="mt-3 font-semibold leading-7 text-neutral-700">
              Esta pagina muestra Bolivia como mercado inicial. Los precios y metodos de pago pueden variar por pais y deben confirmarse con
              soporte antes de activar un plan pagado.
            </p>
            <Link href="/contacto" className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-background px-5 font-bold text-brand-dark transition hover:border-brand">
              Contactar soporte
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
