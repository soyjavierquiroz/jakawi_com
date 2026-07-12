# Seller AI Advisor v4 Playbooks

Status: **PASS**

QA_DIR: `/var/backups/jakawi.com/qa/finalize-seller-ai-advisor-v4-playbooks/20260712-213121`

Previous QA_DIR: `/var/backups/jakawi.com/qa/continue-seller-ai-advisor-v4-dirty-tree/20260712-211844`

## Summary

Seller AI Advisor v4 implements answer-before-closing behavior, vertical playbooks, and a Boutique Luna fashion profile so product questions are answered before WhatsApp handoff.

The previous run was blocked only because raw `npx prisma validate` ran without `DATABASE_URL` in the shell. This final run corrected the gate by loading `.env.stack` before Prisma checks. Validation, tests, deploy, and production smoke passed.

Deploy, commit, tag, and push were completed in this run.

## Dirty Tree Audit

Dirty tree accepted: **yes**

Only the allowed Seller AI Advisor v4 files were dirty:

- `app/src/app/api/seller-ai/chat/route.ts`
- `app/src/lib/seller-ai/boutique-luna.test.ts`
- `app/src/lib/seller-ai/context.ts`
- `app/src/lib/seller-ai/intent-router.ts`
- `app/src/lib/seller-ai/lead-qualification.ts`
- `app/src/lib/seller-ai/advisor-v4-playbooks.test.ts`
- `docs/SELLER-AI-ADVISOR-V4-PLAYBOOKS.md`

Evidence: `working-tree-before-commit.patch`, `diff-stat-before.txt`, `diff-name-status-before.txt`, `dirty-files-to-validate.txt`, and `unexpected-dirty-files.txt` inside the QA directory.

Secrets exposed: **no**

## Root Cause

The premature closing happened because product questions like `y para qué evento es más adecuado?` were not protected as informational product-advice intents. They could fall through to generic mode inference. With high lead score or a previous close-stage journey, Seller AI could move to `CLOSING_PREP` and return phone/WhatsApp copy before answering the actual question.

## Answer Before Closing

Implemented: **yes**

- Informational intents force `PRODUCT_ADVISOR` or `DECISION_SUPPORT`.
- Informational turns stay on deterministic rules and do not use OpenAI override.
- Handoff visibility is gated with `shouldExposeWhatsappHandoffForIntent`.
- Lead score may still increase, but cannot replace an informational answer or expose handoff for that turn.

Explicit closing remains allowed for `START_ORDER`, `START_BOOKING`, `USER_PROVIDED_PHONE`, `CLICKED_WHATSAPP_CTA`, and phrases such as `quiero comprar`, `lo quiero`, `pedir`, `apartar`, `agendar`, and `hablar por WhatsApp`.

## Playbooks

- MENU / food: ingredientes, porción, precio, disponibilidad, pedir.
- PRODUCT / fashion: tallas, colores, material, ocasión, estilo, disponibilidad, comprar.
- PRODUCT / luggage: medidas, capacidad, material, viaje, garantía, comprar.
- PRODUCT / footwear: tallas, color, material, ocasión/uso, comodidad, comprar.
- SERVICE: qué incluye, duración, precio, agenda, requisitos, WhatsApp.
- PRODUCT generic: características, precio, disponibilidad, comprar.

## Fashion Playbook

Implemented: **yes**

Added local Boutique Luna profiles for:

- Vestido Rojo de Fiesta
- Vestido Floral Midi
- Vestido Negro Elegante
- Vestido Largo Satinado
- Vestido Blanco Casual
- Vestido Verde Cruzado
- Cinturón Delgado Dorado

The red dress profile includes M/L sizes, red color, occasion suitability, style notes, and honest material behavior. If material is not specified, Seller AI says it is not specified instead of inventing fabric.

## Boutique Luna Smoke

Status: **PASS**

Production API smoke for `Vestido Rojo de Fiesta`:

- `y para qué evento es más adecuado?` resolved as `ASK_OCCASION`.
- Reply mentioned fiestas/cenas/eventos de noche and included wedding/formality guidance.
- Reply did not ask for phone.
- Reply did not generate visible handoff.
- Reply did not say `ya tenemos el contexto` or `deja tu número`.
- `quiero comprarlo` resolved as `START_ORDER` and asked for phone to confirm talla/disponibilidad.
- Phone continuation generated a human handoff code matching `KJ-XXXX`.
- No WhatsApp API real was called.

Public route smoke also passed:

- `https://jakawi.com/boutique-luna`
- `https://jakawi.com/boutique-luna/p/vestido-rojo-de-fiesta`

## Exitosos Regression

Status: **PASS**

Exitosos remains MENU/food. Caesar with Chicken still answers ingredients using the food playbook, not fashion facts, and does not ask for phone immediately.

Public custom-domain smoke passed:

- `https://exitosos.com`
- `https://exitosos.com/p/caesar-with-chicken`

## Checks

All checks passed with `.env.stack` loaded before Prisma validation:

- `DATABASE_URL_present`: **yes**
- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npm run test --if-present`: **PASS** (`156` tests passed)
- `npm run typecheck --if-present`: **PASS**
- `npm run lint --if-present`: **PASS**
- `scripts/deploy-preflight.sh`: **PASS**

Prisma note: `npx prisma validate` requires `DATABASE_URL`; for this repo, load `.env.stack` or provide an explicit database URL before running it.

## Deploy

Status: **PASS**

- Docker build: **PASS**
- Built image id matched active container image id.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: **PASS**
- `docker service update --force jakawi_com_web`: **PASS**
- `jakawi_com_web` update status: **completed**
- `https://jakawi.com/api/health`: **PASS**
- Health database assertion: **PASS**

## Secrets

Secrets exposed: **no**

No `.env.stack` contents, tokens, cookies, payment data, emails, WhatsApp API calls, n8n calls, or OpenAI calls were printed.
