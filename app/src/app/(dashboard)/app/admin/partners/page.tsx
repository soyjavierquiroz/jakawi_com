import { ExternalLink, HandCoins, UsersRound } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { createPartnerAction, updatePartnerStatusAction } from "@/lib/actions";
import { getAdminPartnerRows, requireSuperAdmin } from "@/lib/admin";
import { getPartnerReferralLink } from "@/lib/acquisition/partners";
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
      <button className="h-10 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark hover:border-brand">
        {nextStatus === "ACTIVE" ? "Activar" : "Desactivar"}
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
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Personas/agencias que activan comercios. Comisiones solo como referencia manual futura.</p>
        </div>
        <Link href="/app/admin" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
          Volver al panel
        </Link>
      </div>

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

      <div className="hidden overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm md:block">
        {partners.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-neutral-600">No hay partners creados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="border-b border-brand-border text-xs font-black uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Comision</th>
                  <th className="px-4 py-3">Tiendas</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {partners.map((partner) => {
                  const partnerLink = getPartnerReferralLink(partner.code);
                  return (
                    <tr key={partner.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-black text-brand-dark">{partner.name}</p>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{partner.code}</p>
                      </td>
                      <td className="px-4 py-4">
                        <a href={partnerLink} target="_blank" className="block max-w-[260px] truncate text-xs font-bold text-brand-dark hover:text-brand">
                          {partnerLink}
                        </a>
                        <div className="mt-2 flex gap-2">
                          <CopyButton value={partnerLink} />
                          <a href={partnerLink} target="_blank" className="inline-flex h-10 items-center justify-center rounded-md border border-brand-border bg-white px-3 text-brand-dark hover:border-brand" aria-label="Abrir link">
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold leading-5 text-neutral-600">
                        <p>{partner.contactName ?? "Sin contacto"}</p>
                        <p>{partner.contactEmail ?? "Sin email"}</p>
                        <p>{partner.contactPhone ?? "Sin telefono"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(partner.status))}>{partner.status}</span>
                      </td>
                      <td className="px-4 py-4 font-black text-brand-dark">{formatCommission(partner.commissionRateBps)}</td>
                      <td className="px-4 py-4 font-black text-brand-dark">{partner._count.attributions}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-neutral-600">{formatDate(partner.createdAt)}</td>
                      <td className="px-4 py-4">
                        <PartnerStatusForm partnerId={partner.id} status={partner.status} />
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
        {partners.map((partner) => {
          const partnerLink = getPartnerReferralLink(partner.code);
          return (
            <article key={partner.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-brand-dark">{partner.name}</h2>
                  <p className="mt-1 font-mono text-xs text-neutral-500">{partner.code}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black", statusClass(partner.status))}>{partner.status}</span>
              </div>
              <code className="mt-3 block break-all rounded-md bg-brand-muted px-3 py-2 text-xs text-neutral-800">{partnerLink}</code>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Comision</p>
                  <p className="mt-1 font-black text-brand-dark">{formatCommission(partner.commissionRateBps)}</p>
                </div>
                <div className="rounded-md bg-brand-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-neutral-500">Tiendas</p>
                  <p className="mt-1 font-black text-brand-dark">{partner._count.attributions}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CopyButton value={partnerLink} />
                <PartnerStatusForm partnerId={partner.id} status={partner.status} />
              </div>
            </article>
          );
        })}
        {partners.length === 0 ? <div className="rounded-lg border border-brand-border bg-brand-paper p-6 text-center text-sm font-semibold text-neutral-600 shadow-sm">No hay partners creados.</div> : null}
      </div>
    </section>
  );
}
