import { ExternalLink, Gift, HandCoins, TrendingUp } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { DataQualityBadge } from "@/components/admin/DataQualityBadge";
import { requireSuperAdmin } from "@/lib/admin";
import { getDataQualityForPartner, getDataQualityForPartnerDestination, getDataQualityForStore } from "@/lib/data-quality";
import {
  formatRate,
  formatRevenueRate,
  formatRevenueTotals,
  getAdminRevenueAttributionSummary,
  getTopRevenuePartnerDestinations,
  getTopRevenuePartners,
  getTopRevenueStoreReferrers,
  type RevenueMetricPeriod,
} from "@/lib/revenue-attribution-metrics";
import { getAdminSuggestedGrowthActionsSummary } from "@/lib/suggested-growth-actions";

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black leading-8 text-brand-dark">{value}</p>
      {detail ? <p className="mt-1 text-sm font-semibold text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function DataBadge({ period }: { period: RevenueMetricPeriod }) {
  if (period.clicks > 0 && period.clicks < 3) {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">Datos iniciales</span>;
  }
  if (period.signups < 1) {
    return <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-black text-neutral-600">Sin registros</span>;
  }
  if (period.paidStores < 1) {
    return <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-black text-neutral-600">Sin pagos confirmados</span>;
  }
  return <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-black text-brand-dark">Revenue confirmado</span>;
}

function MetricGrid({ period }: { period: RevenueMetricPeriod }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Clicks</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{period.clicks}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Registros</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{period.signups}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Tiendas pagadas</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{period.paidStores}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Pagos confirmados</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{period.confirmedPayments}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Click → registro</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{formatRate(period.clickToSignupRate, "Sin clicks")}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Registro → pago</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{formatRate(period.signupToPaymentRate, "Sin registros")}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Revenue por click</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{formatRevenueRate(period.revenuePerClick, "Sin clicks")}</p>
      </div>
      <div className="rounded-md bg-brand-muted px-3 py-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Revenue por registro</p>
        <p className="mt-1 text-sm font-black text-brand-dark">{formatRevenueRate(period.revenuePerSignup, "Sin registros")}</p>
      </div>
    </div>
  );
}

export default async function AdminRevenuePage() {
  await requireSuperAdmin();
  const [summary, partners, destinations, storeReferrers, suggestedActions] = await Promise.all([
    getAdminRevenueAttributionSummary(),
    getTopRevenuePartners({ rangeDays: 30, limit: 50 }),
    getTopRevenuePartnerDestinations({ rangeDays: 30, limit: 50 }),
    getTopRevenueStoreReferrers({ rangeDays: 30, limit: 50 }),
    getAdminSuggestedGrowthActionsSummary(),
  ]);

  const organic = summary.sourceBreakdown.find((source) => source.key === "ORGANIC");

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Revenue</h1>
          <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">Revenue real confirmado registrado manualmente. Demo, QA e interno quedan visibles en listados, pero fuera de estas métricas.</p>
        </div>
        <Link href="/app/admin/payments" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          <TrendingUp className="size-4" />
          Ver pagos
        </Link>
      </div>

      <AdminNav />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue real total" value={formatRevenueTotals(summary.totalRevenue)} detail={`${summary.confirmedPayments} pagos reales confirmados`} />
        <StatCard label="Revenue real 30 días" value={formatRevenueTotals(summary.last30DaysRevenue)} detail="Por confirmedAt, paidAt o fallback creado" />
        <StatCard label="Tiendas reales con pago" value={summary.confirmedStores} detail="Stores reales con pagos CONFIRMED positivos" />
        <StatCard label="Pagos reales confirmados" value={summary.confirmedPayments} detail="No incluye pending/cancelled/refunded ni demo/QA/internal" />
        <StatCard label="Revenue real partners" value={formatRevenueTotals(summary.partnerRevenue)} detail="sourceType PARTNER" />
        <StatCard label="Revenue real referidoras" value={formatRevenueTotals(summary.storeReferralRevenue)} detail="sourceType STORE_REFERRAL" />
        <StatCard label="Revenue real orgánico" value={formatRevenueTotals(summary.organicRevenue)} detail="Sin partner/store referral" />
        <StatCard label="Revenue real 7 días" value={formatRevenueTotals(summary.last7DaysRevenue)} detail="Actividad reciente" />
      </div>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black text-brand-dark">Data Quality v1</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Revenue excluido de métricas comerciales</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-neutral-600">Excluye DEMO/QA/INTERNAL según Data Quality v1. No borra ni modifica StorePayment; solo separa el headline comercial real.</p>
          </div>
          <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-black uppercase text-neutral-500">Transparencia</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Revenue demo/QA excluido" value={formatRevenueTotals(summary.excludedDemoQaRevenue)} detail="No mezclado con revenue real" />
          <StatCard label="Pagos excluidos" value={summary.excludedDemoQaPayments} detail="Confirmados positivos" />
          <StatCard label="Tiendas excluidas" value={summary.excludedDemoQaStores} detail="Con pago confirmado excluido" />
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-brand-dark">Acciones sugeridas</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">Sugerencias operativas sobre pagos confirmados. No crean comisiones ni recompensas automáticamente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/admin/commissions" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
              <HandCoins className="size-4" />
              Ver comisiones
            </Link>
            <Link href="/app/admin/rewards" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
              <Gift className="size-4" />
              Ver recompensas
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md bg-brand-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase text-neutral-500">Comisiones sugeridas</p>
            <p className="mt-1 text-xl font-black text-brand-dark">{suggestedActions.commissionSuggested}</p>
          </div>
          <div className="rounded-md bg-brand-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase text-neutral-500">Recompensas sugeridas</p>
            <p className="mt-1 text-xl font-black text-brand-dark">{suggestedActions.rewardSuggested}</p>
          </div>
          <div className="rounded-md bg-brand-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase text-neutral-500">Pagos cubiertos</p>
            <p className="mt-1 text-xl font-black text-brand-dark">{suggestedActions.covered}</p>
          </div>
          <div className="rounded-md bg-brand-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase text-neutral-500">Sin acción comercial</p>
            <p className="mt-1 text-xl font-black text-brand-dark">{suggestedActions.noAction}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Funnel general</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Click → registro → pago</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">Funnel atribuido a partners y tiendas referidoras.</p>
          </div>
          <DataBadge period={summary.attributedFunnel.total} />
        </div>
        <div className="mt-4">
          <MetricGrid period={summary.attributedFunnel.total} />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black text-brand-dark">Por partner</p>
          <h2 className="mt-1 text-2xl font-black text-brand-dark">Revenue confirmado atribuido a partners</h2>
        </div>
        {partners.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">Sin revenue confirmado atribuido a partners.</div>
        ) : (
          partners.map((partner) => (
            <article key={partner.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-black text-brand-dark">{partner.name}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-black text-neutral-600">{partner.code}</span>
                    <DataQualityBadge label={getDataQualityForPartner(partner)} />
                    <DataBadge period={partner.total} />
                  </div>
                  <p className="mt-2 text-3xl font-black text-brand-dark">{formatRevenueTotals(partner.total.revenue)}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">30 días: {formatRevenueTotals(partner.last30Days.revenue)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/app/partner?partnerId=${partner.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                    <ExternalLink className="size-4" />
                    Ver partner
                  </Link>
                  <Link href={`/app/admin/commissions?partnerId=${partner.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                    <HandCoins className="size-4" />
                    Ver comisiones
                  </Link>
                  <Link href="/app/admin/payments?filter=CONFIRMED" className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
                    Ver pagos
                  </Link>
                </div>
              </div>
              {suggestedActions.partnerPending.get(partner.id) ? (
                <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p>Hay pagos confirmados sin comisión relacionada para este partner.</p>
                    <Link href={suggestedActions.partnerPending.get(partner.id)?.ctaHref ?? `/app/admin/commissions?partnerId=${partner.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
                      <HandCoins className="size-4" />
                      Crear comisión sugerida
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <MetricGrid period={partner.total} />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black text-brand-dark">Por destino partner</p>
          <h2 className="mt-1 text-2xl font-black text-brand-dark">Revenue confirmado por destino</h2>
        </div>
        {destinations.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">Sin revenue confirmado por destino partner.</div>
        ) : (
          destinations.map((destination) => (
            <article key={destination.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-black text-brand-dark">{destination.label}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-neutral-600">{destination.partnerName}</span>
                    <DataQualityBadge label={getDataQualityForPartnerDestination({ ...destination, partner: { code: destination.partnerCode, name: destination.partnerName } })} />
                    <DataBadge period={destination.total} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-neutral-500">{destination.partnerCode}/{destination.slug}</p>
                  <p className="mt-2 break-all text-xs font-semibold text-neutral-600">{destination.targetUrl}</p>
                  <p className="mt-3 text-2xl font-black text-brand-dark">{formatRevenueTotals(destination.total.revenue)}</p>
                </div>
              </div>
              <div className="mt-4">
                <MetricGrid period={destination.total} />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black text-brand-dark">Por tienda referidora</p>
          <h2 className="mt-1 text-2xl font-black text-brand-dark">Revenue confirmado generado por referidos</h2>
        </div>
        {storeReferrers.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">Sin revenue confirmado atribuido a tiendas referidoras.</div>
        ) : (
          storeReferrers.map((store) => (
            <article key={store.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-black text-brand-dark">{store.name}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-black text-neutral-600">{store.slug}</span>
                    <DataQualityBadge label={getDataQualityForStore(store)} />
                    <DataBadge period={store.total} />
                  </div>
                  <p className="mt-2 text-3xl font-black text-brand-dark">{formatRevenueTotals(store.total.revenue)}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">Recompensas aprobadas/aplicadas: {store.approvedRewards} / {store.appliedRewards}</p>
                </div>
                <Link href={`/app/admin/rewards?referrerStoreId=${store.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                  <Gift className="size-4" />
                  Ver recompensas
                </Link>
              </div>
              {suggestedActions.referrerStorePending.get(store.id) ? (
                <div className="mt-4 rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-dark">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p>Hay pagos confirmados sin recompensa relacionada para esta tienda referidora.</p>
                    <Link href={suggestedActions.referrerStorePending.get(store.id)?.ctaHref ?? `/app/admin/rewards?referrerStoreId=${store.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
                      <Gift className="size-4" />
                      Crear recompensa sugerida
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <MetricGrid period={store.total} />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Orgánico / sin atribución</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Pagos confirmados no atribuidos a partner o referidor</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">Incluye stores sin atribución comercial partner/store referral o sourceType ORGANIC.</p>
          </div>
          {organic ? <DataBadge period={organic.total} /> : null}
        </div>
        {organic ? (
          <div className="mt-4">
            <MetricGrid period={organic.total} />
          </div>
        ) : null}
      </section>
    </section>
  );
}
