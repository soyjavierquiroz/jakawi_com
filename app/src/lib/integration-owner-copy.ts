export function ownerServerEventsLabel() {
  return "Eventos del servidor";
}

export function ownerPrivateTokenLabel() {
  return "Token privado de eventos";
}

export function ownerEncryptionStatusLabel(encryptionReady: boolean) {
  return encryptionReady ? "Cifrado del servidor activo" : "Cifrado del servidor pendiente";
}

export function ownerEncryptionStatusText(encryptionReady: boolean) {
  return encryptionReady
    ? "Los tokens privados se guardan cifrados y nunca se muestran después de guardar."
    : "Puedes guardar Pixel ID. Los tokens privados de eventos quedan bloqueados hasta completar la configuración segura.";
}

export function ownerIntegrationReasonLabel(reason: string) {
  if (reason === "provider not implemented") return "Proveedor preparado para un hito futuro; no envía eventos externos desde servidor.";
  if (reason === "integration missing") return "Aún no guardaste esta integración.";
  if (reason === "status not ACTIVE") return "Configurado pero apagado: el estado no está en Activo.";
  if (reason === "pixelId missing") return "Falta Pixel ID.";
  if (reason === "browserPixelEnabled false") return "Browser Pixel apagado.";
  if (reason === "capiEnabled false") return `${ownerServerEventsLabel()} apagados.`;
  if (reason === "access token missing") return "Falta guardar el token privado de eventos.";
  if (reason === "global META_CAPI_ENABLED false") return "Eventos del servidor apagados por seguridad.";
  return "Configuración pendiente de revisión.";
}
