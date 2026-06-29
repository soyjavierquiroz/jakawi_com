import { MessageCircle, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { classifyIntent } from "@/lib/seller-ai/intent";
import { classifyLead, getLeadWhatsappMessage, visibleLeadWhere } from "@/lib/seller-ai/leads";
import { buildWhatsappUrl } from "@/lib/seller-ai/whatsapp";
import { cn } from "@/lib/ui";
import { CustomerJourneyStage, JourneyEventType, LeadEventType, LeadStatus, Prisma } from "@prisma/client";

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
  CLOSING_PREP: "Cierre",
};

const contactMethodLabels = {
  PHONE: "Teléfono",
  WHATSAPP: "WhatsApp",
  NONE: "Sin contacto",
} as const;

const groups = [
  { key: "contactable", label: "Contactables", description: "Clientes con WhatsApp, teléfono o consulta enviada." },
  { key: "intent", label: "Intención", description: "Visitantes con señales de compra, pero sin contacto directo." },
  { key: "all", label: "Todos", description: "Contactables e intención anónima." },
] as const;

const filters = [
  { key: "all", label: "Todos" },
  { key: "high", label: "Alta intención" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "new", label: "Nuevos" },
  { key: "anonymous", label: "Anónimos" },
] as const;

function shortSummary(input?: string | null) {
  if (!input) return "Consulta en preparación.";
  return input.length > 86 ? `${input.slice(0, 83)}...` : input;
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

function buildQuery(params: { group?: string; filter?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.group && params.group !== "contactable") search.set("group", params.group);
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const value = search.toString();
  return value ? `?${value}` : "";
}

function filterWhere(filter: string): Prisma.LeadWhereInput {
  if (filter === "new") return { status: { in: [LeadStatus.ENGAGED, LeadStatus.BROWSING] } };
  if (filter === "high") return { OR: [{ intentScore: { gte: 70 } }, { journey: { stage: { in: [CustomerJourneyStage.DECISION_SUPPORT, CustomerJourneyStage.CLOSING_PREP] } } }] };
  if (filter === "whatsapp") return { OR: [{ status: LeadStatus.WHATSAPP_CLICKED }, { whatsappClickedAt: { not: null } }, { events: { some: { eventType: LeadEventType.WHATSAPP_CLICKED } } }] };
  return {};
}

function isHighIntent(lead: { intentScore: number; journey?: { stage?: CustomerJourneyStage | null; intentScore?: number | null } | null }) {
  return (lead.intentScore ?? 0) >= 70 || (lead.journey?.intentScore ?? 0) >= 70 || lead.journey?.stage === CustomerJourneyStage.CLOSING_PREP;
}

function buildCustomerWhatsappUrl(phone: string, leadCode: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(`Hola, te escribo por tu consulta ${leadCode} en JAKAWI.`)}`;
}

function getSignals({
  detectedNeed,
  objections,
  stage,
}: {
  detectedNeed?: string | null;
  objections?: string | null;
  stage?: CustomerJourneyStage | null;
}) {
  return [
    detectedNeed ? `Necesidad: ${detectedNeed}` : null,
    objections ? `Duda: ${objections}` : null,
    stage ? stageLabels[stage] ?? stage : null,
  ].filter((item): item is string => Boolean(item));
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; filter?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const activeGroup = groups.some((group) => group.key === params.group) ? params.group ?? "contactable" : "contactable";
  const activeFilter = filters.some((filter) => filter.key === params.filter) ? params.filter ?? "all" : "all";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });

  if (!store) {
    return <section className="rounded-lg border border-brand-border bg-brand-paper p-6 text-sm font-semibold text-neutral-600">Crea tu tienda para ver clientes y señales.</section>;
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

  const include = {
    store: true,
    activeSnapshot: true,
    snapshots: { orderBy: { createdAt: "desc" as const }, take: 1 },
    events: {
      where: { eventType: { in: [LeadEventType.CHAT_OPENED, LeadEventType.CUSTOMER_MESSAGE_SENT, LeadEventType.PRODUCT_RECOMMENDED, LeadEventType.WHATSAPP_CLICKED] } },
      select: { eventType: true },
      take: 20,
    },
    journey: {
      include: {
        events: {
          where: { type: { in: [JourneyEventType.CUSTOMER_MESSAGE_SENT, JourneyEventType.NEED_DETECTED, JourneyEventType.OBJECTION_DETECTED, JourneyEventType.INTENT_UPDATED, JourneyEventType.CHANNEL_CLICKED] } },
          select: { type: true },
          take: 20,
        },
      },
    },
  };
  const statWhere: Prisma.LeadWhereInput = { AND: [visibleLeadWhere(store.id), searchWhere] };
  const listWhere: Prisma.LeadWhereInput = { AND: [visibleLeadWhere(store.id), filterWhere(activeFilter), searchWhere] };
  const [statLeads, candidateLeads] = await Promise.all([
    getPrisma().lead.findMany({
      where: statWhere,
      include,
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    getPrisma().lead.findMany({
      where: listWhere,
      include,
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const statRows = statLeads.map((lead) => ({ lead, classification: classifyLead(lead) }));
  const contactableCount = statRows.filter((row) => row.classification.isContactable).length;
  const anonymousCount = statRows.filter((row) => row.classification.isAnonymousIntent).length;
  const highIntentCount = statRows.filter((row) => isHighIntent(row.lead)).length;

  const groupedLeads = candidateLeads
    .map((lead) => ({ lead, classification: classifyLead(lead) }))
    .filter((row) => {
      if (activeFilter === "anonymous" && !row.classification.isAnonymousIntent) return false;
      if (activeGroup === "contactable") return row.classification.isContactable;
      if (activeGroup === "intent") return row.classification.isAnonymousIntent;
      return row.classification.isContactable || row.classification.isAnonymousIntent;
    });
  const total = groupedLeads.length;
  const leads = groupedLeads.slice((page - 1) * pageSize, page * pageSize);

  const productIds = [...new Set(leads.flatMap(({ lead }) => [lead.currentProductId, lead.selectedProductId]).filter((id): id is string => Boolean(id)))];
  const products = productIds.length
    ? await getPrisma().product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, priceCents: true, currency: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const hasNextPage = page * pageSize < total;
  const activeGroupConfig = groups.find((group) => group.key === activeGroup) ?? groups[0];

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Leads</p>
          <h1 className="text-3xl font-black md:text-4xl">Clientes y señales</h1>
          <p className="mt-2 text-sm font-semibold text-neutral-600">Separa clientes contactables de visitantes con intención anónima.</p>
        </div>
        <div className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-soft px-4 text-sm font-black text-brand-dark">
          <UsersRound className="size-4" />
          {total} en vista
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-brand-border bg-brand-paper p-2 shadow-sm">
        <div className="min-w-0 rounded-md bg-brand-muted px-2 py-2 text-center">
          <p className="truncate text-[11px] font-black text-neutral-500">Contactables</p>
          <p className="text-xl font-black leading-6 text-brand-dark">{contactableCount}</p>
        </div>
        <div className="min-w-0 rounded-md bg-brand-muted px-2 py-2 text-center">
          <p className="truncate text-[11px] font-black text-neutral-500">Intención anónima</p>
          <p className="text-xl font-black leading-6 text-brand-dark">{anonymousCount}</p>
        </div>
        <div className="min-w-0 rounded-md bg-brand-muted px-2 py-2 text-center">
          <p className="truncate text-[11px] font-black text-neutral-500">Alta intención</p>
          <p className="text-xl font-black leading-6 text-brand-dark">{highIntentCount}</p>
        </div>
      </div>

      <div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <Link
              key={group.key}
              href={`/app/leads${buildQuery({ group: group.key, filter: activeFilter, q })}`}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-4 text-sm font-black text-brand-dark",
                activeGroup === group.key && "border-brand-dark bg-brand-dark text-white",
              )}
            >
              {group.label}
            </Link>
          ))}
        </div>
        <p className="mt-1 text-xs font-semibold text-neutral-500">{activeGroupConfig.description}</p>
      </div>

      <form action="/app/leads" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeGroup !== "contactable" ? <input type="hidden" name="group" value={activeGroup} /> : null}
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar producto, código JAK, teléfono..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={`/app/leads${buildQuery({ group: activeGroup, filter: filter.key, q })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeFilter === filter.key && "border-brand bg-brand-soft",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-brand-border bg-brand-paper p-8 text-center text-sm font-semibold text-neutral-600">Aún no hay clientes o señales para este filtro.</div>
      ) : (
        <div className="space-y-3">
          {leads.map(({ lead, classification }) => {
            const product = productMap.get(lead.selectedProductId ?? lead.currentProductId ?? "");
            const snapshot = lead.activeSnapshot ?? lead.snapshots[0];
            const detectedNeed = lead.journey?.detectedNeed ?? snapshot?.detectedNeed;
            const objections = lead.journey?.objections ?? snapshot?.objections;
            const lastActivity = lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt;
            const contactPhone = lead.customerPhone ?? snapshot?.customerPhone;
            const whatsappMessage = getLeadWhatsappMessage(lead);
            const whatsappUrl = contactPhone ? buildCustomerWhatsappUrl(contactPhone, lead.leadCode) : classification.canOpenWhatsapp && whatsappMessage ? buildWhatsappUrl(lead.store, whatsappMessage) : null;
            const signals = getSignals({ detectedNeed, objections, stage: lead.journey?.stage });

            return (
              <article key={lead.id} className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-black", classification.isContactable ? "bg-brand-dark text-white" : "bg-brand-soft text-brand-dark")}>
                        {classification.isContactable ? "Contactable" : "Intención"}
                      </span>
                      <p className="font-mono text-sm font-black text-brand-dark">{lead.leadCode}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-neutral-600 ring-1 ring-brand-border">{classifyIntent(lead.intentScore)}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-neutral-600 ring-1 ring-brand-border">{statusLabels[lead.status] ?? lead.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-neutral-500">{relativeTime(lastActivity)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-muted px-2 py-1 text-[11px] font-black text-neutral-600">{contactMethodLabels[classification.contactMethod]}</span>
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
                    {classification.isContactable ? contactPhone ?? "WhatsApp o consulta enviada" : shortSummary(lead.conversationSummary ?? lead.journey?.conversationSummary)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                  {classification.isAnonymousIntent ? <span className="rounded-full bg-brand-muted px-2 py-1 text-brand-dark">Visitante con intención</span> : null}
                  {classification.isAnonymousIntent ? <span className="rounded-full bg-white px-2 py-1 text-neutral-600 ring-1 ring-brand-border">No contactable todavía</span> : null}
                  {signals.slice(0, 3).map((signal) => (
                    <span key={signal} className="rounded-full bg-white px-2 py-1 text-brand-dark ring-1 ring-brand-border">
                      {signal}
                    </span>
                  ))}
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
                    <span className="inline-flex h-10 items-center justify-center rounded-md bg-brand-muted px-3 text-sm font-black text-brand-dark">Sin contacto directo</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasNextPage ? (
        <Link href={`/app/leads${buildQuery({ group: activeGroup, filter: activeFilter, q, page: page + 1 })}`} className="flex h-11 items-center justify-center rounded-md border border-brand-border bg-brand-paper px-5 text-sm font-black text-brand-dark hover:border-brand">
          Cargar más
        </Link>
      ) : null}
    </section>
  );
}
