# Seller AI WhatsApp handoff roadmap evaluation

## 1. Resumen ejecutivo

**Decisión: GO para Fase 1, con complejidad baja-media y sin migración de base de datos.**

El repositorio ya tiene casi todas las piezas necesarias para el handoff inteligente:

- conversación persistida por lead;
- `Lead.intentScore` y estado comercial;
- `CustomerJourney` con etapa, producto actual, señales y resumen;
- `CommercialSnapshot`, creado al continuar a WhatsApp, con código único, contexto comercial y mensaje;
- eventos de lead y journey para el click de WhatsApp;
- un widget de Seller AI que ya muestra CTA, captura teléfono cuando aplica y abre un `wa.me`.

La ruta de menor resistencia es **reutilizar `CommercialSnapshot` como registro de handoff** y su `snapshotCode` como código humano externo. No se necesita una tabla `Handoff`, un CRM, WhatsApp API, WebSockets ni llamadas a OpenAI.

Fase 1 debe endurecer una regla que actualmente es más permisiva de lo deseado: el CTA aparece también en `DECISION_SUPPORT`, y el endpoint de continuación no vuelve a validar que el lead esté calificado. La implementación debe centralizar la elegibilidad y aplicarla tanto al CTA como al endpoint. Eso evita que el filtro sea solamente visual.

Hay una decisión de alcance que conviene confirmar antes de implementar: los planes PRO conservan un CTA secundario de WhatsApp directo en páginas de producto y varios templates tienen enlaces `wa.me` directos. El GO de esta evaluación garantiza el filtro para el **handoff de Seller AI**. Si el principio significa que *ningún* visitante puede salir a WhatsApp sin calificar, esos enlaces deben eliminarse o redirigirse al chat como una decisión de producto adicional.

## 2. Hallazgos del repo

### Stack y estructura

- Aplicación única en `app/`, con Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 6 y PostgreSQL.
- Package manager declarado: `pnpm@11.9.0`; lockfile: `app/pnpm-lock.yaml`.
- APIs: route handlers bajo `app/src/app/api`.
- UI pública y dashboard: `app/src/components`, `app/src/app` y `app/src/lib`.
- Schema y migraciones: `app/prisma/schema.prisma` y `app/prisma/migrations`.
- No se instaló nada ni se llamaron servicios externos durante esta evaluación.

### Contexto Seller AI existente

El audit `docs/SELLER-AI-CONTEXT-PROMPT-MEMORY-AUDIT.md` es consistente con el código actual:

- El flujo es reglas primero; OpenAI está detrás de un cost router y flags.
- Cada mensaje de usuario y asistente se persiste en `ConversationMessage`.
- Las reglas reciben producto actual, señales comerciales y journey; OpenAI, cuando está permitido, recibe contexto limitado.
- No existe prompt libre editable por owner, lo cual se debe conservar.
- El cierre actual sigue siendo un enlace `wa.me`; no existe WhatsApp API en el flujo revisado.

### Hallazgo importante de eventos externos

Hay infraestructura de first-party tracking (`TrackingEvent`) y código Meta CAPI ya presente. Meta CAPI está deshabilitado por defecto salvo `META_CAPI_ENABLED=true`, pero `trackInternalEvent` puede invocar el dispatcher para ciertos nombres de evento si se activa la configuración.

Por tanto, Fase 1 no debe usar el dispatcher de CAPI para registrar el handoff. Los eventos existentes de lead/journey son suficientes y no hacen llamadas externas. Cualquier puente Meta/TikTok queda explícitamente para fases futuras y con una decisión de activación separada.

## 3. Modelos existentes relevantes

| Necesidad | Modelo/campo existente | Evaluación |
| --- | --- | --- |
| Tienda y número destino | `Store.whatsapp` (requerido), `Store.id`, `Store.slug`, moneda/localización | Ya disponible. |
| Producto actual | `Lead.currentProductId`, `Lead.selectedProductId`, `CustomerJourney.currentProductId`, `CommercialSnapshot.currentItem` | Ya disponible; `CustomerJourney.currentProduct` permite cargar el producto completo. |
| Visitante anónimo | `Lead.sessionId`, `Lead.visitorId`, `CustomerJourney.sessionId`, `CustomerJourney.visitorId` | Ya disponible. |
| Conversación | `Conversation` por `leadId` y `ConversationMessage` por conversación | Ya disponible. `Conversation` no tiene metadata JSON; los mensajes sí. No hace falta agregarla. |
| Score | `Lead.intentScore`, `CustomerJourney.intentScore` | Ya disponible. El score actual es 0–100 y ya usa 70 como alta intención. |
| Etapa | `Lead.status`: `BROWSING`, `ENGAGED`, `WHATSAPP_CLICKED`, etc.; `CustomerJourney.stage`: `DISCOVERY`, `PRODUCT_ADVISOR`, `DECISION_SUPPORT`, `CLOSING_PREP`; `CustomerJourney.status` | Ya disponible. Es preferible mapear los nombres deseados a estos estados que crear nuevos enums. |
| Handoff/código | `CommercialSnapshot.snapshotCode`, `journeyId`, `leadId`, `channel`, contexto, teléfono, score y `createdAt` | Ya disponible; es el candidato correcto para el registro de handoff. |
| Click de handoff | `Lead.whatsappClickedAt`, `Lead.status`, `LeadEvent.WHATSAPP_CLICKED`, `JourneyEvent.CHANNEL_CLICKED` | Ya disponible. |
| Eventos internos | `LeadEvent`, `JourneyEvent`, `TrackingEvent`, además del legado `AnalyticsEvent` | Hay infraestructura suficiente. No se necesita tabla nueva para Fase 1. |

### Mapeo recomendado de estados de producto

| Estado deseado | Fuente existente recomendada |
| --- | --- |
| `CURIOUS` | `Lead.status = BROWSING` y/o `CustomerJourney.stage = DISCOVERY` |
| `INTERESTED` | `Lead.status = ENGAGED` y `PRODUCT_ADVISOR` o señales iniciales |
| `QUALIFIED` | `intentScore >= 70` o `DECISION_SUPPORT` con señal explícita de compra |
| `READY_FOR_WHATSAPP` | `CustomerJourney.stage = CLOSING_PREP`, `CustomerJourney.status = READY_FOR_CHANNEL` |
| `WHATSAPP_CLICKED` | `Lead.status = WHATSAPP_CLICKED`, `whatsappClickedAt`, `CHANNEL_CLICKED` |

No se recomienda añadir un nuevo `lead_stage` duplicado al modelo `Lead`: introduciría dos fuentes de verdad frente a `Lead.status` y `CustomerJourney.stage`.

## 4. Flujo actual de chat/Seller AI

1. `SellerAiWidget` crea/recupera un `sessionId` anónimo y abre el chat.
2. `POST /api/seller-ai/events` registra apertura y crea/recupera un `CustomerJourney`.
3. `POST /api/seller-ai/opening` crea/reutiliza `Lead`, `Conversation` y journey, y persiste el mensaje de apertura.
4. `POST /api/seller-ai/chat`:
   - carga lead, conversación, tienda, journey y producto actual;
   - persiste el mensaje de usuario;
   - extrae señales en `lib/seller-ai/modes.ts`;
   - calcula `intentScore` en `lib/seller-ai/intent.ts`;
   - decide modo y respuesta por reglas; el cost router puede optar por OpenAI;
   - persiste la respuesta, actualiza lead/journey y devuelve `shouldShowWhatsappCta`.
5. `SellerAiWidget` muestra el CTA y, en PRO/PREMIUM, captura teléfono antes de continuar.
6. `POST /api/seller-ai/continue-whatsapp`:
   - crea `CommercialSnapshot`;
   - actualiza lead a `WHATSAPP_CLICKED`, registra fecha, resumen y teléfono;
   - registra `SNAPSHOT_CREATED`, `CHANNEL_CLICKED` y `LeadEvent.WHATSAPP_CLICKED`;
   - devuelve `whatsappUrl` y el navegador abre `wa.me`.

### Punto mínimo de inserción para el filtro

La inserción correcta es una función pura de elegibilidad de handoff, reutilizada en dos lugares:

1. en `chat/route.ts`, para calcular `shouldShowWhatsappCta`;
2. en `continue-whatsapp/route.ts`, para rechazar intentos que no estén calificados.

El widget puede conservar el flujo visual existente; debe confiar en el booleano recibido del servidor y no abrir WhatsApp para un lead no elegible. La validación del servidor es obligatoria porque ocultar un botón no es control de acceso.

## 5. Plan Fase 1 recomendado

### Decisión de diseño

Reutilizar `CommercialSnapshot` como handoff record y llamar externamente a `snapshotCode` **handoff code**. El nombre interno de tabla/campo no es un problema: ya es único y está relacionado con lead, journey y toda la información requerida.

Al click autorizado:

1. crear snapshot;
2. generar código `KJ-8F42` (nuevo formato para snapshots futuros);
3. guardar score, contexto y mensaje ya soportados por el snapshot;
4. actualizar el estado/click ya existente del lead;
5. abrir `wa.me` con mensaje corto y humano.

### Regla de elegibilidad única

La regla propuesta para Fase 1 es:

```text
eligible = leadScore >= 70
  OR journeyStage == CLOSING_PREP por intención explícita
```

La segunda condición cubre frases como “quiero comprar”, aunque el score acumulado todavía no haya alcanzado 70. No se debe usar simplemente `DECISION_SUPPORT`: preguntar precio, envío o disponibilidad es buena señal, pero no necesariamente autorización automática para sacar a un curioso al canal final.

El CTA debe aparecer después de actualizar el score y el journey, nunca sólo por heurística del cliente. El endpoint debe devolver `409 HANDOFF_NOT_READY` para un `leadId` no elegible, con un mensaje de volver al chat.

### Registro mínimo sin tabla nueva

| Campo solicitado | Fuente actual |
| --- | --- |
| `handoffCode` | `CommercialSnapshot.snapshotCode` |
| `conversationId` | `snapshot.lead.conversation.id` (relación 1:1); no requiere columna duplicada |
| `storeId` | `snapshot.journey.storeId` / `snapshot.lead.storeId` |
| teléfono opcional | `CommercialSnapshot.customerPhone` y `Lead.customerPhone` |
| `leadScore` | `CommercialSnapshot.intentScore`, con `Lead.intentScore` como fuente actual |
| `leadStage` | `CustomerJourney.stage`; no duplicar |
| `currentProductId` | `CustomerJourney.currentProductId` y objeto `snapshot.currentItem` |
| `createdAt` | `CommercialSnapshot.createdAt` |
| `clickedAt` | `Lead.whatsappClickedAt` |
| `status` | `Lead.status` y `CustomerJourney.status` |

El snapshot se crea al click, por lo que `createdAt` es el momento del handoff. Reintentos de click pueden conservar el primer snapshot activo o crear uno nuevo; para el MVP se recomienda **reusar `Lead.snapshotId` si ya existe** y sólo actualizar `whatsappClickedAt`/evento para evitar múltiples códigos para la misma conversación. Esta es una mejora pequeña sobre el comportamiento actual, que crea un snapshot en cada continuación.

## 6. Cambios mínimos necesarios

Archivos probables para implementar Fase 1:

- `app/src/lib/seller-ai/intent.ts`: completar reglas de score y exponer señales deterministas reutilizables.
- `app/src/lib/seller-ai/modes.ts`: mantener/delimitar patrones de intención explícita y etapa `CLOSING_PREP`.
- `app/src/config/seller-ai.ts`: umbrales, textos y prefijo de código controlados por JAKAWI.
- `app/src/lib/seller-ai/journey-code.ts`: generar nuevos códigos `KJ-XXXX`; los códigos `SNP-*` existentes siguen siendo válidos al resolverlos.
- `app/src/lib/seller-ai/snapshot.ts`: mensaje prellenado breve y, si se decide, helper para reusar snapshot activo.
- `app/src/lib/seller-ai/whatsapp.ts`: sólo si se centraliza el copy del mensaje humano allí; evitar dos generadores distintos.
- `app/src/app/api/seller-ai/chat/route.ts`: aplicar la función única de elegibilidad al CTA.
- `app/src/app/api/seller-ai/continue-whatsapp/route.ts`: validar elegibilidad antes de crear/actualizar handoff; conservar eventos existentes.
- `app/src/components/seller-ai/SellerAiWidget.tsx`: retirar la promoción optimista del CTA si contradice al servidor y mostrar el CTA sólo con respuesta elegible.
- tests nuevos junto a las utilidades puras bajo `app/src/lib/seller-ai/`.

No se debe tocar el provider de OpenAI ni agregar prompts de owner. La Fase 1 funciona enteramente con reglas existentes.

## 7. Migración DB: evitar / mínima / necesaria

### Recomendación: evitar migración en Fase 1

La migración no es necesaria porque:

- `Lead.intentScore` ya existe;
- los dos ejes de etapa/estado ya existen;
- `CommercialSnapshot` ya modela un handoff único con código y contexto;
- conversación, teléfono, producto y timestamps se obtienen por relaciones existentes;
- `LeadEvent` y `JourneyEvent` ya registran el click.

No conviene usar metadata JSON como nuevo almacén de score/stage: se perdería capacidad de consulta y ya existen columnas correctas. Tampoco conviene crear `Handoff` sólo para renombrar `CommercialSnapshot`.

### Única migración que podría justificarse después

Sólo si se necesita retener varios intentos con estado independiente, confirmación de mensaje recibido y timestamps propios por intento, se podría crear una tabla `WhatsAppHandoff` en una fase posterior. No es necesaria para el MVP ni para `/api/handoffs/resolve`.

No se deben añadir enums para `CURIOUS`/`QUALIFIED` ni `WHATSAPP_HANDOFF_CLICKED` en Fase 1: los valores actuales y un mapeo semántico cubren el caso sin desplegar ALTER TYPE.

## 8. Endpoints propuestos

### Fase 1: ajustar endpoint existente

`POST /api/seller-ai/continue-whatsapp`

Mantiene el contrato actual para el widget y pasa a:

- comprobar elegibilidad en servidor;
- crear o reusar `CommercialSnapshot`;
- devolver `whatsappUrl`, `handoffCode` (además de mantener `snapshotCode` temporalmente por compatibilidad) y estado;
- registrar los eventos internos existentes;
- no hacer llamadas a WhatsApp API, OpenAI, Meta o TikTok.

Respuesta mínima sugerida:

```json
{
  "ok": true,
  "whatsappUrl": "https://wa.me/…",
  "handoffCode": "KJ-8F42",
  "leadStage": "READY_FOR_WHATSAPP"
}
```

### Fase 2: endpoint de lectura para n8n

`POST /api/handoffs/resolve`

No forma parte de Fase 1 de UI, pero se puede implementar inmediatamente después sin cambiar el modelo. Debe ser un endpoint server-to-server autenticado; no debe exponerse al navegador ni confiar sólo en conocer un código corto.

Input:

```json
{
  "code": "KJ-8F42",
  "phone": "+57..."
}
```

Reglas de seguridad y resolución:

1. autenticar n8n con un secreto de servicio o mecanismo interno definido antes de implementarlo;
2. normalizar el teléfono recibido;
3. buscar `CommercialSnapshot` por código e incluir lead, journey, tienda, producto actual y conversación;
4. si el snapshot ya tiene teléfono, exigir coincidencia normalizada; ante discrepancia, devolver `404` o `409` sin filtrar contexto;
5. si no tenía teléfono, devolver el contexto como no vinculado; la vinculación/escritura debe ser una acción explícita posterior al mensaje recibido, no un efecto lateral de `resolve`;
6. limitar los últimos mensajes (por ejemplo 8) y cada contenido (por ejemplo 500 caracteres).

Respuesta mínima y sin secretos:

```json
{
  "store": {
    "id": "…",
    "name": "…",
    "slug": "…"
  },
  "handoff": {
    "code": "KJ-8F42",
    "createdAt": "…",
    "status": "WHATSAPP_CLICKED"
  },
  "conversation": {
    "id": "…",
    "lastMessages": []
  },
  "leadScore": 82,
  "leadStage": "READY_FOR_WHATSAPP",
  "summary": "…",
  "currentProduct": {
    "id": "…",
    "name": "…",
    "priceCents": 120000,
    "currency": "COP"
  }
}
```

No devolver: tokens, costes, hashes, configuración de pixels, credenciales, identificadores de sesión/visitor ni todo el historial de mensajes.

## Fase 2 implementation notes

- Se implementó `POST /api/handoffs/resolve` para recuperar el contexto mínimo de un handoff por `code` y `phone`.
- El código se normaliza con `trim()` y mayúsculas. El teléfono se valida y normaliza sólo para comprobarlo contra el teléfono ya asociado al snapshot; no se guarda ni se devuelve.
- La respuesta queda preparada para n8n con tienda reducida, producto actual, hasta 8 mensajes de hasta 500 caracteres y un resumen de hasta 1000 caracteres. No devuelve catálogo, configuración de tienda, sesión, visitor, costes, secretos ni variables de entorno.
- Si el snapshot ya tiene teléfono, se exige coincidencia; una discrepancia responde `404` sin filtrar contexto. Si no tiene teléfono, la resolución sigue siendo sólo lectura y no lo vincula en esta fase.
- No se añadió WhatsApp API, n8n real, Meta, TikTok ni llamadas a OpenAI. Tampoco se añadió migración ni un sistema nuevo de eventos: no existe un evento interno específico para `HANDOFF_RESOLVED`; registrarlo queda como siguiente paso cuando se defina el evento.
- `InitiateCheckout` queda para `PAYMENT_INFO_SENT` y `Purchase` queda para `PURCHASE_COMPLETED`.

## 9. Frontend propuesto

El componente a tocar es `app/src/components/seller-ai/SellerAiWidget.tsx`.

El widget ya tiene:

- estado `shouldShowWhatsappCta`;
- copy de CTA;
- flujo `chat` → `phone_capture` → `redirecting`;
- llamada a `/api/seller-ai/continue-whatsapp`;
- fallback de enlace manual si la redirección falla.

Cambio mínimo recomendado:

1. El botón sigue llamándose **“Continuar por WhatsApp”** cuando el backend lo habilita.
2. Mostrarlo sólo a partir de `shouldShowWhatsappCta` del servidor; no elevarlo permanentemente en cliente por coincidencia local de texto.
3. Conservar captura de teléfono de PRO/PREMIUM; el teléfono queda asociado al snapshot/lead y permite verificar n8n después.
4. Si el endpoint devuelve `HANDOFF_NOT_READY`, mantener al usuario en el chat con una pregunta/quick reply útil; no abrir WhatsApp.
5. No añadir una pantalla, inbox, polling ni WebSocket.

El CTA de producto actual puede iniciar Seller AI como hoy. Los CTA directos existentes son una decisión separada:

- `ProductConversionCta` y `/api/whatsapp/click` permiten salida directa;
- PRO mantiene WhatsApp secundario por configuración de plan;
- algunos templates contienen `https://wa.me/${store.whatsapp}` directamente.

Para el MVP se recomienda mantenerlos para BASIC/TRIAL y revisar por separado si PRO debe conservar el escape secundario. PREMIUM ya oculta los CTA directos de producto según `getStorefrontFlow`.

## 10. Scoring por reglas

No usar OpenAI para el score de Fase 1. Las señales se pueden extraer de manera determinista del mensaje normalizado y de eventos existentes.

La implementación debe evitar que sólo el número de mensajes convierta a un curioso en calificado. El score actual suma por cada mensaje; conviene mantenerlo como señal menor y dar prioridad a señales comerciales únicas por conversación/journey.

Propuesta inicial, acumulable con tope 100 y deduplicada por tipo de señal:

| Señal | Puntos sugeridos |
| --- | ---: |
| Abrir chat | 5 |
| Producto visto o producto actual | 5 |
| Pregunta de precio | 15 |
| Disponibilidad/stock | 15 |
| Envío/entrega | 15 |
| Talla/color/modelo/variante | 15 |
| Forma de pago/QR/transferencia | 20 |
| Comparar alternativas | 15 |
| Intención explícita: “lo quiero”, “cómo compro”, “me interesa” | 35 |
| Hablar con alguien / WhatsApp | 35 |
| Urgencia concreta | 10 |

Reglas de CTA:

- score `>= 70`; o
- intención explícita de compra, pago, envío o hablar con alguien que lleve `CustomerJourney.stage` a `CLOSING_PREP`.

La intención explícita debe ser específica. “Me interesa” por sí sola puede ser suficientemente fuerte sólo cuando hay producto actual o una recomendación concreta; en discovery sin contexto, pedir una pregunta corta antes de ofrecer handoff.

OpenAI queda fuera del cálculo. Sólo se podría usar en fases posteriores y bajo el cost router para:

- generar un resumen al handoff cuando no exista;
- objeciones complejas;
- ambigüedad contextual que las reglas no puedan resolver.

El resumen actual de handoff puede mantenerse con `generateLeadSummary`, que no requiere una llamada real a OpenAI.

## 11. Handoff code y mensaje WhatsApp

### Código

Usar el código único de `CommercialSnapshot` con formato nuevo:

```text
KJ-8F42
```

Recomendación técnica:

- modificar sólo el generador de códigos para nuevos snapshots;
- conservar resolución de códigos antiguos `SNP-*` para compatibilidad;
- usar alfabeto sin caracteres ambiguos, como ya hace el repo;
- seguir verificando colisiones en base de datos antes de crear el snapshot.

### Mensaje prellenado

El mensaje actual incluye resumen, datos de contacto y muchas líneas. Para el filtro planteado es mejor reducirlo a un mensaje humano que no revele tracking ni parezca CRM:

```text
Hola 👋 quiero continuar con lo que estaba viendo en la tienda. Código: KJ-8F42
```

Se puede añadir el nombre del producto sólo si mejora la claridad y no crea promesas comerciales:

```text
Hola 👋 quiero continuar con [Producto] que estaba viendo en la tienda. Código: KJ-8F42
```

El contexto rico queda en JAKAWI para que n8n lo recupere; no debe viajar dentro del mensaje de WhatsApp ni hacer visible teléfono, resumen u objeciones al propio visitante.

## 12. n8n resolve flow

Flujo recomendado para Fase 2:

```text
Cliente envía WhatsApp con código
  -> n8n extrae código y teléfono del inbound
  -> POST autenticado /api/handoffs/resolve
  -> JAKAWI verifica código y, si aplica, teléfono
  -> JAKAWI devuelve contexto mínimo
  -> n8n presenta el contexto al owner o continúa su flujo manual
```

No se debe intentar resolver por teléfono sin código en esta fase: el código es el vínculo determinista con una conversación anónima y evita falsos empates. Un futuro endpoint `WHATSAPP_MESSAGE_RECEIVED` puede vincular de forma explícita el teléfono inbound al lead/snapshot y registrar el evento, pero no es necesario para iniciar el resolve.

El endpoint debe ser de sólo lectura. Limitar el mensaje/contexto y exigir autenticación evita convertir un código corto en acceso público a conversaciones.

## 13. Conversion events roadmap

### Lo que ya existe

- `LeadEvent` y `JourneyEvent` registran comportamiento comercial.
- `TrackingEvent` es una tabla first-party flexible (`eventName` es string), adecuada para eventos internos futuros sin migración.
- Existe configuración de pixel por tienda y una implementación Meta CAPI, pero no debe activarse ni usarse ahora.

### Fase 1

Usar los eventos ya persistidos:

- `LeadEventType.WHATSAPP_CLICKED`;
- `JourneyEventType.SNAPSHOT_CREATED`;
- `JourneyEventType.CHANNEL_CLICKED`.

Semánticamente, ese conjunto representa `WHATSAPP_HANDOFF_CLICKED`. Para el MVP no se recomienda añadir un enum sólo para renombrar el evento.

### Fase 3

Agregar una taxonomía first-party documentada, por ejemplo:

| Evento de negocio | Registro recomendado |
| --- | --- |
| `CHAT_STARTED` | `LeadEvent.CHAT_OPENED` / `JourneyEvent.SELLER_AI_OPENED` |
| `QUALIFIED_LEAD` | nuevo `TrackingEvent.eventName` de sólo persistencia, o derivado de score + etapa |
| `WHATSAPP_HANDOFF_CLICKED` | eventos existentes; opcional eventName first-party dedicado |
| `WHATSAPP_MESSAGE_RECEIVED` | endpoint autenticado de n8n + `TrackingEvent` |
| `PAYMENT_INFO_SENT` | endpoint autenticado de n8n + `TrackingEvent` |
| `PURCHASE_COMPLETED` | endpoint autenticado de n8n + `TrackingEvent` |

Al implementar nombres nuevos en `TrackingEvent`, actualizar la lista TypeScript permitida pero **no** agregarlos al conjunto que dispara Meta CAPI. Así se registran internamente sin llamadas externas.

### Fase 4: pago informado

`POST /api/conversion-events/payment-info-sent` debe autenticarse server-to-server, resolver `handoffCode` y validar consistencia de tienda/productos. Debe persistir monto, moneda, productos y método como evento first-party. Este es el punto correcto para mapear después a `InitiateCheckout`; no en el click de WhatsApp.

### Fase 5: compra

`POST /api/conversion-events/purchase-completed` debe ser idempotente por `orderId` o una clave de evento externa. Debe persistir proveedor, monto y moneda y actualizar journey/lead a convertido/ganado sólo si esa es la fuente de verdad acordada. Éste es el único punto que, más adelante, puede mapear a `Purchase`.

Meta CAPI y TikTok Events API quedan apagados y fuera de estas fases hasta que haya señales first-party suficientes, consentimiento y una decisión explícita de activación.

## 14. Riesgos

| Riesgo | Impacto | Mitigación mínima |
| --- | --- | --- |
| CTA se muestra demasiado pronto | Envía curiosos a WhatsApp | Eliminar `DECISION_SUPPORT` como criterio suficiente y usar elegibilidad centralizada. |
| Endpoint saltable por llamada directa | El filtro sería sólo UI | Revalidar score/etapa en `continue-whatsapp`. |
| Score infla por cantidad de mensajes | Falsos positivos | Deduplicar señales comerciales y bajar el peso de mensajes genéricos. |
| Salidas `wa.me` directas de storefront | El principio “sólo leads calientes” no sería global | Definir explícitamente la política por plan/template antes de retirar enlaces. |
| Código corto adivinable | Riesgo de exposición de conversación | Endpoint n8n autenticado, verificación de teléfono cuando exista y respuesta mínima. |
| Múltiples códigos por un mismo lead | Contexto fragmentado | Reusar snapshot activo en retries o documentar uno por intento. |
| Mensaje WhatsApp demasiado detallado | Mala UX y exposición innecesaria | Prefill corto; contexto queda sólo en JAKAWI. |
| Uso accidental de Meta CAPI | Violación del alcance de Fase 1 | No llamar `trackInternalEvent` para este evento mientras exista dispatcher; usar eventos lead/journey. |
| Dependencia de OpenAI | Coste/latencia no necesarios | Fase 1 por reglas; no tocar provider ni flags. |

## 15. Recomendación final: go/no-go

**GO.**

Fase 1 encaja con la arquitectura real y es una extensión pequeña de un flujo ya implementado. La recomendación de mínima resistencia es:

1. reutilizar `CommercialSnapshot` y `snapshotCode` como handoff/code;
2. reutilizar `Lead.intentScore`, `Lead.status` y `CustomerJourney.stage` en vez de crear campos nuevos;
3. centralizar una elegibilidad server-side de score `>= 70` o intención explícita;
4. simplificar el mensaje `wa.me`;
5. reutilizar eventos de lead/journey y no conectar analytics externos;
6. dejar `/api/handoffs/resolve` para Fase 2 como endpoint autenticado de sólo lectura.

Complejidad estimada: **baja-media**. La única decisión que puede ampliar el alcance es convertir todos los enlaces directos de WhatsApp en entradas al filtro de Seller AI. Eso no es necesario para lanzar el handoff inteligente dentro del chat, pero sí lo sería para imponer el filtro como regla absoluta en todo el storefront.

Primer feature branch recomendado: `feat/seller-ai-qualified-whatsapp-handoff`.

## Fase 1 implementation notes

- La calificación de lead está implementada con reglas deterministas y sin tokens: precio, disponibilidad, envío, variantes, pago, comparación e intención explícita de compra.
- El CTA se habilita sólo con score `>= 70` o intención explícita y sólo cuando la tienda tiene WhatsApp configurado. La misma validación se aplica en el chat y en `continue-whatsapp`.
- `CommercialSnapshot` se reutiliza como handoff record sin migración. Los snapshots nuevos usan códigos humanos `KJ-XXXX`; los reintentos reutilizan el snapshot activo del lead.
- El mensaje prellenado es breve y humano: `Hola 👋 quiero continuar con lo que estaba viendo en la tienda. Código: KJ-8F42`.
- Esta fase no usa WhatsApp API, Meta, TikTok, n8n ni llamadas reales a OpenAI. No existe prompt editable por owner.
- `InitiateCheckout` queda para n8n cuando informe pago; `Purchase` queda para pago confirmado.
