export const registrationConfig = {
  title: "Crea tu tienda",
  subtitle: "Tu link para vender queda listo en minutos.",
  sections: {
    personal: "Tus datos",
    store: "Tu tienda",
  },
  fields: {
    firstName: {
      label: "Nombre",
      placeholder: "Ana",
    },
    lastName: {
      label: "Apellido",
      placeholder: "Quiroga",
    },
    phone: {
      label: "WhatsApp",
      helper: "Usaremos este numero para que tus clientes te escriban.",
    },
    email: {
      label: "Email para entrar",
      placeholder: "ana@correo.com",
    },
    password: {
      label: "Contraseña",
      placeholder: "Minimo 8 caracteres",
    },
    storeName: {
      label: "Nombre de tienda",
      placeholder: "Boutique Ana",
    },
    storeSlug: {
      label: "Link de tu tienda",
      placeholder: "boutique-ana",
      helper: "Este sera el enlace que compartiras en TikTok, Instagram y WhatsApp.",
      prefix: "jakawi.com/",
    },
    city: {
      label: "Ciudad",
      placeholder: "La Paz",
    },
    country: {
      label: "Pais",
      placeholder: "Bolivia",
    },
  },
  actions: {
    submit: "Crear mi tienda",
    loginPrompt: "¿Ya tienes cuenta?",
    login: "Entrar",
  },
  defaultCountry: "BO",
  priorityCountries: ["BO", "PE", "AR", "CL", "CO", "EC", "PY", "UY", "VE", "MX", "US", "ES"],
  reservedSlugs: [
    "admin",
    "app",
    "api",
    "login",
    "registro",
    "demo",
    "pricing",
    "planes",
    "soporte",
    "ayuda",
    "legal",
    "privacidad",
    "terms",
    "terminos",
    "www",
    "media",
    "minio",
    "dashboard",
    "dash",
  ],
  routeAfterRegister: "/app",
} as const;

export type RegistrationCountryCode = (typeof registrationConfig.priorityCountries)[number];
