import { MessageCircle } from "lucide-react";
import { updateWhatsappAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";

export default async function WhatsappPage() {
  const { store } = await requireStore();

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">WhatsApp</p>
      <h1 className="text-4xl font-black">Consultas directas</h1>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <form action={updateWhatsappAction} className="rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm">
          <label className="space-y-2 block">
            <span className="text-sm font-semibold text-neutral-700">Número actual</span>
            <input name="whatsapp" defaultValue={store.whatsapp} required className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <button className="mt-5 h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">Actualizar número</button>
        </form>
        <div className="rounded-lg bg-brand-dark p-6 text-white">
          <MessageCircle className="size-8 text-brand-soft" />
          <h2 className="mt-4 text-2xl font-black">Texto de ejemplo</h2>
          <p className="mt-3 text-white/75">
            Hola, vi este producto en tu tienda JAKAWI: Celular demo. Sigue disponible?
          </p>
          <p className="mt-5 text-sm text-white/50">El botón público registra el click y redirige al WhatsApp del comercio.</p>
        </div>
      </div>
    </section>
  );
}
