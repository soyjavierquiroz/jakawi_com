# Seller AI Food Menu Intelligence v2

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-food-menu-intelligence-v2/20260712-142402`

## Root Cause v2

Food mode v1 knew Exitosos was a menu store, but `Product` has no structured `metadata`, `tags`, `ingredients`, `portionNote`, `servingSuggestion`, or `shortDescription` fields. Ingredient questions fell back to name inference and said `parece`, which was honest but not polished enough for a real restaurant menu.

Pedido flow also allowed the optional LLM path to override the local food copy, so `Pedir por WhatsApp` could sound longer and less direct than the intended restaurant flow.

## Changes

- Added small Exitosos menu profiles in `app/src/lib/seller-ai/context.ts`.
- Menu profile structure: `menuType`, `ingredients`, `portionNote`, `servingSuggestion`, `orderQuestions`, `ownerVerified`, `tags`.
- `ownerVerified` is `false` because there is no explicit owner confirmation field yet.
- Kept no-migration approach because `Product` has no metadata JSON field.
- Food ingredient, portion, and order messages now stay on local rules instead of LLM.
- Removed `parece` from food ingredient/order fallbacks.
- Added contextual food chips after ingredients and order.
- Improved phone capture copy in the widget to reference the store and order confirmation.
- Added `pedir`, `pedido`, `hacer pedido`, and `pedir por WhatsApp` to closing/qualification logic.

## Products Enriched

Products enriched: 7

- Caesar with Chicken: ingredients include lechuga fresca, pollo, aderezo César, queso parmesano, crutones. Category `Ensaladas`.
- Beef Stroganoff: profile with carne and salsa cremosa estilo stroganoff. Category `Platos`.
- Creamy Chicken Alfredo: profile with pasta, pollo, salsa Alfredo cremosa. Category `Pastas`.
- Pan-Seared Duck: profile with pato and preparación sellada a la sartén. Category `Platos`.
- Pan-Seared Salmon: profile with salmón and preparación sellada a la sartén. Category `Platos`.
- Roasted Tomato Soup: profile with tomate rostizado and base de sopa. Category `Sopas`.
- Tandoori Chicken: profile with pollo and preparación estilo tandoori. Category `Platos`.

No prices, images, slugs, domains, payments, emails, n8n, WhatsApp API, or visibility fields were changed.

## Before / After

Before:

`No tengo la lista exacta de ingredientes cargada todavía, pero por el nombre parece una ensalada tipo César con pollo...`

After:

`La Caesar with Chicken incluye lechuga fresca, pollo, aderezo César, queso parmesano, crutones. Ideal para almuerzo ligero o cena fresca. Los detalles pueden variar según disponibilidad. ¿Quieres que te ayude a confirmar disponibilidad o dejar el pedido listo por WhatsApp?`

Pedido after:

`Perfecto. Te dejo el pedido de Caesar with Chicken listo para WhatsApp. ¿A qué número quieres que Exitosos te confirme disponibilidad?`

## Quick Replies

Inicio producto:

- Ingredientes
- Porción
- Precio
- Pedir

Después de ingredientes:

- Confirmar disponibilidad
- Pedir por WhatsApp
- Ver precio
- Volver al producto

Después de pedido:

- Ya te dejo mi número
- ¿Cuánto tarda?
- Confirmar disponibilidad

No food-mode chips contain `Trabajo`, `Estudio`, `Viaje`, `Para regalar`, or `Uso diario`.

## Tests

Checks:

- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npm run test --if-present`: PASS, 156 tests
- `npm run typecheck --if-present`: PASS
- `npm run lint --if-present`: PASS

Added/updated tests in `app/src/lib/seller-ai/food-store.test.ts` for:

- Caesar menu profile ingredients.
- 7 Exitosos menu profiles.
- Ingredient answer with concrete Caesar ingredients.
- No `parece` or ecommerce occasion language.
- Short order copy and phone ask.
- Contextual quick replies.
- Handoff qualification preserved.
- Non-food ecommerce chips preserved.

## Smoke

Production smoke: PASS

- `https://jakawi.com/api/health`: database ok
- `https://exitosos.com`: loads
- `https://exitosos.com/p/caesar-with-chicken`: loads
- `www.exitosos.com`: redirects to apex
- Seller AI opening: food chips PASS
- Seller AI ingredients: concrete ingredients PASS
- Seller AI order: short copy and phone capture PASS
- Continue WhatsApp endpoint: handoff code `KJ-XXXX` generated and `wa.me` URL returned
- WhatsApp real API called: no

## Evidence

- `evidence/seller-ai-food-v2-files.txt`
- `evidence/food-v2-audit-findings.md`
- `evidence/exitosos-products-before-v2.json`
- `evidence/exitosos-products-after-v2.json`
- `evidence/seller-ai-chat-ingredients-caesar-v2.json`
- `evidence/seller-ai-chat-order-caesar-v2.json`
- `evidence/seller-ai-continue-whatsapp-caesar-v2.json`
- `evidence/smoke-validation.json`

Manual QA pending: yes, visual browser/mobile confirmation of widget layout and phone capture panel.

Secrets exposed: no.
