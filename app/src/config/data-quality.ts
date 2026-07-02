export const DATA_QUALITY_LABELS = {
  REAL: "REAL",
  DEMO: "DEMO",
  QA: "QA",
  INTERNAL: "INTERNAL",
  NEEDS_REVIEW: "NEEDS_REVIEW",
} as const;

export type DataQualityLabel = (typeof DATA_QUALITY_LABELS)[keyof typeof DATA_QUALITY_LABELS];

export const dataQualityDisplay: Record<DataQualityLabel, { label: string; detail: string }> = {
  REAL: {
    label: "Real",
    detail: "Dato comercial real incluido en metricas ejecutivas.",
  },
  DEMO: {
    label: "Demo",
    detail: "Dato demo/sample conocido. No se borra y se excluye de metricas reales.",
  },
  QA: {
    label: "QA",
    detail: "Dato de prueba, fixture o rate-limit. No se borra y se excluye de metricas reales.",
  },
  INTERNAL: {
    label: "Interno",
    detail: "Dato interno de JAKAWI. No se borra y se excluye de metricas reales.",
  },
  NEEDS_REVIEW: {
    label: "Revisar",
    detail: "Dato ambiguo que requiere revision operativa antes de tratarlo como real.",
  },
};

export const dataQualityConfig = {
  knownDemoEmails: ["demo@jakawi.com"],
  knownDemoStoreSlugs: ["megalon"],
  possibleDemoStoreSlugs: ["ejemplo"],
  knownDemoPartnerCodes: ["partner-demo"],
  knownQaLeadCodes: ["JAK-WJFA"],
  qaTextPatterns: ["qa", "test", "demo", "rate-limit", "fixture", "seed"],
  internalTextPatterns: ["internal", "interno"],
  safeNonPatterns: ["javier"],
} as const;
