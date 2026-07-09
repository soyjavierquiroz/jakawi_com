import { AlertTriangle, CheckCircle2, Globe2, ShieldCheck } from "lucide-react";
import { requestCustomDomainAction, verifyCustomDomainAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { buildDnsInstructions, deriveDomainStatusLabel } from "@/lib/custom-domains";
import { getPrisma } from "@/lib/prisma";
import { cn } from "@/lib/ui";

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "VERIFIED") return "bg-green-50 text-green-700";
  if (status === "VERIFYING") return "bg-blue-50 text-blue-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "DISABLED") return "bg-neutral-100 text-neutral-600";
  return "bg-amber-50 text-amber-800";
}

export default async function OwnerDomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const domains = await getPrisma().storeDomain.findMany({
    where: { storeId: store.id, type: "CUSTOM_DOMAIN" },
    select: {
      id: true,
      hostname: true,
      status: true,
      isPrimary: true,
      verificationValue: true,
      sslStatus: true,
      lastCheckedAt: true,
      createdAt: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  const primaryDomain = domains.find((domain) => domain.isPrimary);
  const cnameTarget = process.env.CUSTOM_DOMAIN_CNAME_TARGET || process.env.CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN || "jakawi.com";

  return (
    <section className="space-y-5 md:space-y-6">
      <div>
        <p className="text-sm font-bold text-brand-dark">Beta asistida</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Dominios personalizados</h1>
        <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">
          Los dominios personalizados están en beta asistida. JAKAWI debe validar DNS antes de activarlo.
        </p>
      </div>

      {params.ok ? (
        <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
          <CheckCircle2 className="size-4" />
          {params.ok === "cloudflare-disabled"
            ? "Cloudflare todavía no está habilitado. Mantén tus DNS listos; JAKAWI activará la verificación automática pronto."
            : "Solicitud recibida. Tu dominio se activará automáticamente cuando DNS y SSL estén listos."}
        </p>
      ) : null}
      {params.error ? (
        <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          <AlertTriangle className="size-4" />
          {params.error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
        <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
              <Globe2 className="size-4" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-dark">Solicitar dominio</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Escribe solo el dominio. Quitaremos protocolo, ruta y mayúsculas automáticamente.</p>
            </div>
          </div>

          <form action={requestCustomDomainAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="returnTo" value="/app/dominios" />
            <input type="hidden" name="storeId" value={store.id} />
            <label className="space-y-1">
              <span className="text-xs font-black uppercase text-neutral-500">Dominio</span>
              <input
                name="hostname"
                required
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="www.tienda.com"
                className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark placeholder:text-neutral-400"
              />
            </label>
            <button className="h-11 rounded-md bg-brand px-5 text-sm font-black text-white hover:bg-brand-dark sm:self-end">Solicitar</button>
          </form>
          <p className="mt-3 text-xs font-semibold leading-5 text-neutral-500">No aceptamos localhost, direcciones IP, dominios internos de JAKAWI ni dominios ya registrados.</p>
        </section>

        <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-dark">Dominio principal</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600">
                {primaryDomain ? primaryDomain.hostname : "Todavía no hay un dominio personalizado principal."}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
            Aunque un registro figure como active, el tráfico personalizado permanece apagado mientras CUSTOM_DOMAINS_ENABLED=false.
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-brand-dark">Solicitudes</h2>
          <span className="text-sm font-bold text-neutral-500">{domains.length} dominios</span>
        </div>

        {domains.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay solicitudes todavía.</div>
        ) : (
          domains.map((domain) => {
            const instructions = buildDnsInstructions({
              hostname: domain.hostname,
              cnameTarget,
              verificationToken: domain.verificationValue,
            });

            return (
              <article key={domain.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-all text-lg font-black text-brand-dark">{domain.hostname}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(domain.status))}>
                        {deriveDomainStatusLabel(domain.status)}
                      </span>
                      {domain.isPrimary ? <span className="inline-flex rounded-full bg-brand-dark px-2.5 py-1 text-xs font-black text-white">principal</span> : null}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-neutral-500">Solicitado: {domain.createdAt.toISOString().slice(0, 10)}</p>
                    <div className="mt-2 text-xs font-semibold leading-5 text-neutral-600">
                      <p>SSL/certificado: {domain.sslStatus ?? "pendiente"}</p>
                      <p>Última verificación: {domain.lastCheckedAt ? domain.lastCheckedAt.toISOString().slice(0, 16).replace("T", " ") : "sin verificar"}</p>
                    </div>
                  </div>
                  <div className="w-full rounded-md bg-brand-muted px-3 py-2 md:max-w-xl">
                    <p className="text-xs font-black uppercase text-neutral-500">Instrucciones DNS manuales</p>
                    <ul className="mt-2 space-y-1">
                      {instructions.map((instruction) => (
                        <li key={`${instruction.type}-${instruction.name}`} className="break-all font-mono text-xs font-semibold text-neutral-700">
                          {instruction.type} · {instruction.name} → {instruction.value}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs font-semibold leading-5 text-neutral-500">Tu dominio se activará automáticamente cuando DNS y SSL estén listos.</p>
                    <form action={verifyCustomDomainAction} className="mt-3">
                      <input type="hidden" name="returnTo" value="/app/dominios" />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <button className="h-9 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
                        Verificar ahora
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}
