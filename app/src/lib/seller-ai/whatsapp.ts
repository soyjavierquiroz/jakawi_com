import { sellerAiConfig } from "@/config/seller-ai";
import { normalizePhone } from "@/lib/format";
import { formatMoney } from "@/lib/money";

type LeadLike = {
  leadCode: string;
  customerName?: string | null;
  customerPhone?: string | null;
  city?: string | null;
  budget?: string | null;
  urgency?: string | null;
};
type StoreLike = { whatsapp: string; countryCode?: string | null; currency?: string | null; locale?: string | null };
type ProductLike = { name: string; priceCents?: number | null; currency?: string | null } | null;

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
    product?.priceCents != null
      ? `Precio publicado: ${formatMoney({
          amountCents: product.priceCents,
          currency: store?.currency ?? product.currency,
          countryCode: store?.countryCode ?? "BO",
          locale: store?.locale,
        })}.`
      : null,
    lead.customerPhone ? `Mi número: ${lead.customerPhone}.` : null,
    lead.customerName ? `Mi nombre: ${lead.customerName}.` : null,
    `Resumen: ${summary}`,
    lead.city ? `Ciudad: ${lead.city}` : null,
    lead.budget ? `Presupuesto: ${lead.budget}` : null,
    lead.urgency ? `Urgencia: ${lead.urgency}` : null,
    `Código: ${lead.leadCode}`,
    "Quiero saber cómo comprar.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function normalizeCustomerPhone(input: string) {
  const clean = input.trim();
  const digits = clean.replace(/\D/g, "");
  if (!digits) return "";
  if (clean.startsWith("+")) return `+${digits}`;
  if (digits.length === 8) return `+591${digits}`;
  if (digits.startsWith("591")) return `+${digits}`;
  return `+${digits}`;
}

export function isReasonableCustomerPhone(input: string) {
  const normalized = normalizeCustomerPhone(input);
  const digits = normalized.replace(/\D/g, "");
  return /^\+\d{8,15}$/.test(normalized) && digits.length >= 8 && digits.length <= 15;
}

export function buildWhatsappUrl(store: StoreLike, message: string) {
  return `https://wa.me/${normalizePhone(store.whatsapp)}?text=${encodeURIComponent(message)}`;
}
