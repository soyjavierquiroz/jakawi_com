import { Bot, ExternalLink, Search, Store } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { CopyButton } from "@/components/CopyButton";
import { getCountryCommerceConfig } from "@/config/countries";
import { storePlans } from "@/config/plans";
import { getPublicStoreUrl } from "@/config/site";
import { extendStoreTrialAction, updateStorePlanAction } from "@/lib/actions";
import { adminStoreFilters, getAdminStoreFilter, getAdminStoreRows, requireSuperAdmin } from "@/lib/admin";
import { getPlanLimitLabel } from "@/lib/plan-limits";
import { cn } from "@/lib/ui";

type AdminStoresSearchParams = {
  ok?: string;
  error?: string;
  filter?: string;
  q?: string;
};

function buildQuery(params: { filter?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function formatDate(date: Date | null | undefined, locale: string) {
  return date ? date.toLocaleDateString(locale) : "Sin fecha";
}

function planStatusLabel(planStatus: string, trialExpired: boolean) {
  if (trialExpired || planStatus === "EXPIRED") return "Trial vencido";
  if (planStatus === "TRIALING") return "Trial activo";
  if (planStatus === "ACTIVE") return "Activo";
  return planStatus;
}

function statusClass(planStatus: string, trialExpired: boolean) {
  if (trialExpired || planStatus === "EXPIRED") return "bg-red-50 text-red-700";
  if (planStatus === "TRIALING") return "bg-brand-muted text-brand-dark";
  return "bg-brand-soft text-brand-dark";
}

function AdminStoreActions({ storeId, planCode, publicUrl }: { storeId: string; planCode: string; publicUrl: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a href={publicUrl} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-bold text-white hover:bg-brand">
          <ExternalLink className="size-4" />
          Abrir
        </a>
        <CopyButton value={publicUrl} />
      </div>
      <form action={updateStorePlanAction} className="grid grid-cols-[1fr_auto] gap-2">
        <input type="hidden" name="storeId" value={storeId} />
        <select name="plan" defaultValue={planCode} className="h-10 min-w-0 rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark">
          {Object.values(storePlans).map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.code}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Guardar</button>
      </form>
      <form action={extendStoreTrialAction} className="grid grid-cols-[76px_1fr] gap-2">
        <input type="hidden" name="storeId" value={storeId} />
        <input name="days" type="number" min="1" max="90" defaultValue="14" className="h-10 rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark" />
        <button className="h-10 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">Extender trial</button>
      </form>
    </div>
  );
}

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<AdminStoresSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const activeFilter = getAdminStoreFilter(params.filter);
  const q = params.q?.trim() ?? "";
  const rows = await getAdminStoreRows({ filter: activeFilter, q });

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Tiendas</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Listado operativo de espacios comerciales, planes, uso y acciones manuales.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <form action="/app/admin/stores" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda, slug, owner, país o plan..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex flex-wrap gap-2 pb-1">
        {adminStoreFilters.map((filter) => (
          <Link
            key={filter.key}
            href={`/app/admin/stores${buildQuery({ filter: filter.key, q })}`}
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
        <span>{rows.length} tiendas</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay tiendas para esta búsqueda.</div>
        ) : (
          rows.map(({ store, productUsage, sellerAiUsage, planState, leadSignals }) => {
            const country = getCountryCommerceConfig(store.countryCode);
            const publicUrl = getPublicStoreUrl(store.slug);
            const status = planStatusLabel(planState.planStatus, planState.trialExpired);

            return (
              <article key={store.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(260px,0.7fr)]">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand-dark">
                        <Store className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-words text-xl font-black leading-6 text-brand-dark">{store.name}</h2>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{store.slug}</p>
                        <a href={publicUrl} target="_blank" className="mt-2 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                          {publicUrl}
                        </a>
                      </div>
                    </div>
                    <div className="mt-4 rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Owner</p>
                      <p className="mt-1 break-all text-sm font-semibold text-neutral-700">{store.owner.email}</p>
                      <p className="text-xs font-semibold text-neutral-500">{store.owner.name ?? "Sin nombre"}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Plan</p>
                        <p className="mt-1 font-black text-brand-dark">{planState.planCode}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Estado</p>
                        <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(planState.planStatus, planState.trialExpired))}>{status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">País</p>
                        <p className="mt-1 font-black text-brand-dark">{country.countryCode}</p>
                        <p className="text-xs font-semibold text-neutral-500">{store.currency ?? country.defaultCurrency}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Señales</p>
                        <p className="mt-1 font-black text-brand-dark">{leadSignals}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Uso</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-700">Productos: {productUsage.used} / {productUsage.limit}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                        <Bot className="size-3.5" />
                        Seller AI: {sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                      <p>Trial: {formatDate(planState.trialEndsAt, country.locale)}</p>
                      <p>Renueva: {formatDate(store.planRenewsAt, country.locale)}</p>
                      <p>Creada: {formatDate(store.createdAt, country.locale)}</p>
                      <p>Actualizada: {formatDate(store.updatedAt, country.locale)}</p>
                    </div>
                    <AdminStoreActions storeId={store.id} planCode={planState.planCode} publicUrl={publicUrl} />
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
