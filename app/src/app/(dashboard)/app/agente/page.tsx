import { Bot } from "lucide-react";

export default function AgentPage() {
  return (
    <section className="rounded-lg border border-brand-border bg-brand-paper p-8 shadow-sm">
      <Bot className="size-10 text-brand" />
      <p className="mt-6 text-sm font-bold text-brand-clay">Incluido desde el inicio</p>
      <h1 className="mt-2 text-4xl font-black">Seller AI: tu Agente de Ventas</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
        Un vendedor entrenado con tu catálogo para responder preguntas, recomendar productos y ayudarte a llevar clientes listos a WhatsApp.
      </p>
    </section>
  );
}
