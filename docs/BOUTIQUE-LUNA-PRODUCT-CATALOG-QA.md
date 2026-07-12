# Boutique Luna Product Catalog QA

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/populate-boutique-luna-products/20260712-163648`

## Store

- URL: `https://jakawi.com/boutique-luna`
- Slug: `boutique-luna`
- Store: Boutique Luna
- Offer type: `PRODUCT`
- Store commercial type: `PRODUCT_STORE`
- Plan: updated from `TRIAL/TRIALING` to `PRO/ACTIVE` to enable Seller AI for this demo store.
- Payments touched: no.

## Products

Created/updated idempotently by `(storeId, slug)`:

- `vestido-floral-midi` - Vestido Floral Midi - BOB 180.00
- `vestido-negro-elegante` - Vestido Negro Elegante - BOB 240.00
- `vestido-rojo-de-fiesta` - Vestido Rojo de Fiesta - BOB 260.00
- `vestido-blanco-casual` - Vestido Blanco Casual - BOB 190.00
- `vestido-largo-satinado` - Vestido Largo Satinado - BOB 320.00
- `vestido-verde-cruzado` - Vestido Verde Cruzado - BOB 220.00
- `cinturon-delgado-dorado` - Cinturón Delgado Dorado - BOB 45.00

## Categories

Created/reused:

- Vestidos casuales
- Vestidos de fiesta
- Vestidos elegantes
- Accesorios

## Images

Image status: PASS.

Used first-party generated SVG demo assets in `app/public/demo/boutique-luna/`.

No third-party stock, ecommerce, Instagram, Pinterest, Zara, Shein, or brand images were used.

## URLs

- `https://jakawi.com/boutique-luna`
- `https://jakawi.com/boutique-luna/p/vestido-floral-midi`
- `https://jakawi.com/boutique-luna/p/vestido-negro-elegante`
- `https://jakawi.com/boutique-luna/p/vestido-rojo-de-fiesta`
- `https://jakawi.com/boutique-luna/p/vestido-blanco-casual`
- `https://jakawi.com/boutique-luna/p/vestido-largo-satinado`
- `https://jakawi.com/boutique-luna/p/vestido-verde-cruzado`
- `https://jakawi.com/boutique-luna/p/cinturon-delgado-dorado`

## Seller AI PRODUCT Behavior

Smoke: PASS.

- `offerType`: `PRODUCT`
- Quick replies: `Tallas`, `Colores`, `Precio`, `Comprar`
- Food/generic chips absent: no `Ingredientes`, `Porción`, `Trabajo`, `Estudio`, `Viaje`, `Para regalar`

Responses:

- Tallas: returns `S, M, L` and says final availability is confirmed by Boutique Luna.
- Colores: returns `floral claro`.
- Boda: says Vestido Floral Midi can work for day/casual elegant wedding and recommends Vestido Largo Satinado or Vestido Rojo de Fiesta for formal/night.
- Comprar: asks for WhatsApp with short copy.
- Valid phone: generated `KJ-XXXX` handoff code.

## Memory Smoke

PASS.

- Opened Vestido Floral Midi.
- Asked tallas.
- Opened Vestido Negro Elegante with the same visitor.
- Same `leadId` and `journeyId` reused.
- `productChanged=true`.
- Follow-up event question used Vestido Negro Elegante context.

## Regression

- `https://exitosos.com`: PASS.
- `https://exitosos.com/p/caesar-with-chicken`: PASS.
- Existing tests for handoff resolve and LATAM cookies: PASS.

## Checks

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS
- Boutique Luna targeted tests: PASS
- Typecheck: PASS
- Lint: PASS
- Docker build: PASS
- Deploy: PASS
- Production smoke: PASS

## Secrets

Secrets exposed: no.
