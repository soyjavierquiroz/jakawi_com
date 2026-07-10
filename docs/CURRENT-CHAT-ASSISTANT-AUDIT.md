# Current Chat / Assistant Audit

Fecha: 2026-07-10

## Estado

PASS: ya existe un flujo Seller AI en storefront con widget, APIs, persistencia de leads/conversaciones, scoring simple, handoff a WhatsApp y dashboard owner.

WARN: el "AI" actual no llama a un modelo. Es un MVP deterministico por reglas, templates, regex, quick replies y recomendaciones por catalogo. `app/src/lib/seller-ai/providers/openai.ts` es placeholder y retorna `null`.

BLOCKED: no hay integracion real OpenAI, n8n ni WhatsApp bot/API. No hay envs de OpenAI/n8n en `.env.example`. Para convertirlo en vendedor IA falta decidir proveedor, contrato de contexto y guardrails.

## Archivos Encontrados

- `app/src/components/seller-ai/SellerAiWidget.tsx`
- `app/src/components/seller-ai/SellerAiVoiceNote.tsx`
- `app/src/components/seller-ai/SellerAiTrustBubble.tsx`
- `app/src/components/seller-ai/TypingIndicator.tsx`
- `app/src/components/storefront/ProductConversionCta.tsx`
- `app/src/components/storefront/templates/CommercialSpaceRenderer.tsx`
- `app/src/lib/storefront-pages.tsx`
- `app/src/lib/storefront-flow.ts`
- `app/src/config/seller-ai.ts`
- `app/src/config/plans.ts`
- `app/src/lib/seller-ai/*`
- `app/src/lib/seller-ai/providers/openai.ts`
- `app/src/app/(dashboard)/app/seller-ai/page.tsx`
- `app/src/app/(dashboard)/app/whatsapp/page.tsx`
- `app/src/app/(dashboard)/app/leads/*`
- `app/prisma/schema.prisma`

## Rutas Encontradas

Storefront:

- `app/src/app/[storeSlug]/page.tsx` usa `renderStorefrontBySlug()`.
- `app/src/app/[storeSlug]/p/[productSlug]/page.tsx` usa `renderProductBySlug()`.
- `app/src/app/p/[productSlug]/page.tsx` existe para producto publico.
- `app/src/app/r/[storeSlug]/route.ts` existe para redirect/referral.

APIs:

- `POST /api/seller-ai/opening`
- `POST /api/seller-ai/chat`
- `POST /api/seller-ai/lead`
- `POST /api/seller-ai/events`
- `POST /api/seller-ai/continue-whatsapp`
- `GET /api/whatsapp/click`

Owner dashboard:

- `/app/seller-ai`
- `/app/agente` redirige a `/app/seller-ai`
- `/app/whatsapp`
- `/app/leads`
- `/app/leads/[leadId]`

## Componentes Frontend

- `SellerAiWidget` es el widget principal. Recibe `storeSlug`, `storeName`, `productId`, `productName`, `productImageUrl`, `productPriceLabel`, `categoryName`, `whatsapp`, `planCode`, `mode` y `requirePhoneBeforeWhatsapp`.
- `CommercialSpaceRenderer` monta `SellerAiWidget` en storefront cuando `flow.sellerAiEnabled`.
- `renderProductBySlug()` monta `SellerAiWidget` con contexto de producto.
- `ProductConversionCta` abre Seller AI con evento `jakawi:seller-ai-open`; si no hay Seller AI, cae a WhatsApp directo.
- `VisitorProvider`/`getVisitorSessionId()` dan identidad de visitante/sesion.

## API / Actions

- `opening`: valida plan, crea/reusa lead y journey, crea mensaje assistant inicial y devuelve quick replies.
- `chat`: crea mensaje user, calcula señales comerciales, incrementa uso mensual Seller AI, genera respuesta por reglas, guarda mensaje assistant, actualiza lead/journey.
- `lead`: crea/reusa lead y journey sin iniciar chat completo.
- `events`: registra eventos Seller AI y tracking interno.
- `continue-whatsapp`: crea snapshot comercial, actualiza lead como `WHATSAPP_CLICKED`, genera mensaje y devuelve `wa.me`.
- `whatsapp/click`: registra click de WhatsApp de producto y redirige a `wa.me`.
- Server actions de leads: `markLeadWon`, `markLeadLost`, `markLeadContacted`.

## DB Models Relevantes

- `Store`: tiene `whatsapp`, plan, contador `sellerAiConversationCount`, periodo `sellerAiPeriodStart` y campos de notas de voz.
- `Lead`: estado, score, producto actual/seleccionado, datos cliente, resumen, `whatsappMessage`, `whatsappClickedAt`, recomendaciones y relacion a conversation/journey.
- `Conversation`: relacion 1:1 con lead; campos preparados para `modelUsed`, tokens y costo.
- `ConversationMessage`: mensajes `USER`, `ASSISTANT`, `SYSTEM`.
- `CustomerJourney`: etapa, status, necesidad, objeciones, score, productos vistos/recomendados.
- `JourneyEvent`, `LeadEvent`: eventos comerciales y de tracking.
- `CommercialSnapshot`: snapshot para handoff, canal default `WHATSAPP`, mensaje de WhatsApp.
- `TrackingEvent`: registra eventos first-party, incluido Seller AI/WhatsApp.

## Contexto Disponible Hoy

PASS: el chat sabe tienda por `storeSlug` o `storeId`, producto por `productId`/`productSlug`, categoria, plan, moneda/locale, sessionId/visitorId y journeyId.

WARN: no vi uso directo de `host`/dominio dentro de Seller AI. El resolver de storefront soporta dominios, pero el chat opera principalmente por slug/storeId.

PASS: en pagina de producto el widget recibe producto actual, nombre, imagen, precio y categoria.

## Reglas Hardcoded vs IA

Hoy usa reglas hardcoded:

- `extractCommercialSignals()` detecta necesidad, presupuesto, urgencia, objeciones e intención por regex.
- `inferSellerAiMode()` decide `DISCOVERY`, `PRODUCT_ADVISOR`, `DECISION_SUPPORT`, `CLOSING_PREP`.
- `buildAssistantMessage()` arma respuestas por templates.
- `getSellerAiRecommendations()` recomienda productos por categoria/texto/precio/destacado.

No usa IA real:

- `getOpenAISellerReply()` existe, revisa `OPENAI_API_KEY`, pero tiene TODO y retorna `null`.
- No encontré llamada OpenAI activa.
- No encontré endpoint n8n.

## WhatsApp

PASS: hay WhatsApp directo y handoff con contexto.

- `Store.whatsapp` es el numero destino.
- `buildWhatsappUrl()` arma `https://wa.me/...`.
- `buildWhatsappLeadMessage()` prepara mensaje con producto, precio, nombre/telefono del cliente, resumen, presupuesto, urgencia y codigo.
- `/api/seller-ai/continue-whatsapp` guarda snapshot y devuelve URL.
- `/api/whatsapp/click` registra click de producto y redirige.

WARN: no hay WhatsApp bot/API real. El propio dashboard dice que no hay automatizacion de WhatsApp en este sprint.

## Variables Env Relacionadas

En `.env.example`:

- No encontré `OPENAI_API_KEY`.
- No encontré variables `N8N`.
- No encontré variables `ASSISTANT` o `CHAT` especificas.
- No encontré `WHATSAPP` especifica para integracion externa.
- Si existen envs de soporte en codigo: `NEXT_PUBLIC_SUPPORT_WHATSAPP`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Existen flags no relacionados directamente: `CRM_WEBHOOK_*`, `EMAIL_*`, `CUSTOM_DOMAINS_*`, `META_CAPI_*`.

## Qué Ya Sirve

- Widget comercial ya integrado en storefront y producto.
- Captura de sesion/visitor, lead, conversacion y journey.
- Persistencia completa de mensajes y eventos.
- Handoff a WhatsApp con contexto comercial.
- Scoring/etapas basicas de intención.
- Recomendaciones simples con catalogo existente.
- Plan gating y limites mensuales por plan.
- Owner dashboard para Seller AI, WhatsApp y leads.
- Notas de voz del vendedor para confianza.

## Qué Falta Para Vendedor IA

- Provider LLM real con prompt y contrato JSON.
- Context builder compacto por tienda/producto/journey.
- Guardrails: no inventar stock, envio, garantia, descuentos ni condiciones no cargadas.
- Modo de respuesta con presupuesto de tokens y fallback a reglas actuales.
- Manejo estructurado de objeciones por categoria/tienda.
- Cierre: detectar compra lista, pedir telefono si aplica, generar WhatsApp final.
- Config env segura para OpenAI o gateway.
- Observabilidad: `modelUsed`, tokens, costo y razon de fallback.
- Tests de unidad para prompts/guardrails y smoke sin llamadas externas.
- Si se quiere n8n: webhook firmado, timeout, retry/fallback y politica de PII.

## Recomendacion App / n8n / Hibrido

Recomendacion: C) hibrido app + n8n, pero empezar por app.

- A) IA directa en JAKAWI app: camino mas corto para chat en tiempo real, menos latencia, mas facil reutilizar DB/contexto y limitar tokens.
- B) IA via n8n: util para follow-up, operaciones, CRM o automatizaciones asincronas; peor para cada mensaje del chat por latencia, costo operativo y duplicacion de contexto.
- C) hibrido: app responde chat y genera cierre; n8n queda para post-handoff, recordatorios, CRM y tareas no interactivas.

Camino corto: mantener el motor por reglas como fallback y reemplazar solo `buildAssistantMessage()` por un provider opcional cuando haya `OPENAI_API_KEY` y feature flag.

## Maximo Ahorro de Tokens

- No mandar toda la conversacion: ultimos 4-6 mensajes + summary persistido.
- Mandar catalogo minimo: producto actual + max 3 recomendaciones candidatas.
- Mandar solo campos comerciales seguros: nombre tienda, tipo comercial, moneda, producto, descripcion corta, precio publicado, categoria, señales detectadas.
- Usar salida JSON corta: `reply`, `mode`, `shouldAskPhone`, `objectionType`, `handoffReady`, `quickReplies`.
- Cachear/summarizar journey en `conversationSummary`.
- No usar IA para opening, eventos, clicks ni mensajes obvios; dejar reglas actuales.
- Usar LLM solo desde segundo mensaje o cuando haya pregunta/objecion no cubierta.

## Objeciones y Cierre por WhatsApp

- Mantener regla fuerte: disponibilidad, envio, garantia, tallas, descuentos y pagos los confirma la tienda.
- Para objeciones, respuesta corta: reconocer duda, dar dato publicado si existe, no inventar, proponer WhatsApp con contexto.
- Para cierre, objetivo del chat: preparar una consulta de 5 lineas, no cerrar pago dentro de IA.
- Capturar telefono antes de WhatsApp en PRO/PREMIUM como ya hace `requirePhoneBeforeWhatsapp`.
- En WhatsApp incluir: producto, precio publicado, objecion principal, urgencia, presupuesto si existe, leadCode/journeyCode.

## Siguiente Paso Minimo

Crear un contrato de provider IA sin activarlo en produccion:

1. Definir `SellerAiReplyInput` y `SellerAiReplyOutput`.
2. Agregar feature flag `SELLER_AI_LLM_ENABLED=false`.
3. Conectar OpenAI solo detras del flag y con fallback a reglas actuales.
4. Probar con mocks, sin llamadas reales, antes de habilitar runtime.

Good Enough: no hace falta n8n para el primer vendedor IA. Primero IA directa con contexto minimo y fallback; luego n8n para automatizacion posterior.
