export type StorePlanCode = "TRIAL" | "BASIC" | "PRO" | "PREMIUM";
export type DirectWhatsappPlanMode = boolean | "secondary";

export type StorePlanConfig = {
  code: StorePlanCode;
  name: string;
  priceLabel: string;
  billingLabel?: string;
  trialDays?: 14 | 30;
  productLimit: number;
  sellerAiEnabled: boolean;
  sellerAiMonthlyConversations: number | null;
  whatsappBotEnabled: boolean;
  directWhatsappEnabled: DirectWhatsappPlanMode;
  requirePhoneBeforeWhatsapp: boolean;
};

export const storePlans = {
  TRIAL: {
    code: "TRIAL",
    name: "Prueba gratis",
    priceLabel: "Gratis",
    billingLabel: "14 días",
    trialDays: 14,
    productLimit: 5,
    sellerAiEnabled: false,
    sellerAiMonthlyConversations: 0,
    whatsappBotEnabled: false,
    directWhatsappEnabled: true,
    requirePhoneBeforeWhatsapp: false,
  },
  BASIC: {
    code: "BASIC",
    name: "Tienda básica",
    priceLabel: "Bs 350/año",
    productLimit: 10,
    sellerAiEnabled: false,
    sellerAiMonthlyConversations: 0,
    whatsappBotEnabled: false,
    directWhatsappEnabled: true,
    requirePhoneBeforeWhatsapp: false,
  },
  PRO: {
    code: "PRO",
    name: "Tienda Pro",
    priceLabel: "Bs 997/año",
    productLimit: 30,
    sellerAiEnabled: true,
    sellerAiMonthlyConversations: 20,
    whatsappBotEnabled: false,
    directWhatsappEnabled: "secondary",
    requirePhoneBeforeWhatsapp: true,
  },
  PREMIUM: {
    code: "PREMIUM",
    name: "Tienda Premium",
    priceLabel: "Bs 1997/año",
    productLimit: 50,
    sellerAiEnabled: true,
    sellerAiMonthlyConversations: 100,
    whatsappBotEnabled: true,
    directWhatsappEnabled: false,
    requirePhoneBeforeWhatsapp: true,
  },
} as const satisfies Record<StorePlanCode, StorePlanConfig>;

export const plansConfig = [
  {
    name: storePlans.TRIAL.name,
    price: storePlans.TRIAL.priceLabel,
    description: "Para probar tu tienda y vender rápido por WhatsApp.",
    features: [`${storePlans.TRIAL.billingLabel} de prueba`, `Hasta ${storePlans.TRIAL.productLimit} productos`, "Link JAKAWI", "WhatsApp directo"],
  },
  {
    name: storePlans.BASIC.name,
    price: storePlans.BASIC.priceLabel,
    description: "Para negocios que quieren una tienda simple.",
    features: [`Hasta ${storePlans.BASIC.productLimit} productos`, "Tienda pública", "WhatsApp directo", "Sin Seller AI"],
  },
  {
    name: storePlans.PRO.name,
    price: storePlans.PRO.priceLabel,
    description: "Para responder menos y vender con contexto.",
    features: [`Hasta ${storePlans.PRO.productLimit} productos`, "Seller AI incluido", `${storePlans.PRO.sellerAiMonthlyConversations} conversaciones Seller AI/mes`, "WhatsApp con contexto"],
    highlighted: true,
    badge: "Más vendido",
  },
  {
    name: storePlans.PREMIUM.name,
    price: storePlans.PREMIUM.priceLabel,
    description: "Para tiendas que necesitan seguimiento y cierre guiado.",
    features: [`Hasta ${storePlans.PREMIUM.productLimit} productos`, "Seller AI Premium", `${storePlans.PREMIUM.sellerAiMonthlyConversations} conversaciones Seller AI/mes`, "WhatsApp bot y seguimiento"],
  },
];
