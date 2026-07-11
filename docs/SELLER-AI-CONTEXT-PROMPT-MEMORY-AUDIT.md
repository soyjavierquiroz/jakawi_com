# Seller AI Context / Prompt / Memory Audit

Fecha: 2026-07-11
Alcance: auditoría estática del repositorio. Sin llamadas a OpenAI, n8n o WhatsApp; sin escrituras de base de datos, cambios de código, deploy, commit o push.

## Estado

**WARN — Good enough en contexto, prompt, router e historial corto; el selector de estilo predefinido por tienda está implementado y el resumen aún no es memoria viva.**

| Área | Estado | Evidencia / conclusión |
| --- | --- | --- |
| Prompt controlado por JAKAWI | PASS | Prompt OpenAI fijo en `app/src/lib/seller-ai/providers/openai.ts`; el owner no puede editarlo. |
| Contexto comercial acotado | PASS | Producto actual + hasta 4 candidatos, todos visibles y de la misma tienda; catálogo completo no se envía. |
| Precio, descripción y categoría | PASS | Llegan al LLM como `priceLabel`, descripción corta (220), categoría y URL. |
| Estilos predefinidos | PASS | Cinco presets controlados por JAKAWI; cada tienda guarda y selecciona uno. |
| Historial corto persistido | PASS | Se guardan USER/ASSISTANT y se entregan hasta 6 mensajes recientes al LLM. |
| Resumen conversacional vivo | WARN | El campo existe, pero se llena al continuar a WhatsApp; no se mantiene durante el chat. |
| Router rules-first | PASS | Preguntas simples quedan en reglas; objeciones, comparación, indecisión, cierre complejo y referencias ambiguas con historial pueden ir a OpenAI. |
| Aislamiento tienda/producto | PASS / WARN | Consultas de productos/candidatos filtran por `storeId`; el endpoint público confía en un `leadId` recibido y no verifica que coincida con la sesión/tienda del payload. |
| Bloqueos | BLOCKED: ninguno | No hay un bloqueo técnico para el siguiente paso mínimo. |

## 1. Inputs actuales del owner

### Por tienda

El owner puede configurar:

- Nombre, slug, descripción corta y slogan comercial (`Store.description`, `Store.commercialTagline`).
- Número de WhatsApp; Instagram y TikTok.
- País, moneda, locale, identidad visual, plantilla comercial, logo y portada.
- Notas de voz de Seller AI: nombre visible, avatar, activación y audio/transcripción/duración de bienvenida, orientación y cierre.

La descripción y el slogan sí llegan hoy a OpenAI: se normalizan y se limitan a 500 y 200 caracteres respectivamente. El número sólo llega como booleanos de disponibilidad de WhatsApp, no como teléfono.

### Por producto

El owner puede cargar:

- Nombre, slug, precio, moneda, categoría, descripción, imagen, visibilidad y destacado.

Para Seller AI importan directamente nombre, precio publicado, categoría y descripción. Sólo los productos visibles se consideran en contexto o recomendaciones.

### Tono, estilo, instrucciones y prompt libre

- El owner puede elegir un único preset de estilo de venta controlado por JAKAWI.
- **No existe** input de tono libre, personalidad, instrucciones comerciales, política de objeciones ni prompt libre para el owner.
- Las transcripciones de voz son contenido presentado al visitante; no entran al input del LLM.
- Sí existen cinco estilos internos, pero no son configurables por owner ni por tienda todavía (ver sección 4).

Conclusión: el owner hoy carga datos comerciales estructurados/publicables, no prompts. Esto es la dirección correcta.

## 2. Contexto de producto actual

### Lo que recibe el widget

`SellerAiWidget` recibe desde la página pública:

- `storeSlug`, `storeName`, modo/plan y requisito de teléfono para WhatsApp.
- En página de producto: `productId`, nombre, imagen, etiqueta de precio y categoría.
- El widget envía a `/api/seller-ai/chat`: `leadId`, `journeyId`, `sessionId`, `visitorId`, `storeSlug`, mensaje y `currentProductId`.

El widget mantiene los mensajes sólo para la UI local; el historial que decide el servidor se vuelve a cargar desde la conversación persistida.

### Lo que usa `/api/seller-ai/chat`

La ruta carga la conversación completa del lead (orden cronológico), su tienda, journey y eventos. Luego carga el producto actual por `currentProductId` o `lead.currentProductId`, con filtro `storeId = lead.storeId` e `isVisible = true`.

Las reglas reciben el producto con `id`, nombre, descripción, precio en centavos, moneda, categoría y `categoryId`. En la práctica, sus respuestas usan sobre todo nombre, precio, categoría, señales del mensaje y estado del journey.

### Lo que recibe OpenAI

`buildSellerAiReplyInput` envía un JSON como mensaje de usuario, además del prompt de sistema. Incluye:

- Tienda: `id`, slug, nombre y si tiene WhatsApp.
- Contexto de tienda: nombre, descripción limitada a 500 caracteres y slogan limitado a 200.
- Estilo de venta: id e instrucción del preset activo.
- Producto actual, si existe: id, slug, nombre, `priceLabel`, descripción corta (máximo 220 caracteres), categoría y URL relativa.
- Productos candidatos con los mismos campos.
- Señales: necesidad, presupuesto, urgencia, objeciones, boost e intención fuerte.
- Modo comercial, resumen de journey si existe, últimos mensajes, mensaje actual y flags de handoff/telefono.

**Precio real:** sí. Se formatea desde `Product.priceCents` con moneda/locale de tienda.
**Descripción/categoría:** sí.
**Cantidad:** por defecto hasta 4 candidatos, con límite duro de 5. Con producto actual, éste ocupa uno de los 4.
**Catálogo completo:** no. Se seleccionan productos visibles de la misma categoría y luego fallback visible de la misma tienda; nunca se manda el catálogo completo.

## 3. Prompt vendedor actual

El prompt de sistema está centralizado en `app/src/lib/seller-ai/providers/openai.ts` mediante `systemPrompt(storeName)` y no es editable por el owner.

Ordena al modelo:

- vender para esa tienda y usar sólo el contexto entregado;
- aplicar el estilo interno incluido en el contexto;
- no inventar productos, precios, descuentos, stock, envíos, garantías ni métodos de pago;
- atender objeciones con empatía y datos disponibles;
- llevar a WhatsApp ante intención de compra;
- responder breve/natural y no revelar detalles internos.

También hay defensas fuera del prompt:

- Las reglas confirman precio publicado sólo si existe; disponibilidad, envío, garantía, talla/color, descuento y pago se derivan a confirmación por WhatsApp.
- La salida de OpenAI debe cumplir JSON schema.
- Los slugs recomendados se eliminan si no están dentro de los candidatos enviados.
- Si OpenAI falla, está deshabilitado o devuelve `fallbackToRules`, se usan reglas.

**WARN:** aunque el prompt OpenAI está centralizado, el comportamiento vendedor completo está repartido entre este prompt, respuestas de reglas de `chat/route.ts`, modos, quick replies y templates. No conviene abrir esto a prompts libres; sólo documentar el prompt como la fuente normativa para LLM y conservar reglas como fuente normativa de hechos simples.

## 4. Estilos y niveles de venta

Existen estos presets JAKAWI en `app/src/lib/seller-ai/seller-ai.ts`:

- `CONSULTATIVE` — una pregunta útil y recomendación breve.
- `DIRECT` — corto y sin rodeos.
- `PREMIUM_TRUST` — refuerza confianza sólo con datos conocidos.
- `FAST_CLOSE` — acelera handoff por WhatsApp con intención clara.
- `EXPERT` — criterio experto y comparaciones simples con datos provistos.

Corresponden a consultivo, directo, premium/confianza, cierre rápido y experto solicitados.

Cada tienda guarda `Store.sellerAiSalesStyle` (default `CONSULTATIVE`) y `/app/seller-ai` ofrece un selector limitado a estos cinco valores. `buildSellerAiReplyInput()` aplica el estilo de esa tienda al contexto LLM. Los modos `DISCOVERY`, `PRODUCT_ADVISOR`, `DECISION_SUPPORT` y `CLOSING_PREP` no son estilos: son etapas de conversación.

Estructura mínima recomendada: mantener exactamente estos cinco presets bajo control de JAKAWI y añadir un único selector por tienda. No añadir estilo libre ni prompt editable por owner.

## 5. Memoria conversacional

### Persistencia y alcance

- `ConversationMessage` existe y guarda cada mensaje `USER` y `ASSISTANT` con metadata.
- `/api/seller-ai/opening` guarda el mensaje de bienvenida del asistente.
- `/api/seller-ai/chat` guarda el mensaje del visitante y la respuesta (rules u OpenAI).
- Cada `Conversation` pertenece a un `Lead`; el lead y `CustomerJourney` están ligados a `storeId`, `sessionId`, `visitorId` y/o `journeyId`.
- La reutilización busca journeys/leads activos dentro de la misma tienda usando journey explícito o visitor/session. No hay memoria global entre tiendas.

### Historial enviado a OpenAI

`/api/seller-ai/chat` carga los mensajes anteriores y agrega el mensaje nuevo; OpenAI recibe sólo los últimos **6** `USER`/`ASSISTANT` por defecto (`SELLER_AI_LLM_MAX_RECENT_MESSAGES`, rango 1–12). Cada contenido se corta a 1.000 caracteres. El mensaje de apertura cuenta si está dentro de esa ventana.

### Reglas versus historial

- Las reglas no reciben ni resuelven semánticamente toda la transcripción. Usan mensaje actual, producto actual, modo, señales y estado acumulado del journey (necesidad, presupuesto, urgencia, objeciones, productos vistos/recomendados e intención).
- El cálculo de intención sí considera los mensajes USER acumulados y eventos.
- Las quick replies leen hasta 8 mensajes USER para evitar repetir opciones.
- OpenAI sí recibe el historial corto y puede interpretar la conversación dentro de esa ventana.

### Summary / journey

`Lead.conversationSummary` y `CustomerJourney.conversationSummary` existen. En el chat se pasa `journey.conversationSummary` a OpenAI si ya existe, pero no se actualiza por turno. El resumen se genera a partir de hasta cuatro mensajes USER cuando el visitante continúa a WhatsApp y se guarda entonces. Por tanto:

- Hay historial conversacional real y persistido: **sí**.
- Hay memoria de resumen continua durante el chat: **no**.
- El summary es principalmente contexto de handoff, no memoria viva del vendedor AI.

### Referencias

Para `ese producto`, `el otro` y `lo que me dijiste antes`:

- El router identifica varias referencias ambiguas (`ese/esa`, `el otro`, `cuál de esos`, `lo que dijiste`, `anterior`, etc.).
- Si los últimos seis mensajes contienen señales de recomendación/comparación, la consulta pasa a OpenAI con ese historial; el caso está cubierto por test para `¿Y el otro?`.
- Si no hay ese historial útil, queda en reglas y la resolución será débil o dependerá del producto actual/journey.

Resultado: entiende referencias recientes vinculadas a una recomendación; no es memoria robusta de largo plazo.

## 6. Cost router

`app/src/lib/seller-ai/llm.ts` implementa el router. El LLM sólo se intenta si además está habilitado, configurado para OpenAI, tiene API key y la tienda está permitida por feature flag.

**Rules-first (PASS):** preguntas simples de precio, disponibilidad, envío/pago/garantía y orientación básica reciben respuestas determinísticas. El test confirma que `¿Cuánto cuesta?` y `¿Está disponible?` no activan OpenAI.

**OpenAI (PASS):** objeciones reales (caro, descuento, confianza, entrega, stock, pago), comparación/alternativas, indecisión, cierre complejo y mensajes largos de cierre. Las referencias ambiguas sólo van a OpenAI cuando el historial reciente muestra recomendación o comparación.

El router no usa el summary para decidir ni realiza comprensión completa del historial. Sí usa historial reciente de forma acotada para referencias ambiguas; el resto de las decisiones es principalmente por mensaje actual, señales y modo.

## 7. Riesgos

1. **Owner escribiendo prompts — PASS hoy.** No existe prompt libre. Mantenerlo así evita instrucciones contradictorias, fuga de políticas o respuestas no verificables.
2. **Demasiado contexto en OpenAI — PASS.** Productos 4/5, mensajes 6/12, descripción 500, slogan 200 y descripción de producto 220. El riesgo residual es que seis mensajes de 1.000 caracteres todavía pueden ser relativamente costosos en casos complejos, pero está limitado y sólo pasa por router.
3. **Memoria insuficiente — WARN.** La conversación es real pero corta para OpenAI; el resumen no se mantiene antes del handoff. Referencias fuera de seis turnos pueden perderse.
4. **Invención de datos — WARN mitigado.** Prompt, reglas y schema reducen fuertemente precio/descuento/stock/envío/garantía/pago inventados. Sigue siendo posible que el modelo formule beneficios suaves que no estén explícitos; las respuestas LLM no tienen validación factual por frase.
5. **Mezcla de productos/tiendas — PASS para candidatos; WARN para identidad de lead.** Candidatos y productos se filtran por `storeId` y sólo se aceptan slugs candidatos. Sin embargo, `/api/seller-ai/chat` busca por `leadId` sin comprobar `sessionId`, `visitorId` o `storeSlug` contra ese lead. Un ID de lead conocido podría cruzar el contexto de la conversación; CUID lo hace poco probable, pero la validación de pertenencia es el hardening pendiente.
6. **Costo/latencia — PASS / WARN.** Router y fallback reducen llamadas innecesarias. Las llamadas complejas envían contexto limitado; la latencia queda asociada al timeout configurable (default 10 s). No hay cache ni summary incremental, pero no es necesario para el cambio mínimo.
7. **Estilo no operativo por tienda — PASS.** Los presets se guardan por tienda y viajan al contexto LLM; no alteran el router de costo.

## 8. Recomendación mínima exacta

No cambiar el prompt ni añadir campos libres. El sistema ya cumple casi todo el objetivo. El cambio mínimo debe ser:

1. Mantener `sellerAiSalesStyle` con default `CONSULTATIVE` y el selector limitado de cinco opciones en `/app/seller-ai`.
2. Mantener `store.sellerAiSalesStyle` conectado a `getSellerAiSalesStylePreset(store.sellerAiSalesStyle)` en `llm-context.ts`.
3. Mantener como datos del owner, no como prompt: descripción/slogan de tienda, WhatsApp y por producto nombre, precio, categoría y descripción. No añadir instrucciones libres.
4. Conservar límites actuales: producto actual + máximo 4 candidatos, seis mensajes recientes, descripciones capadas y sólo productos visibles de la misma tienda.
5. Conservar rules-first y el router actual: reglas para hechos simples; OpenAI sólo para objeciones, comparación, indecisión, referencias ambiguas con historial y cierre complejo.
6. Mantener WhatsApp como CTA/handoff de cierre. No pedir a OpenAI confirmar stock, envío, garantía, descuentos o pagos si no existen datos estructurados.
7. Como hardening independiente y pequeño, validar que un `leadId` recibido pertenece al mismo `storeSlug`/sesión/visitor antes de leer o escribir su conversación.

No recomiendo añadir summary incremental en este mismo paso: los seis mensajes y señales persistidas ya cubren el objetivo de historial corto. Evaluarlo sólo si QA muestra fallos reales de referencia después de seis mensajes.

## Siguiente paso mínimo

El selector por tienda y su conexión al input LLM ya están implementados. Mantener el resto sin cambios; el siguiente hardening independiente es validar explícitamente `leadId` contra sesión/visitor/store.

Esto deja a JAKAWI dueño del prompt vendedor, permite al owner cargar contexto comercial mínimo y elegir un estilo seguro, conserva historial corto/contexto por producto, y mantiene WhatsApp + rules-first como flujo de cierre.
