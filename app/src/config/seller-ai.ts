export const sellerAiConfig = {
  enabled: true,
  activationDelayMs: 10000,
  nudgeDelayMs: 3500,
  nudgeRepeatMs: 6000,
  nudgeMaxCount: 3,
  bottomSheetHeightMobile: "72dvh",
  maxRecommendedProducts: 3,
  leadCodePrefix: "JAK",
  whatsappIntro: "Hola, vengo de JAKAWI.",
  typing: {
    minDelayMs: 700,
    maxDelayMs: 1200,
    openingDelayMs: 800,
  },
  reserved: {
    confirmByWhatsapp: "Eso te lo confirma la tienda por WhatsApp, pero puedo ayudarte a dejar el pedido armado.",
    safeDescription: "Según la descripción del producto, puede ser una buena opción para lo que buscas.",
    maxMessages: "Para continuar mejor, escribe por WhatsApp y la tienda te confirma.",
  },
  widget: {
    closedLabel: "¿Te ayudo a elegir?",
    premiumClosedLabel: "Armar mi pedido",
    closedTeaserDefault: "Te ayudo a elegir mejor.",
    closedTeasers: {
      termo: "Ese termo es práctico para oficina.",
      audifonos: "¿Quieres saber si convienen para llamadas?",
      mochila: "Te ayudo a elegir tamaño y uso.",
    },
    title: "Seller AI",
    subtitle: "Te ayuda a elegir antes de WhatsApp",
    phoneCaptureTitle: "¿A qué número te escribimos?",
    phoneCaptureMessage: "Deja tu WhatsApp para que la tienda pueda ubicar tu consulta.",
    phoneCaptureHelper: "Así la tienda puede ubicar tu consulta aunque cierres WhatsApp.",
    phonePlaceholder: "Ej: 79790873",
    namePlaceholder: "Tu nombre, opcional",
    continueWhatsapp: "Continuar",
    continueWhatsappLong: "Continuar por WhatsApp",
    leaveWhatsappInquiry: "Hablemos por WhatsApp",
    sendWhatsappInquiry: "Enviar consulta por WhatsApp",
    consultWhatsapp: "Hablemos por WhatsApp",
    preparingWhatsapp: "Preparando WhatsApp...",
    inputPlaceholder: "Escribe tu respuesta...",
    phoneRequiredError: "Escribe un WhatsApp válido.",
    phoneInvalidError: "Escribe un WhatsApp válido.",
    redirectFailed: "No pudimos abrir WhatsApp automáticamente.",
    openWhatsappManually: "Abrir WhatsApp",
    backToChat: "Volver",
    responseLoading: "Preparando respuesta...",
  },
  phoneCapture: {
    assistive: {
      title: "¿A qué número te escribimos?",
      message: "Deja tu WhatsApp para que la tienda pueda ubicar tu consulta.",
    },
    guided: {
      title: "¿A qué número te escribimos?",
      message: "Deja tu WhatsApp para que la tienda pueda ubicar tu consulta.",
    },
    premium: {
      title: "¿A qué WhatsApp te pasamos los detalles?",
      message: "Así la tienda puede enviarte disponibilidad, QR o pasos de compra.",
    },
  },
  quickReplies: {
    default: ["Lo quiero para mí", "Es para regalar", "Quiero saber cómo comprar"],
    celular: ["Trabajo y redes", "Batería y cámara", "Quiero saber precio"],
    ropa: ["Algo casual", "Algo elegante", "Revisar tallas"],
    zapatos: ["Uso diario", "Para salir", "Revisar tallas"],
    maquillaje: ["Uso diario", "Para evento", "Tonos disponibles"],
    regalos: ["Es para regalar", "Tengo presupuesto", "Lo necesito pronto"],
  },
  categoryTemplates: {
    celular: "Ese modelo puede ser buena opción si buscas batería y cámara sin pagar de más. ¿Lo quieres para trabajo, estudio o redes?",
    celulares: "Ese modelo puede ser buena opción si buscas batería y cámara sin pagar de más. ¿Lo quieres para trabajo, estudio o redes?",
    tecnologia: "Ese producto encaja bien si quieres algo práctico para uso diario. ¿Lo buscas para trabajo, estudio o entretenimiento?",
    tecnologia_: "Ese producto encaja bien si quieres algo práctico para uso diario. ¿Lo buscas para trabajo, estudio o entretenimiento?",
    ropa: "Ese modelo suele quedar bien para salidas y eventos. ¿Lo buscas para algo elegante o más casual?",
    vestidos: "Ese vestido puede funcionar muy bien para una ocasión especial. ¿Lo buscas para algo elegante o más casual?",
    moda: "Ese modelo suele quedar bien para armar un look fácil. ¿Lo buscas para uso diario o para una ocasión especial?",
    zapatos: "Ese modelo combina fácil y puede servir para uso diario. ¿Quieres revisar tallas?",
    zapatillas: "Ese modelo combina fácil y puede servir para uso diario. ¿Quieres revisar tallas?",
    maquillaje: "Ese producto puede ayudarte a completar un look sin complicarte. ¿Lo buscas para diario o para un evento?",
    belleza: "Ese producto puede ayudarte a completar un look sin complicarte. ¿Lo buscas para diario o para un evento?",
    regalos: "Ese producto puede quedar bien como regalo porque es fácil de aprovechar. ¿Es para alguien especial o para ti?",
    default: "Vi que estás mirando {productName}. Te ayudo a elegir mejor: ¿lo buscas para ti o para regalar?",
  },
  intentScoreRules: {
    base: 10,
    chatOpened: 10,
    customerMessageSent: 10,
    priceQuestion: 15,
    variantQuestion: 15,
    buyIntent: 20,
    whatsappClicked: 25,
    sameProductReturn: 10,
    sameCategoryProducts: 10,
    max: 100,
  },
  modes: {
    DISCOVERY: {
      label: "Discovery",
      purpose: "Descubrir necesidad",
      maxQuestionCountBeforeRecommendation: 1,
      defaultOpening: "¿Qué estás buscando hoy?",
      quickReplies: ["Para mí", "Para regalar", "Económico", "Más recomendado"],
    },
    PRODUCT_ADVISOR: {
      label: "Product Advisor",
      purpose: "Ayudar a decidir si un producto encaja",
      maxQuestionCountBeforeRecommendation: 1,
      defaultOpening: "Ese producto puede encajar bien. ¿Lo buscas para ti, para regalar o para algo específico?",
      quickReplies: ["Trabajo", "Estudio", "Viaje", "Para regalar"],
    },
    DECISION_SUPPORT: {
      label: "Decision Support",
      purpose: "Reducir incertidumbre",
      maxQuestionCountBeforeRecommendation: 0,
      defaultOpening: "Te ayudo a resolver esa duda sin inventar datos.",
      quickReplies: ["¿Cuál es el precio?", "¿Está disponible?", "¿Hacen envío?", "Me interesa comprar"],
    },
    CLOSING_PREP: {
      label: "Closing Prep",
      purpose: "Preparar handoff al canal",
      maxQuestionCountBeforeRecommendation: 0,
      defaultOpening: "Perfecto. Te dejo la consulta armada para la tienda.",
      quickReplies: ["Enviar consulta por WhatsApp", "Quiero comprarlo"],
    },
  },
  commercialTypes: {
    PRODUCT_STORE: {
      discoveryOpening: "¿Qué estás buscando hoy?",
      quickReplies: ["Para mí", "Para regalar", "Económico", "Más recomendado"],
    },
    LIVE_CATALOG: {
      discoveryOpening: "¿Qué producto del live te interesa?",
      quickReplies: ["El destacado", "Precio", "Cómo pedir", "Ver opciones"],
    },
    MENU: {
      discoveryOpening: "¿Qué se te antoja hoy?",
      quickReplies: ["Carne", "Pollo", "Algo rápido", "Para compartir"],
    },
    SERVICES: {
      discoveryOpening: "¿Qué cambio o resultado estás buscando?",
      quickReplies: ["Cotizar", "Agendar", "Ver opciones", "Preguntar disponibilidad"],
    },
    COURSES: {
      discoveryOpening: "¿Qué quieres aprender o mejorar?",
      quickReplies: ["Empezar desde cero", "Ganar más", "Certificarme", "Ver cursos"],
    },
  },
};

function parseBoolean(value: string | undefined, fallback = false) {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, fallback: number, options: { min: number; max: number }) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(options.max, Math.max(options.min, parsed));
}

function parseSlugList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type SellerAiEnv = Record<string, string | undefined>;

export function getSellerAiLlmConfig(env: SellerAiEnv = process.env) {
  return {
    enabled: parseBoolean(env.SELLER_AI_LLM_ENABLED, false),
    provider: env.SELLER_AI_LLM_PROVIDER?.trim() || "openai",
    model: env.SELLER_AI_LLM_MODEL?.trim() || "gpt-4.1-mini",
    allowedStoreSlugs: parseSlugList(env.SELLER_AI_LLM_STORE_SLUGS || "javier"),
    timeoutMs: parseInteger(env.SELLER_AI_LLM_TIMEOUT_MS, 10000, { min: 1000, max: 30000 }),
    maxRecentMessages: parseInteger(env.SELLER_AI_LLM_MAX_RECENT_MESSAGES, 6, { min: 1, max: 12 }),
    maxContextProducts: parseInteger(env.SELLER_AI_LLM_MAX_CONTEXT_PRODUCTS, 4, { min: 1, max: 5 }),
    openAiApiKeyPresent: Boolean(env.OPENAI_API_KEY?.trim()),
  };
}

export function isSellerAiLlmStoreAllowed(storeSlug: string, env: SellerAiEnv = process.env) {
  const config = getSellerAiLlmConfig(env);
  return config.allowedStoreSlugs.length === 0 || config.allowedStoreSlugs.includes(storeSlug);
}
