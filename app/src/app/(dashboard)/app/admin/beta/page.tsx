import { AlertTriangle, Boxes, CheckCircle2, CircleOff, ExternalLink, Globe2, ReceiptText, Store } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { getPublicStoreUrl } from "@/config/site";
import { getAdminBetaOperationsSnapshots, type AdminBetaReadiness } from "@/lib/admin-beta-operations";
import { requireSuperAdmin } from "@/lib/admin";
import { cn } from "@/lib/ui";

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("es-BO") : "Sin fecha";
}

function readinessCopy(readiness: AdminBetaReadiness) {
  if (readiness === "READY") return { label: "Listo para beta", className: "bg-green-50 text-green-700", icon: CheckCircle2 };
  if (readiness === "SUSPENDED") return { label: "Suspendida", className: "bg-red-50 text-red-700", icon: CircleOff };
  return { label: "Requiere atención", className: "bg-amber-50 text-amber-800", icon: AlertTriangle };
}

function paymentLabel(status: string | undefined) {
  if (!status) return "Sin pagos registrados";
  if (status === "PENDING") return "Pago manual pendiente";
  return `Último pago: ${status}`;
}

export default async function AdminBetaOperationsPage() {
  await requireSuperAdmin();
  const snapshots = await getAdminBetaOperationsSnapshots();
  const totals = snapshots.reduce(
    (result, snapshot) => {
      result[snapshot.readiness] += 1;
      return result;
    },
    { READY: 0, NEEDS_ATTENTION: 0, SUSPENDED: 0 } satisfies Record<AdminBetaReadiness, number>,
  );

  return (
    <section className="space-y-4 md:space-y-6">
      <div>
        <p className="text-sm font-bold leading-none text-brand-dark">Superadmin · read-only</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Operaciones beta privada</h1>
        <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">
          Vista segura para revisar owners, catálogo, plan, billing manual, dominios e integraciones sin activar servicios ni modificar datos.
        </p>
      </div>

      <AdminNav />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-neutral-500">Tiendas beta</p>
          <p className="mt-2 text-3xl font-black text-brand-dark">{snapshots.length}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-black uppercase text-green-700">Listas</p>
          <p className="mt-2 text-3xl font-black text-green-800">{totals.READY}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase text-amber-800">Requieren atención</p>
          <p className="mt-2 text-3xl font-black text-amber-900">{totals.NEEDS_ATTENTION}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-black uppercase text-red-700">Suspendidas</p>
          <p className="mt-2 text-3xl font-black text-red-800">{totals.SUSPENDED}</p>
        </div>
      </div>

      <div className="space-y-3">
        {snapshots.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-8 text-center font-semibold text-neutral-600 shadow-sm">
            No hay tiendas para operar.
          </div>
        ) : (
          snapshots.map((snapshot) => {
            const readiness = readinessCopy(snapshot.readiness);
            const ReadinessIcon = readiness.icon;
            const publicUrl = getPublicStoreUrl(snapshot.slug);

            return (
              <article key={snapshot.storeId} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-xl font-black text-brand-dark">{snapshot.storeName}</h2>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black", readiness.className)}>
                        <ReadinessIcon className="size-3.5" />
                        {readiness.label}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">/{snapshot.slug}</p>
                    <p className="mt-2 text-sm font-semibold text-neutral-600">Owner: {snapshot.ownerEmail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-dark px-3 text-xs font-black text-white hover:bg-brand">
                      <ExternalLink className="size-4" />
                      Storefront
                    </a>
                    <Link href={`/app/admin/billing?q=${encodeURIComponent(snapshot.slug)}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                      <ReceiptText className="size-4" />
                      Billing
                    </Link>
                    <Link href={`/app/admin/stores?q=${encodeURIComponent(snapshot.slug)}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                      <Store className="size-4" />
                      Tienda / productos
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md bg-brand-muted p-3">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-neutral-500"><Boxes className="size-4" /> Catálogo</p>
                    <p className="mt-2 text-sm font-black text-brand-dark">{snapshot.visibleProductCount} visibles / {snapshot.productCount} totales</p>
                  </div>
                  <div className="rounded-md bg-brand-muted p-3">
                    <p className="text-xs font-black uppercase text-neutral-500">Plan y estado</p>
                    <p className="mt-2 text-sm font-black text-brand-dark">{snapshot.plan} · {snapshot.planStatus}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-600">Trial: {formatDate(snapshot.trialEndsAt)}</p>
                    <p className="text-xs font-semibold text-neutral-600">Renueva: {formatDate(snapshot.planRenewsAt)}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted p-3">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-neutral-500"><Globe2 className="size-4" /> Dominio</p>
                    <p className="mt-2 break-all text-sm font-black text-brand-dark">{snapshot.domain?.hostname ?? "Sin dominio propio"}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-600">{snapshot.domain?.status ?? "Storefront por slug"}</p>
                  </div>
                  <div className="rounded-md bg-brand-muted p-3">
                    <p className="text-xs font-black uppercase text-neutral-500">Billing manual</p>
                    <p className="mt-2 text-sm font-black text-brand-dark">{paymentLabel(snapshot.latestPayment?.status)}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-600">
                      {snapshot.latestPayment ? `${snapshot.latestPayment.amountCents / 100} ${snapshot.latestPayment.currency} · ${formatDate(snapshot.latestPayment.confirmedAt ?? snapshot.latestPayment.paidAt ?? snapshot.latestPayment.createdAt)}` : "Sin movimientos monetarios"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_2fr]">
                  <div className="rounded-md border border-brand-border bg-white p-3">
                    <p className="text-xs font-black uppercase text-neutral-500">Integraciones</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {snapshot.integrations.map((integration) => (
                        <span key={integration.platform} className={cn("rounded-full px-2.5 py-1 text-xs font-black", integration.state === "ON" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600")}>
                          {integration.platform}: {integration.state === "ON" ? "encendida" : "apagada"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-brand-border bg-white p-3">
                    <p className="text-xs font-black uppercase text-neutral-500">Indicadores operativos</p>
                    {snapshot.warnings.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {snapshot.warnings.map((warning) => (
                          <li key={warning} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-green-700">Sin bloqueos de readiness.</p>
                    )}
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
