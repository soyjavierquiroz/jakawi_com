import { Ban, CheckCircle2, Clock, Gift, Pencil, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { createStoreReferralRewardAction, updateStoreReferralRewardNotesAction, updateStoreReferralRewardStatusAction } from "@/lib/actions";
import { requireSuperAdmin } from "@/lib/admin";
import {
  getAdminStoreReferralRewardFilter,
  getAdminStoreReferralRewardFormOptions,
  getAdminStoreReferralRewards,
  getStoreReferralRewardStats,
  storeReferralRewardStatusLabel,
  storeReferralRewardStatuses,
  storeReferralRewardTypeLabel,
  storeReferralRewardTypes,
} from "@/lib/store-referral-rewards";
import { cn } from "@/lib/ui";

type AdminRewardsSearchParams = {
  ok?: string;
  error?: string;
  filter?: string;
  q?: string;
  referrerStoreId?: string;
  referredStoreId?: string;
  attributionId?: string;
};

const filterLabels: Record<string, string> = {
  all: "Todos",
  PENDING: "Pendientes",
  APPROVED: "Aprobadas",
  APPLIED: "Aplicadas",
  CANCELLED: "Canceladas",
  EXPIRED: "Expiradas",
  FREE_MONTH: "Mes gratis",
  SELLER_AI_CREDITS: "Seller AI",
  DISCOUNT: "Descuento",
  CUSTOM: "Personalizado",
};

function buildQuery(params: { filter?: string; q?: string; referrerStoreId?: string; referredStoreId?: string; attributionId?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  if (params.referrerStoreId) search.set("referrerStoreId", params.referrerStoreId);
  if (params.referredStoreId) search.set("referredStoreId", params.referredStoreId);
  if (params.attributionId) search.set("attributionId", params.attributionId);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-BO") : "Sin fecha";
}

function formatDateTime(date: Date | null | undefined) {
  return date ? date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha";
}

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "APPROVED") return "bg-brand-soft text-brand-dark";
  if (status === "APPLIED") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-600";
  if (status === "EXPIRED") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

function rewardTypeClass(type: string) {
  if (type === "FREE_MONTH") return "bg-brand-soft text-brand-dark";
  if (type === "SELLER_AI_CREDITS") return "bg-blue-50 text-blue-800";
  if (type === "DISCOUNT") return "bg-emerald-50 text-emerald-800";
  if (type === "CUSTOM") return "bg-purple-50 text-purple-800";
  return "bg-neutral-100 text-neutral-700";
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
  rewardId,
  status,
  label,
  returnTo,
  icon,
}: {
  rewardId: string;
  status: string;
  label: string;
  returnTo: string;
  icon: "approve" | "apply" | "cancel" | "expire";
}) {
  const Icon = icon === "approve" ? CheckCircle2 : icon === "apply" ? Sparkles : icon === "cancel" ? Ban : Clock;
  const needsReference = status === "APPLIED";

  return (
    <form action={updateStoreReferralRewardStatusAction} className="rounded-md border border-brand-border bg-white p-2">
      <input type="hidden" name="rewardId" value={rewardId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {needsReference ? (
        <input
          name="applicationReference"
          placeholder="Referencia de aplicación"
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

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<AdminRewardsSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const activeFilter = getAdminStoreReferralRewardFilter(params.filter);
  const q = params.q?.trim() ?? "";
  const returnTo = `/app/admin/rewards${buildQuery({
    filter: activeFilter,
    q,
    referrerStoreId: params.referrerStoreId,
    referredStoreId: params.referredStoreId,
    attributionId: params.attributionId,
  })}`;

  const [rows, stats, formOptions] = await Promise.all([
    getAdminStoreReferralRewards({ filter: activeFilter, q }),
    getStoreReferralRewardStats(),
    getAdminStoreReferralRewardFormOptions({
      referrerStoreId: params.referrerStoreId,
      referredStoreId: params.referredStoreId,
      attributionId: params.attributionId,
    }),
  ]);

  const selectedAttribution = formOptions.selectedAttribution;
  const selectedReferrerStore = formOptions.selectedReferrerStore;
  const selectedReferredStore = formOptions.selectedReferredStore;
  const filterItems = ["all", ...storeReferralRewardStatuses, "FREE_MONTH", "SELLER_AI_CREDITS", "DISCOUNT", "CUSTOM"];

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Recompensas</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Beneficios manuales para tiendas que recomiendan JAKAWI. No se aplican automáticamente.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Pendientes" value={stats.PENDING.count} />
        <StatCard label="Aprobadas" value={stats.APPROVED.count} />
        <StatCard label="Aplicadas" value={stats.APPLIED.count} />
        <StatCard label="Canceladas/expiradas" value={stats.CANCELLED.count + stats.EXPIRED.count} />
        <StatCard label="Meses prometidos" value={stats.promisedMonths} />
        <StatCard label="Seller AI prometido" value={stats.promisedSellerAiCredits} detail="Conversaciones" />
      </div>

      <form action={createStoreReferralRewardAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Recompensa manual</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Se crea como pendiente. JAKAWI revisa y aplica beneficios manualmente.</p>
          </div>
          <Gift className="size-5 shrink-0 text-brand" />
        </div>

        {selectedAttribution || selectedReferrerStore || selectedReferredStore ? (
          <div className="mt-4 grid gap-2 rounded-md border border-brand-border bg-white p-3 text-sm font-semibold text-neutral-600 md:grid-cols-2">
            {selectedReferrerStore ? (
              <div>
                <p className="text-[11px] font-black uppercase text-neutral-500">Tienda referidora</p>
                <p className="mt-1 text-brand-dark">{selectedReferrerStore.name} ({selectedReferrerStore.slug})</p>
                <p className="text-xs text-neutral-500">{selectedReferrerStore.owner.email}</p>
              </div>
            ) : null}
            {selectedReferredStore ? (
              <div>
                <p className="text-[11px] font-black uppercase text-neutral-500">Tienda referida</p>
                <p className="mt-1 text-brand-dark">{selectedReferredStore.name} ({selectedReferredStore.slug})</p>
                <p className="text-xs text-neutral-500">{selectedReferredStore.owner.email}</p>
              </div>
            ) : null}
            {selectedAttribution ? (
              <div className="md:col-span-2">
                <p className="text-[11px] font-black uppercase text-neutral-500">Atribución de tienda referidora</p>
                <p className="mt-1 font-mono text-xs text-brand-dark">{selectedAttribution.id}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Tienda referidora</span>
            <select name="referrerStoreId" required defaultValue={params.referrerStoreId ?? selectedReferrerStore?.id ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Seleccionar tienda</option>
              {formOptions.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.slug}) / {store.owner.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Tienda referida</span>
            <select name="referredStoreId" defaultValue={params.referredStoreId ?? selectedReferredStore?.id ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Sin tienda referida</option>
              {formOptions.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.slug}) / {store.owner.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Tipo</span>
            <select name="rewardType" required defaultValue="FREE_MONTH" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              {storeReferralRewardTypes.map((type) => (
                <option key={type} value={type}>
                  {storeReferralRewardTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Etiqueta</span>
            <input name="valueLabel" placeholder="1 mes gratis" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Valor interno</span>
            <input name="valueAmount" inputMode="decimal" placeholder="Opcional" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Moneda</span>
            <input name="currency" defaultValue="BOB" maxLength={3} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold uppercase outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Seller AI</span>
            <input name="sellerAiCredits" type="number" min="0" placeholder="Conversaciones" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Meses</span>
            <input name="months" type="number" min="0" placeholder="1" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Expira</span>
            <input name="expiresAt" type="date" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
            <span className="text-xs font-black uppercase text-neutral-500">Atribución de tienda referidora</span>
            <select name="attributionId" defaultValue={params.attributionId ?? ""} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand">
              <option value="">Sin atribución</option>
              {formOptions.recentStoreReferralAttributions.map((attribution) => (
                <option key={attribution.id} value={attribution.id}>
                  {attribution.referrerStore?.name ?? "Sin referidor"} / {attribution.store.name} / {formatDate(attribution.createdAt)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Descripción</span>
            <input name="description" placeholder="Beneficio por referido, renovación, ajuste manual..." className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Notas internas</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
          </label>
        </div>

        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <Gift className="size-4" />
          Crear recompensa pendiente
        </button>
      </form>

      <form action="/app/admin/rewards" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda referidora, tienda referida, owner, slug, tipo o estado..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex flex-wrap gap-2 pb-1">
        {filterItems.map((filter) => (
          <Link
            key={filter}
            href={`/app/admin/rewards${buildQuery({ filter, q })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeFilter === filter && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {filterLabels[filter] ?? storeReferralRewardTypeLabel(filter)}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{rows.length} recompensas</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay recompensas para esta búsqueda. Crea un beneficio manual desde una atribución de tienda referidora.</div>
        ) : (
          rows.map((reward) => (
            <article key={reward.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)_minmax(260px,0.7fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{reward.referrerStore.name}</h2>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(reward.status))}>{storeReferralRewardStatusLabel(reward.status)}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", rewardTypeClass(reward.rewardType))}>{storeReferralRewardTypeLabel(reward.rewardType)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-neutral-500">{reward.referrerStore.slug}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-neutral-700">{reward.referrerStore.owner.email}</p>
                  <p className="mt-3 text-2xl font-black leading-8 text-brand-dark">{reward.valueLabel ?? storeReferralRewardTypeLabel(reward.rewardType)}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">{storeReferralRewardTypeLabel(reward.rewardType)}</p>
                  {reward.description ? <p className="mt-3 break-words text-sm font-bold text-neutral-700">{reward.description}</p> : null}
                </div>

                <div className="grid gap-2">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Tienda referida</p>
                    {reward.referredStore ? (
                      <>
                        <p className="mt-1 break-words text-sm font-black text-brand-dark">{reward.referredStore.name}</p>
                        <p className="font-mono text-xs text-neutral-600">{reward.referredStore.slug}</p>
                        <p className="truncate text-xs font-semibold text-neutral-600">{reward.referredStore.owner.email}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-neutral-600">Ajuste solo tienda referidora</p>
                    )}
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Atribución</p>
                    {reward.attribution ? (
                      <>
                        <p className="mt-1 font-mono text-xs text-brand-dark">{reward.attribution.id}</p>
                        <p className="text-xs font-semibold text-neutral-600">{reward.attribution.status}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-neutral-600">Sin atribución</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Meses</p>
                      <p className="mt-1 font-black text-brand-dark">{reward.months ?? "N/A"}</p>
                    </div>
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Seller AI</p>
                      <p className="mt-1 font-black text-brand-dark">{reward.sellerAiCredits ?? "N/A"}</p>
                    </div>
                  </div>
                  <div className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                    <p>Creada: {formatDateTime(reward.createdAt)}</p>
                    <p>Aprobada: {formatDate(reward.approvedAt)}</p>
                    <p>Aplicada: {formatDate(reward.appliedAt)}</p>
                    <p>Cancelada: {formatDate(reward.cancelledAt)}</p>
                    <p>Expira: {formatDate(reward.expiresAt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-[11px] font-black uppercase text-neutral-500">Referencia de aplicación</p>
                    <p className="mt-1 break-words text-sm font-black text-brand-dark">{reward.applicationReference ?? "Sin referencia"}</p>
                  </div>
                  {reward.notes ? <p className="rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">{reward.notes}</p> : null}

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <StatusActionForm rewardId={reward.id} status="APPROVED" label="Marcar aprobada" returnTo={returnTo} icon="approve" />
                    <StatusActionForm rewardId={reward.id} status="APPLIED" label="Marcar aplicada" returnTo={returnTo} icon="apply" />
                    <StatusActionForm rewardId={reward.id} status="CANCELLED" label="Cancelar" returnTo={returnTo} icon="cancel" />
                    <StatusActionForm rewardId={reward.id} status="EXPIRED" label="Expirar" returnTo={returnTo} icon="expire" />
                  </div>

                  <form action={updateStoreReferralRewardNotesAction} className="rounded-md border border-brand-border bg-white p-2">
                    <input type="hidden" name="rewardId" value={reward.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <textarea name="notes" defaultValue={reward.notes ?? ""} rows={2} placeholder="Notas" className="w-full rounded-md border border-brand-border bg-white px-2 py-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
                    <input name="applicationReference" defaultValue={reward.applicationReference ?? ""} placeholder="Referencia de aplicación" className="mt-2 h-9 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark outline-none focus:border-brand" />
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
