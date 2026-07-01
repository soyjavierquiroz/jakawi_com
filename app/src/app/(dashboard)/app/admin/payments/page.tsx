import { Ban, CheckCircle2, CreditCard, Pencil, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { createStorePaymentAction, updateStorePaymentNotesAction, updateStorePaymentStatusAction } from "@/lib/actions";
import { requireSuperAdmin } from "@/lib/admin";
import {
  formatStorePaymentMoney,
  getAdminPaymentStats,
  getAdminStorePaymentFilter,
  getAdminStorePaymentFormOptions,
  getStorePaymentsForAdmin,
  storePaymentMethodLabel,
  storePaymentMethods,
  storePaymentPlanKeys,
  storePaymentStatusLabel,
  storePaymentStatuses,
  storePaymentTypeLabel,
  storePaymentTypes,
} from "@/lib/store-payments";
import { cn } from "@/lib/ui";

type AdminPaymentsSearchParams = {
  ok?: string;
  error?: string;
  filter?: string;
  q?: string;
  storeId?: string;
};

const filterLabels: Record<string, string> = {
  all: "Todos",
  PENDING: "Pendientes",
  CONFIRMED: "Confirmados",
  CANCELLED: "Cancelados",
  REFUNDED: "Reembolsados",
  BASIC: "Basic",
  PRO: "Pro",
  PREMIUM: "Premium",
  NEW_SUBSCRIPTION: "Nuevo",
  RENEWAL: "Renovación",
  UPGRADE: "Upgrade",
};

function buildQuery(params: { filter?: string; q?: string; storeId?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
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

function formatPeriod(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start && !end) return "Sin periodo";
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "CONFIRMED") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-600";
  if (status === "REFUNDED") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

function typeClass(type: string) {
  if (type === "NEW_SUBSCRIPTION") return "bg-brand-soft text-brand-dark";
  if (type === "RENEWAL") return "bg-blue-50 text-blue-800";
  if (type === "UPGRADE") return "bg-emerald-50 text-emerald-800";
  if (type === "REFUND") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-700";
}

function attributionContextLabel(attribution: NonNullable<Awaited<ReturnType<typeof getStorePaymentsForAdmin>>[number]["store"]["acquisitionAttribution"]> | null | undefined) {
  if (attribution?.sourceType === "PARTNER") return `Partner: ${attribution.partner?.name ?? "Partner"}${attribution.partnerDestination ? ` / ${attribution.partnerDestination.label}` : ""}`;
  if (attribution?.sourceType === "STORE_REFERRAL") return `Referido por ${attribution.referrerStore?.name ?? "tienda"}`;
  if (attribution?.sourceType === "ORGANIC") return "Orgánico / sin atribución";
  return "Orgánico / sin atribución";
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
  paymentId,
  status,
  label,
  returnTo,
  icon,
}: {
  paymentId: string;
  status: string;
  label: string;
  returnTo: string;
  icon: "confirm" | "cancel" | "refund";
}) {
  const Icon = icon === "confirm" ? CheckCircle2 : icon === "refund" ? RotateCcw : Ban;

  return (
    <form action={updateStorePaymentStatusAction} className="rounded-md border border-brand-border bg-white p-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input
        name="externalReference"
        placeholder="Referencia externa opcional"
        className="mb-2 h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand"
      />
      <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">
        <Icon className="size-3.5" />
        {label}
      </button>
    </form>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminPaymentsSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const activeFilter = getAdminStorePaymentFilter(params.filter);
  const q = params.q?.trim() ?? "";
  const returnTo = `/app/admin/payments${buildQuery({ filter: activeFilter, q, storeId: params.storeId })}`;

  const [rows, stats, formOptions] = await Promise.all([
    getStorePaymentsForAdmin({ filter: activeFilter, q, storeId: params.storeId }),
    getAdminPaymentStats(),
    getAdminStorePaymentFormOptions({ storeId: params.storeId }),
  ]);

  const filterItems = ["all", ...storePaymentStatuses, "BASIC", "PRO", "PREMIUM", "NEW_SUBSCRIPTION", "RENEWAL", "UPGRADE"];
  const selectedStore = formOptions.selectedStore;

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Pagos</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Ledger manual de pagos y renovaciones. No ejecuta cobros automáticos.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Pendientes" value={stats.PENDING.count} detail={formatStorePaymentMoney(stats.PENDING.amountCents)} />
        <StatCard label="Confirmados" value={stats.CONFIRMED.count} detail={formatStorePaymentMoney(stats.CONFIRMED.amountCents)} />
        <StatCard label="Cancelados" value={stats.CANCELLED.count} detail={formatStorePaymentMoney(stats.CANCELLED.amountCents)} />
        <StatCard label="Reembolsados" value={stats.REFUNDED.count} detail={formatStorePaymentMoney(stats.REFUNDED.amountCents)} />
        <StatCard label="Total confirmado" value={formatStorePaymentMoney(stats.CONFIRMED.amountCents)} />
        <StatCard label="Total pendiente" value={formatStorePaymentMoney(stats.PENDING.amountCents)} />
        <StatCard label="Confirmado 30 días" value={formatStorePaymentMoney(stats.confirmedLast30DaysCents)} />
      </div>

      <form action={createStorePaymentAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Pago manual</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Registrar pago no cambia el plan automáticamente.</p>
          </div>
          <CreditCard className="size-5 shrink-0 text-brand" />
        </div>

        {selectedStore ? (
          <div className="mt-4 rounded-md border border-brand-border bg-white p-3 text-sm font-semibold text-neutral-600">
            <p className="text-[11px] font-black uppercase text-neutral-500">Tienda preseleccionada</p>
            <p className="mt-1 text-brand-dark">{selectedStore.name} ({selectedStore.slug})</p>
            <p className="text-xs text-neutral-500">{selectedStore.owner.email}</p>
          </div>
        ) : null}

        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Tienda</span>
            <select name="storeId" required defaultValue={params.storeId ?? selectedStore?.id ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Seleccionar tienda</option>
              {formOptions.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.slug}) / {store.owner.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Plan</span>
            <select name="planKey" defaultValue="PRO" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Sin plan</option>
              {storePaymentPlanKeys.map((planKey) => (
                <option key={planKey} value={planKey}>
                  {planKey}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Tipo</span>
            <select name="paymentType" required defaultValue="NEW_SUBSCRIPTION" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              {storePaymentTypes.map((type) => (
                <option key={type} value={type}>
                  {storePaymentTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Monto</span>
            <input name="amount" required inputMode="decimal" placeholder="997" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Moneda</span>
            <input name="currency" defaultValue="BOB" maxLength={3} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold uppercase outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Método</span>
            <select name="paymentMethod" defaultValue="MANUAL_QR" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Sin método</option>
              {storePaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {storePaymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Referencia externa</span>
            <input name="externalReference" placeholder="QA pago manual" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Inicio periodo</span>
            <input name="periodStart" type="date" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Fin periodo</span>
            <input name="periodEnd" type="date" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Fecha pagada</span>
            <input name="paidAt" type="date" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Descripción</span>
            <input name="description" placeholder="Pago demo, renovación, ajuste manual..." className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Notas internas</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
          </label>
        </div>

        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <CreditCard className="size-4" />
          Crear pago pendiente
        </button>
      </form>

      <form action="/app/admin/payments" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        {params.storeId ? <input type="hidden" name="storeId" value={params.storeId} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda, slug, owner, referencia, plan o estado..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex flex-wrap gap-2 pb-1">
        {filterItems.map((filter) => (
          <Link
            key={filter}
            href={`/app/admin/payments${buildQuery({ filter, q, storeId: params.storeId })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeFilter === filter && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {filterLabels[filter] ?? storePaymentTypeLabel(filter)}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{rows.length} pagos</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay pagos para esta búsqueda. Registra pagos que ocurrieron fuera del sistema.</div>
        ) : (
          rows.map((payment) => {
            const attribution = payment.store.acquisitionAttribution;

            return (
              <article key={payment.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)_minmax(270px,0.7fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{payment.store.name}</h2>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(payment.status))}>{storePaymentStatusLabel(payment.status)}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", typeClass(payment.paymentType))}>{storePaymentTypeLabel(payment.paymentType)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">{payment.store.slug}</p>
                    <p className="mt-2 break-all text-sm font-semibold text-neutral-700">{payment.store.owner.email}</p>
                    <p className="mt-3 text-3xl font-black leading-9 text-brand-dark">{formatStorePaymentMoney(payment.amountCents, payment.currency)}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-500">{payment.planKey ?? "Sin plan"} / {storePaymentTypeLabel(payment.paymentType)}</p>
                    {payment.description ? <p className="mt-3 break-words text-sm font-bold text-neutral-700">{payment.description}</p> : null}
                    <div className="mt-4 rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-neutral-600">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Atribución</p>
                      <p className="mt-1 text-brand-dark">{attributionContextLabel(attribution)}</p>
                      <p className="text-xs text-neutral-500">Contexto informativo. No crea comisiones, recompensas ni cobros automáticos.</p>
                    </div>
                    {attribution?.sourceType === "PARTNER" ? (
                      <div className="mt-4 rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-neutral-600">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Atribución partner</p>
                        <p className="mt-1 text-brand-dark">Esta tienda fue atribuida a {attribution.partner?.name ?? "Partner"}.</p>
                        <p className="text-xs text-neutral-500">Puedes crear comisión desde Referidos o Comisiones.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Método</p>
                        <p className="mt-1 text-sm font-black text-brand-dark">{storePaymentMethodLabel(payment.paymentMethod)}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Plan</p>
                        <p className="mt-1 text-sm font-black text-brand-dark">{payment.planKey ?? "N/A"}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Referencia externa</p>
                      <p className="mt-1 break-words text-sm font-black text-brand-dark">{payment.externalReference ?? "Sin referencia"}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Periodo</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-700">{formatPeriod(payment.periodStart, payment.periodEnd)}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                      <p>Pagado: {formatDate(payment.paidAt)}</p>
                      <p>Confirmado: {formatDateTime(payment.confirmedAt)}</p>
                      <p>Cancelado: {formatDateTime(payment.cancelledAt)}</p>
                      <p>Reembolsado: {formatDateTime(payment.refundedAt)}</p>
                      <p>Creado: {formatDateTime(payment.createdAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {payment.notes ? <p className="rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">{payment.notes}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                      <StatusActionForm paymentId={payment.id} status="CONFIRMED" label="Confirmar" returnTo={returnTo} icon="confirm" />
                      <StatusActionForm paymentId={payment.id} status="CANCELLED" label="Cancelar" returnTo={returnTo} icon="cancel" />
                      <StatusActionForm paymentId={payment.id} status="REFUNDED" label="Reembolsar" returnTo={returnTo} icon="refund" />
                    </div>

                    <form action={updateStorePaymentNotesAction} className="rounded-md border border-brand-border bg-white p-2">
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input name="description" defaultValue={payment.description ?? ""} placeholder="Descripción" className="h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                      <textarea name="notes" defaultValue={payment.notes ?? ""} rows={2} placeholder="Notas" className="mt-2 w-full rounded-md border border-brand-border bg-white px-2 py-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                      <input name="externalReference" defaultValue={payment.externalReference ?? ""} placeholder="Referencia externa" className="mt-2 h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                      <button className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark hover:border-brand">
                        <Pencil className="size-3.5" />
                        Editar notas
                      </button>
                    </form>
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
