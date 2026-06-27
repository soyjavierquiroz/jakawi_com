import { Bot, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { landingConfig } from "@/config/landing";

export function SellerAiSection() {
  const { sellerAi } = landingConfig;

  return (
    <section className="bg-brand-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full bg-brand-lime px-4 py-2 text-sm font-black text-brand-dark">{sellerAi.badge}</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-5xl">{sellerAi.title}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{sellerAi.text}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {sellerAi.bullets.map((bullet) => (
              <p key={bullet} className="flex items-center gap-2 text-sm font-bold text-brand-soft">
                <CheckCircle2 className="size-4 shrink-0 text-brand-lime" />
                {bullet}
              </p>
            ))}
          </div>
          <Link href={sellerAi.cta.href} className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-lime px-5 font-bold text-brand-dark transition hover:bg-brand-yellow sm:w-auto">
            {sellerAi.cta.label}
          </Link>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4 sm:p-5">
          <div className="rounded-md bg-brand-paper p-5 text-neutral-950">
            <Bot className="size-10 text-brand" />
            <p className="mt-5 text-sm font-black uppercase text-brand-clay">{sellerAi.panel.eyebrow}</p>
            <p className="mt-2 text-2xl font-black">{sellerAi.panel.title}</p>
            <div className="mt-5 space-y-3 text-sm font-semibold text-neutral-700">
              {sellerAi.panel.messages.map((message, index) => (
                <p key={message} className={index === 1 ? "rounded-md bg-brand-muted px-3 py-2" : "rounded-md bg-brand-soft px-3 py-2"}>
                  {message}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
