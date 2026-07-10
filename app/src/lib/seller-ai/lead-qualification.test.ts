import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWhatsappHandoffMessage,
  buildWhatsappHandoffUrl,
  computeLeadQualification,
  shouldShowWhatsappHandoff,
} from "@/lib/seller-ai/lead-qualification";
import { generateSnapshotCode } from "@/lib/seller-ai/journey-code";

test("un mensaje curioso no muestra WhatsApp", () => {
  const qualification = computeLeadQualification({ messages: ["Hola, estoy mirando"] });

  assert.equal(qualification.stage, "CURIOUS");
  assert.equal(shouldShowWhatsappHandoff(qualification, "59170000000"), false);
});

test("preguntas por precio y envío aumentan el score", () => {
  const price = computeLeadQualification({ messages: ["¿Cuál es el precio?"] });
  const priceAndShipping = computeLeadQualification({ messages: ["¿Cuál es el precio?", "¿Hacen envío?"] });

  assert.ok(price.score > 0);
  assert.ok(priceAndShipping.score > price.score);
  assert.deepEqual(priceAndShipping.reasons, ["precio", "envío"]);
});

test("intención explícita de compra o pago activa WhatsApp", () => {
  for (const message of ["Quiero comprar", "¿Cómo pago?"]) {
    const qualification = computeLeadQualification({ messages: [message] });
    assert.equal(qualification.readyForWhatsapp, true);
    assert.equal(shouldShowWhatsappHandoff(qualification, "59170000000"), true);
  }
});

test("un número de WhatsApp ausente oculta el CTA aunque el lead califique", () => {
  const qualification = computeLeadQualification({ messages: ["Quiero comprar"] });

  assert.equal(qualification.readyForWhatsapp, true);
  assert.equal(shouldShowWhatsappHandoff(qualification, null), false);
});

test("el mensaje de WhatsApp es humano, breve y contiene sólo el código de handoff", () => {
  const message = buildWhatsappHandoffMessage("KJ-8F42");

  assert.match(message, /Código: KJ-8F42/);
  assert.doesNotMatch(message, /Lead ID/i);
  assert.doesNotMatch(message, /Resumen:/i);
  assert.ok(message.length < 120);
});

test("la URL de WhatsApp incluye el código y no llama servicios externos", () => {
  const url = buildWhatsappHandoffUrl({ whatsappNumber: "+591 7000-0000", code: "KJ-8F42" });

  assert.ok(url?.startsWith("https://wa.me/59170000000?text="));
  assert.match(decodeURIComponent(url ?? ""), /Código: KJ-8F42/);
});

test("los nuevos handoffs usan códigos humanos KJ-XXXX", () => {
  assert.match(generateSnapshotCode(), /^KJ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});
