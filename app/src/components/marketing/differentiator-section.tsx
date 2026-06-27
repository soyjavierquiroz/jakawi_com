import { MessageCircle } from "lucide-react";
import { landingConfig } from "@/config/landing";

export function DifferentiatorSection() {
  const { differentiator } = landingConfig;

  return (
    <section className="bg-brand-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <h2 className="text-4xl font-black leading-tight text-foreground md:text-5xl">{differentiator.title}</h2>
          <p className="mt-5 text-lg leading-8 text-neutral-700">{differentiator.text}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-brand-border bg-brand-muted p-5">
            <p className="text-sm font-black text-brand-clay">{differentiator.beforeTitle}</p>
            <div className="mt-5 space-y-3">
              {differentiator.beforeMessages.map((message) => (
                <p key={message} className="w-fit rounded-md bg-brand-paper px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm">
                  {message}
                </p>
              ))}
            </div>
          </article>
          <article className="rounded-lg bg-brand-dark p-5 text-white">
            <p className="text-sm font-black text-brand-lime">{differentiator.afterTitle}</p>
            <div className="mt-5 space-y-3">
              {differentiator.afterMessages.map((message) => (
                <p key={message} className="flex items-start gap-2 rounded-md bg-brand-paper px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand" />
                  {message}
                </p>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
