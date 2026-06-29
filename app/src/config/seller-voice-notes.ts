export type SellerVoiceNoteDefault = {
  title: string;
  transcript: string;
  durationSeconds: number;
  audioUrl?: string;
};

export const sellerVoiceNoteDefaults: Record<"intro" | "guidance" | "handoff", SellerVoiceNoteDefault> = {
  intro: {
    title: "Cómo funciona esta compra",
    transcript: "Este asistente te ayuda a dejar clara tu consulta. La disponibilidad, el pago y la entrega los confirma directamente el vendedor por WhatsApp.",
    durationSeconds: 12,
  },
  guidance: {
    title: "Estamos preparando tu consulta",
    transcript: "Con esa información ya podemos preparar mejor tu consulta. Puedes aclarar una duda más o dejarla lista para enviarla al vendedor por WhatsApp.",
    durationSeconds: 9,
  },
  handoff: {
    title: "Listo para contactar al vendedor",
    transcript: "Listo. Ya tenemos el contexto de tu consulta. Ahora puedes dejar tu número o continuar por WhatsApp para que el vendedor confirme disponibilidad, pago y entrega.",
    durationSeconds: 10,
  },
};
