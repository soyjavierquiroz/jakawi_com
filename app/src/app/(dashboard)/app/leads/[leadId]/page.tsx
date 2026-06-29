import { CheckCircle2, MessageCircle, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { markLeadContacted, markLeadLost, markLeadWon } from "@/app/(dashboard)/app/leads/actions";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { classifyIntent } from "@/lib/seller-ai/intent";

const statusLabels: Record<string, string> = {
  BROWSING: "Navegando",
  ENGAGED: "Conversando",
  WHATSAPP_CLICKED: "WhatsApp clickeado",
  CONTACTED: "Contactado",
  WON: "Vendido",
  LOST: "Perdido",
};

function jsonIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recommendedNames(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "object" && item && "name" in item ? String(item.name) : null)).filter((item): item is string => Boolean(item));
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const user = await requireUser();
  const lead = await getPrisma().lead.findFirst({
    where: { id: leadId, store: { ownerId: user.id } },
    include: {
      store: true,
      journey: { include: { events: { orderBy: { createdAt: "asc" } } } },
      activeSnapshot: true,
      snapshots: { orderBy: { createdAt: "desc" }, take: 3 },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lead) notFound();

  const productIds = [...new Set([lead.currentProductId, lead.selectedProductId, ...jsonIds(lead.viewedProducts)].filter((id): id is string => Boolean(id)))];
  const products = productIds.length
    ? await getPrisma().product.findMany({
        where: { id: { in: productIds }, storeId: lead.storeId },
        include: { category: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const mainProduct = productMap.get(lead.selectedProductId ?? lead.currentProductId ?? "");
  const whatsappUrl = lead.whatsappMessage ? `https://wa.me/${normalizePhone(lead.store.whatsapp)}?text=${encodeURIComponent(lead.whatsappMessage)}` : null;
  const latestSnapshot = lead.activeSnapshot ?? lead.snapshots[0] ?? null;
  const timeline = [
    ...lead.events.map((event) => ({
      id: `lead-${event.id}`,
      label: event.eventType,
      source: "Lead",
      createdAt: event.createdAt,
    })),
    ...(lead.journey?.events.map((event) => ({
      id: `journey-${event.id}`,
      label: event.type,
      source: "Journey",
      createdAt: event.createdAt,
    })) ?? []),
  ].sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-sm font-black text-brand-dark">{lead.leadCode}</p>
          <h1 className="text-4xl font-black">Detalle del lead</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 font-black text-white hover:bg-brand-dark">
              <MessageCircle className="size-4" />
              Abrir WhatsApp
            </a>
          ) : null}
          <form action={markLeadContacted}>
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="inline-flex h-11 items-center gap-2 rounded-md border border-brand-border px-4 font-bold hover:border-brand">
              <CheckCircle2 className="size-4" />
              Contactado
            </button>
          </form>
          <form action={markLeadWon}>
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="inline-flex h-11 items-center gap-2 rounded-md border border-brand-border px-4 font-bold hover:border-brand">
              <CheckCircle2 className="size-4" />
              Vendido
            </button>
          </form>
          <form action={markLeadLost}>
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="inline-flex h-11 items-center gap-2 rounded-md border border-red-200 px-4 font-bold text-red-700 hover:border-red-500">
              <XCircle className="size-4" />
              Perdido
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Resumen</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Estado</p>
                <p className="mt-1 font-black">{statusLabels[lead.status] ?? lead.status}</p>
              </div>
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Intención</p>
                <p className="mt-1 font-black">{classifyIntent(lead.intentScore)} ({lead.intentScore}/100)</p>
              </div>
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Ciudad</p>
                <p className="mt-1 font-black">{lead.city ?? "Sin dato"}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">WhatsApp cliente</p>
                <p className="mt-1 font-black">{lead.customerPhone ?? "Sin dato"}</p>
              </div>
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Nombre cliente</p>
                <p className="mt-1 font-black">{lead.customerName ?? "Sin dato"}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Journey</p>
                <p className="mt-1 font-mono font-black">{lead.journey?.journeyCode ?? "Sin journey"}</p>
              </div>
              <div className="rounded-md bg-brand-muted p-3">
                <p className="font-bold text-neutral-500">Snapshot</p>
                <p className="mt-1 font-mono font-black">{latestSnapshot?.snapshotCode ?? "Sin snapshot"}</p>
              </div>
            </div>
            <p className="mt-4 leading-7 text-neutral-700">{lead.conversationSummary ?? "El resumen se generará cuando el cliente continúe a WhatsApp."}</p>
          </section>

          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Conversación</h2>
            <div className="mt-4 space-y-3">
              {lead.conversation?.messages.length ? (
                lead.conversation.messages.map((message) => (
                  <div key={message.id} className={message.role === "USER" ? "text-right" : ""}>
                    <div className={`inline-block max-w-[84%] rounded-lg px-3 py-2 text-sm leading-6 ${message.role === "USER" ? "bg-brand text-white" : "bg-brand-muted text-neutral-800"}`}>
                      {message.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500">Sin mensajes todavía.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Mensaje WhatsApp</h2>
            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-brand-muted p-4 text-sm leading-6 text-neutral-700">{lead.whatsappMessage ?? "Todavía no se generó mensaje de WhatsApp."}</pre>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Producto principal</h2>
            {mainProduct ? (
              <div className="mt-4">
                <img src={mainProduct.imageUrl ?? "/placeholder-product.svg"} alt="" className="aspect-square w-full rounded-md object-cover" />
                <h3 className="mt-3 font-black">{mainProduct.name}</h3>
                <p className="text-sm font-bold text-brand-dark">
                  {formatMoney({
                    amountCents: mainProduct.priceCents,
                    currency: lead.store.currency ?? mainProduct.currency,
                    countryCode: lead.store.countryCode ?? "BO",
                    locale: lead.store.locale,
                  })}
                </p>
                <p className="text-sm text-neutral-500">{mainProduct.category?.name ?? "Sin categoría"}</p>
              </div>
            ) : (
              <p className="mt-3 text-neutral-500">Producto por confirmar.</p>
            )}
          </section>

          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Productos vistos</h2>
            <div className="mt-3 space-y-2">
              {jsonIds(lead.viewedProducts).map((id) => (
                <p key={id} className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold">{productMap.get(id)?.name ?? id}</p>
              ))}
              {jsonIds(lead.viewedProducts).length === 0 ? <p className="text-neutral-500">Sin productos vistos.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Recomendados</h2>
            <div className="mt-3 space-y-2">
              {recommendedNames(lead.recommendedProducts).map((name) => (
                <p key={name} className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold">{name}</p>
              ))}
              {recommendedNames(lead.recommendedProducts).length === 0 ? <p className="text-neutral-500">Sin recomendaciones todavía.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <h2 className="text-xl font-black">Timeline</h2>
            <div className="mt-4 space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="border-l-2 border-brand-border pl-3">
                  <p className="text-sm font-black">{event.label}</p>
                  <p className="text-xs font-semibold text-neutral-500">{event.source} - {event.createdAt.toLocaleString("es-BO")}</p>
                </div>
              ))}
              {timeline.length === 0 ? <p className="text-neutral-500">Sin eventos todavía.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
