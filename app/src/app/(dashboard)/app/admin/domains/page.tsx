import { AlertTriangle, Globe2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  createStoreDomainManualAction,
  refreshStoreDomainCloudflareStatusAction,
  setPrimaryStoreDomainAction,
  updateStoreDomainStatusAction,
} from "@/lib/actions";
import { redactCloudflareHostnameId } from "@/lib/cloudflare-custom-hostnames";
import { getAdminDomainManagementData, requireSuperAdmin } from "@/lib/admin";
import {
  buildCanonicalDomainDnsInstructions,
  deriveDomainStatusLabel,
  normalizeCanonicalCustomDomainInput,
  redactDomainOwnerEmail,
} from "@/lib/custom-domains";
import { storeDomainStatuses } from "@/lib/store-domains";
import { cn } from "@/lib/ui";

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "VERIFIED") return "bg-green-50 text-green-700";
  if (status === "VERIFYING") return "bg-blue-50 text-blue-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "DISABLED") return "bg-neutral-100 text-neutral-600";
  return "bg-amber-50 text-amber-800";
}

export default async function AdminDomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const { domains, stores, customDomainsEnabled, cloudflareCustomHostnames } = await getAdminDomainManagementData();

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Dominios · self-service beta</h1>
          <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">
            Revisión asistida de solicitudes, DNS y Cloudflare Custom Hostnames. No activa tráfico personalizado mientras el flag runtime esté apagado.
          </p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={cn("rounded-lg border p-4 text-sm font-semibold shadow-sm", customDomainsEnabled ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-black">CUSTOM_DOMAINS_ENABLED={customDomainsEnabled ? "true" : "false"}</p>
              <p className="mt-1 leading-6">{customDomainsEnabled ? "Atención: runtime permite resolución custom." : "Estado beta esperado: guardar y revisar sí; resolver tráfico custom no."}</p>
            </div>
          </div>
        </div>
        <div className={cn("rounded-lg border p-4 text-sm font-semibold shadow-sm", cloudflareCustomHostnames.enabled ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-700")}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-black">CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED={cloudflareCustomHostnames.enabled ? "true" : "false"}</p>
              <p className="mt-1 leading-6">{cloudflareCustomHostnames.enabled ? "Cloudflare API lista para verificaciones explícitas." : "Cloudflare API apagada: las verificaciones no llamarán API externa."}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
            <Globe2 className="size-4" />
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-dark">Registrar solicitud manual</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Crea únicamente un dominio custom pendiente. La verificación Cloudflare se ejecuta por acciones explícitas y flag habilitado.</p>
          </div>
        </div>

        <form action={createStoreDomainManualAction} className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
          <input type="hidden" name="returnTo" value="/app/admin/domains" />
          <input type="hidden" name="type" value="CUSTOM_DOMAIN" />
          <input type="hidden" name="status" value="PENDING" />
          <input type="hidden" name="verificationType" value="DNS_TXT" />
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">Tienda</span>
            <select name="storeId" required className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
              <option value="">Seleccionar tienda</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} / {store.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">Hostname</span>
            <input name="hostname" required placeholder="www.tienda.com" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark placeholder:text-neutral-400" />
          </label>
          <button className="h-11 rounded-md bg-brand px-5 text-sm font-black text-white hover:bg-brand-dark md:self-end">Crear pending</button>
        </form>
      </section>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{domains.length} solicitudes</span>
        <span className="hidden md:inline">Hasta 250 registros</span>
      </div>

      <div className="space-y-3">
        {domains.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay dominios registrados.</div>
        ) : (
          domains.map((domain) => {
            const domainFlow = normalizeCanonicalCustomDomainInput(domain.hostname);
            const instructions = buildCanonicalDomainDnsInstructions({
              hostname: domain.hostname,
              cnameTarget: cloudflareCustomHostnames.fallbackOrigin,
              verificationToken: domain.verificationValue,
            });

            return (
              <article key={domain.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)_minmax(300px,0.9fr)]">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-all text-xl font-black leading-6 text-brand-dark">{domainFlow.canonicalHost}</h2>
                        <p className="mt-1 break-all text-xs font-bold text-neutral-500">Alias redirect: {domainFlow.redirectAlias}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(domain.status))}>{deriveDomainStatusLabel(domain.status)}</span>
                          {domain.isPrimary ? <span className="inline-flex rounded-full bg-brand-dark px-2.5 py-1 text-xs font-black text-white">primary</span> : null}
                        </div>
                        <div className="mt-3 rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold leading-6 text-neutral-700">
                          <p>Tienda: <span className="font-black text-brand-dark">{domain.store.name}</span></p>
                          <p className="font-mono text-xs text-neutral-500">/{domain.store.slug}</p>
                          <p>Owner: {redactDomainOwnerEmail(domain.store.owner.email)}</p>
                          <p>Publicada: {domain.store.isPublished ? "Sí" : "No"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <form action={updateStoreDomainStatusAction} className="grid grid-cols-[1fr_auto] gap-2">
                      <input type="hidden" name="returnTo" value="/app/admin/domains" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <select name="status" defaultValue={domain.status} className="h-10 rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark">
                        {storeDomainStatuses.map((status) => (
                          <option key={status} value={status}>{deriveDomainStatusLabel(status)}</option>
                        ))}
                      </select>
                      <button className="h-10 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Guardar</button>
                    </form>
                    <form action={setPrimaryStoreDomainAction}>
                      <input type="hidden" name="returnTo" value="/app/admin/domains" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand" disabled={domain.isPrimary}>
                        {domain.isPrimary ? "Ya es primary" : "Marcar primary"}
                      </button>
                    </form>
                    <form action={refreshStoreDomainCloudflareStatusAction}>
                      <input type="hidden" name="returnTo" value="/app/admin/domains" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                        Verificar Cloudflare
                      </button>
                    </form>
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                      {customDomainsEnabled ? "Runtime custom habilitado: revisar antes de usar ACTIVE." : "ACTIVE solo registra decisión manual; no activa tráfico con el flag apagado."}
                    </div>
                  </div>

                  <div className="rounded-md bg-brand-muted px-3 py-2">
                    <p className="text-xs font-black uppercase text-neutral-500">DNS esperado</p>
                    <div className="mt-2 rounded bg-white/70 px-2 py-1 text-xs font-semibold leading-5 text-neutral-700">
                      <p>Cloudflare ID: {redactCloudflareHostnameId(domain.cloudflareHostnameId) ?? "sin crear"}</p>
                      <p>SSL/certificado: {domain.sslStatus ?? "pendiente"}</p>
                      <p>Último check: {domain.lastCheckedAt ? domain.lastCheckedAt.toISOString().slice(0, 16).replace("T", " ") : "sin verificar"}</p>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {instructions.map((instruction) => (
                        <li key={`${instruction.type}-${instruction.name}`} className="break-all font-mono text-xs font-semibold text-neutral-700">
                          {instruction.type} · {instruction.name} → {instruction.value}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs font-semibold leading-5 text-neutral-500">Sin ID Cloudflare, token API, nota privada ni secreto expuesto.</p>
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
