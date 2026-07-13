# Seller AI Advisor v5 Category Advice

Status: **PASS**

QA_DIR: `/var/backups/jakawi.com/qa/recover-seller-ai-v5-clean-deploy/20260713-023404`

Previous QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-advisor-v5-category-advice/20260712-222916`

## Summary

Seller AI Advisor v5 adds category-specific product advice for Boutique Luna fashion accessories, starting with `Cinturón Delgado Dorado` as `fashion.belt`.

The previous run was blocked because production still served the old v4 belt copy after an interrupted build/deploy evidence flow. This recovery run built a clean unique image, verified v5 strings inside the built image, retagged `jakawi-com-web:latest` only after the clean build passed, deployed once, confirmed the active container image id matched the clean build image id, and passed production smoke.

Deploy, commit, tag, and push were completed in this run.

## Problem Observed

Before v5, the belt advice was technically acceptable but too generic:

- Occasion advice listed facts without natural styling guidance.
- `Y combina con una chamarra?` did not answer the jacket/chamarra question directly.
- The style CTA said `elegir talla`, which is awkward for a belt.
- Shipping copy was correct but cold and did not ask for city/zone.

## Category-Specific Playbooks

The resolver now supports fashion subcategories:

- `fashion.dress`
- `fashion.accessory`
- `fashion.belt`
- `fashion.footwear`
- `fashion.bag`
- `fashion.generic`

For `Cinturón Delgado Dorado`, the local playbook resolves:

- offerType: `PRODUCT`
- vertical: `fashion`
- category: `accessory`
- subcategory: `belt`

## Fashion Belt Behavior

Implemented: **yes**

- Occasion advice explains casual/elegant looks, dinners, outings, events of night, and subtle waist definition.
- Compatibility advice answers chamarras/chaquetas/blazers directly and suggests clean looks with black, beige, white, denim, or dark green.
- Shipping asks for city/zone and offers to leave the WhatsApp query ready with the belt context.
- Size wording uses `medida`, `largo`, and `ajuste`, not generic dress-style `talla`.
- Explicit purchase asks for phone to confirm measure, fit, and availability.

## Before And After

Before:

`Cinturón Delgado Dorado puede funcionar para complemento para vestidos, eventos casuales o elegantes, marcar cintura.`

After:

`El Cinturón Delgado Dorado funciona bien para completar looks casuales o elegantes: cenas, salidas, eventos de noche o para darle un toque más arreglado a un vestido sencillo. También ayuda a marcar la cintura de forma sutil.`

For `Y combina con una chamarra?`, production now answers with chamarras/blazers directly and recommends a clean look with black, beige, white, denim, dark green, or neutral tones.

## Tests

Checks with `.env.stack` loaded:

- `DATABASE_URL_present`: **yes**
- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npm run test --if-present`: **PASS** (`247` tests passed)
- `npm run typecheck --if-present`: **PASS**
- `npm run lint --if-present`: **PASS**
- `scripts/deploy-preflight.sh`: **PASS**

The `npm run test` script was corrected to quote the glob so nested `src/lib/seller-ai/**/*.test.ts` files are included.

## Deploy

Status: **PASS**

- Clean build tag: `jakawi-com-web:seller-ai-v5-category-advice-20260713023511`
- Clean build image id: `sha256:bdd56cc20069066c16332e5e92d57eacc87beecc3dd65e79abd159666cbd05bb`
- `jakawi-com-web:latest` image id matched the clean build image id before deploy.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: **PASS**
- `docker service update --force jakawi_com_web`: **PASS**
- `jakawi_com_web` update status: **completed**
- Active container image id matched the clean build image id.

## Smoke

Public HTTP smoke:

- `https://jakawi.com/api/health`: **PASS**
- `https://jakawi.com/boutique-luna`: **PASS**
- `https://jakawi.com/boutique-luna/p/cinturon-delgado-dorado`: **PASS**
- `https://jakawi.com/boutique-luna/p/vestido-rojo-de-fiesta`: **PASS**
- `https://exitosos.com`: **PASS**
- `https://exitosos.com/p/caesar-with-chicken`: **PASS**

Seller AI API v5 belt smoke: **PASS**

- `¿Para qué evento sirve?` resolved to belt-specific occasion advice and did not ask for phone.
- `Y combina con una chamarra?` answered chamarras/blazers directly and did not use generic dress or accessory wording.
- `Envío` asked for city/zone and kept the belt context.
- `quiero comprarlo` asked for phone to confirm medida, ajuste, and disponibilidad.
- Valid phone continuation generated a `KJ-XXXX` handoff code.
- No WhatsApp API real was called.

## Regressions

Boutique Luna dress regression: **PASS**

- `Vestido Rojo de Fiesta` still answers occasion guidance with fiestas, cenas, eventos de noche, wedding caveat, and the satin dress alternative.
- Informational dress advice still avoids premature phone capture.

Exitosos regression: **PASS**

- Public custom domain still loads.
- `Caesar with Chicken` still resolves as `MENU`.
- Ingredient answer still uses food facts and does not use the fashion playbook.

## Secrets

Secrets exposed: **no**

No `.env.stack` contents, tokens, cookies, payment data, emails, WhatsApp API calls, n8n calls, or OpenAI calls were printed.
