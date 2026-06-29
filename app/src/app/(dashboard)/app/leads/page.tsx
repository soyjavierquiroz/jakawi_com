import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { classifyIntent } from "@/lib/seller-ai/intent";

const statusLabels: Record<string, string> = {
  BROWSING: "Navegando",
  ENGAGED: "Conversando",
  WHATSAPP_CLICKED: "WhatsApp",
  CONTACTED: "Contactado",
  WON: "Vendido",
  LOST: "Perdido",
};

function shortSummary(input?: string | null) {
  if (!input) return "Sin resumen todavía.";
  return input.length > 120 ? `${input.slice(0, 117)}...` : input;
}

export default async function LeadsPage() {
  const user = await requireUser();
  const leads = await getPrisma().lead.findMany({
    where: { store: { ownerId: user.id } },
    include: { store: true, journey: true, activeSnapshot: true, snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const productIds = [...new Set(leads.flatMap((lead) => [lead.currentProductId, lead.selectedProductId]).filter((id): id is string => Boolean(id)))];
  const products = productIds.length
    ? await getPrisma().product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, priceCents: true, currency: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Leads</p>
          <h1 className="text-4xl font-black">Clientes listos para cerrar</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-brand-soft px-4 py-3 text-sm font-black text-brand-dark">
          <MessageCircle className="size-4" />
          {leads.length} leads
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-neutral-600">Aún no hay leads del Seller AI.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {leads.map((lead) => {
              const product = productMap.get(lead.selectedProductId ?? lead.currentProductId ?? "");
              return (
                <Link key={lead.id} href={`/app/leads/${lead.id}`} className="grid gap-3 p-4 transition hover:bg-brand-muted md:grid-cols-[160px_1fr_120px_110px_auto] md:items-center">
                  <div>
                    <p className="font-mono text-sm font-black text-brand-dark">{lead.leadCode}</p>
                    <p className="text-xs font-semibold text-neutral-500">{lead.store.name}</p>
                    {lead.journey ? <p className="mt-1 font-mono text-[11px] font-bold text-neutral-500">{lead.journey.journeyCode}</p> : null}
                    {lead.activeSnapshot ?? lead.snapshots[0] ? <p className="mt-1 font-mono text-[11px] font-bold text-neutral-500">{(lead.activeSnapshot ?? lead.snapshots[0])?.snapshotCode}</p> : null}
                    {lead.customerPhone ? <p className="mt-1 text-xs font-bold text-neutral-600">{lead.customerPhone}</p> : null}
                  </div>
                  <div>
                    <h2 className="font-black">{product?.name ?? "Producto por confirmar"}</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {product
                        ? `${formatMoney({
                            amountCents: product.priceCents,
                            currency: lead.store.currency ?? product.currency,
                            countryCode: lead.store.countryCode ?? "BO",
                            locale: lead.store.locale,
                          })} - `
                        : ""}
                      {shortSummary(lead.conversationSummary)}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-soft px-3 py-2 text-center text-xs font-black text-brand-dark">{classifyIntent(lead.intentScore)}</span>
                  <span className="text-sm font-bold text-neutral-600">{statusLabels[lead.status] ?? lead.status}</span>
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-neutral-500 md:justify-end">
                    <span>{lead.createdAt.toLocaleDateString("es-BO")}</span>
                    <ArrowRight className="size-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
