import { Bot, CheckCircle2, ExternalLink, MessageCircle, Mic, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlanUsageCompactCard } from "@/components/dashboard/PlanUsageCompactCard";
import { SellerVoiceNotesSettings } from "@/components/dashboard/SellerVoiceNotesSettings";
import { getPublicStoreUrl } from "@/config/site";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";
import { requireStore } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { buildWhatsappLeadMessage } from "@/lib/seller-ai/whatsapp";

const agentModes = [
  "Descubre necesidad",
  "Asesora producto",
  "Resuelve dudas",
  "Prepara WhatsApp",
];

const agentRules = [
  "No inventa disponibilidad",
  "No inventa precio",
  "No inventa envío",
  "No reemplaza al vendedor",
];

function SellerAiSection({ title, summary, children, defaultOpen = false }: { title: string; summary: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-brand-border bg-brand-paper shadow-sm lg:contents">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <span>
          <span className="block text-sm font-black text-brand-dark">{title}</span>
          <span className="mt-0.5 block text-xs font-semibold leading-5 text-neutral-500">{summary}</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-muted text-lg font-black text-brand-dark group-open:rotate-45">+</span>
      </summary>
      <div className="hidden px-4 pb-4 group-open:block lg:block lg:px-0 lg:pb-0">{children}</div>
    </details>
  );
}

export default async function SellerAiPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const [productUsage, sellerAiUsage, sampleProduct] = await Promise.all([
    getProductUsage(store.id),
    getSellerAiUsage(store.id),
    getPrisma().product.findFirst({
      where: { storeId: store.id, isVisible: true },
      include: { category: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
    }),
  ]);
  const planState = getStorePlanState(store);
  const publicUrl = getPublicStoreUrl(store.slug);
  const sellerAiStatus = planState.sellerAiEnabled ? "Habilitado" : "No incluido";
  const productUsageLabel = `${productUsage.used} / ${productUsage.limit}`;
  const sellerAiUsageLabel = sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido";
  const voiceNotesLabel = planState.sellerAiEnabled ? "Disponible" : "Pro/Premium";
  const displayName = store.sellerVoiceDisplayName ?? store.name;
  const exampleProductName = sampleProduct?.name ?? "Celular demo";
  const examplePrice = sampleProduct
    ? formatMoney({
        amountCents: sampleProduct.priceCents,
        currency: store.currency ?? sampleProduct.currency,
        countryCode: store.countryCode ?? "BO",
        locale: store.locale,
      })
    : "Precio publicado";
  const whatsappPreview = buildWhatsappLeadMessage({
    lead: {
      leadCode: "JAK-1234",
      customerName: "Cliente demo",
      customerPhone: "+59170000000",
      budget: "Quiere confirmar precio",
      urgency: "Hoy",
    },
    store,
    product: sampleProduct,
    summary: `Viene de JAKAWI interesado en ${exampleProductName}. Preguntó por disponibilidad, pago y entrega.`,
  });

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Seller AI</p>
          <h1 className="text-3xl font-black md:text-4xl">Centro de configuración Seller AI</h1>
          <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">Configura cómo JAKAWI prepara consultas, cuándo aparece la voz del vendedor y cómo llega el contexto a WhatsApp.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:flex md:items-center">
          <Link href="/app/whatsapp" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            <MessageCircle className="size-4" />
            Ver WhatsApp
          </Link>
          <a href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-paper px-5 font-bold text-brand-dark hover:border-brand">
            <ExternalLink className="size-4" />
            Ver tienda
          </a>
        </div>
      </div>

      {params.ok ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error === "voice-plan" ? "Las notas de voz están disponibles en Pro/Premium." : params.error}</p> : null}

      <div className="mt-5 space-y-3 lg:mt-6 lg:space-y-6">
        <SellerAiSection title="Estado" summary={`${sellerAiStatus} · ${planState.planName}`} defaultOpen>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-brand-dark">Estado de Seller AI</p>
                  <h2 className="mt-2 text-2xl font-black">{sellerAiStatus}</h2>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-dark">{planState.planName}</span>
              </div>
              <PlanUsageCompactCard productUsageLabel={productUsageLabel} sellerAiUsageLabel={sellerAiUsageLabel} voiceNotesLabel={voiceNotesLabel} className="mt-4 border-0 bg-transparent p-0 shadow-none" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link href="/app/whatsapp" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
                  <MessageCircle className="size-4" />
                  Ver WhatsApp
                </Link>
                <a href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border px-5 font-bold text-brand-dark hover:border-brand">
                  <ExternalLink className="size-4" />
                  Ver tienda
                </a>
              </div>
              {!planState.sellerAiEnabled ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Seller AI está disponible en Pro/Premium.</p> : null}
            </section>

            <section className="rounded-lg bg-brand-dark p-5 text-white lg:p-6">
              <Bot className="size-8 text-brand-lime" />
              <h2 className="mt-4 text-2xl font-black">Cómo funciona</h2>
              <p className="mt-3 max-w-2xl text-lg font-black leading-8 text-white">Seller AI prepara. La voz del vendedor genera confianza. WhatsApp cierra.</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/65">JAKAWI recuerda el contexto para que el vendedor real cierre con menos ida y vuelta.</p>
            </section>
          </div>
        </SellerAiSection>

        <SellerAiSection title="Notas de voz" summary="Bienvenida, orientación y cierre">
          <SellerVoiceNotesSettings canEdit={planState.sellerAiEnabled} store={store} />
        </SellerAiSection>

        <SellerAiSection title="Vista previa" summary="Cómo lo siente el cliente">
          <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm lg:p-5">
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-black text-brand-dark">Vista previa</p>
                <h2 className="mt-2 text-xl font-black lg:text-2xl">Así se siente para el cliente</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600">Preview compacto del flujo: producto, nota de voz, respuesta corta y CTA a WhatsApp.</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-[#FAF7EF] p-4">
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs font-black uppercase text-neutral-500">Producto seleccionado</p>
                  <p className="mt-1 font-black text-brand-dark">{exampleProductName}</p>
                  <p className="text-sm font-semibold text-neutral-500">{examplePrice}</p>
                </div>
                <div className="mt-3 max-w-[310px] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Mic className="size-4 text-neutral-500" />
                    <p className="text-xs font-black text-brand-dark">{displayName}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span key={index} className="w-[3px] rounded-full bg-neutral-300" style={{ height: 8 + ((index * 5) % 18) }} />
                    ))}
                    <span className="ml-2 text-xs font-bold text-neutral-500">0:12</span>
                  </div>
                </div>
                <div className="mt-3 max-w-[330px] rounded-2xl rounded-bl-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold leading-6 text-neutral-700">Te ayudo a dejar clara tu consulta para que el vendedor confirme disponibilidad, pago y entrega.</div>
                <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-black text-white">
                  <MessageCircle className="size-4" />
                  Continuar por WhatsApp
                </button>
              </div>
            </div>
          </section>
        </SellerAiSection>

        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <SellerAiSection title="WhatsApp" summary="Mensaje que recibe el vendedor">
            <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm lg:p-5">
              <p className="text-sm font-black text-brand-dark">WhatsApp handoff preview</p>
              <h2 className="mt-2 text-xl font-black lg:text-2xl">Mensaje que recibe el vendedor</h2>
              <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md bg-brand-muted p-4 text-sm font-semibold leading-6 text-neutral-700">{whatsappPreview}</pre>
            </section>
          </SellerAiSection>

          <SellerAiSection title="Reglas del agente" summary="Qué hace y qué no inventa">
            <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm lg:p-5">
              <p className="text-sm font-black text-brand-dark">Comportamiento del agente</p>
              <h2 className="mt-2 text-xl font-black lg:text-2xl">MVP sin LLM</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {agentModes.map((mode) => (
                  <div key={mode} className="flex items-center gap-2 rounded-md bg-brand-muted px-3 py-2 text-sm font-black text-brand-dark">
                    <CheckCircle2 className="size-4 text-brand" />
                    {mode}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {agentRules.map((rule) => (
                  <div key={rule} className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                    <ShieldCheck className="size-4 text-neutral-500" />
                    {rule}
                  </div>
                ))}
              </div>
            </section>
          </SellerAiSection>
        </div>
      </div>
    </section>
  );
}
