import { landingConfig } from "@/config/landing";
import { VisitorProvider } from "@/context/VisitorContext";
import { PricingCountrySelector } from "@/components/marketing/PricingCountrySelector";

export function PricingSection() {
  const { plans } = landingConfig;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-tight text-foreground md:text-5xl">{plans.title}</h2>
          <p className="mt-4 text-lg leading-8 text-neutral-700">{plans.text}</p>
        </div>
        <VisitorProvider>
          <PricingCountrySelector />
        </VisitorProvider>
      </div>
    </section>
  );
}
