import { brandConfig } from "@/config/brand";

const configuredSupportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
const configuredSupportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();

export const supportConfig = {
  supportEmail: configuredSupportEmail || "soporte@jakawi.com",
  supportWhatsApp: configuredSupportWhatsapp || "",
  businessName: brandConfig.legalName,
  supportHours: "Lunes a viernes, 09:00 a 18:00 (hora Bolivia)",
  country: "Bolivia",
  market: "Bolivia / pilotos privados",
  manualPaymentInstructionsShort:
    "Durante la beta, los planes pagados se activan con pago manual coordinado con el equipo de JAKAWI.",
  legalLastUpdated: "2026-07-01",
};

export function getSupportMailto(subject?: string) {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${supportConfig.supportEmail}${query}`;
}

export function getSupportWhatsappUrl(message?: string) {
  if (!supportConfig.supportWhatsApp) return "";

  const phone = supportConfig.supportWhatsApp.replace(/[^\d+]/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${phone.replace(/^\+/, "")}${query}`;
}
