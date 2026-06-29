"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { landingConfig } from "@/config/landing";
import { type StorePlanCode, storePlans } from "@/config/plans";
import { getCheckoutAction } from "@/config/payment-routing";
import { getPlanPriceForCountry, getPricingCountryFromVisitor } from "@/config/regional-pricing";
import { normalizeCountryCode, type SupportedCountryCode } from "@/config/countries";
import { useVisitor } from "@/context/VisitorContext";

type PricingCard = {
  code: StorePlanCode;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
};

const pricingCards: PricingCard[] = [
  {
    code: "TRIAL",
    description: "Para probar tu tienda y vender rápido por WhatsApp.",
    features: [`${storePlans.TRIAL.billingLabel} de prueba`, `Hasta ${storePlans.TRIAL.productLimit} productos`, "Link JAKAWI", "WhatsApp directo"],
  },
  {
    code: "BASIC",
    description: "Para negocios que quieren una tienda simple.",
    features: [`Hasta ${storePlans.BASIC.productLimit} productos`, "Tienda pública", "WhatsApp directo", "Sin Seller AI"],
  },
  {
    code: "PRO",
    description: "Para responder menos y vender con contexto.",
    features: [`Hasta ${storePlans.PRO.productLimit} productos`, "Seller AI incluido", `${storePlans.PRO.sellerAiMonthlyConversations} conversaciones Seller AI/mes`, "WhatsApp con contexto"],
    highlighted: true,
    badge: "Más vendido",
  },
  {
    code: "PREMIUM",
    description: "Para tiendas que necesitan seguimiento y cierre guiado.",
    features: [`Hasta ${storePlans.PREMIUM.productLimit} productos`, "Seller AI Premium", `${storePlans.PREMIUM.sellerAiMonthlyConversations} conversaciones Seller AI/mes`, "WhatsApp bot y seguimiento"],
  },
];

function getDetectedPricingCountry(countryCode?: string): SupportedCountryCode {
  return countryCode ? normalizeCountryCode(countryCode) : "OTHER";
}

export function RegionalPricingDisplay() {
  const { visitorData } = useVisitor();
  const countryCode = getDetectedPricingCountry(visitorData.country_code);
  const pricingCountry = getPricingCountryFromVisitor(countryCode);
  const isBoliviaPricing = pricingCountry === "BO";
  const pricingBadge = isBoliviaPricing ? "Precios para Bolivia" : "Precios internacionales";
  const pricingContextLabel = isBoliviaPricing ? "Precio especial Bolivia" : "Precio internacional";

  const planCards = pricingCards.map((plan) => {
    const price = getPlanPriceForCountry(plan.code, countryCode);
    const action = getCheckoutAction({
      countryCode,
      planCode: plan.code,
      checkoutUrl: price.checkoutUrl,
    });

    return { ...plan, price, action };
  });

  return (
    <>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="inline-flex w-fit rounded-full bg-brand-soft px-4 py-2 text-sm font-black text-brand-dark">
          {pricingBadge}
        </span>
        <p className="text-sm font-semibold text-neutral-600">{pricingContextLabel}</p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {planCards.map((plan) => (
          <article key={plan.code} className={plan.highlighted ? "rounded-lg border-2 border-brand bg-brand-paper p-6 shadow-lg shadow-brand/10" : "rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm"}>
            {plan.badge ? <p className="mb-4 inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-black text-brand-dark">{plan.badge}</p> : null}
            <h3 className="text-2xl font-black">{storePlans[plan.code].name}</h3>
            <p className="mt-2 min-h-[48px] text-sm font-semibold text-neutral-600">{plan.description}</p>
            <p className="mt-5 text-3xl font-black text-brand-dark">{plan.price.priceLabel}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-neutral-500">{pricingContextLabel}</p>
            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <p key={feature} className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <CheckCircle2 className="size-4 shrink-0 text-brand" />
                  {feature}
                </p>
              ))}
            </div>
            <Link
              href={plan.action.href}
              target={plan.action.isExternal ? "_blank" : undefined}
              rel={plan.action.isExternal ? "noreferrer" : undefined}
              className="mt-7 flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark"
            >
              {landingConfig.plans.cta.label}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-500">Los precios pueden variar según país y método de pago.</p>
    </>
  );
}
