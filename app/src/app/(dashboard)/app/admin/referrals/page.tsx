import { ExternalLink, Gift, HandCoins, Search } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { getPublicStoreUrl } from "@/config/site";
import { updateAttributionStatusAction } from "@/lib/actions";
import { adminAttributionFilters, getAdminAttributionFilter, getAdminAttributionRows, getAdminGrowthConversionSummary, requireSuperAdmin } from "@/lib/admin";
import { formatConversionContext, formatConversionRate } from "@/lib/growth-conversion-metrics";
import { formatRevenueTotals, getAdminRevenueAttributionSummary, type RevenueCurrencyTotal } from "@/lib/revenue-attribution-metrics";
import { getSuggestedActionsForAttributions, type SuggestedGrowthAction } from "@/lib/suggested-growth-actions";
import { cn } from "@/lib/ui";

type AdminReferralsSearchParams = {
  ok?: string;
  error?: string;
  filter?: string;
  q?: string;
};

const attributionStatuses = ["SIGNED_UP", "ACTIVE", "PAID", "REWARD_PENDING", "REWARD_APPROVED", "REWARD_APPLIED", "CANCELLED"];

function buildQuery(params: { filter?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-BO") : "Sin fecha";
}

function sourceLabel(sourceType: string) {
  if (sourceType === "STORE_REFERRAL") return "Tienda referidora";
  if (sourceType === "PARTNER") return "Partner";
  if (sourceType === "ORGANIC") return "Orgánico";
  if (sourceType === "MANUAL") return "Manual";
  return sourceType;
}

function sourceDescription(sourceType: string) {
  if (sourceType === "STORE_REFERRAL") return "Referido por tienda";
  if (sourceType === "PARTNER") return "Canal partner";
  if (sourceType === "ORGANIC") return "Sin atribución comercial";
  if (sourceType === "MANUAL") return "Atribución manual";
  return "Atribución comercial";
}

function sourceClass(sourceType: string) {
  if (sourceType === "PARTNER") return "bg-brand-soft text-brand-dark";
  if (sourceType === "STORE_REFERRAL") return "bg-brand-muted text-brand-dark";
  if (sourceType === "ORGANIC") return "bg-neutral-100 text-neutral-600";
  return "bg-amber-50 text-amber-800";
}

function attributionStatusLabel(status: string) {
  if (status === "SIGNED_UP") return "Registrada";
  if (status === "ACTIVE") return "Activa";
  if (status === "PAID") return "Pagada";
  if (status === "REWARD_PENDING") return "Beneficio pendiente";
  if (status === "REWARD_APPROVED") return "Beneficio aprobado";
  if (status === "REWARD_APPLIED") return "Beneficio aplicado";
  if (status === "CANCELLED") return "Cancelada";
  return status;
}

function AttributionStatusForm({ attributionId, status, notes }: { attributionId: string; status: string; notes: string | null }) {
  return (
    <form action={updateAttributionStatusAction} className="space-y-2">
      <input type="hidden" name="attributionId" value={attributionId} />
      <select name="status" defaultValue={status} className="h-10 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark">
        {attributionStatuses.map((value) => (
          <option key={value} value={value}>
            {attributionStatusLabel(value)}
          </option>
        ))}
      </select>
      <input name="notes" defaultValue={notes ?? ""} placeholder="Notas manuales" className="h-10 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark" />
      <button className="h-10 w-full rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Cambiar estado</button>
    </form>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black leading-8 text-brand-dark">{value}</p>
      {detail ? <p className="mt-1 text-sm font-semibold text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function paymentRevenueTotals(payments: { amountCents: number; currency: string }[]): RevenueCurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const payment of payments) {
    const currency = (payment.currency ?? "BOB").toUpperCase();
    totals.set(currency, (totals.get(currency) ?? 0) + payment.amountCents);
  }
  return [...totals.entries()].map(([currency, amountCents]) => ({ currency, amountCents }));
}

function suggestedActionClass(action: SuggestedGrowthAction) {
  if (action.status === "SUGGESTED" && action.kind === "PARTNER_COMMISSION") return "bg-amber-50 text-amber-800";
  if (action.status === "SUGGESTED" && action.kind === "STORE_REWARD") return "bg-brand-soft text-brand-dark";
  if (action.status === "COVERED") return "bg-green-50 text-green-700";
  if (action.status === "NEEDS_REVIEW") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

function SuggestedActionCard({ action }: { action: SuggestedGrowthAction | null | undefined }) {
  if (!action) return null;

  return (
    <div className="rounded-md bg-brand-muted px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-black uppercase text-neutral-500">Acción sugerida</p>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", suggestedActionClass(action))}>{action.label}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-neutral-600">{action.description}</p>
      {action.ctaHref ? (
        <Link href={action.ctaHref} className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
          {action.kind === "PARTNER_COMMISSION" ? <HandCoins className="size-4" /> : <Gift className="size-4" />}
          {action.ctaLabel ?? "Abrir acción"}
        </Link>
      ) : null}
    </div>
  );
}

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<AdminReferralsSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const activeFilter = getAdminAttributionFilter(params.filter);
  const q = params.q?.trim() ?? "";
  const [rows, conversionSummary, revenueSummary] = await Promise.all([
    getAdminAttributionRows({ filter: activeFilter, q }),
    getAdminGrowthConversionSummary(),
    getAdminRevenueAttributionSummary(),
  ]);
  const suggestedActions = await getSuggestedActionsForAttributions(rows.map((row) => row.id));

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Referidos y atribuciones</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Tiendas que recomiendan JAKAWI, canales partner y registros orgánicos. Sin pagos automáticos.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clicks totales" value={conversionSummary.all.total.clicks} detail="Links de partners y tiendas" />
        <MetricCard label="Registros atribuidos" value={conversionSummary.all.total.signups} detail="No incluye orgánico" />
        <MetricCard label="Conversión total" value={formatConversionRate(conversionSummary.all.total.conversionRate)} detail={formatConversionContext(conversionSummary.all.total)} />
        <MetricCard label="Conversión 30 días" value={formatConversionRate(conversionSummary.all.last30Days.conversionRate)} detail={formatConversionContext(conversionSummary.all.last30Days)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue atribuido total" value={formatRevenueTotals(revenueSummary.attributedFunnel.total.revenue)} detail="Partners y tiendas referidoras" />
        <MetricCard label="Revenue partners" value={formatRevenueTotals(revenueSummary.partnerRevenue)} detail="Atribuido a partner" />
        <MetricCard label="Revenue tiendas referidoras" value={formatRevenueTotals(revenueSummary.storeReferralRevenue)} detail="Atribuido a tienda referidora" />
        <MetricCard label="Revenue orgánico" value={formatRevenueTotals(revenueSummary.organicRevenue)} detail="Orgánico / sin atribución" />
      </div>

      <form action="/app/admin/referrals" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda, owner, partner, codigo o referidor..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex flex-wrap gap-2 pb-1">
        {adminAttributionFilters.map((filter) => (
          <Link
            key={filter.key}
            href={`/app/admin/referrals${buildQuery({ filter: filter.key, q })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeFilter === filter.key && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{rows.length} atribuciones</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
            <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay atribuciones para esta búsqueda. Prueba otro filtro o revisa nuevos registros desde tiendas, partners u orgánico.</div>
        ) : (
          rows.map((row) => {
            const publicUrl = getPublicStoreUrl(row.store.slug);
            const sourceName = row.partner ? `${row.partner.name} (${row.partner.code})` : row.referrerStore ? `${row.referrerStore.name} (${row.referrerStore.slug})` : sourceDescription(row.sourceType);
            const destinationLabel = row.partnerDestination ? `${row.partnerDestination.label} (${row.partnerDestination.slug})` : row.partnerDestinationSlug ?? row.landingPath ?? "Sin destino";
            const confirmedRevenue = paymentRevenueTotals(row.store.payments);
            const hasConfirmedPayment = row.store.payments.length > 0;
            const suggestedAction = suggestedActions.get(row.id);
            const revenueLabel =
              row.sourceType === "PARTNER"
                ? "Pago confirmado atribuido a partner"
                : row.sourceType === "STORE_REFERRAL"
                  ? "Pago confirmado atribuido a tienda referidora"
                  : "Pago confirmado orgánico / sin atribución";

            return (
              <article key={row.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(220px,0.65fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{row.store.name}</h2>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", sourceClass(row.sourceType))}>{sourceLabel(row.sourceType)}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-neutral-600">{sourceDescription(row.sourceType)}</p>
                    <p className="mt-1 font-mono text-xs text-neutral-500">{row.store.slug}</p>
                    <p className="mt-2 break-all text-sm font-semibold text-neutral-700">{row.store.owner.email}</p>
                    <p className="text-xs font-semibold text-neutral-500">{row.store.owner.name ?? "Sin nombre"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={publicUrl} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-bold text-white hover:bg-brand">
                        <ExternalLink className="size-4" />
                        Abrir espacio
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Referidor / partner</p>
                      <p className="mt-1 break-words text-sm font-black text-brand-dark">{sourceName}</p>
                      <p className="mt-1 font-mono text-xs text-neutral-600">{row.code ?? "Sin código usado"}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Destino</p>
                      <p className="mt-1 break-words text-sm font-black text-brand-dark">{destinationLabel}</p>
                      {row.landingPath ? <p className="mt-1 break-all font-mono text-xs text-neutral-600">{row.landingPath}</p> : null}
                    </div>
                    {row.sourceType === "PARTNER" || row.sourceType === "STORE_REFERRAL" ? (
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Conversión click → registro</p>
                        <p className="mt-1 text-sm font-black text-brand-dark">{formatConversionRate(row.growthConversionStats.total.conversionRate)}</p>
                        <p className="mt-1 text-xs font-semibold text-neutral-600">{row.growthConversionStats.total.clicks} clicks · {row.growthConversionStats.total.signups} registros atribuidos</p>
                        <p className="mt-1 text-xs font-semibold text-neutral-600">30 días: {formatConversionRate(row.growthConversionStats.last30Days.conversionRate)} · {formatConversionContext(row.growthConversionStats.last30Days)}</p>
                      </div>
                    ) : (
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Conversión click → registro</p>
                        <p className="mt-1 text-sm font-black text-neutral-500">{row.sourceType === "ORGANIC" ? "No aplica para orgánico" : "No aplica"}</p>
                      </div>
                    )}
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Revenue confirmado</p>
                      <p className="mt-1 text-sm font-black text-brand-dark">{hasConfirmedPayment ? formatRevenueTotals(confirmedRevenue) : "Sin pagos confirmados"}</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-600">{hasConfirmedPayment ? revenueLabel : "Esta tienda todavía no tiene pago confirmado en el ledger."}</p>
                    </div>
                    <SuggestedActionCard action={suggestedAction} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Estado</p>
                        <p className="mt-1 truncate font-black text-brand-dark">{attributionStatusLabel(row.status)}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Plan</p>
                        <p className="mt-1 font-black text-brand-dark">{row.store.plan}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                      <p>Registro: {formatDate(row.signedUpAt)}</p>
                      <p>Activacion: {formatDate(row.activatedAt)}</p>
                      <p>Pago: {formatDate(row.paidAt)}</p>
                    </div>
                    <AttributionStatusForm attributionId={row.id} status={row.status} notes={row.notes} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
