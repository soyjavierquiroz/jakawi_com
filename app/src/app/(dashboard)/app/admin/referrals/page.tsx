import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { getPublicStoreUrl } from "@/config/site";
import { updateAttributionStatusAction } from "@/lib/actions";
import { adminAttributionFilters, getAdminAttributionFilter, getAdminAttributionRows, requireSuperAdmin } from "@/lib/admin";
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
  if (sourceType === "STORE_REFERRAL") return "Store referral";
  if (sourceType === "PARTNER") return "Partner";
  if (sourceType === "ORGANIC") return "Organico";
  return sourceType;
}

function sourceClass(sourceType: string) {
  if (sourceType === "PARTNER") return "bg-brand-soft text-brand-dark";
  if (sourceType === "STORE_REFERRAL") return "bg-brand-muted text-brand-dark";
  if (sourceType === "ORGANIC") return "bg-neutral-100 text-neutral-600";
  return "bg-amber-50 text-amber-800";
}

function AttributionStatusForm({ attributionId, status, notes }: { attributionId: string; status: string; notes: string | null }) {
  return (
    <form action={updateAttributionStatusAction} className="space-y-2">
      <input type="hidden" name="attributionId" value={attributionId} />
      <select name="status" defaultValue={status} className="h-10 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark">
        {attributionStatuses.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <input name="notes" defaultValue={notes ?? ""} placeholder="Notas manuales" className="h-10 w-full rounded-md border border-brand-border bg-white px-2 text-xs font-semibold text-brand-dark" />
      <button className="h-10 w-full rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Guardar</button>
    </form>
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
  const rows = await getAdminAttributionRows({ filter: activeFilter, q });

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Referidos y atribuciones</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Tiendas que recomiendan JAKAWI y partners que activan comercios. Sin pagos automaticos.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <form action="/app/admin/referrals" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar tienda, owner, partner, codigo o referidor..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
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

      <div className="hidden overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm md:block">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-neutral-600">No hay atribuciones para esta busqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="border-b border-brand-border text-xs font-black uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Tienda creada</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3">Referidor / Partner</th>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Fechas</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => {
                  const publicUrl = getPublicStoreUrl(row.store.slug);
                  const sourceName = row.partner ? `${row.partner.name} (${row.partner.code})` : row.referrerStore ? `${row.referrerStore.name} (${row.referrerStore.slug})` : "Sin referidor";

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-black text-brand-dark">{row.store.name}</p>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{row.store.slug}</p>
                        <a href={publicUrl} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-dark hover:text-brand">
                          Abrir <ExternalLink className="size-3" />
                        </a>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[220px] truncate font-semibold text-neutral-700">{row.store.owner.email}</p>
                        <p className="mt-1 text-xs font-semibold text-neutral-500">{row.store.owner.name ?? "Sin nombre"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", sourceClass(row.sourceType))}>{sourceLabel(row.sourceType)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[240px] truncate font-semibold text-neutral-700">{sourceName}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-neutral-600">{row.code ?? "Sin codigo"}</td>
                      <td className="px-4 py-4 font-black text-brand-dark">{row.status}</td>
                      <td className="px-4 py-4 font-black text-brand-dark">{row.store.plan}</td>
                      <td className="px-4 py-4 text-xs font-semibold leading-5 text-neutral-600">
                        <p>Registro: {formatDate(row.signedUpAt)}</p>
                        <p>Activacion: {formatDate(row.activatedAt)}</p>
                        <p>Pago: {formatDate(row.paidAt)}</p>
                      </td>
                      <td className="w-[220px] px-4 py-4">
                        <AttributionStatusForm attributionId={row.id} status={row.status} notes={row.notes} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const publicUrl = getPublicStoreUrl(row.store.slug);
          const sourceName = row.partner ? `${row.partner.name} (${row.partner.code})` : row.referrerStore ? `${row.referrerStore.name} (${row.referrerStore.slug})` : "Sin referidor";

          return (
            <article key={row.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-brand-dark">{row.store.name}</h2>
                  <p className="mt-1 font-mono text-xs text-neutral-500">{row.store.slug}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-neutral-600">{row.store.owner.email}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black", sourceClass(row.sourceType))}>{sourceLabel(row.sourceType)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Origen</p>
                  <p className="mt-1 truncate font-black text-brand-dark">{sourceName}</p>
                </div>
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Estado</p>
                  <p className="mt-1 truncate font-black text-brand-dark">{row.status}</p>
                </div>
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Codigo</p>
                  <p className="mt-1 truncate font-mono text-xs text-brand-dark">{row.code ?? "Sin codigo"}</p>
                </div>
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Plan</p>
                  <p className="mt-1 font-black text-brand-dark">{row.store.plan}</p>
                </div>
              </div>
              <a href={publicUrl} target="_blank" className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-bold text-white hover:bg-brand">
                <ExternalLink className="size-4" />
                Abrir tienda
              </a>
              <div className="mt-3">
                <AttributionStatusForm attributionId={row.id} status={row.status} notes={row.notes} />
              </div>
            </article>
          );
        })}
        {rows.length === 0 ? <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay atribuciones para esta busqueda.</div> : null}
      </div>
    </section>
  );
}
