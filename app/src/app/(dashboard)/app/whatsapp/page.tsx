import { ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getPublicStoreUrl } from "@/config/site";
import { updateWhatsappAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { buildWhatsappLeadMessage } from "@/lib/seller-ai/whatsapp";

export default async function WhatsappPage() {
  const { store } = await requireStore();
  const sampleProduct = await getPrisma().product.findFirst({ where: { storeId: store.id, isVisible: true }, orderBy: { createdAt: "desc" } });
  const publicUrl = getPublicStoreUrl(store.slug);
  const previewMessage = buildWhatsappLeadMessage({
    lead: {
      leadCode: "JAK-1234",
      customerName: "Cliente demo",
      customerPhone: "+59170000000",
      budget: "Quiere confirmar precio",
      urgency: "Hoy",
    },
    store,
    product: sampleProduct,
    summary: `Viene de JAKAWI${sampleProduct ? ` interesado en ${sampleProduct.name}` : ""}. Preguntó por disponibilidad, pago y entrega.`,
  });

  return (
    <section className="space-y-5 md:space-y-6">
      <p className="text-sm font-bold text-brand-dark">WhatsApp</p>
      <h1 className="text-3xl font-black md:text-4xl">Handoff a WhatsApp</h1>
      <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">JAKAWI prepara la consulta; WhatsApp es donde confirmas disponibilidad, pago y entrega.</p>

      <section className="rounded-lg bg-brand-dark p-5 text-white md:p-6">
        <MessageCircle className="size-7 text-brand-lime" />
        <h2 className="mt-3 text-xl font-black md:text-2xl">JAKAWI prepara el contexto antes de enviarlo a WhatsApp.</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/70">El vendedor recibe producto, código, dudas y urgencia para cerrar sin reconstruir la conversación.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:flex md:items-center">
          <a href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-lime px-5 font-black text-brand-dark hover:bg-brand-yellow">
            <ExternalLink className="size-4" />
            Probar flujo
          </a>
          <Link href="/app/leads" className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-5 font-black text-white hover:bg-white/10">
            Ver clientes y señales
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={updateWhatsappAction} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Número de WhatsApp de la tienda</span>
            <input name="whatsapp" defaultValue={store.whatsapp} required className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <p className="mt-3 text-sm font-semibold leading-6 text-neutral-600">Este número recibe consultas con contexto cuando el cliente decide continuar desde Seller AI.</p>
          <button className="mt-5 h-11 w-full rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark sm:w-auto">Actualizar número</button>
        </form>
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
          <p className="text-sm font-black text-brand-dark">Qué recibe el vendedor</p>
          <h2 className="mt-1 text-xl font-black md:text-2xl">Preview compacto del handoff</h2>
          <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md bg-brand-muted p-4 text-sm font-semibold leading-6 text-neutral-700">{previewMessage}</pre>
          <p className="mt-4 text-sm font-semibold leading-6 text-neutral-600">No hay automatización de WhatsApp en este sprint. El botón público registra el click y redirige al WhatsApp del comercio.</p>
        </div>
      </div>
    </section>
  );
}
