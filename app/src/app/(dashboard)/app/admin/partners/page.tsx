import { CheckCircle2, ExternalLink, HandCoins, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { CopyButton } from "@/components/CopyButton";
import { createPartnerAction, createPartnerDestinationAction, setDefaultPartnerDestinationAction, updatePartnerDestinationStatusAction, updatePartnerStatusAction } from "@/lib/actions";
import { getAdminPartnerRows, requireSuperAdmin } from "@/lib/admin";
import { getPartnerDestinationReferralLink, getPartnerReferralLink } from "@/lib/acquisition/partners";
import { cn } from "@/lib/ui";

type AdminPartnersSearchParams = {
  ok?: string;
  error?: string;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("es-BO");
}

function formatCommission(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function statusClass(status: string) {
  return status === "ACTIVE" ? "bg-brand-soft text-brand-dark" : "bg-neutral-100 text-neutral-600";
}

function PartnerStatusForm({ partnerId, status }: { partnerId: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={updatePartnerStatusAction}>
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
        {nextStatus === "ACTIVE" ? "Activar" : "Desactivar"}
      </button>
    </form>
  );
}

function DestinationStatusForm({ destinationId, status }: { destinationId: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={updatePartnerDestinationStatusAction}>
      <input type="hidden" name="destinationId" value={destinationId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button className="h-9 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
        {nextStatus === "ACTIVE" ? "Activar" : "Desactivar"}
      </button>
    </form>
  );
}

function SetDefaultDestinationForm({ destinationId, disabled }: { destinationId: string; disabled: boolean }) {
  return (
    <form action={setDefaultPartnerDestinationAction}>
      <input type="hidden" name="destinationId" value={destinationId} />
      <button disabled={disabled} className="h-9 rounded-md bg-brand px-3 text-xs font-black text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500">
        Default
      </button>
    </form>
  );
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<AdminPartnersSearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const partners = await getAdminPartnerRows();

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Partners</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Canales comerciales con links configurables. Comisiones solo como referencia manual futura.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

      <AdminNav />

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}

      <form action={createPartnerAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Crear partner</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">El codigo se normaliza a letras, numeros y guiones.</p>
          </div>
          <UsersRound className="size-5 shrink-0 text-brand" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Nombre</span>
            <input name="name" required className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Codigo</span>
            <input name="code" placeholder="partner-demo" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Contacto</span>
            <input name="contactName" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Email</span>
            <input name="contactEmail" type="email" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Telefono</span>
            <input name="contactPhone" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase text-neutral-500">Comision referencia bps</span>
            <input name="commissionRateBps" type="number" min="0" max="10000" defaultValue="2000" className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-black uppercase text-neutral-500">Notas</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
          </label>
        </div>
        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <HandCoins className="size-4" />
          Crear partner
        </button>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-500">
        <span>{partners.length} partners</span>
        <span className="hidden md:inline">Mostrando hasta 250 resultados</span>
      </div>

      <div className="space-y-3">
        {partners.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-brand-paper p-8 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay partners creados.</div>
        ) : (
          partners.map((partner) => {
            const partnerLink = getPartnerReferralLink(partner.code);
            return (
              <article key={partner.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.8fr)_minmax(220px,0.55fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h2 className="min-w-0 break-words text-xl font-black leading-6 text-brand-dark">{partner.name}</h2>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", statusClass(partner.status))}>{partner.status}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-neutral-500">{partner.code}</p>
                    <div className="mt-3 rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Link principal</p>
                      <a href={partnerLink} target="_blank" className="mt-1 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                        {partnerLink}
                      </a>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton value={partnerLink} />
                      <a href={partnerLink} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand">
                        <ExternalLink className="size-4" />
                        Abrir
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Contacto</p>
                      <p className="mt-1 truncate text-sm font-black text-brand-dark">{partner.contactName ?? "Sin contacto"}</p>
                      <p className="truncate text-xs font-semibold text-neutral-600">{partner.contactEmail ?? "Sin email"}</p>
                      <p className="truncate text-xs font-semibold text-neutral-600">{partner.contactPhone ?? "Sin telefono"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Comision</p>
                        <p className="mt-1 font-black text-brand-dark">{formatCommission(partner.commissionRateBps)}</p>
                      </div>
                      <div className="rounded-md bg-brand-muted px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-neutral-500">Tiendas</p>
                        <p className="mt-1 font-black text-brand-dark">{partner._count.attributions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-md bg-brand-muted px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-neutral-500">Creado</p>
                      <p className="mt-1 text-sm font-black text-brand-dark">{formatDate(partner.createdAt)}</p>
                    </div>
                    <PartnerStatusForm partnerId={partner.id} status={partner.status} />
                  </div>
                </div>

                <div className="mt-5 border-t border-brand-border pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-brand-dark">Destinos</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-500">El link primero setea cookies y luego redirige al target configurado.</p>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-500">{partner.destinations.length} destinos</span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {partner.destinations.map((destination) => {
                      const destinationLink = getPartnerDestinationReferralLink(partner.code, destination.slug);
                      return (
                        <div key={destination.id} className="rounded-md border border-brand-border bg-white p-3">
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-sm font-black text-brand-dark">{destination.label}</p>
                                {destination.isDefault ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-black text-brand-dark">
                                    <CheckCircle2 className="size-3" />
                                    Default
                                  </span>
                                ) : null}
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", statusClass(destination.status))}>{destination.status}</span>
                              </div>
                              <p className="mt-1 font-mono text-xs text-neutral-500">{destination.slug}</p>
                              <a href={destinationLink} target="_blank" className="mt-2 block break-all text-xs font-bold text-brand-dark hover:text-brand">
                                {destinationLink}
                              </a>
                            </div>
                            <div className="min-w-0 rounded-md bg-brand-muted px-3 py-2">
                              <p className="text-[11px] font-black uppercase text-neutral-500">Target URL</p>
                              <p className="mt-1 break-all text-xs font-semibold text-neutral-700">{destination.targetUrl}</p>
                              {destination.notes ? <p className="mt-2 break-words text-xs font-semibold text-neutral-500">{destination.notes}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <CopyButton value={destinationLink} />
                              <a href={destinationLink} target="_blank" className="inline-flex h-10 items-center justify-center rounded-md border border-brand-border bg-white px-3 text-brand-dark hover:border-brand" aria-label="Abrir destino">
                                <ExternalLink className="size-4" />
                              </a>
                              <SetDefaultDestinationForm destinationId={destination.id} disabled={destination.isDefault || destination.status !== "ACTIVE"} />
                              <DestinationStatusForm destinationId={destination.id} status={destination.status} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {partner.destinations.length === 0 ? <div className="rounded-md border border-dashed border-brand-border bg-white px-3 py-4 text-sm font-semibold text-neutral-600">Sin destinos configurados. El link principal sigue llevando a registro.</div> : null}
                  </div>

                  <form action={createPartnerDestinationAction} className="mt-4 rounded-md border border-brand-border bg-white p-3">
                    <input type="hidden" name="partnerId" value={partner.id} />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-1.5">
                        <span className="text-xs font-black uppercase text-neutral-500">Label</span>
                        <input name="label" required placeholder="Webinar" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-black uppercase text-neutral-500">Slug</span>
                        <input name="slug" placeholder="webinar" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5 md:col-span-2">
                        <span className="text-xs font-black uppercase text-neutral-500">Target URL</span>
                        <input name="targetUrl" required placeholder="https://webinar.jakawi.com" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-black uppercase text-neutral-500">Notas</span>
                        <input name="notes" className="h-10 w-full rounded-md border border-brand-border bg-white px-3 text-sm font-semibold outline-none focus:border-brand" />
                      </label>
                      <label className="flex h-10 items-center gap-2 self-end rounded-md border border-brand-border bg-brand-muted px-3 text-sm font-black text-brand-dark">
                        <input name="isDefault" type="checkbox" className="size-4 accent-brand" />
                        Default
                      </label>
                    </div>
                    <button className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark">
                      <Plus className="size-4" />
                      Crear destino
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
