# JAKAWI Release Batch v13

Fecha UTC: 2026-07-09
Repo: `/var/opt/jakawi.com`
Resultado global: **WARN**
QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v13/20260709-112500`

## 1. Objetivo

Desplegar Manual Billing / Plan Ops v1 y Manual Billing QA v1 manteniendo pagos manuales/asistidos:

- no checkout
- no pasarela
- no pagos reales
- `EMAIL_DELIVERY_MODE=disabled`

## 2. Commit Desplegado

| Campo | Resultado |
| --- | --- |
| Commit desplegado | `842f743ecaeabbe554d3367c8883e817079201b3` |
| Image id construido | `sha256:adbae458aa4abf79c2948b19b8f542d4fe750549fa9d06ff11c800c0bf8dcb3d` |
| Image id activo verificado | `sha256:adbae458aa4abf79c2948b19b8f542d4fe750549fa9d06ff11c800c0bf8dcb3d` |
| Service image id coincide | yes |
| Servicio | `jakawi_com_web 1/1` |
| UpdateStatus | `completed` |
| `docker service update --force` | Ejecutado; task recreado |

## 3. Cambios Incluidos

- Manual Billing / Plan Ops v1: `67499c5804624ea54def2588f5a67f5768587388`
- Manual Billing QA v1 docs: `842f743ecaeabbe554d3367c8883e817079201b3`

## 4. Validaciones

| Check | Resultado |
| --- | --- |
| Working tree preflight | Limpio |
| `scripts/deploy-preflight.sh` usado | PASS |
| `.env.stack` cargado para deploy | yes |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npm run test --if-present` | PASS, 109 tests |
| `npm run typecheck --if-present` | PASS |
| `npm run lint --if-present` | PASS, 0 warnings |
| Prisma migrate status host | No resolvio `postgres:5432` desde host |
| Prisma migrate status runtime | PASS; database schema is up to date |
| Migraciones pendientes reales | no |
| `migrate deploy` ejecutado | no |
| Docker build | PASS |
| Docker stack deploy | PASS |
| env-add manual needed | no |
| Secret scan de evidencia | PASS |

## 5. Flags Finales

| Flag | Resultado |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | `false` |
| `CRM_WEBHOOK_QA_ONLY` | `true` |
| `CUSTOM_DOMAINS_ENABLED` | `false` |
| `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` | `false` |
| `META_CAPI_ENABLED` | `false` |
| `EMAIL_DELIVERY_MODE` | `disabled` |
| `DATABASE_URL` presente | yes |
| `SESSION_SECRET` presente | yes |
| `APP_ENCRYPTION_KEY` presente | yes |

## 6. Smoke Publico

| URL | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, database ok |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/forgot-password` | 200 |
| `https://jakawi.com/app` | 307 -> `/login` |
| `https://jakawi.com/app/plan` | 307 -> `/login` |
| `https://jakawi.com/app/admin/billing` | 307 -> `/login` |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## 7. Billing QA Post-Deploy

| Check | Resultado |
| --- | --- |
| `/app/plan` requiere auth | PASS, 307 -> `/login` |
| `/app/admin/billing` requiere auth/superadmin | PASS, 307 -> `/login` sin sesion |
| Stripe/PayPal/payment link/cobrar ahora en HTML publico | no |
| `checkout` en HTML publico | Solo copy negativo/manual: no checkout automatico |
| `tarjeta` en HTML publico | Solo copy preventivo: no compartir datos completos de tarjeta |
| Pagos reales ejecutados | no |
| Checkout ejecutado | no |
| Emails reales enviados | no |
| APIs externas | no |
| `EMAIL_DELIVERY_MODE` runtime | `disabled` |

## 8. Visual/Auth Validation

Resultado: **WARN**.

No habia sesion QA owner/superadmin segura disponible sin usar secretos o tocar datos reales. No se fabricaron screenshots.

Pendiente controlado:

- `/app/plan` autenticado como owner QA.
- `/app/admin/billing` autenticado como superadmin.

## 9. Controles

- No push.
- No pagos reales.
- No checkout.
- No Stripe.
- No PayPal.
- No SMTP real.
- No emails reales.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No secrets expuestos.
- No migraciones Prisma ejecutadas.
- No `env-add` manual.
- Token values exposed: no.

## 10. Siguiente Hito Recomendado

Billing Authenticated QA Retry si se quiere cerrar el WARN visual/auth con sesiones QA seguras; si no, Admin Beta Operations v1.
