import { sellerAiConfig } from "@/config/seller-ai";
import { normalizePhone } from "@/lib/format";

type LeadLike = {
  leadCode: string;
  city?: string | null;
  budget?: string | null;
  urgency?: string | null;
};
type StoreLike = { whatsapp: string };
type ProductLike = { name: string } | null;

export function buildWhatsappLeadMessage({
  lead,
  product,
  summary,
}: {
  lead: LeadLike;
  store?: StoreLike;
  product: ProductLike;
  summary: string;
}) {
  const lines = [
    sellerAiConfig.whatsappIntro,
    product?.name ? `Me interesa: ${product.name}.` : null,
    `Resumen: ${summary}`,
    lead.city ? `Ciudad: ${lead.city}` : null,
    lead.budget ? `Presupuesto: ${lead.budget}` : null,
    lead.urgency ? `Urgencia: ${lead.urgency}` : null,
    `Código: ${lead.leadCode}`,
    "Quiero saber cómo comprar.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildWhatsappUrl(store: StoreLike, message: string) {
  return `https://wa.me/${normalizePhone(store.whatsapp)}?text=${encodeURIComponent(message)}`;
}
