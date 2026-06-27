import { brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";

export const landingConfig = {
  hero: {
    eyebrow: "Tienda + WhatsApp + Seller AI",
    title: "Deja de perder ventas en WhatsApp.",
    subtitle:
      "Crea tu tienda, comparte tu link y deja que Seller AI responda preguntas, recomiende productos y lleve clientes listos a tu WhatsApp.",
    bullets: [
      "Tienda lista en minutos.",
      "Productos ordenados para tus redes.",
      "Seller AI atiende por ti.",
      "Consultas claras por WhatsApp.",
    ],
    primaryCta: { label: "Crear mi tienda", href: siteConfig.routes.register },
    secondaryCta: { label: "Ver demo", href: siteConfig.routes.demo },
    tagline: brandConfig.tagline,
    image: {
      desktopSrc: "/images/jakawi-hero-v2.webp",
      mobileSrc: "/images/jakawi-hero-v2.webp",
      fallbackSrc: "/images/jakawi-hero-v2.webp",
      alt: "Flujo de ventas JAKAWI desde redes sociales, catálogo, Seller AI y WhatsApp",
    },
  },
  problem: {
    title: "Vender por redes funciona. El problema es el desorden.",
    text:
      "Publicas un producto. Te preguntan precio. Luego talla. Luego color. Luego envío. Luego forma de pago. Y al final muchos desaparecen.",
    closer: "JAKAWI ordena ese camino.",
  },
  howItWorks: {
    title: "De publicar a recibir pedidos en minutos.",
    steps: [
      { title: "Crea tu tienda", text: "Tu nombre, tus productos y tus precios en un solo link." },
      { title: "Comparte tu link", text: "Ponlo en TikTok, Instagram, Facebook o estados de WhatsApp." },
      { title: "El cliente elige", text: "Ve productos antes de escribirte." },
      { title: "Te llega una consulta clara", text: "Menos vueltas. Más pedidos." },
    ],
  },
  differentiator: {
    title: "De ‘¿precio?’ a ‘quiero este producto’.",
    text:
      "JAKAWI hace que el cliente vea el producto antes de escribirte. Así llegan menos curiosos y más personas listas para comprar.",
    beforeTitle: "Antes",
    beforeMessages: ["precio?", "qué tallas hay?", "foto real?", "envío cuánto?"],
    afterTitle: "Después",
    afterMessages: ["Hola, quiero este producto en talla M", "¿Me confirmas disponibilidad?", "Estoy lista para comprar"],
  },
  sellerAi: {
    badge: "Incluido desde el inicio",
    title: "Seller AI atiende mientras tú vendes.",
    text:
      "Responde preguntas frecuentes, recomienda productos y ayuda a que cada consulta llegue más clara a tu WhatsApp.",
    bullets: [
      "Entrenado con tu catálogo.",
      "Responde precio, stock y detalles.",
      "Recomienda productos relacionados.",
      "Deriva a WhatsApp cuando el cliente está listo.",
    ],
    panel: {
      eyebrow: "Agente de Ventas",
      title: "Tienda + WhatsApp + Seller AI",
      messages: [
        "Recomienda productos según lo que busca el cliente.",
        "Responde precio, stock y detalles del catálogo.",
        "Deriva a WhatsApp cuando el cliente está listo.",
      ],
    },
    cta: { label: "Crear mi tienda con Seller AI", href: siteConfig.routes.register },
  },
  plans: {
    title: "Planes simples para vender sin enredarte.",
    text: "Empieza con el link de venta y sube de nivel cuando necesites más atención comercial.",
    cta: { label: "Crear mi tienda", href: siteConfig.routes.register },
  },
  finalCta: {
    title: brandConfig.tagline,
    text: "Crea tu tienda, comparte tu link y empieza a recibir consultas más claras por WhatsApp.",
    primaryCta: { label: "Crear mi tienda", href: siteConfig.routes.register },
    secondaryCta: { label: "Ver tienda demo", href: siteConfig.routes.demo },
  },
};
