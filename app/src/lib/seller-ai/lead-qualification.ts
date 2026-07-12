export type LeadStage = "CURIOUS" | "INTERESTED" | "QUALIFIED" | "READY_FOR_WHATSAPP" | "WHATSAPP_CLICKED";

export type LeadQualification = {
  score: number;
  stage: LeadStage;
  reasons: string[];
  readyForWhatsapp: boolean;
};

type QualificationInput = {
  score?: number | null;
  messages?: Array<string | null | undefined>;
  whatsappNumber?: string | null;
  whatsappClicked?: boolean;
};

const signals: Array<{ reason: string; points: number; pattern: RegExp }> = [
  { reason: "precio", points: 15, pattern: /\b(precio|cuanto|cuánto|vale|costo|cuesta)\b/i },
  { reason: "disponibilidad", points: 15, pattern: /\b(disponible|disponibilidad|stock|hay)\b/i },
  { reason: "envío", points: 15, pattern: /\b(envio|envío|enviar|entrega|delivery)\b/i },
  { reason: "variante", points: 15, pattern: /\b(talla|color|modelo|variante)\b/i },
  { reason: "comparación", points: 15, pattern: /\b(comparar|comparación|comparacion|alternativa|opciones)\b/i },
  { reason: "pago", points: 20, pattern: /\b(pago|pagar|cómo pago|como pago|método de pago|metodo de pago|transferencia|tarjeta|qr)\b/i },
  { reason: "intención de compra", points: 35, pattern: /\b(quiero comprar|comprarlo|comprarla|lo quiero|cómo compro|como compro|me interesa|lo llevo|hacer pedido|quiero pedir|pedir|pedir por whatsapp)\b/i },
  { reason: "hablar con un asesor", points: 35, pattern: /\b(hablar con alguien|hablar con un asesor|whatsapp|hablemos)\b/i },
];

const explicitPurchaseIntent = /\b(quiero comprar|comprarlo|comprarla|lo quiero|cómo compro|como compro|cómo pago|como pago|quiero pagar|lo llevo|hacer pedido|quiero pedir|pedir|pedir por whatsapp|hablar con alguien|hablar con un asesor|continuar por whatsapp|hablemos por whatsapp)\b/i;

function normalize(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function computeLeadQualification(input: QualificationInput): LeadQualification {
  const text = (input.messages ?? []).map(normalize).join("\n");
  const matchedSignals = signals.filter((signal) => signal.pattern.test(text));
  const reasons = matchedSignals.map((signal) => signal.reason);
  const signalScore = matchedSignals.reduce((total, signal) => total + signal.points, 0);
  const explicitIntent = explicitPurchaseIntent.test(text);
  const score = Math.min(100, Math.max(0, input.score ?? 0, signalScore, explicitIntent ? 70 : 0));
  const readyForWhatsapp = score >= 70 || explicitIntent;

  if (input.whatsappClicked) return { score, stage: "WHATSAPP_CLICKED", reasons, readyForWhatsapp: true };
  if (readyForWhatsapp) return { score, stage: "READY_FOR_WHATSAPP", reasons, readyForWhatsapp: true };
  if (score >= 55) return { score, stage: "QUALIFIED", reasons, readyForWhatsapp: false };
  if (score >= 25 || reasons.length > 0) return { score, stage: "INTERESTED", reasons, readyForWhatsapp: false };
  return { score, stage: "CURIOUS", reasons, readyForWhatsapp: false };
}

export function shouldShowWhatsappHandoff(qualification: LeadQualification, whatsappNumber?: string | null) {
  return qualification.readyForWhatsapp && Boolean(whatsappNumber?.replace(/\D/g, ""));
}

export function shouldExposeWhatsappHandoffForIntent({
  qualification,
  whatsappNumber,
  informationalIntent,
}: {
  qualification: LeadQualification;
  whatsappNumber?: string | null;
  informationalIntent?: boolean;
}) {
  return !informationalIntent && shouldShowWhatsappHandoff(qualification, whatsappNumber);
}

export function buildWhatsappHandoffMessage(code: string) {
  return `Hola 👋 quiero continuar con lo que estaba viendo en la tienda. Código: ${code}`;
}

export function buildWhatsappHandoffUrl({ whatsappNumber, code }: { whatsappNumber?: string | null; code: string }) {
  const number = whatsappNumber?.replace(/\D/g, "") ?? "";
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappHandoffMessage(code))}`;
}
