import { Link2, MessageCircle, MousePointer2, Store } from "lucide-react";
import { landingConfig } from "@/config/landing";

const icons = [Store, Link2, MousePointer2, MessageCircle];

export function HowItWorksSection() {
  const { howItWorks } = landingConfig;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <h2 className="max-w-3xl text-4xl font-black leading-tight text-foreground md:text-5xl">{howItWorks.title}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {howItWorks.steps.map((step, index) => {
            const Icon = icons[index] ?? Store;
            return (
              <article key={step.title} className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
                <Icon className={index === 1 ? "size-6 text-brand-clay" : "size-6 text-brand"} />
                <p className="mt-4 text-sm font-bold text-brand-dark">0{index + 1}</p>
                <h3 className="mt-1 text-xl font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{step.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
