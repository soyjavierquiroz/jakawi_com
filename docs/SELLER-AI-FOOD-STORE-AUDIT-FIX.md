# Seller AI Food Store Audit Fix

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-food-store-audit-fix/20260712-135721`

## Summary

Seller AI was treating Exitosos food products like generic ecommerce products. The reported chips `Trabajo`, `Estudio`, `Viaje`, `Para regalar` came from hardcoded `PRODUCT_ADVISOR` defaults in `app/src/config/seller-ai.ts` and were selected by `app/src/lib/seller-ai/conversation-state.ts`.

Before this fix, Exitosos was `commercialType=PRODUCT_STORE`, its products had no category, and all 7 product descriptions shared the same generic dressing text. The ingredient question for `Caesar with Chicken` fell through to generic copy: work/gift/daily-use language.

## Changes

- Added simple food/restaurant detection in `app/src/lib/seller-ai/context.ts`.
- Detection uses `commercialType=MENU`, food category/product/store text, and a manual Exitosos fallback for `slug=javier` / `name=Exitosos`.
- Added food quick replies: `Ingredientes`, `Porción`, `Precio`, `Pedir`.
- Added food opening copy for product pages.
- Added food-specific rule responses for ingredients, portion, price, availability, and order intent.
- Ingredient answers use explicit ingredient lists only when present in product description; otherwise they honestly say the exact list is not loaded and offer WhatsApp confirmation.
- Kept WhatsApp handoff and lead qualification logic unchanged.
- Added OpenAI prompt guardrails for food contexts.
- In food mode, quick replies come from rules even if an LLM handles a complex answer.

## Product Data

Products audited: 7

Products enriched: 7

Exitosos updates:

- Store `commercialType`: `PRODUCT_STORE` -> `MENU`
- Store description/tagline updated for food ordering.
- Categories created: `Ensaladas`, `Platos`, `Pastas`, `Sopas`
- Product descriptions replaced with food-specific commercial copy.
- No products deleted.
- No prices changed.
- No image URLs changed.
- No exact nutritional, allergen, gluten-free, vegan, keto, or calorie claims added.

## Behavior

For `Caesar with Chicken`, opening now returns:

- `Ingredientes`
- `Porción`
- `Precio`
- `Pedir`

For `cuales son los ingredientes?`, production API returned:

`No tengo la lista exacta de ingredientes cargada todavía, pero por el nombre parece una ensalada tipo César con pollo. Te puedo ayudar a confirmar con la tienda por WhatsApp.`

It does not mention work, study, travel, gift, or daily use.

## Tests

Added `app/src/lib/seller-ai/food-store.test.ts`.

Coverage:

- Exitosos food products do not show generic occasion chips.
- Caesar with Chicken shows food chips.
- Ingredient question does not produce work/gift/study/travel/daily-use copy.
- Exact ingredient descriptions are used when present.
- Food mode preserves WhatsApp handoff for qualified leads.
- Non-food ecommerce can still use occasion chips.
- Lead scoring still qualifies explicit purchase intent.

Checks:

- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npm run test --if-present`: PASS, 156 tests
- `npm run typecheck --if-present`: PASS
- `npm run lint --if-present`: PASS

## Deploy And Smoke

Deploy: PASS

- Docker image built: PASS
- Stack deploy: PASS
- `jakawi_com_web` force update: PASS
- Service converged: PASS

Production smoke: PASS

- `https://jakawi.com/api/health`: database ok
- `https://exitosos.com`: loads Exitosos
- `https://exitosos.com/p/caesar-with-chicken`: loads product
- LATAM cookie consent did not block the Seller AI surface in HTML smoke
- Custom domain apex OK
- `www.exitosos.com` redirects to apex
- Seller AI API opening for Caesar returned food chips
- Seller AI API chat for ingredients returned food-aware honest answer
- No real WhatsApp API call made

## Evidence

- `evidence/seller-ai-files.txt`
- `evidence/seller-ai-audit-findings.md`
- `evidence/exitosos-products-before.json`
- `evidence/exitosos-products-audit.md`
- `evidence/exitosos-products-after.json`
- `evidence/test.txt`
- `evidence/typecheck.txt`
- `evidence/lint.txt`
- `evidence/docker-build.txt`
- `evidence/smoke-validation.json`

## Pending

- Manual browser QA is still useful for visual confirmation of the widget, animation, and mobile keyboard behavior.
- Add structured ingredient fields later if restaurants need exact ingredient/allergen support.

Secrets exposed: no.
