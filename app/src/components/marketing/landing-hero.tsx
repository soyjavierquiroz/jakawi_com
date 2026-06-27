import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { landingConfig } from "@/config/landing";
import { siteConfig } from "@/config/site";

function HeroCopy({ variant }: { variant: "mobile" | "desktop" }) {
  const { hero } = landingConfig;
  const isDesktop = variant === "desktop";

  return (
    <div className={isDesktop ? "relative max-w-[540px] px-8 pt-24 lg:px-0 lg:pt-32" : "px-4 pt-7"}>
      <p className="mb-4 inline-flex rounded-full bg-brand-lime px-4 py-2 text-sm font-black text-brand-dark">
        {hero.eyebrow}
      </p>
      <h1 className={isDesktop ? "text-6xl font-black leading-[1.02] tracking-normal text-foreground xl:text-7xl" : "text-4xl font-black leading-[1.03] tracking-normal text-foreground sm:text-5xl"}>
        {hero.title}
      </h1>
      <p className={isDesktop ? "mt-6 text-lg leading-8 text-neutral-700" : "mt-5 text-base leading-7 text-neutral-700"}>
        {hero.subtitle}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href={hero.primaryCta.href} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-6 font-bold text-white transition hover:bg-brand-dark sm:w-auto">
          {hero.primaryCta.label} <ArrowRight className="size-4" />
        </Link>
        <Link href={hero.secondaryCta.href} className="inline-flex h-12 w-full items-center justify-center rounded-md border border-brand-border bg-brand-paper px-6 font-bold text-neutral-900 transition hover:border-brand hover:text-brand-dark sm:w-auto">
          {hero.secondaryCta.label}
        </Link>
      </div>

      <div className="mt-6 grid gap-2 text-sm font-bold text-neutral-800 sm:grid-cols-2">
        {hero.bullets.map((bullet) => (
          <p key={bullet} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-brand" />
            {bullet}
          </p>
        ))}
      </div>

      <p className="mt-6 max-w-xl text-base font-black text-brand-dark">{hero.tagline}</p>
    </div>
  );
}

export function LandingHero() {
  const { hero } = landingConfig;
  const mobileSrc = hero.image.mobileSrc || hero.image.desktopSrc || hero.image.fallbackSrc;

  return (
    <section className="relative overflow-hidden bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <BrandLogo />
        <nav className="flex shrink-0 items-center gap-3">
          <Link href={siteConfig.routes.login} className="text-sm font-semibold text-neutral-700 hover:text-brand-dark">
            Entrar
          </Link>
          <Link href={hero.primaryCta.href} className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
            {hero.primaryCta.label}
          </Link>
        </nav>
      </header>

      <div className="lg:hidden">
        <HeroCopy variant="mobile" />
        <div className="mt-6 px-4 pb-12">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-brand-border bg-brand-paper shadow-sm">
            <Image
              src={mobileSrc}
              alt={hero.image.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[68%_center]"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto hidden max-w-7xl px-4 sm:px-6 lg:block lg:px-8">
        <div className="relative min-h-[680px] overflow-hidden rounded-[2rem] ring-1 ring-black/5 lg:min-h-[760px]">
          <Image
            src={hero.image.desktopSrc || hero.image.fallbackSrc}
            alt={hero.image.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-[#FAF7EF] via-[#FAF7EF]/92 to-[#FAF7EF]/0 lg:block" />
          <div className="relative z-10">
            <HeroCopy variant="desktop" />
          </div>
        </div>
      </div>
    </section>
  );
}
