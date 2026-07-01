import { CircleDollarSign, ExternalLink, Handshake, Link2, Store, WalletCards } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { getPublicStoreUrl } from "@/config/site";
import { formatCommissionMoney, partnerCommissionStatusLabel } from "@/lib/partner-commissions";
import {
  getCurrentUserPartnerPortal,
  getPartnerPortalAttributions,
  getPartnerPortalCommissions,
  getPartnerPortalLinks,
  getPartnerPortalSummary,
} from "@/lib/partner-portal";
import { cn } from "@/lib/ui";

type PartnerPortalSearchParams = {
  partnerId?: string;
  status?: string;
};

const attributionFilters = [
  { key: "all", label: "Todos" },
  { key: "signed-up", label: "Registrados" },
  { key: "active", label: "Activos" },
  { key: "paid", label: "Pagados" },
] as const;

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-BO") : "Pendiente";
}

function formatCommissionRate(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function statusLabel(status: string) {
  if (status === "SIGNED_UP") return "Registrado";
  if (status === "ACTIVE") return "Activo";
  if (status === "PAID") return "Pagado";
  if (status === "REWARD_PENDING") return "Reward pendiente";
  if (status === "REWARD_APPROVED") return "Reward aprobado";
  if (status === "REWARD_APPLIED") return "Reward aplicado";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

function statusClass(status: string) {
  if (status === "PAID" || status === "APPROVED") return "bg-brand-soft text-brand-dark";
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-800";
  if (status === "PENDING" || status === "SIGNED_UP") return "bg-amber-50 text-amber-800";
  return "bg-neutral-100 text-neutral-600";
}

function EmptyPartnerState() {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center">
      <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center shadow-sm md:p-8">
        <Handshake className="mx-auto size-10 text-brand" />
        <h1 className="mt-4 text-2xl font-black text-brand-dark">No tienes un partner vinculado todavia.</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-neutral-600">Pide al equipo de JAKAWI que vincule tu cuenta como partner.</p>
      </div>
    </section>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-dark">{value}</p>
      {detail ? <p className="mt-1 text-xs font-semibold text-neutral-500">{detail}</p> : null}
    </div>
  );
}

export default async function PartnerPortalPage({
  searchParams,
}: {
  searchParams: Promise<PartnerPortalSearchParams>;
}) {
  const params = await searchParams;
  const portal = await getCurrentUserPartnerPortal(params.partnerId);
  const partner = portal.partner;

  if (!partner) return <EmptyPartnerState />;

  const [summary, links, attributions, commissions] = await Promise.all([
    getPartnerPortalSummary(partner.id),
    getPartnerPortalLinks(partner.id),
    getPartnerPortalAttributions(partner.id),
    getPartnerPortalCommissions(partner.id),
  ]);

  const activeFilter: (typeof attributionFilters)[number]["key"] = attributionFilters.some((filter) => filter.key === params.status)
    ? (params.status as (typeof attributionFilters)[number]["key"])
    : "all";
  const filterBaseHref = portal.isSuperAdminView ? `/app/partner?partnerId=${encodeURIComponent(partner.id)}` : "/app/partner";
  const visibleAttributions = attributions.filter((attribution) => {
    if (activeFilter === "signed-up") return attribution.status === "SIGNED_UP";
    if (activeFilter === "active") return attribution.status === "ACTIVE";
    if (activeFilter === "paid") return attribution.status === "PAID";
    return true;
  });

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-brand-dark">Panel de partner</p>
            <h1 className="mt-1 break-words text-3xl font-black leading-tight text-brand-dark md:text-4xl">{partner.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-600">{partner.code}</span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-black", statusClass(partner.status))}>{partner.status}</span>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-dark">{formatCommissionRate(partner.commissionRateBps)} referencial</span>
              {portal.isSuperAdminView ? <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-black text-white">Vista superadmin</span> : null}
            </div>
          </div>
          <div className="rounded-md bg-white px-4 py-3 text-sm font-semibold leading-6 text-neutral-600 lg:max-w-sm">
            Las comisiones se aprueban y pagan manualmente por JAKAWI.
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Comercios registrados" value={summary.registeredStores} />
        <StatCard label="Comercios activos" value={summary.activeStores} />
        <StatCard label="Comercios pagados" value={summary.paidStores} />
        <StatCard label="Comisiones pendientes" value={summary.commissionStats.PENDING.count} detail={formatCommissionMoney(summary.commissionStats.PENDING.amountCents)} />
        <StatCard label="Comisiones aprobadas" value={summary.commissionStats.APPROVED.count} detail={formatCommissionMoney(summary.commissionStats.APPROVED.amountCents)} />
        <StatCard label="Comisiones pagadas" value={summary.commissionStats.PAID.count} detail={formatCommissionMoney(summary.commissionStats.PAID.amountCents)} />
        <StatCard label="Total pendiente" value={formatCommissionMoney(summary.commissionStats.PENDING.amountCents)} />
        <StatCard label="Total aprobado" value={formatCommissionMoney(summary.commissionStats.APPROVED.amountCents)} />
        <StatCard label="Total pagado" value={formatCommissionMoney(summary.commissionStats.PAID.amountCents)} />
      </div>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <h2 className="text-xl font-black text-brand-dark">Mis links</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Comparte estos enlaces. JAKAWI guarda la atribucion antes de enviar al destino.</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-brand-border bg-white p-3">
          <p className="text-xs font-black uppercase text-neutral-500">Link principal</p>
          <a href={links.mainLink} target="_blank" className="mt-2 block break-all text-sm font-bold text-brand-dark hover:text-brand">
            {links.mainLink}
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={links.mainLink} />
            <a href={links.mainLink} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand">
              <ExternalLink className="size-4" />
              Abrir
            </a>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {links.destinations.map((destination) => (
            <article key={destination.id} className="rounded-md border border-brand-border bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-sm font-black text-brand-dark">{destination.label}</h3>
                {destination.isDefault ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-black text-brand-dark">Default</span> : null}
              </div>
              <p className="mt-1 font-mono text-xs text-neutral-500">{destination.slug}</p>
              <p className="mt-3 text-xs font-black uppercase text-neutral-500">Destino</p>
              <p className="mt-1 break-all text-xs font-semibold text-neutral-600">{destination.targetUrl}</p>
              <p className="mt-3 text-xs font-black uppercase text-neutral-500">Link trackeado</p>
              <a href={destination.trackedLink} target="_blank" className="mt-1 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                {destination.trackedLink}
              </a>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={destination.trackedLink} />
                <a href={destination.trackedLink} target="_blank" className="inline-flex h-10 items-center justify-center rounded-md border border-brand-border bg-white px-3 text-brand-dark hover:border-brand" aria-label="Abrir destino">
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </article>
          ))}
          {links.destinations.length === 0 ? <div className="rounded-md border border-dashed border-brand-border bg-white px-3 py-5 text-sm font-semibold text-neutral-600">No hay destinos activos configurados.</div> : null}
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <Store className="mt-0.5 size-5 shrink-0 text-brand" />
            <div>
              <h2 className="text-xl font-black text-brand-dark">Comercios referidos</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600">Tiendas atribuidas a tus enlaces.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {attributionFilters.map((filter) => (
              <Link
                key={filter.key}
                href={filter.key === "all" ? filterBaseHref : `${filterBaseHref}${filterBaseHref.includes("?") ? "&" : "?"}status=${filter.key}`}
                className={cn(
                  "rounded-md border border-brand-border bg-white px-3 py-2 text-xs font-black text-brand-dark hover:border-brand",
                  activeFilter === filter.key && "border-brand bg-brand-soft",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {visibleAttributions.map((attribution) => {
            const storeUrl = getPublicStoreUrl(attribution.store.slug);
            return (
              <article key={attribution.id} className="rounded-md border border-brand-border bg-white p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-black text-brand-dark">{attribution.store.name}</h3>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(attribution.status))}>{statusLabel(attribution.status)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">/{attribution.store.slug}</p>
                    <p className="mt-2 break-all text-xs font-semibold text-neutral-600">{attribution.store.owner.email}</p>
                  </div>
                  <a href={storeUrl} target="_blank" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand">
                    <ExternalLink className="size-4" />
                    Ver espacio
                  </a>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Plan</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{attribution.store.plan} / {attribution.store.planStatus}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Destino/codigo</p>
                    <p className="mt-1 break-words text-sm font-black text-brand-dark">{attribution.partnerDestination?.label ?? attribution.partnerDestinationSlug ?? attribution.code ?? "Principal"}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Registro</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(attribution.signedUpAt ?? attribution.createdAt)}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Estado</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{statusLabel(attribution.status)}</p>
                  </div>
                </div>
              </article>
            );
          })}
          {visibleAttributions.length === 0 ? <div className="rounded-md border border-dashed border-brand-border bg-white px-3 py-6 text-center text-sm font-semibold text-neutral-600">Todavia no tienes comercios atribuidos.</div> : null}
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <WalletCards className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <h2 className="text-xl font-black text-brand-dark">Mis comisiones</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">Registro informativo de comisiones manuales.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {commissions.map((commission) => {
            const store = commission.store ?? commission.attribution?.store ?? null;
            return (
              <article key={commission.id} className="rounded-md border border-brand-border bg-white p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(commission.status))}>{partnerCommissionStatusLabel(commission.status)}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-black text-brand-dark">
                        <CircleDollarSign className="size-3.5" />
                        {formatCommissionMoney(commission.commissionAmountCents, commission.currency)}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words text-base font-black text-brand-dark">{commission.description ?? "Comision partner"}</h3>
                    {store ? <p className="mt-1 break-words text-sm font-semibold text-neutral-600">{store.name} / {store.slug}</p> : null}
                    {commission.paymentReference ? <p className="mt-2 break-all text-xs font-semibold text-neutral-500">Referencia: {commission.paymentReference}</p> : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Creada</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(commission.createdAt)}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Aprobada</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(commission.approvedAt)}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Pagada</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(commission.paidAt)}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Moneda</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{commission.currency}</p>
                  </div>
                </div>
              </article>
            );
          })}
          {commissions.length === 0 ? <div className="rounded-md border border-dashed border-brand-border bg-white px-3 py-6 text-center text-sm font-semibold text-neutral-600">Cuando JAKAWI apruebe comisiones, apareceran aqui.</div> : null}
        </div>
      </section>
    </section>
  );
}
