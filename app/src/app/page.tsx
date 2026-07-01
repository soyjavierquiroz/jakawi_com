import { DifferentiatorSection } from "@/components/marketing/differentiator-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LandingHero } from "@/components/marketing/landing-hero";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SellerAiSection } from "@/components/marketing/seller-ai-section";

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
      <PublicFooter />
    </main>
  );
}
