function cleanDisplayName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export function buildPartnerShareText(partnerName: string | null | undefined, url: string) {
  const sender = cleanDisplayName(partnerName, "JAKAWI");
  return `Desde ${sender}, estoy recomendando JAKAWI para negocios que quieren vender mejor por WhatsApp con un espacio comercial y asistencia inteligente. Mira aqui: ${url}`;
}

export function buildPartnerDestinationShareText(
  partnerName: string | null | undefined,
  destinationLabel: string | null | undefined,
  url: string,
) {
  const sender = cleanDisplayName(partnerName, "JAKAWI");
  const resource = cleanDisplayName(destinationLabel, "este recurso");
  return `${sender} te invita a conocer JAKAWI en ${resource}. Es para negocios que quieren convertir mejor sus conversaciones en ventas: ${url}`;
}

export function buildStoreReferralShareText(storeName: string | null | undefined, url: string) {
  const name = cleanDisplayName(storeName, "mi negocio");
  return `En ${name}, estoy usando JAKAWI para mostrar mi negocio y atender mejor a mis clientes. Si tienes un negocio, puedes crear tu espacio aqui: ${url}`;
}

export function buildGrowthQrFileName(prefix: string, ...parts: Array<string | null | undefined>) {
  const safeParts = [prefix, ...parts]
    .map((part) => part?.toLowerCase().trim().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);

  return `${safeParts.join("-") || "jakawi-link"}.png`;
}
