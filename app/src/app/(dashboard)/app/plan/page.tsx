import { Sparkles } from "lucide-react";
import Link from "next/link";
import { PlanUsageCompactCard } from "@/components/dashboard/PlanUsageCompactCard";
import { getPlanPriceForCountry } from "@/config/regional-pricing";
import { siteConfig } from "@/config/site";
import { requireStore } from "@/lib/auth";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";

export default async function PlanPage() {
  const { store } = await requireStore();
  const [productUsage, sellerAiUsage] = await Promise.all([getProductUsage(store.id), getSellerAiUsage(store.id)]);
  const planState = getStorePlanState(store);
  const price = getPlanPriceForCountry(planState.planCode, store.countryCode);
  const trialLabel = planState.trialEndsAt ? planState.trialEndsAt.toLocaleDateString(store.locale ?? "es-BO") : null;
  const status = planState.trialExpired ? "Prueba terminada" : planState.planCode === "TRIAL" && trialLabel ? `Prueba hasta ${trialLabel}` : "Activo";

  const productUsageLabel = `${productUsage.used} / ${productUsage.limit}`;
  const sellerAiUsageLabel = sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido";
  const voiceNotesLabel = planState.sellerAiEnabled ? "Disponible" : "Pro/Premium";

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Plan</p>
          <h1 className="text-3xl font-black md:text-4xl">Plan y límites</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Consulta tu uso actual sin configurar cobros ni checkout desde aquí.</p>
        </div>
        <a href="mailto:hola@jakawi.com?subject=Solicitar%20upgrade%20JAKAWI" className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          Solicitar upgrade
        </a>
      </div>

      <section className="rounded-lg bg-brand-dark p-4 text-white md:p-5">
        <Sparkles className="size-8 text-brand-lime" />
        <p className="mt-4 text-sm font-black text-white/60">Plan actual</p>
        <h2 className="mt-1 text-2xl font-black md:text-3xl">{planState.planName}</h2>
        <p className="mt-2 text-sm font-semibold text-white/70">{price.priceLabel} · {status}</p>
      </section>

      <PlanUsageCompactCard productUsageLabel={productUsageLabel} sellerAiUsageLabel={sellerAiUsageLabel} voiceNotesLabel={voiceNotesLabel} />

      {!planState.sellerAiEnabled ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 md:p-5">
          <p className="font-black text-amber-900">Seller AI y notas de voz están disponibles en Pro/Premium.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">Puedes seguir vendiendo con link público y WhatsApp directo mientras evalúas el upgrade.</p>
        </section>
      ) : (
        <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <p className="font-black text-brand-dark">Tu plan permite operar Seller AI con contexto.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Revisa tus notas de voz y handoff para mejorar la confianza antes de WhatsApp.</p>
          <Link href={siteConfig.routes.sellerAi} className="mt-4 inline-flex h-11 items-center rounded-md border border-brand-border px-5 font-bold text-brand-dark hover:border-brand">
            Configurar Seller AI
          </Link>
        </section>
      )}
    </section>
  );
}
