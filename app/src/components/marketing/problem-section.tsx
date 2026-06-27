import { landingConfig } from "@/config/landing";

export function ProblemSection() {
  const { problem } = landingConfig;

  return (
    <section className="border-y border-brand-border bg-brand-paper">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <h2 className="text-4xl font-black leading-tight text-foreground md:text-5xl">{problem.title}</h2>
        <div className="rounded-lg border border-brand-border bg-brand-muted p-6">
          <p className="text-lg leading-8 text-neutral-700">{problem.text}</p>
          <p className="mt-5 text-2xl font-black text-brand-clay">{problem.closer}</p>
        </div>
      </div>
    </section>
  );
}
