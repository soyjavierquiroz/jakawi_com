import { MessageCircle } from "lucide-react";
import { updateWhatsappAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { buildWhatsappLeadMessage } from "@/lib/seller-ai/whatsapp";

export default async function WhatsappPage() {
  const { store } = await requireStore();
  const sampleProduct = await getPrisma().product.findFirst({ where: { storeId: store.id, isVisible: true }, orderBy: { createdAt: "desc" } });
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
    <section>
      <p className="text-sm font-bold text-brand-dark">WhatsApp</p>
      <h1 className="text-4xl font-black">Handoff a WhatsApp</h1>
      <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">JAKAWI prepara la consulta; WhatsApp es donde confirmas disponibilidad, pago y entrega.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <form action={updateWhatsappAction} className="rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm">
          <label className="space-y-2 block">
            <span className="text-sm font-semibold text-neutral-700">Número de WhatsApp de la tienda</span>
            <input name="whatsapp" defaultValue={store.whatsapp} required className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <p className="mt-3 text-sm font-semibold leading-6 text-neutral-600">Este número recibe consultas con contexto cuando el cliente decide continuar desde Seller AI.</p>
          <button className="mt-5 h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">Actualizar número</button>
        </form>
        <div className="rounded-lg bg-brand-dark p-6 text-white">
          <MessageCircle className="size-8 text-brand-soft" />
          <h2 className="mt-4 text-2xl font-black">Preview del mensaje</h2>
          <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md bg-white/10 p-4 text-sm font-semibold leading-6 text-white/80">{previewMessage}</pre>
          <p className="mt-5 text-sm text-white/55">No hay automatización de WhatsApp en este sprint. El botón público registra el click y redirige al WhatsApp del comercio.</p>
        </div>
      </div>
    </section>
  );
}
