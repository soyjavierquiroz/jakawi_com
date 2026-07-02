import { CheckCircle2, ExternalLink, HandCoins, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { DataQualityBadge } from "@/components/admin/DataQualityBadge";
import { CopyButton } from "@/components/CopyButton";
import { ShareKitCard } from "@/components/growth/ShareKitCard";
import {
  createPartnerAction,
  createPartnerDestinationAction,
  linkPartnerPortalUserAction,
  setDefaultPartnerDestinationAction,
  unlinkPartnerPortalUserAction,
  updatePartnerDestinationStatusAction,
  updatePartnerStatusAction,
} from "@/lib/actions";
import { getAdminPartnerRows, requireSuperAdmin } from "@/lib/admin";
import { getPartnerDestinationReferralLink, getPartnerReferralLink } from "@/lib/acquisition/partners";
import { getDataQualityForPartner, getDataQualityForPartnerDestination } from "@/lib/data-quality";
import { formatConversionContext, formatConversionRate, type GrowthConversionPeriod } from "@/lib/growth-conversion-metrics";
import { buildGrowthQrFileName, buildPartnerDestinationShareText, buildPartnerShareText } from "@/lib/growth-share-copy";
import { formatCommissionMoney } from "@/lib/partner-commissions";
import { formatRate, formatRevenueRate, formatRevenueTotals } from "@/lib/revenue-attribution-metrics";
import { cn } from "@/lib/ui";

type AdminPartnersSearchParams = {
  ok?: string;
  error?: string;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("es-BO");
}

function formatCommission(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function statusClass(status: string) {
  return status === "ACTIVE" ? "bg-brand-soft text-brand-dark" : "bg-neutral-100 text-neutral-600";
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Activo";
  if (status === "INACTIVE") return "Inactivo";
  return status;
}

function targetKindLabel(targetUrl: string) {
  return targetUrl.startsWith("/") ? "Destino interno" : "Destino externo";
}

function performanceEmptyText(period: GrowthConversionPeriod) {
  if (period.clicks === 0) return "Aún sin tráfico registrado.";
  if (period.signups === 0) return "Tráfico inicial, sin registros atribuidos todavía.";
  return formatConversionContext(period);
}

function PartnerStatusForm({ partnerId, status }: { partnerId: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={updatePartnerStatusAction}>
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
        {nextStatus === "ACTIVE" ? "Activar" : "Desactivar"}
      </button>
    </form>
  );
}

function DestinationStatusForm({ destinationId, status }: { destinationId: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={updatePartnerDestinationStatusAction}>
      <input type="hidden" name="destinationId" value={destinationId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button className="h-9 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
        {nextStatus === "ACTIVE" ? "Activar" : "Desactivar"}
      </button>
    </form>
  );
}

function SetDefaultDestinationForm({ destinationId, disabled }: { destinationId: string; disabled: boolean }) {
  return (
    <form action={setDefaultPartnerDestinationAction}>
      <input type="hidden" name="destinationId" value={destinationId} />
      <button disabled={disabled} className="h-9 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500">
        Default
      </button>
    </form>
  );
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<AdminPartnersSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const partners = await getAdminPartnerRows();

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Partners</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Canales comerciales con links configurables, portal read-only y comisiones manuales. No ejecuta pagos automáticos.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <form action={createPartnerAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Crear partner</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">El código se normaliza a letras, números y guiones.</p>
          </div>
          <UsersRound className="size-5 shrink-0 text-brand" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Nombre</span>
            <input name="name" required className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Código</span>
            <input name="code" placeholder="partner-demo" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Contacto</span>
            <input name="contactName" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Email</span>
            <input name="contactEmail" type="email" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Teléfono</span>
            <input name="contactPhone" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Comisión referencial bps</span>
            <input name="commissionRateBps" type="number" min="0" max="10000" defaultValue="2000" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Notas</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
          </label>
        </div>
        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <HandCoins className="size-4" />
          Crear partner
        </button>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{partners.length} partners</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {partners.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-8 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay partners creados. Crea el primer canal comercial para generar links y comisiones manuales.</div>
        ) : (
          partners.map((partner) => {
            const partnerLink = getPartnerReferralLink(partner.code);
            const bestDestination = [...partner.destinations]
              .filter((destination) => destination.conversionStats.total.clicks >= 3 && destination.conversionStats.total.signups > 0)
              .sort((a, b) => (b.conversionStats.total.conversionRate ?? 0) - (a.conversionStats.total.conversionRate ?? 0) || b.conversionStats.total.signups - a.conversionStats.total.signups)[0];
            return (
              <article key={partner.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.8fr)_minmax(220px,0.55fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{partner.name}</h2>
                      <DataQualityBadge label={getDataQualityForPartner(partner)} />
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(partner.status))}>{statusLabel(partner.status)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">{partner.code}</p>
                    <div className="mt-3 rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Link principal</p>
                      <a href={partnerLink} target="_blank" className="mt-1 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                        {partnerLink}
                      </a>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton value={partnerLink} />
                      <a href={partnerLink} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand">
                        <ExternalLink className="size-4" />
                        Abrir link
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Performance real</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-neutral-600">
                        <p>
                          <span className="block text-[10px] uppercase">Clicks</span>
                          <span className="font-black text-brand-dark">{partner.conversionStats.total.clicks}</span>
                        </p>
                        <p>
                          <span className="block text-[10px] uppercase">Registros</span>
                          <span className="font-black text-brand-dark">{partner.conversionStats.total.signups}</span>
                        </p>
                        <p>
                          <span className="block text-[10px] uppercase">Conversión</span>
                          <span className="font-black text-brand-dark">{formatConversionRate(partner.conversionStats.total.conversionRate)}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-neutral-600">Clicks → registros · {performanceEmptyText(partner.conversionStats.total)}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Performance real 30 días</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-neutral-600">
                        <p>
                          <span className="block text-[10px] uppercase">Clicks</span>
                          <span className="font-black text-brand-dark">{partner.conversionStats.last30Days.clicks}</span>
                        </p>
                        <p>
                          <span className="block text-[10px] uppercase">Registros</span>
                          <span className="font-black text-brand-dark">{partner.conversionStats.last30Days.signups}</span>
                        </p>
                        <p>
                          <span className="block text-[10px] uppercase">Conversión</span>
                          <span className="font-black text-brand-dark">{formatConversionRate(partner.conversionStats.last30Days.conversionRate)}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-neutral-600">{performanceEmptyText(partner.conversionStats.last30Days)}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Destino con mejor rendimiento</p>
                      <p className="mt-1 text-sm font-black text-brand-dark">{bestDestination?.label ?? "Datos iniciales"}</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-600">
                        {bestDestination ? `${formatConversionRate(bestDestination.conversionStats.total.conversionRate)} · ${bestDestination.conversionStats.total.clicks} clicks · ${bestDestination.conversionStats.total.signups} registros` : "Requiere al menos 3 clicks y registros atribuidos."}
                      </p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Revenue real atribuido</p>
                      <p className="mt-1 text-sm font-black text-brand-dark">{formatRevenueTotals(partner.revenueMetrics?.total.revenue)}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-neutral-600">
                        <p>
                          <span className="block text-[10px] uppercase">30 días</span>
                          <span className="font-black text-brand-dark">{formatRevenueTotals(partner.revenueMetrics?.last30Days.revenue)}</span>
                        </p>
                        <p>
                          <span className="block text-[10px] uppercase">Tiendas pagadas</span>
                          <span className="font-black text-brand-dark">{partner.revenueMetrics?.total.paidStores ?? 0}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-neutral-600">Registro → pago: {formatRate(partner.revenueMetrics?.total.signupToPaymentRate, "Sin registros")} · Revenue por registro: {formatRevenueRate(partner.revenueMetrics?.total.revenuePerSignup, "Sin registros")}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Contacto</p>
                      <p className="mt-1 truncate text-sm font-black text-brand-dark">{partner.contactName ?? "Sin contacto"}</p>
                      <p className="truncate text-xs font-semibold text-neutral-600">{partner.contactEmail ?? "Sin email"}</p>
                      <p className="truncate text-xs font-semibold text-neutral-600">{partner.contactPhone ?? "Sin teléfono"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Comisión referencial</p>
                        <p className="mt-1 font-black text-brand-dark">{formatCommission(partner.commissionRateBps)}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Tiendas</p>
                        <p className="mt-1 font-black text-brand-dark">{partner._count.attributions}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Comisiones</p>
                      <div className="mt-2 grid gap-2 text-xs font-semibold text-neutral-600">
                        <p className="flex justify-between gap-2">
                          <span>Pendientes</span>
                          <span className="font-black text-brand-dark">{partner.commissionStats.PENDING.count} / {formatCommissionMoney(partner.commissionStats.PENDING.amountCents)}</span>
                        </p>
                        <p className="flex justify-between gap-2">
                          <span>Aprobadas</span>
                          <span className="font-black text-brand-dark">{partner.commissionStats.APPROVED.count} / {formatCommissionMoney(partner.commissionStats.APPROVED.amountCents)}</span>
                        </p>
                        <p className="flex justify-between gap-2">
                          <span>Pagadas</span>
                          <span className="font-black text-brand-dark">{partner.commissionStats.PAID.count} / {formatCommissionMoney(partner.commissionStats.PAID.amountCents)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Portal</p>
                      {partner.portalUser ? (
                        <div className="mt-1">
                          <p className="truncate text-sm font-black text-brand-dark">{partner.portalUser.email}</p>
                          <p className="text-xs font-semibold text-neutral-600">{partner.portalUser.role}</p>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-black text-neutral-500">Sin usuario vinculado. Vincula un email para que vea su portal read-only.</p>
                      )}
                      <form action={linkPartnerPortalUserAction} className="mt-3 grid gap-2">
                        <input type="hidden" name="partnerId" value={partner.id} />
                        <input name="email" type="email" placeholder="usuario@jakawi.com" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-semibold outline-none focus:border-brand" />
                        <button className="h-10 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Vincular usuario</button>
                      </form>
                      {partner.portalUser ? (
                        <form action={unlinkPartnerPortalUserAction} className="mt-2">
                          <input type="hidden" name="partnerId" value={partner.id} />
                          <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">Quitar acceso</button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Creado</p>
                      <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(partner.createdAt)}</p>
                    </div>
                    <Link href={`/app/admin/commissions?partnerId=${partner.id}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                      <HandCoins className="size-4" />
                      Ver comisiones
                    </Link>
                    <Link href={`/app/admin/commissions?partnerId=${partner.id}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
                      <Plus className="size-4" />
                      Nueva comisión
                    </Link>
                    <Link href={`/app/partner?partnerId=${partner.id}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                      <ExternalLink className="size-4" />
                      Ver portal
                    </Link>
                    <PartnerStatusForm partnerId={partner.id} status={partner.status} />
                  </div>
                </div>

                <details className="mt-5 rounded-md border border-brand-border bg-white p-3">
                  <summary className="cursor-pointer text-sm font-black text-brand-dark">Ver QR y texto para compartir</summary>
                  <div className="mt-3 grid gap-3">
                    <ShareKitCard
                      title="Link principal"
                      description="Kit operativo para copiar o compartir el link principal del partner."
                      url={partnerLink}
                      shareText={buildPartnerShareText(partner.name, partnerLink)}
                      qrLabel={`Partner ${partner.code}`}
                      compact
                      downloadFileName={buildGrowthQrFileName("jakawi-partner", partner.code)}
                    >
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Partner</p>
                        <p className="mt-1 break-words text-sm font-black text-brand-dark">{partner.name}</p>
                        <p className="mt-1 font-mono text-xs font-semibold text-neutral-600">{partner.code}</p>
                      </div>
                    </ShareKitCard>

                    {partner.destinations.length > 0 ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {partner.destinations.map((destination) => {
                          const destinationLink = getPartnerDestinationReferralLink(partner.code, destination.slug);
                          return (
                            <ShareKitCard
                              key={destination.id}
                              title={destination.label}
                              description="Kit compacto para compartir este destino del partner."
                              url={destinationLink}
                              shareText={buildPartnerDestinationShareText(partner.name, destination.label, destinationLink)}
                              qrLabel={destination.label}
                              compact
                              downloadFileName={buildGrowthQrFileName("jakawi-partner", partner.code, destination.slug)}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <DataQualityBadge label={getDataQualityForPartnerDestination({ ...destination, partner })} />
                                {destination.isDefault ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-black text-brand-dark">Default</span> : null}
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", statusClass(destination.status))}>{statusLabel(destination.status)}</span>
                              </div>
                              <div className="mt-3 rounded-md bg-brand-muted px-3 py-2">
                                <p className="text-[11px] font-black uppercase text-neutral-500">Target URL</p>
                                <p className="mt-1 break-all text-xs font-semibold text-neutral-700">{destination.targetUrl}</p>
                              </div>
                            </ShareKitCard>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-brand-border bg-brand-muted px-3 py-4 text-sm font-semibold text-neutral-600">Sin destinos configurados para compartir.</div>
                    )}
                  </div>
                </details>

                <div className="mt-5 border-t border-brand-border pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-brand-dark">Destinos</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-500">Cada destino genera un link trackeado y luego redirige al target configurado.</p>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-500">{partner.destinations.length} destinos</span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {partner.destinations.map((destination) => {
                      const destinationLink = getPartnerDestinationReferralLink(partner.code, destination.slug);
                      return (
                        <div key={destination.id} className="rounded-md border border-brand-border bg-white p-3">
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.45fr)_auto] lg:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-sm font-black text-brand-dark">{destination.label}</p>
                                <DataQualityBadge label={getDataQualityForPartnerDestination({ ...destination, partner })} />
                                {destination.isDefault ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-black text-brand-dark">
                                    <CheckCircle2 className="size-3" />
                                    Default
                                  </span>
                                ) : null}
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", statusClass(destination.status))}>{statusLabel(destination.status)}</span>
                              </div>
                              <p className="mt-1 font-mono text-xs text-neutral-500">{destination.slug}</p>
                              <a href={destinationLink} target="_blank" className="mt-2 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                                {destinationLink}
                              </a>
                            </div>
                            <div className="min-w-0 rounded-md bg-brand-muted px-3 py-2">
                              <p className="text-[11px] font-black uppercase text-neutral-500">Target URL</p>
                              <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-neutral-500">{targetKindLabel(destination.targetUrl)}</span>
                              <p className="mt-1 break-all text-xs font-semibold text-neutral-700">{destination.targetUrl}</p>
                              {destination.notes ? <p className="mt-2 break-words text-xs font-semibold text-neutral-500">{destination.notes}</p> : null}
                            </div>
                            <div className="rounded-md bg-brand-muted px-3 py-2">
                              <p className="text-[11px] font-black uppercase text-neutral-500">Performance real</p>
                              <p className="mt-1 text-sm font-black text-brand-dark">{formatConversionRate(destination.conversionStats.total.conversionRate)}</p>
                              <p className="mt-1 text-xs font-semibold text-neutral-600">{destination.conversionStats.total.clicks} clicks · {destination.conversionStats.total.signups} registros</p>
                              <p className="mt-1 text-xs font-semibold text-neutral-600">30 días: {destination.conversionStats.last30Days.clicks} clicks · {destination.conversionStats.last30Days.signups} registros · {formatConversionRate(destination.conversionStats.last30Days.conversionRate)}</p>
                              <p className="mt-1 text-xs font-semibold text-neutral-600">{performanceEmptyText(destination.conversionStats.total)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <CopyButton value={destinationLink} />
                              <a href={destinationLink} target="_blank" className="inline-flex h-10 items-center justify-center rounded-md border border-brand-border bg-white px-3 text-brand-dark hover:border-brand" aria-label="Abrir destino">
                                <ExternalLink className="size-4" />
                              </a>
                              <SetDefaultDestinationForm destinationId={destination.id} disabled={destination.isDefault || destination.status !== "ACTIVE"} />
                              <DestinationStatusForm destinationId={destination.id} status={destination.status} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {partner.destinations.length === 0 ? <div className="rounded-md border border-dashed border-brand-border bg-white px-3 py-4 text-sm font-semibold text-neutral-600">Sin destinos configurados. Crea un destino para campañas, webinars o rutas específicas; el link principal sigue llevando a registro.</div> : null}
                  </div>

                  <form action={createPartnerDestinationAction} className="mt-4 rounded-md border border-brand-border bg-white p-3">
                    <input type="hidden" name="partnerId" value={partner.id} />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-1.5">
                        <span className="text-xs font-black uppercase text-neutral-500">Nombre visible</span>
                        <input name="label" required placeholder="Webinar" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-black uppercase text-neutral-500">Slug</span>
                        <input name="slug" placeholder="webinar" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5 md:col-span-2">
                        <span className="text-xs font-black uppercase text-neutral-500">Target URL</span>
                        <input name="targetUrl" required placeholder="https://webinar.jakawi.com" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-black uppercase text-neutral-500">Notas</span>
                        <input name="notes" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="flex h-10 items-center gap-2 self-end rounded-md border border-brand-border bg-brand-muted px-3 text-sm font-black text-brand-dark">
                        <input name="isDefault" type="checkbox" className="size-4 accent-brand" />
                        Default
                      </label>
                    </div>
                    <button className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark">
                      <Plus className="size-4" />
                      Crear destino
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
