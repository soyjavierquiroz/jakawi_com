import { Ban, CheckCircle2, CreditCard, HandCoins, Pencil, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { createPartnerCommissionAction, updatePartnerCommissionNotesAction, updatePartnerCommissionStatusAction } from "@/lib/actions";
import { requireSuperAdmin } from "@/lib/admin";
import {
  formatCommissionMoney,
  getAdminCommissionFormOptions,
  getAdminCommissions,
  getPartnerCommissionStats,
  getPartnerCommissionStatus,
  partnerCommissionStatusLabel,
  partnerCommissionStatuses,
} from "@/lib/partner-commissions";
import { cn } from "@/lib/ui";

type AdminCommissionsSearchParams = {
  ok?: string;
  error?: string;
  status?: string;
  q?: string;
  partnerId?: string;
  attributionId?: string;
  storeId?: string;
};

function buildQuery(params: { status?: string; q?: string; partnerId?: string; attributionId?: string; storeId?: string }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.partnerId) search.set("partnerId", params.partnerId);
  if (params.attributionId) search.set("attributionId", params.attributionId);
  if (params.storeId) search.set("storeId", params.storeId);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-BO") : "Sin fecha";
}

function formatDateTime(date: Date | null | undefined) {
  return date ? date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha";
}

function formatRate(rateBps: number | null | undefined) {
  if (rateBps === null || rateBps === undefined) return "Sin porcentaje";
  return `${(rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 2)}%`;
}

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "APPROVED") return "bg-brand-soft text-brand-dark";
  if (status === "PAID") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-600";
  if (status === "REVERSED") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black leading-8 text-brand-dark">{value}</p>
      {detail ? <p className="mt-1 text-sm font-semibold text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function StatusActionForm({
  commissionId,
  status,
  label,
  returnTo,
  icon,
  paymentReference,
}: {
  commissionId: string;
  status: string;
  label: string;
  returnTo: string;
  icon: "approve" | "pay" | "cancel" | "reverse";
  paymentReference?: string | null;
}) {
  const Icon = icon === "approve" ? CheckCircle2 : icon === "pay" ? CreditCard : icon === "cancel" ? Ban : RotateCcw;
  const needsPaymentReference = status === "PAID";

  return (
    <form action={updatePartnerCommissionStatusAction} className="rounded-md border border-brand-border bg-white p-2">
      <input type="hidden" name="commissionId" value={commissionId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {needsPaymentReference ? (
        <input
          name="paymentReference"
          defaultValue={paymentReference ?? ""}
          placeholder="Referencia de pago"
          className="mb-2 h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand"
        />
      ) : null}
      <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
        <Icon className="size-3.5" />
        {label}
      </button>
    </form>
  );
}

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<AdminCommissionsSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const activeStatus = getPartnerCommissionStatus(params.status);
  const q = params.q?.trim() ?? "";
  const returnTo = `/app/admin/commissions${buildQuery({
    status: activeStatus,
    q,
    partnerId: params.partnerId,
    attributionId: params.attributionId,
    storeId: params.storeId,
  })}`;

  const [rows, stats, formOptions] = await Promise.all([
    getAdminCommissions({ status: activeStatus, q, partnerId: params.partnerId }),
    getPartnerCommissionStats(params.partnerId),
    getAdminCommissionFormOptions({
      partnerId: params.partnerId,
      attributionId: params.attributionId,
      storeId: params.storeId,
    }),
  ]);

  const selectedAttribution = formOptions.selectedAttribution;
  const selectedStore = formOptions.selectedStore ?? selectedAttribution?.store ?? null;
  const selectedPartner = formOptions.selectedPartner;
  const suggestedRate = selectedPartner?.commissionRateBps ?? selectedAttribution?.partner?.commissionRateBps ?? null;

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Comisiones</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Control manual de comisiones para partners. No ejecuta pagos automáticos.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Pendientes" value={stats.PENDING.count} />
        <StatCard label="Aprobadas" value={stats.APPROVED.count} />
        <StatCard label="Pagadas" value={stats.PAID.count} />
        <StatCard label="Canceladas/Reversadas" value={stats.CANCELLED.count + stats.REVERSED.count} />
        <StatCard label="Total pendiente" value={formatCommissionMoney(stats.PENDING.amountCents)} />
        <StatCard label="Total aprobado" value={formatCommissionMoney(stats.APPROVED.amountCents)} />
        <StatCard label="Total pagado" value={formatCommissionMoney(stats.PAID.amountCents)} />
      </div>

      <form action={createPartnerCommissionAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Comisión manual</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Se crea como pendiente y no ejecuta pagos automáticos.</p>
          </div>
          <HandCoins className="size-5 shrink-0 text-brand" />
        </div>

        {selectedAttribution || selectedStore ? (
          <div className="mt-4 grid gap-2 rounded-md border border-brand-border bg-white p-3 text-sm font-semibold text-neutral-600 md:grid-cols-2">
            {selectedPartner ? (
              <div>
                <p className="text-[11px] font-black uppercase text-neutral-500">Partner preseleccionado</p>
                <p className="mt-1 text-brand-dark">{selectedPartner.name} ({selectedPartner.code})</p>
              </div>
            ) : null}
            {selectedStore ? (
              <div>
                <p className="text-[11px] font-black uppercase text-neutral-500">Tienda asociada</p>
                <p className="mt-1 text-brand-dark">{selectedStore.name} ({selectedStore.slug})</p>
                <p className="text-xs text-neutral-500">{selectedStore.owner.email}</p>
              </div>
            ) : null}
            {selectedAttribution ? (
              <div className="md:col-span-2">
                <p className="text-[11px] font-black uppercase text-neutral-500">Atribución</p>
                <p className="mt-1 text-brand-dark">{selectedAttribution.id}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Partner</span>
            <select name="partnerId" required defaultValue={params.partnerId ?? selectedPartner?.id ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Seleccionar partner</option>
              {formOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} ({partner.code})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Monto comisión</span>
            <input name="commissionAmount" required inputMode="decimal" placeholder="100.00" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Moneda</span>
            <input name="currency" defaultValue="BOB" maxLength={3} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold uppercase outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Base</span>
            <input name="basisAmount" inputMode="decimal" placeholder="Opcional" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Rate bps</span>
            <input name="commissionRateBps" type="number" min="0" max="10000" defaultValue={suggestedRate ?? ""} placeholder="Opcional" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Atribución partner</span>
            <select name="attributionId" defaultValue={params.attributionId ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Sin atribución</option>
              {formOptions.recentPartnerAttributions.map((attribution) => (
                <option key={attribution.id} value={attribution.id}>
                  {attribution.store.name} / {attribution.partner?.name ?? "Partner"} / {formatDate(attribution.createdAt)}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="storeId" value={params.storeId ?? selectedAttribution?.storeId ?? ""} />

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Descripción</span>
            <input name="description" placeholder="Comisión demo, ajuste manual..." className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Notas</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
          </label>
        </div>

        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <HandCoins className="size-4" />
          Crear comisión pendiente
        </button>
      </form>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form action="/app/admin/commissions" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
          {activeStatus !== "all" ? <input type="hidden" name="status" value={activeStatus} /> : null}
          {params.partnerId ? <input type="hidden" name="partnerId" value={params.partnerId} /> : null}
          <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
            <Search className="size-4 shrink-0 text-neutral-500" />
            <input name="q" defaultValue={q} placeholder="Buscar partner, tienda, owner, estado o referencia..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
          </label>
        </form>
        <form action="/app/admin/commissions" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
          {activeStatus !== "all" ? <input type="hidden" name="status" value={activeStatus} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <select name="partnerId" defaultValue={params.partnerId ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
            <option value="">Todos los partners</option>
            {formOptions.partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
          <button className="mt-2 h-9 w-full rounded-md bg-brand-dark px-3 text-xs font-black text-white hover:bg-brand">Filtrar partner</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        <Link
          href={`/app/admin/commissions${buildQuery({ status: "all", q, partnerId: params.partnerId })}`}
          className={cn("inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark", activeStatus === "all" && "border-brand-dark bg-brand-dark text-white")}
        >
          Todos
        </Link>
        {partnerCommissionStatuses.map((status) => (
          <Link
            key={status}
            href={`/app/admin/commissions${buildQuery({ status, q, partnerId: params.partnerId })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeStatus === status && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {partnerCommissionStatusLabel(status)}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{rows.length} comisiones</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay comisiones para esta búsqueda. Crea una comisión manual desde un partner o una atribución partner.</div>
        ) : (
          rows.map((commission) => (
            <article key={commission.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)_minmax(260px,0.7fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{commission.partner.name}</h2>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(commission.status))}>{partnerCommissionStatusLabel(commission.status)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-neutral-500">{commission.partner.code}</p>
                  <p className="mt-3 text-3xl font-black leading-9 text-brand-dark">{formatCommissionMoney(commission.commissionAmountCents, commission.currency)}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">
                    Base {commission.basisAmountCents === null ? "sin registrar" : formatCommissionMoney(commission.basisAmountCents, commission.currency)} / {formatRate(commission.commissionRateBps)}
                  </p>
                  {commission.description ? <p className="mt-3 break-words text-sm font-bold text-neutral-700">{commission.description}</p> : null}
                </div>

                <div className="grid gap-2">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Tienda asociada</p>
                    {commission.store ? (
                      <>
                        <p className="mt-1 break-words text-sm font-black text-brand-dark">{commission.store.name}</p>
                        <p className="font-mono text-xs text-neutral-600">{commission.store.slug}</p>
                        <p className="truncate text-xs font-semibold text-neutral-600">{commission.store.owner.email}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-neutral-600">Ajuste solo partner</p>
                    )}
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Atribución</p>
                    {commission.attribution ? (
                      <>
                        <p className="mt-1 font-mono text-xs text-brand-dark">{commission.attribution.id}</p>
                        <p className="text-xs font-semibold text-neutral-600">{commission.attribution.partnerDestination?.label ?? commission.attribution.partnerDestinationSlug ?? "Sin destino"}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-neutral-600">Sin atribución</p>
                    )}
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                    <p>Creada: {formatDateTime(commission.createdAt)}</p>
                    <p>Aprobada: {formatDate(commission.approvedAt)}</p>
                    <p>Pagada manualmente: {formatDate(commission.paidAt)}</p>
                    <p>Cancelada/Reversada: {formatDate(commission.cancelledAt ?? commission.reversedAt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Referencia de pago</p>
                    <p className="mt-1 break-words text-sm font-black text-brand-dark">{commission.paymentReference ?? "Sin referencia"}</p>
                  </div>
                  {commission.notes ? <p className="rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">{commission.notes}</p> : null}

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <StatusActionForm commissionId={commission.id} status="APPROVED" label="Marcar aprobada" returnTo={returnTo} icon="approve" />
                    <StatusActionForm commissionId={commission.id} status="PAID" label="Marcar pagada" returnTo={returnTo} icon="pay" paymentReference={commission.paymentReference} />
                    <StatusActionForm commissionId={commission.id} status="CANCELLED" label="Cancelar" returnTo={returnTo} icon="cancel" />
                    <StatusActionForm commissionId={commission.id} status="REVERSED" label="Reversar" returnTo={returnTo} icon="reverse" />
                  </div>

                  <form action={updatePartnerCommissionNotesAction} className="rounded-md border border-brand-border bg-white p-2">
                    <input type="hidden" name="commissionId" value={commission.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <textarea name="notes" defaultValue={commission.notes ?? ""} rows={2} placeholder="Notas" className="w-full rounded-md border border-brand-border bg-white px-2 py-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                    <input name="paymentReference" defaultValue={commission.paymentReference ?? ""} placeholder="Referencia de pago" className="mt-2 h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                    <button className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark hover:border-brand">
                      <Pencil className="size-3.5" />
                      Editar notas
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
