import { CalendarDays, ReceiptText, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { DataQualityBadge } from "@/components/admin/DataQualityBadge";
import { storePlans } from "@/config/plans";
import { updateManualBillingAction } from "@/lib/actions";
import { requireSuperAdmin } from "@/lib/admin";
import { getDataQualityForStore } from "@/lib/data-quality";
import { getAdminManualBillingRows, manualBillingStatusLabel, manualBillingStatuses } from "@/lib/manual-billing";
import { formatStorePaymentMoney } from "@/lib/store-payments";
import { cn } from "@/lib/ui";

type AdminBillingSearchParams = {
  ok?: string;
  error?: string;
  q?: string;
};

function formatDate(date: Date | null | undefined, locale = "es-BO") {
  return date ? date.toLocaleDateString(locale) : "Sin fecha";
}

function formatDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function statusClass(status: string) {
  if (status === "TRIALING") return "bg-brand-muted text-brand-dark";
  if (status === "ACTIVE") return "bg-green-50 text-green-700";
  if (status === "PAST_DUE") return "bg-amber-50 text-amber-800";
  if (status === "SUSPENDED") return "bg-red-50 text-red-700";
  if (status === "CANCELED") return "bg-neutral-100 text-neutral-600";
  return "bg-neutral-100 text-neutral-600";
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<AdminBillingSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const rows = await getAdminManualBillingRows({ q });
  const returnTo = `/app/admin/billing${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Billing manual</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Operación asistida de planes para beta privada. No crea checkout, no cobra y no llama pasarelas externas.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-brand" />
          <div>
            <p className="font-black text-brand-dark">Alcance seguro</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Esta pantalla solo actualiza estado operativo, trial, vencimiento y notas internas. Los pagos reales se coordinan fuera de JAKAWI y se registran manualmente.</p>
          </div>
        </div>
      </section>

      <form action="/app/admin/billing" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda, slug, owner, plan o estado..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{rows.length} tiendas</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay tiendas para esta busqueda.</div>
        ) : (
          rows.map(({ store, snapshot, opsRecord, latestPayment }) => {
            const locale = store.locale ?? "es-BO";
            const status = store.planStatus ?? (snapshot.planCode === "TRIAL" ? "TRIALING" : "ACTIVE");

            return (
              <article key={store.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand-dark">
                        <ReceiptText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start gap-2">
                          <h2 className="break-words text-xl font-black leading-6 text-brand-dark">{store.name}</h2>
                          <DataQualityBadge label={getDataQualityForStore(store)} />
                        </div>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{store.slug}</p>
                        <p className="mt-2 break-all text-sm font-semibold text-neutral-700">{store.owner.email}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Plan owner</p>
                        <p className="mt-1 font-black text-brand-dark">{snapshot.planName}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Estado</p>
                        <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(status))}>{manualBillingStatusLabel(status)}</span>
                      </div>
                    </div>

                    <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        Trial: {formatDate(snapshot.trialEndsAt, locale)}
                      </p>
                      <p>Vencimiento/periodo: {formatDate(snapshot.currentPeriodEndsAt, locale)}</p>
                      <p>Referencia visible owner: {snapshot.manualPaymentReference ?? "Sin referencia visible"}</p>
                      <p>Ultimo pago visible: {latestPayment ? `${formatStorePaymentMoney(latestPayment.amountCents, store.currency)} / ${latestPayment.status}` : "Sin pago visible"}</p>
                      <p>Nota interna: {opsRecord?.notes ? "registrada" : "sin nota interna"}</p>
                    </div>
                  </div>

                  <form action={updateManualBillingAction} className="grid gap-3 rounded-md bg-white p-3 md:grid-cols-2">
                    <input type="hidden" name="storeId" value={store.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />

                    <label className="space-y-1.5">
                      <span className="text-xs font-black uppercase text-neutral-500">Plan</span>
                      <select name="plan" defaultValue={snapshot.planCode} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
                        {Object.values(storePlans).map((plan) => (
                          <option key={plan.code} value={plan.code}>
                            {plan.code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-black uppercase text-neutral-500">Estado billing</span>
                      <select name="billingStatus" defaultValue={status} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
                        {manualBillingStatuses.map((billingStatus) => (
                          <option key={billingStatus} value={billingStatus}>
                            {manualBillingStatusLabel(billingStatus)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-black uppercase text-neutral-500">Trial hasta</span>
                      <input name="trialEndsAt" type="date" defaultValue={formatDateInput(snapshot.trialEndsAt)} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-black uppercase text-neutral-500">Vence periodo</span>
                      <input name="currentPeriodEndsAt" type="date" defaultValue={formatDateInput(snapshot.currentPeriodEndsAt)} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-black uppercase text-neutral-500">Referencia manual</span>
                      <input name="manualPaymentReference" defaultValue={opsRecord?.externalReference ?? snapshot.manualPaymentReference ?? ""} placeholder="Referencia de coordinacion manual, sin datos sensibles" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-black uppercase text-neutral-500">Nota interna</span>
                      <textarea name="internalBillingNotes" defaultValue={opsRecord?.notes ?? ""} rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
                    </label>

                    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark md:col-span-2">
                      <ShieldCheck className="size-4" />
                      Guardar billing manual
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
