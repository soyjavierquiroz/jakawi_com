# Seller AI Service Mode Studio Bella QA

Status: **PASS**

QA_DIR: `/var/backups/jakawi.com/qa/service-mode-studio-bella-good-enough/20260715-022646`

## Summary

Studio Bella is a Good Enough SERVICE mode demo store for beauty services. The store and five service offerings were created/updated idempotently in production DB, using the existing Store/Product model and no schema migration.

This run also made small SERVICE-mode fixes only where smoke showed clear incoherence: SERVICE quick replies now include `Disponibilidad`, duration can answer from the service description, and event/boda suitability stays in service copy instead of drifting into product/fashion wording.

## Services Created

- `Maquillaje Social` (`maquillaje-social`) - Bs. 180.00
- `Manicure Semipermanente` (`manicure-semipermanente`) - Bs. 90.00
- `Diseño de Cejas` (`diseno-de-cejas`) - Bs. 60.00
- `Peinado para Evento` (`peinado-para-evento`) - Bs. 150.00
- `Limpieza Facial Básica` (`limpieza-facial-basica`) - Bs. 120.00

No medical claims, dermatology promises, payments, emails, WhatsApp API calls, n8n calls, OpenAI calls, custom domains, or migrations were added.

## URLs

- `https://jakawi.com/studio-bella`
- `https://jakawi.com/studio-bella/p/maquillaje-social`

## SERVICE Mode Behavior

Production Seller AI smoke for `Maquillaje Social`: **PASS**

- offerType: `SERVICE`
- Quick replies: `Qué incluye`, `Duración`, `Precio`, `Disponibilidad`, `Agendar`
- No food/product chips: no `Ingredientes`, `Porción`, `Tallas`, `Colores`, `Chamarra`, or `Vestidos`
- `¿Qué incluye?`: answers preparación básica de piel and maquillaje acorde a la ocasión, without asking phone
- `¿Cuánto dura?`: answers 60 a 90 minutos, without asking phone
- `¿Sirve para una boda?`: answers boda/evento with style and schedule guidance, without asking phone
- `Quiero agendar`: asks phone to coordinate schedule with Studio Bella
- Valid phone continuation generated a `KJ-XXXX` handoff code

## Checks

All checks passed with `.env.stack` loaded:

- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npm run test --if-present`: **PASS** (`247` tests passed)
- `npm run typecheck --if-present`: **PASS**
- `npm run lint --if-present`: **PASS**
- `scripts/deploy-preflight.sh`: **PASS**

One unrelated date-sensitive manual billing test fixture was stabilized so its trial-default assertion does not expire with wall-clock time.

## Deploy

Status: **PASS**

- Docker build: **PASS**
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: **PASS**
- `docker service update --force jakawi_com_web`: **PASS**
- `jakawi_com_web` update status: **completed**
- Active container image id matched the built image id
- `https://jakawi.com/api/health`: **PASS**

## Public Smoke

- Studio Bella home: **PASS**
- Studio Bella `Maquillaje Social`: **PASS**
- Exitosos home: **PASS**
- Boutique Luna home: **PASS**

## Regressions

Exitosos MENU remains intact through tests and public smoke.

Boutique Luna PRODUCT remains intact through tests and public smoke.

## Secrets

Secrets exposed: **no**

No `.env.stack` contents, tokens, cookies, payment data, emails, WhatsApp API calls, n8n calls, or OpenAI calls were printed.
