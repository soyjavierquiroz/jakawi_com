import { sellerAiConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/format";
import { getProductCategoryKind } from "@/lib/seller-ai/context";

type CategoryLike = { name: string; slug?: string } | null;
type ProductLike = { name: string; description?: string | null; priceCents?: number; currency?: string; category?: CategoryLike } | null;
type LeadLike = { city?: string | null; budget?: string | null; urgency?: string | null; objections?: string[] | null };
type MessageLike = { role: string; content: string };

export function getTemplateByCategory(categoryName?: string | null) {
  const key = (categoryName ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
  return sellerAiConfig.categoryTemplates[key as keyof typeof sellerAiConfig.categoryTemplates] ?? sellerAiConfig.categoryTemplates.default;
}

export function getOpeningMessage({ product, category }: { product: ProductLike; category?: CategoryLike; store?: unknown }) {
  const kind = getProductCategoryKind(product ? { id: "", name: product.name, category } : null, category);
  const template = sellerAiConfig.categoryTemplates[kind as keyof typeof sellerAiConfig.categoryTemplates] ?? getTemplateByCategory(category?.name);
  return template.replace("{productName}", product?.name ?? "este producto");
}

export function getQuickReplies({ product, category }: { product?: ProductLike; category?: CategoryLike }) {
  const kind = getProductCategoryKind(product ? { id: "", name: product.name, category } : null, category);
  return sellerAiConfig.quickReplies[kind as keyof typeof sellerAiConfig.quickReplies] ?? sellerAiConfig.quickReplies.default;
}

function normalize(input: string) {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateHeuristicReply({
  userMessage,
  product,
  relatedProducts,
}: {
  userMessage: string;
  product: ProductLike;
  relatedProducts: ProductLike[];
  lead?: LeadLike | null;
}) {
  const text = normalize(userMessage);
  if (/precio|cu[aá]nto|cuanto|vale|costo|cuesta/.test(text) && product?.priceCents != null) {
    return `Por el precio publicado, ${product.name} está en ${formatMoney(product.priceCents, product.currency)}. ¿Quieres que te deje el pedido listo por WhatsApp?`;
  }
  if (/talla|color|stock|disponible|disponibilidad|hay|variante/.test(text)) {
    return `${sellerAiConfig.reserved.confirmByWhatsapp} ¿Quieres continuar con este producto?`;
  }
  if (/quiero|me interesa|comprar|como compro|cómo compro|pedido|lo llevo/.test(text)) {
    return "Perfecto. Te dejo el pedido armado para WhatsApp con este producto. ¿Quieres continuar?";
  }
  if (/regalo|regalar/.test(text)) {
    return "Buena idea para regalo. Para afinarlo mejor: ¿es para algo especial o para uso diario?";
  }
  if (/trabajo|estudio|redes|diario|evento|casual|elegante/.test(text)) {
    return "Con ese uso en mente, este producto puede encajar bien. ¿Quieres que lo dejemos listo para consultar por WhatsApp?";
  }
  if (relatedProducts.length > 0) {
    return `También podrías comparar con ${relatedProducts[0]?.name}. ¿Quieres seguir con ${product?.name ?? "este producto"} o ver otra opción?`;
  }
  return `${sellerAiConfig.reserved.safeDescription} ¿Quieres que lo dejemos armado para preguntar por WhatsApp?`;
}

export function generateLeadSummary({ lead, messages, product }: { lead?: LeadLike | null; messages: MessageLike[]; product: ProductLike }) {
  const userMessages = messages.filter((message) => message.role === "USER").map((message) => message.content).slice(-4);
  const details = [
    product?.name ? `Interés principal: ${product.name}` : null,
    lead?.city ? `Ciudad: ${lead.city}` : null,
    lead?.budget ? `Presupuesto: ${lead.budget}` : null,
    lead?.urgency ? `Urgencia: ${lead.urgency}` : null,
    userMessages.length ? `Conversación: ${userMessages.join(" | ")}` : null,
  ].filter(Boolean);

  return details.length ? details.join(". ").slice(0, 700) : "Cliente interesado en consultar este producto por WhatsApp.";
}
