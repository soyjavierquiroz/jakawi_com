# Seller AI Advisor v3: Intent Memory

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-advisor-v3-intent-memory/20260712-150212`

## Root Cause

El chip `Ingredientes` se enviaba como texto visible, no como acción estable. El backend infería modo desde texto, score y estado acumulado; cuando la conversación ya estaba cerca de cierre, `CLOSING_PREP` tomaba prioridad y respondía con copy de pedido: `Te dejo el pedido...`.

El bug era de UI y backend:

- UI: quick replies eran strings y `onClick` llamaba `sendMessage(reply)`.
- Backend: no existía intent router explícito y una pregunta informativa podía caer en cierre por score alto.
- Estado: el widget podía quedarse con el producto inicial al ignorar eventos de otros productos.

## Offer Types

Se agregó `resolveOfferType(store, product)` con salida:

- `MENU`: comida, platos, restaurantes. Exitosos resuelve `MENU`.
- `PRODUCT`: productos físicos como maletas, tenis o ropa.
- `SERVICE`: servicios, citas, clases o tratamientos.

## Intent Router

Se agregó `resolveSellerIntent(input)` con prioridad:

1. `quickReply.action`
2. `action`
3. `ctaAction`
4. `quickReply.label`
5. texto libre

Intenciones soportadas:

- `ASK_INGREDIENTS`
- `ASK_PORTION`
- `ASK_PRICE`
- `ASK_AVAILABILITY`
- `ASK_FEATURES`
- `ASK_SIZE`
- `ASK_SHIPPING`
- `ASK_SERVICE_INCLUDED`
- `ASK_DURATION`
- `START_ORDER`
- `START_BOOKING`
- `BACK_TO_PRODUCT`
- `UNKNOWN`

Regla crítica: `ASK_INGREDIENTS` es informativa y nunca inicia `START_ORDER`, phone capture ni handoff inmediato.

## Quick Reply Actions

Los chips ahora viajan como:

```json
{ "label": "Ingredientes", "action": "ASK_INGREDIENTS" }
```

Mapeo base:

- `MENU`: Ingredientes, Porción, Precio, Pedir.
- `PRODUCT`: Características, Medidas, Precio, Comprar.
- `SERVICE`: Qué incluye, Duración, Precio, Agendar.

## Conversation Memory

La conversación activa se reutiliza por tienda + visitor/session mediante `ensureSellerLead`.

Cambios:

- No se borra historial al abrir otro producto.
- `currentProductId` se actualiza cuando cambia el producto.
- `viewedProducts` conserva productos vistos.
- `productChanged` permite responder: `Ahora estás viendo...`.
- El widget dejó de ignorar eventos de productos distintos.

## Responses

`MENU`:

- `ASK_INGREDIENTS` responde ingredientes si existen y no pide teléfono.
- `START_ORDER` sí puede pedir número para confirmar disponibilidad.

`PRODUCT`:

- `ASK_FEATURES`, `ASK_SIZE`, `ASK_SHIPPING`, `ASK_PRICE`, `START_ORDER`.

`SERVICE`:

- `ASK_SERVICE_INCLUDED`, `ASK_DURATION`, `ASK_PRICE`, `START_BOOKING`.

## Tests

Agregados/actualizados:

- Bug `Ingredientes` con action `ASK_INGREDIENTS`.
- `ASK_INGREDIENTS` no responde pedido, no pide teléfono y no genera handoff inmediato.
- Resolver `MENU/PRODUCT/SERVICE`.
- Chips por tipo de oferta con actions.
- Exitosos/Caesar sigue con ingredientes.
- Food chips no contienen Trabajo/Estudio/Viaje/Para regalar.
- Producto físico usa Características/Medidas/Precio/Comprar.
- Servicio usa Qué incluye/Duración/Precio/Agendar.
- Lead score considera productos vistos.
- Regresiones existentes: custom domains, handoff resolve, cookies LATAM.

## Deploy And Smoke

Deploy: PASS

Smoke: PASS

- `https://jakawi.com/api/health`: PASS.
- `https://exitosos.com`: PASS.
- `https://exitosos.com/p/caesar-with-chicken`: PASS.
- Seller AI API `ASK_INGREDIENTS`: responde ingredientes, no pide teléfono y no genera handoff.
- Seller AI API `START_ORDER` con chip `Pedir`: pide teléfono y genera handoff `KJ-XXXX` al recibir teléfono válido.
- Cambio de producto Exitosos con mismo visitor: reutiliza `leadId/journeyId`, preserva historial y marca `productChanged`.

## Secrets

Secrets exposed: no.

No se imprimieron `.env.stack` ni secretos.
