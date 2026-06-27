import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { landingConfig } from "@/config/landing";

export function FinalCtaSection() {
  const { finalCta } = landingConfig;

  return (
    <section className="bg-brand-paper">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="rounded-lg bg-brand-dark px-6 py-9 text-white md:px-10">
          <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">{finalCta.title}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{finalCta.text}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={finalCta.primaryCta.href} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand-lime px-6 font-bold text-brand-dark transition hover:bg-brand-yellow">
              {finalCta.primaryCta.label} <ArrowRight className="size-4" />
            </Link>
            <Link href={finalCta.secondaryCta.href} className="inline-flex h-12 items-center justify-center rounded-md border border-white/25 px-6 font-bold text-white transition hover:bg-white/10">
              {finalCta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
