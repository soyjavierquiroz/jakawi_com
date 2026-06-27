import { DifferentiatorSection } from "@/components/marketing/differentiator-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LandingHero } from "@/components/marketing/landing-hero";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SellerAiSection } from "@/components/marketing/seller-ai-section";
import { brandConfig } from "@/config/brand";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <LandingHero />
      <ProblemSection />
      <HowItWorksSection />
      <DifferentiatorSection />
      <SellerAiSection />
      <PricingSection />
      <FinalCtaSection />
      <footer className="border-t border-brand-border bg-brand-paper px-5 py-8 text-center text-sm font-semibold text-neutral-500">
        {brandConfig.name} - Hecho para vender desde redes hacia WhatsApp.
      </footer>
    </main>
  );
}
