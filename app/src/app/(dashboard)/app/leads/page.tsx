import { ArrowRight, MessageCircle, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { classifyIntent } from "@/lib/seller-ai/intent";
import { visibleLeadWhere } from "@/lib/seller-ai/leads";
import { buildWhatsappUrl } from "@/lib/seller-ai/whatsapp";
import { cn } from "@/lib/ui";
import { CustomerJourneyStage, LeadStatus, Prisma } from "@prisma/client";

const pageSize = 20;

const statusLabels: Record<string, string> = {
  BROWSING: "Navegando",
  ENGAGED: "Nuevo",
  WHATSAPP_CLICKED: "WhatsApp",
  CONTACTED: "Contactado",
  WON: "Cerrado",
  LOST: "Archivado",
};

const stageLabels: Record<string, string> = {
  DISCOVERY: "Descubriendo",
  PRODUCT_ADVISOR: "Producto",
  DECISION_SUPPORT: "Alta señal",
  CLOSING_PREP: "Listo para cerrar",
};

const filters = [
  { key: "all", label: "Todos" },
  { key: "new", label: "Nuevos" },
  { key: "high", label: "Alta intención" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "archived", label: "Cerrados" },
] as const;

function shortSummary(input?: string | null) {
  if (!input) return "Consulta en preparación.";
  return input.length > 96 ? `${input.slice(0, 93)}...` : input;
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}

function buildQuery(params: { filter?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const value = search.toString();
  return value ? `?${value}` : "";
}

function filterWhere(filter: string): Prisma.LeadWhereInput {
  if (filter === "new") return { status: { in: [LeadStatus.ENGAGED] } };
  if (filter === "high") return { OR: [{ intentScore: { gte: 70 } }, { journey: { stage: CustomerJourneyStage.CLOSING_PREP } }] };
  if (filter === "whatsapp") return { status: LeadStatus.WHATSAPP_CLICKED };
  if (filter === "archived") return { status: { in: [LeadStatus.WON, LeadStatus.LOST] } };
  return {};
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const activeFilter = filters.some((filter) => filter.key === params.filter) ? params.filter ?? "all" : "all";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });

  if (!store) {
    return <section className="rounded-lg border border-brand-border bg-brand-paper p-6 text-sm font-semibold text-neutral-600">Crea tu tienda para ver leads.</section>;
  }

  const matchingProducts = q
    ? await getPrisma().product.findMany({
        where: { storeId: store.id, name: { contains: q, mode: "insensitive" } },
        select: { id: true },
        take: 30,
      })
    : [];
  const matchingProductIds = matchingProducts.map((product) => product.id);
  const searchWhere: Prisma.LeadWhereInput = q
    ? {
        OR: [
          { leadCode: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q, mode: "insensitive" } },
          { conversationSummary: { contains: q, mode: "insensitive" } },
          ...(matchingProductIds.length ? [{ currentProductId: { in: matchingProductIds } }, { selectedProductId: { in: matchingProductIds } }] : []),
        ],
      }
    : {};
  const baseWhere: Prisma.LeadWhereInput = { AND: [visibleLeadWhere(store.id), filterWhere(activeFilter), searchWhere] };
  const [total, leads] = await Promise.all([
    getPrisma().lead.count({ where: baseWhere }),
    getPrisma().lead.findMany({
      where: baseWhere,
      include: { store: true, journey: true, activeSnapshot: true, snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const productIds = [...new Set(leads.flatMap((lead) => [lead.currentProductId, lead.selectedProductId]).filter((id): id is string => Boolean(id)))];
  const products = productIds.length
    ? await getPrisma().product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, priceCents: true, currency: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const hasNextPage = page * pageSize < total;

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Leads</p>
          <h1 className="text-3xl font-black md:text-4xl">Clientes listos para cerrar</h1>
          <p className="mt-2 text-sm font-semibold text-neutral-600">Consultas únicas por journey o visitante. JAKAWI no asume identidad personal.</p>
        </div>
        <div className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-soft px-4 text-sm font-black text-brand-dark">
          <UsersRound className="size-4" />
          {total} visibles
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={`/app/leads${buildQuery({ filter: filter.key, q })}`}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-4 text-sm font-black text-brand-dark",
              activeFilter === filter.key && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <form action="/app/leads" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar producto, código JAK, nombre o teléfono" className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-brand-border bg-brand-paper p-8 text-center text-sm font-semibold text-neutral-600">Aún no hay leads con señal comercial para este filtro.</div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const product = productMap.get(lead.selectedProductId ?? lead.currentProductId ?? "");
            const snapshot = lead.activeSnapshot ?? lead.snapshots[0];
            const detectedNeed = lead.journey?.detectedNeed ?? snapshot?.detectedNeed;
            const objections = lead.journey?.objections ?? snapshot?.objections;
            const lastActivity = lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt;
            const whatsappUrl = lead.whatsappMessage || snapshot?.whatsappMessage || snapshot?.channelMessage ? buildWhatsappUrl(lead.store, lead.whatsappMessage ?? snapshot?.whatsappMessage ?? snapshot?.channelMessage ?? "") : null;

            return (
              <article key={lead.id} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-black text-brand-dark">{lead.leadCode}</p>
                      <span className="rounded-full bg-brand-soft px-2 py-1 text-[11px] font-black text-brand-dark">{classifyIntent(lead.intentScore)}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-neutral-600 ring-1 ring-brand-border">{statusLabels[lead.status] ?? lead.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-neutral-500">{relativeTime(lastActivity)}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-neutral-400" />
                </div>

                <div className="mt-3">
                  <h2 className="line-clamp-1 font-black text-brand-dark">{product?.name ?? "Producto por confirmar"}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">
                    {product
                      ? `${formatMoney({
                          amountCents: product.priceCents,
                          currency: lead.store.currency ?? product.currency,
                          countryCode: lead.store.countryCode ?? "BO",
                          locale: lead.store.locale,
                        })} · `
                      : ""}
                    {shortSummary(lead.conversationSummary ?? lead.journey?.conversationSummary)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                  {lead.journey?.stage ? <span className="rounded-full bg-brand-muted px-2 py-1 text-brand-dark">{stageLabels[lead.journey.stage] ?? lead.journey.stage}</span> : null}
                  {detectedNeed ? <span className="rounded-full bg-white px-2 py-1 text-brand-dark ring-1 ring-brand-border">Contexto: {detectedNeed}</span> : null}
                  {objections ? <span className="rounded-full bg-white px-2 py-1 text-brand-dark ring-1 ring-brand-border">Duda: {objections}</span> : null}
                  {lead.customerPhone ? <span className="rounded-full bg-white px-2 py-1 text-brand-dark ring-1 ring-brand-border">Teléfono</span> : null}
                  {lead.visitorId ? <span className="rounded-full bg-white px-2 py-1 text-neutral-600 ring-1 ring-brand-border">Mismo dispositivo</span> : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href={`/app/leads/${lead.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-brand-border px-3 text-sm font-black text-brand-dark hover:border-brand">
                    Ver detalle
                  </Link>
                  {whatsappUrl ? (
                    <a href={whatsappUrl} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-black text-white hover:bg-brand-dark">
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </a>
                  ) : (
                    <Link href={`/app/leads/${lead.id}`} className="inline-flex h-10 items-center justify-center rounded-md bg-brand-muted px-3 text-sm font-black text-brand-dark">
                      Preparar cierre
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasNextPage ? (
        <Link href={`/app/leads${buildQuery({ filter: activeFilter, q, page: page + 1 })}`} className="flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 text-sm font-black text-brand-dark hover:border-brand">
          Cargar más
        </Link>
      ) : null}
    </section>
  );
}
