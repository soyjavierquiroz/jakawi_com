import type { RateLimitPolicy } from "@/lib/rate-limit";

export const rateLimitPolicies = {
  LOGIN: {
    id: "login",
    limit: 10,
    windowSeconds: 10 * 60,
  },
  LOGIN_IP: {
    id: "login-ip",
    limit: 50,
    windowSeconds: 10 * 60,
  },
  REGISTER: {
    id: "register",
    limit: 5,
    windowSeconds: 60 * 60,
  },
  REGISTER_STORE_SLUG: {
    id: "register-store-slug",
    limit: 3,
    windowSeconds: 60 * 60,
  },
  SELLER_AI_OPENING: {
    id: "seller-ai-opening",
    limit: 60,
    windowSeconds: 10 * 60,
  },
  SELLER_AI_CHAT: {
    id: "seller-ai-chat",
    limit: 30,
    windowSeconds: 60,
  },
  SELLER_AI_EVENTS: {
    id: "seller-ai-events",
    limit: 120,
    windowSeconds: 60,
  },
  SELLER_AI_LEAD: {
    id: "seller-ai-lead",
    limit: 20,
    windowSeconds: 10 * 60,
  },
  SELLER_AI_CONTINUE_WHATSAPP: {
    id: "seller-ai-continue-whatsapp",
    limit: 20,
    windowSeconds: 10 * 60,
  },
  SELLER_VOICE_UPLOAD: {
    id: "seller-voice-upload",
    limit: 10,
    windowSeconds: 60 * 60,
  },
  SELLER_VOICE_UPLOAD_IP: {
    id: "seller-voice-upload-ip",
    limit: 30,
    windowSeconds: 60 * 60,
  },
  WHATSAPP_CLICK: {
    id: "whatsapp-click",
    limit: 120,
    windowSeconds: 60,
  },
  GROWTH_REDIRECT: {
    id: "growth-redirect",
    limit: 180,
    windowSeconds: 60,
  },
} satisfies Record<string, RateLimitPolicy>;

export const userFacingRateLimitMessage = "Demasiados intentos. Intenta nuevamente en unos minutos.";
export const apiRateLimitMessage = "Demasiadas solicitudes. Intenta nuevamente en unos minutos.";
