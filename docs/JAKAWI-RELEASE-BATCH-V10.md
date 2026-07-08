# JAKAWI Release Batch v10

Fecha UTC: 2026-07-08
Repo: `/var/opt/jakawi.com`
QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v10/20260708-224429`
Resultado: **PASS**

## Alcance

Se desplego el commit `cff10a555b762312ecf0a5fd351dde046ef7728d`,
correspondiente a Privacy Floating CTA Mobile Polish v1.

El cambio incluido sube el boton flotante `Privacidad` en mobile cuando existe
el CTA sticky de producto `Consultar por WhatsApp`, manteniendo ambos controles
visibles y accesibles.

## Validaciones

| Check | Resultado |
| --- | --- |
| Working tree inicial | PASS, limpio |
| `scripts/deploy-preflight.sh` | PASS |
| `npm run test --if-present` | PASS, 96 tests |
| `npm run typecheck --if-present` | PASS |
| `npm run lint --if-present` | PASS |
| Lint warnings final | 0 |

## Prisma

`npx prisma migrate status` se ejecuto desde el contenedor runtime de
`jakawi_com_web`.

- Migraciones encontradas: 23.
- Estado: `Database schema is up to date!`
- Migraciones pendientes reales: no.
- `prisma migrate deploy`: no ejecutado.

## Deploy

- `.env.stack` cargado antes de `docker stack deploy`: si.
- Build `jakawi-com-web:latest`: PASS.
- Image ID construido:
  `sha256:9c300dc4b025e18b353435dd80a18ae4588613df79404d0ab50341ddd11acf74`.
- `docker stack deploy --resolve-image never`: PASS.
- El task no se recreo con `stack deploy`; se uso
  `docker service update --force jakawi_com_web`.
- Service final: `jakawi_com_web 1/1`.
- UpdateStatus final: `completed`.
- Image ID activo coincide con el build: si.
- Env-add manual needed: no.

## Smoke publico

| Ruta | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, `database=ok` |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/app` | 307 a `/login` |
| `https://jakawi.com/app/integraciones` | 307 a `/login` |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## Visual post-deploy

- Browser: Google Chrome for Testing `149.0.7827.55`.
- Viewport: `390x844`.
- Ruta: `/qa-onboarding-store/p/qa-producto-demo`.
- Banner cerrado con `Solo necesarias`: si.
- Boton `Privacidad` visible: si.
- CTA `Consultar por WhatsApp` visible: si.
- Solapamiento corregido: si.
- Separacion observada entre `Privacidad` y el sticky: 19 px.
- Overflow horizontal grave: no, 0 px.
- Console/page errors criticos: 0.
- Scripts externos inesperados: 0.
- Screenshot generado: si.
- Screenshot:
  `evidence/screenshots/product-mobile-after-deploy.png`.

## Flags finales

- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `META_CAPI_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- `DATABASE_URL_present=yes`
- `SESSION_SECRET_present=yes`
- `APP_ENCRYPTION_KEY_present=yes`

## Seguridad y controles

- Token values exposed: no.
- No push.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos.
- No emails reales.
- No secrets impresos.
- No migraciones Prisma ejecutadas.
- No `docker service update --env-add`.

## Siguiente hito recomendado

Second Private Owner Onboarding v1.
