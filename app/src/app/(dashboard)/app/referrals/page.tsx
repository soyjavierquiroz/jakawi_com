import { ExternalLink, Gift, Network, UsersRound } from "lucide-react";
import { ShareKitCard } from "@/components/growth/ShareKitCard";
import { getStoreReferralLink } from "@/lib/acquisition/partners";
import { requireStore } from "@/lib/auth";
import { formatConversionContext, formatConversionRate } from "@/lib/growth-conversion-metrics";
import { buildGrowthQrFileName, buildStoreReferralShareText } from "@/lib/growth-share-copy";
import { getOwnerStoreReferralData, storeReferralRewardStatusLabel, storeReferralRewardTypeLabel } from "@/lib/store-referral-rewards";
import { cn } from "@/lib/ui";

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-BO") : "Sin fecha";
}

function rewardStatusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "APPROVED") return "bg-brand-soft text-brand-dark";
  if (status === "APPLIED") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-600";
  if (status === "EXPIRED") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

function attributionStatusLabel(status: string) {
  if (status === "SIGNED_UP") return "Registrado";
  if (status === "ACTIVE") return "Activo";
  if (status === "PAID") return "Plan pago";
  if (status === "REWARD_PENDING") return "Beneficio en revision";
  if (status === "REWARD_APPROVED") return "Beneficio aprobado";
  if (status === "REWARD_APPLIED") return "Beneficio aplicado";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

export default async function ReferralsPage() {
  const { store } = await requireStore();
  const referralUrl = getStoreReferralLink(store.slug);
  const [attributions, rewards, conversionStats] = await getOwnerStoreReferralData(store.id);
  const approvedBenefits = rewards.filter((reward) => reward.status === "APPROVED").length;
  const appliedBenefits = rewards.filter((reward) => reward.status === "APPLIED").length;

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Referidos</p>
          <h1 className="text-3xl font-black md:text-4xl">Referidos</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Comparte JAKAWI con otros negocios y revisa beneficios asociados.</p>
        </div>
        <a href={referralUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <ExternalLink className="size-4" />
          Abrir enlace
        </a>
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Invita negocios a JAKAWI</p>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-neutral-500">Los beneficios se revisan manualmente. La conversión muestra cuántos negocios se registraron después de visitar tu link.</p>
          </div>
          <Network className="size-5 shrink-0 text-brand" />
        </div>
        <div className="mt-4">
          <ShareKitCard
            title="Tu link de referido"
            description="Comparte tu enlace con otros negocios que quieren crear su espacio comercial y atender mejor por WhatsApp."
            url={referralUrl}
            shareText={buildStoreReferralShareText(store.name, referralUrl)}
            qrLabel={`Referido ${store.slug}`}
            downloadFileName={buildGrowthQrFileName("jakawi-referido", store.slug)}
          >
            <div className="rounded-md bg-brand-muted px-3 py-2">
              <p className="text-xs font-black uppercase text-neutral-500">Clicks registrados</p>
              <p className="mt-1 text-xl font-black text-brand-dark">{conversionStats.total.clicks}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-600">Conversion click → registro: {formatConversionRate(conversionStats.total.conversionRate)}. {formatConversionContext(conversionStats.total)}.</p>
            </div>
          </ShareKitCard>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-brand-dark">Clicks de mi link</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">Visitas al link.</p>
            </div>
            <Network className="size-5 shrink-0 text-brand" />
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{conversionStats.total.clicks}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div>
            <p className="text-sm font-black text-brand-dark">Negocios registrados desde mi link</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Registros atribuidos.</p>
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{conversionStats.total.signups}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div>
            <p className="text-sm font-black text-brand-dark">Conversión</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Click → registro.</p>
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{formatConversionRate(conversionStats.total.conversionRate)}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">{formatConversionContext(conversionStats.total)}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-brand-dark">Clicks 30 días</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">Tráfico reciente.</p>
            </div>
            <UsersRound className="size-5 shrink-0 text-brand" />
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{conversionStats.last30Days.clicks}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div>
            <p className="text-sm font-black text-brand-dark">Registros 30 días</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Conversión 30 días: {formatConversionRate(conversionStats.last30Days.conversionRate)}</p>
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{conversionStats.last30Days.signups}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-brand-dark">Mis beneficios</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">Beneficios internos registrados por JAKAWI.</p>
            </div>
            <Gift className="size-5 shrink-0 text-brand" />
          </div>
          <p className="mt-3 text-2xl font-black text-brand-dark">{approvedBenefits} / {appliedBenefits}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">Aprobados / aplicados</p>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Negocios referidos</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Actividad de tu enlace</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {attributions.length === 0 ? (
            <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">Todavía no tienes negocios referidos.</div>
          ) : (
            attributions.map((attribution) => (
              <article key={attribution.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="min-w-0 break-words text-lg font-black leading-6 text-brand-dark">{attribution.store.name}</h3>
                      <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-black text-brand-dark">{attributionStatusLabel(attribution.status)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">{attribution.store.slug}</p>
                    <p className="mt-3 text-sm font-semibold text-neutral-600">Plan {attribution.store.plan} / {attribution.store.planStatus}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                    <p>Registro: {formatDate(attribution.signedUpAt)}</p>
                    <p>Activacion: {formatDate(attribution.activatedAt)}</p>
                    <p>Plan pago: {formatDate(attribution.paidAt)}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Mis beneficios</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Beneficios asociados</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {rewards.length === 0 ? (
            <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">Cuando JAKAWI apruebe beneficios, aparecerán aquí.</div>
          ) : (
            rewards.map((reward) => (
              <article key={reward.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="min-w-0 break-words text-lg font-black leading-6 text-brand-dark">{reward.valueLabel ?? storeReferralRewardTypeLabel(reward.rewardType)}</h3>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", rewardStatusClass(reward.status))}>{storeReferralRewardStatusLabel(reward.status)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-neutral-500">{storeReferralRewardTypeLabel(reward.rewardType)}</p>
                    {reward.referredStore ? <p className="mt-3 text-sm font-semibold text-neutral-600">Referido asociado: {reward.referredStore.name}</p> : null}
                    {reward.applicationReference ? (
                      <div className="mt-3 rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Referencia</p>
                        <p className="mt-1 break-words text-xs font-bold text-brand-dark">{reward.applicationReference}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                    <p>Creado: {formatDate(reward.createdAt)}</p>
                    <p>Aprobado: {formatDate(reward.approvedAt)}</p>
                    <p>Aplicado: {formatDate(reward.appliedAt)}</p>
                    <p>Expira: {formatDate(reward.expiresAt)}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
