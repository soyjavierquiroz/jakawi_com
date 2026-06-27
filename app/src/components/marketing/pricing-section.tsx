import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { landingConfig } from "@/config/landing";
import { plansConfig } from "@/config/plans";

export function PricingSection() {
  const { plans } = landingConfig;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-tight text-foreground md:text-5xl">{plans.title}</h2>
          <p className="mt-4 text-lg leading-8 text-neutral-700">{plans.text}</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plansConfig.map((plan) => (
            <article key={plan.name} className={plan.highlighted ? "rounded-lg border-2 border-brand bg-brand-paper p-6 shadow-lg shadow-brand/10" : "rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm"}>
              {plan.badge ? <p className="mb-4 inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-black text-brand-dark">{plan.badge}</p> : null}
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="mt-2 text-sm font-semibold text-neutral-600">{plan.description}</p>
              <p className="mt-5 text-4xl font-black text-brand-dark">{plan.price}</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                    <CheckCircle2 className="size-4 shrink-0 text-brand" />
                    {feature}
                  </p>
                ))}
              </div>
              <Link href={plans.cta.href} className="mt-7 flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark">
                {plans.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
