export const imageUploadGuidance = {
  product: {
    label: "Imagen del producto",
    recommendation: "Recomendado: 1200 × 1200 px · Cuadrada o vertical 4:5",
    helper: "Usa una imagen clara, bien iluminada y centrada.",
    technical: "Máximo 10MB. Se optimiza automáticamente a WebP.",
  },
  cover: {
    label: "Foto de portada",
    recommendation: "Recomendado: 1600 × 900 px · Formato horizontal",
    helper: "Esta imagen aparece como hero principal de tu espacio comercial.",
    technical: "Máximo 10MB. Se optimiza automáticamente a WebP.",
  },
  logo: {
    label: "Logo del negocio",
    recommendation: "Recomendado: 600 × 600 px · Formato cuadrado",
    helper: "Se usa para identificar tu espacio comercial.",
    technical: "Máximo 10MB. Se optimiza automáticamente a WebP.",
  },
  sellerAvatar: {
    label: "Avatar del vendedor",
    recommendation: "Recomendado: 600 × 600 px · Formato cuadrado",
    helper: "Ayuda a dar confianza en Seller AI y en la experiencia comercial.",
    technical: "Máximo 10MB. Se optimiza automáticamente a WebP.",
  },
  category: {
    label: "Imagen de categoría",
    recommendation: "Recomendado: 800 × 800 px · Formato cuadrado",
    helper: "Ayuda a reconocer rápidamente este grupo de productos.",
    technical: "Máximo 10MB. Se optimiza automáticamente a WebP.",
  },
} as const;
