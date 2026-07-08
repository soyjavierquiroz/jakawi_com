# JAKAWI Release Batch v11

Fecha UTC: 2026-07-08
Repo: `/var/opt/jakawi.com`
QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v11/20260708-230138`
Resultado: **PASS**

## Alcance

Se desplego el commit `163fab459ba9653009f5f87361d823d95dd1d759`,
correspondiente a Privacy Button Storefront Scope v1.

El boton flotante `Privacidad` ahora se muestra en el home de tienda servido
como `/{storeSlug}` y no se muestra en productos ni paginas de plataforma.

## Validaciones

| Check | Resultado |
| --- | --- |
| Working tree inicial | PASS, limpio |
| `scripts/deploy-preflight.sh` | PASS |
| `npm run test --if-present` | PASS, 100 tests |
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
- Build final `jakawi-com-web:latest`: PASS.
- Dos intentos iniciales de build recibieron SIGTERM despues de completar
  `next build`; no modificaron produccion. El intento final aislado del cliente
  termino con exit code 0.
- Image ID construido:
  `sha256:029d640dc6c666e04091e52d0cdd8c19a30fbfcc5a3e9fa0af8d0929180594c7`.
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

## Validacion de scope Privacidad

Browser: Google Chrome for Testing `149.0.7827.55`.
Viewport: `390x844`.

Se guardo consentimiento con `Solo necesarias` en el storefront antes de
validar el scope, sin habilitar marketing.

| Ruta | Privacidad visible | Check adicional | Resultado |
| --- | --- | --- | --- |
| `/qa-onboarding-store` | si | storefront visible | PASS |
| `/qa-onboarding-store/p/qa-producto-demo` | no | CTA WhatsApp visible | PASS |
| `/login` | no | pagina visible | PASS |
| `/app` | no | redirige a `/login` | PASS |
| `/` | no | landing visible | PASS |

- Screenshots generados: si, 5.
- HTML/text checks guardados: si.
- Overflow horizontal: 0 px en las cinco rutas.
- Console/page errors: 0.
- Scripts externos inesperados: 0.
- Custom-domain `/`: pendiente hasta tener una senal explicita de storefront.

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
