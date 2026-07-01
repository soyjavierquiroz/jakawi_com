import { CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import { PlanUsageCompactCard } from "@/components/dashboard/PlanUsageCompactCard";
import { getPlanPriceForCountry } from "@/config/regional-pricing";
import { siteConfig } from "@/config/site";
import { requireStore } from "@/lib/auth";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";
import { formatStorePaymentMoney, getStorePaymentsForOwner, storePaymentStatusLabel, storePaymentTypeLabel } from "@/lib/store-payments";
import { cn } from "@/lib/ui";

function formatDate(date: Date | null | undefined, locale: string) {
  return date ? date.toLocaleDateString(locale) : "Sin fecha";
}

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "CONFIRMED") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-600";
  if (status === "REFUNDED") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

export default async function PlanPage() {
  const { store } = await requireStore();
  const [productUsage, sellerAiUsage, payments] = await Promise.all([getProductUsage(store.id), getSellerAiUsage(store.id), getStorePaymentsForOwner(store.id)]);
  const planState = getStorePlanState(store);
  const price = getPlanPriceForCountry(planState.planCode, store.countryCode);
  const locale = store.locale ?? "es-BO";
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

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Pagos recientes</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Los pagos se registran manualmente por JAKAWI.</p>
          </div>
          <CreditCard className="size-5 shrink-0 text-brand" />
        </div>

        {payments.length === 0 ? (
          <p className="mt-4 rounded-md bg-brand-muted px-3 py-3 text-sm font-semibold text-neutral-600">Todavía no hay pagos registrados para tu negocio.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {payments.map((payment) => (
              <article key={payment.id} className="rounded-md bg-white px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-black leading-6 text-brand-dark">{formatStorePaymentMoney(payment.amountCents, payment.currency)}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">{payment.planKey ?? "Sin plan"} / {storePaymentTypeLabel(payment.paymentType)}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(payment.status))}>{storePaymentStatusLabel(payment.status)}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-neutral-600 sm:grid-cols-2">
                  <p>Fecha: {formatDate(payment.paidAt ?? payment.createdAt, locale)}</p>
                  <p>Periodo: {formatDate(payment.periodStart, locale)} - {formatDate(payment.periodEnd, locale)}</p>
                  {payment.externalReference ? <p className="break-words sm:col-span-2">Referencia externa: {payment.externalReference}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
