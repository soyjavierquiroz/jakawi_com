import { AlertTriangle, CheckCircle2, Globe2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  createStoreDomainManualAction,
  provisionStoreDomainCloudflareAction,
  refreshStoreDomainCloudflareStatusAction,
  setPrimaryStoreDomainAction,
  updateStoreDomainStatusAction,
} from "@/lib/actions";
import { getAdminDomainManagementData, requireSuperAdmin } from "@/lib/admin";
import { getStoreCanonicalBaseUrl } from "@/lib/domains";
import { storeDomainStatuses, storeDomainTypes, storeDomainVerificationTypes } from "@/lib/store-domains";
import { cn } from "@/lib/ui";

type AdminDomainsSearchParams = {
  ok?: string;
  error?: string;
};

function formatDateTime(date: Date | null | undefined) {
  return date ? date.toISOString().replace("T", " ").slice(0, 16) : "Sin revisión";
}

function statusLabel(status: string) {
  if (status === "PENDING") return "Pendiente";
  if (status === "VERIFYING") return "Verificando";
  if (status === "ACTIVE") return "Activo";
  if (status === "FAILED") return "Fallido";
  if (status === "DISABLED") return "Deshabilitado";
  return status;
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-green-50 text-green-700";
  if (status === "VERIFYING") return "bg-blue-50 text-blue-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "DISABLED") return "bg-neutral-100 text-neutral-600";
  return "bg-amber-50 text-amber-800";
}

function typeLabel(type: string) {
  if (type === "CUSTOM_DOMAIN") return "Dominio custom";
  if (type === "JAKAWI_SUBDOMAIN") return "Subdominio JAKAWI";
  return type;
}

function dnsInstructions(domain: {
  hostname: string;
  type: string;
  verificationType: string;
  verificationValue: string | null;
}, fallbackOrigin: string) {
  if (domain.type === "JAKAWI_SUBDOMAIN") {
    return {
      title: "DNS JAKAWI",
      lines: ["Requiere control/wildcard DNS de JAKAWI.", "No usar como CUSTOM_DOMAIN.", "Cloudflare Custom Hostnames solo aplica a dominios propios de tiendas."],
    };
  }

  return {
    title: "DNS para cliente",
    lines: [
      `CNAME: ${domain.hostname} -> ${fallbackOrigin}`,
      domain.verificationType === "DNS_TXT" ? `TXT: ${domain.hostname} -> ${domain.verificationValue ?? "jakawi-domain-verification=<hostname>"}` : "TXT: no requerido si Cloudflare usa validación HTTP/CNAME.",
      "Cloudflare API queda gated por env y solo disponible para superadmin.",
    ],
  };
}

export default async function AdminDomainsPage({
  searchParams,
}: {
  searchParams: Promise<AdminDomainsSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const { domains, stores, customDomainsEnabled, cloudflareCustomHostnames } = await getAdminDomainManagementData();

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Dominios de tiendas</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Gestión manual de StoreDomain, verificación DNS y provisioning Cloudflare gated por env.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <div className={cn("rounded-lg border p-4 text-sm font-semibold shadow-sm", customDomainsEnabled ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
        <div className="flex items-start gap-3">
          {customDomainsEnabled ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
          <div>
            <p className="font-black">CUSTOM_DOMAINS_ENABLED={customDomainsEnabled ? "true" : "false"}</p>
            <p className="mt-1 leading-6">{customDomainsEnabled ? "Los dominios ACTIVE pueden resolver storefront por Host." : "Default seguro activo: los dominios se pueden administrar, pero no resuelven storefront hasta habilitar la variable."}</p>
          </div>
        </div>
      </div>

      <div className={cn("rounded-lg border p-4 text-sm font-semibold shadow-sm", cloudflareCustomHostnames.ready ? "border-green-200 bg-green-50 text-green-800" : "border-neutral-200 bg-neutral-50 text-neutral-700")}>
        <div className="flex items-start gap-3">
          {cloudflareCustomHostnames.ready ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
          <div>
            <p className="font-black">CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED={cloudflareCustomHostnames.enabled ? "true" : "false"}</p>
            <p className="mt-1 leading-6">
              {cloudflareCustomHostnames.ready
                ? "Provisioning Cloudflare disponible para superadmin."
                : cloudflareCustomHostnames.reason === "missing_config"
                  ? "Cloudflare está habilitado, pero falta token o zone id en servidor."
                  : "Cloudflare API deshabilitada por default seguro."}
            </p>
            <p className="mt-1 break-all font-mono text-xs">Fallback origin: {cloudflareCustomHostnames.fallbackOrigin}</p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
            <Globe2 className="size-4" />
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-dark">Crear dominio manual</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Bloquea hosts reservados, localhost/IPs y subdominios JAKAWI mal clasificados.</p>
          </div>
        </div>

        <form action={createStoreDomainManualAction} className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.1fr)_minmax(220px,1fr)_160px_160px_120px]">
          <input type="hidden" name="returnTo" value="/app/admin/domains" />
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
            <input name="hostname" required placeholder="tienda.com" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark placeholder:text-neutral-400" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">Tipo</span>
            <select name="type" defaultValue="CUSTOM_DOMAIN" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
              {storeDomainTypes.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">Estado inicial</span>
            <select name="status" defaultValue="PENDING" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
              {storeDomainStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">Primary</span>
            <span className="flex h-11 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
              <input type="checkbox" name="isPrimary" className="size-4 accent-brand" />
              Sí
            </span>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Verificación</span>
            <select name="verificationType" defaultValue="DNS_TXT" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
              {storeDomainVerificationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Valor DNS manual opcional</span>
            <input name="verificationValue" placeholder="Se autogenera si queda vacío" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark placeholder:text-neutral-400" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-neutral-500">SSL</span>
            <input name="sslStatus" placeholder="pending" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark placeholder:text-neutral-400" />
          </label>
          <button className="h-11 rounded-md bg-brand px-4 text-sm font-black text-white hover:bg-brand-dark lg:self-end">Crear dominio</button>
        </form>
      </section>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{domains.length} dominios</span>
        <span className="hidden md:inline">Mostrando hasta 250 registros</span>
      </div>

      <div className="space-y-3">
        {domains.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay dominios registrados todavía.</div>
        ) : (
          domains.map((domain) => {
            const instructions = dnsInstructions(domain, cloudflareCustomHostnames.fallbackOrigin);
            const canonicalUrl = getStoreCanonicalBaseUrl(domain.store, domain.hostname, {
              activeHostnames: domain.status === "ACTIVE" ? [domain.hostname] : [],
            });
            const wouldResolve = customDomainsEnabled && domain.status === "ACTIVE" && domain.store.isPublished;

            return (
              <article key={domain.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)_minmax(300px,0.8fr)]">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-all text-xl font-black leading-6 text-brand-dark">{domain.hostname}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(domain.status))}>{statusLabel(domain.status)}</span>
                          <span className="inline-flex rounded-full bg-brand-muted px-2.5 py-1 text-xs font-black text-brand-dark">{typeLabel(domain.type)}</span>
                          {domain.isPrimary ? <span className="inline-flex rounded-full bg-brand-dark px-2.5 py-1 text-xs font-black text-white">Primary</span> : null}
                        </div>
                        <div className="mt-3 rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold leading-6 text-neutral-700">
                          <p>
                            Tienda: <span className="font-black text-brand-dark">{domain.store.name}</span>
                          </p>
                          <p className="font-mono text-xs text-neutral-500">/{domain.store.slug}</p>
                          <p>Owner: {domain.store.owner.email}</p>
                          <p>Publicada: {domain.store.isPublished ? "Sí" : "No"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold leading-6 text-neutral-700">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Resolución</p>
                      <p className={cn("mt-1 font-black", wouldResolve ? "text-green-700" : "text-amber-800")}>{wouldResolve ? "Activa por Host" : "No resuelve ahora"}</p>
                      <p className="break-all font-mono text-xs">{canonicalUrl}</p>
                      <p className="mt-1 text-xs text-neutral-500">Última revisión: {formatDateTime(domain.lastCheckedAt)}</p>
                      <p className="text-xs text-neutral-500">SSL: {domain.sslStatus ?? "Sin estado"}</p>
                      <p className="break-all text-xs text-neutral-500">Cloudflare ID: {domain.cloudflareHostnameId ?? "Sin provisioning"}</p>
                    </div>

                    <form action={updateStoreDomainStatusAction} className="grid grid-cols-[1fr_auto] gap-2">
                      <input type="hidden" name="returnTo" value="/app/admin/domains" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <select name="status" defaultValue={domain.status} className="h-10 rounded-md border border-brand-border bg-white px-2 text-xs font-bold text-brand-dark">
                        {storeDomainStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button className="h-10 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark">Estado</button>
                    </form>

                    <form action={setPrimaryStoreDomainAction}>
                      <input type="hidden" name="returnTo" value="/app/admin/domains" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand" disabled={domain.isPrimary}>
                        {domain.isPrimary ? "Ya es primary" : "Marcar primary"}
                      </button>
                    </form>

                    {domain.type === "CUSTOM_DOMAIN" && !domain.cloudflareHostnameId ? (
                      <form action={provisionStoreDomainCloudflareAction}>
                        <input type="hidden" name="returnTo" value="/app/admin/domains" />
                        <input type="hidden" name="domainId" value={domain.id} />
                        <button className="h-10 w-full rounded-md bg-brand-dark px-3 text-xs font-black text-white hover:bg-brand" disabled={!cloudflareCustomHostnames.ready}>
                          Provisionar Cloudflare
                        </button>
                      </form>
                    ) : null}

                    {domain.cloudflareHostnameId ? (
                      <form action={refreshStoreDomainCloudflareStatusAction}>
                        <input type="hidden" name="returnTo" value="/app/admin/domains" />
                        <input type="hidden" name="domainId" value={domain.id} />
                        <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand" disabled={!cloudflareCustomHostnames.ready}>
                          Refrescar Cloudflare
                        </button>
                      </form>
                    ) : null}
                  </div>

                  <div className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold leading-6 text-neutral-700">
                    <p className="text-[11px] font-black uppercase text-neutral-500">{instructions.title}</p>
                    <ul className="mt-2 space-y-1">
                      {instructions.lines.map((line) => (
                        <li key={line} className="break-words font-mono text-xs">
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-neutral-600">
                      <p>verificationType: {domain.verificationType}</p>
                      <p className="break-all">verificationValue: {domain.verificationValue ?? "Sin valor"}</p>
                    </div>
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
