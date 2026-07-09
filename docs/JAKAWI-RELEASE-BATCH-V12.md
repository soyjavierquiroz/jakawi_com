# JAKAWI Release Batch v12

Fecha UTC: 2026-07-09
Repo: `/var/opt/jakawi.com`
Resultado global: **PASS**
QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v12/20260709-105036`

## 1. Objetivo

Desplegar Email Delivery v1 y Email Delivery Controlled QA v1 docs manteniendo el default seguro de produccion:

```bash
EMAIL_DELIVERY_MODE=disabled
```

## 2. Commit desplegado

| Campo | Resultado |
| --- | --- |
| Commit desplegado | `f42609c5422f69e1087724cf7fd030acf68953d0` |
| Image id construido | `sha256:4259c09e804049d3dd4b9885b5fb7d7e7358dc559ab4914b1245e2049aa623d3` |
| Image id activo verificado | `sha256:4259c09e804049d3dd4b9885b5fb7d7e7358dc559ab4914b1245e2049aa623d3` |
| Service image id coincide | yes |
| Servicio | `jakawi_com_web 1/1` |
| UpdateStatus | `completed` |

## 3. Cambios incluidos

- Email Delivery v1: `fe6785c73887cd697e7d36c5cecb1e32a775a579`
- Email Delivery Controlled QA v1 docs: `f42609c5422f69e1087724cf7fd030acf68953d0`

## 4. Validaciones

| Check | Resultado |
| --- | --- |
| Working tree preflight | Limpio |
| `scripts/deploy-preflight.sh` usado | PASS |
| `.env.stack` cargado para deploy | yes |
| `npm run test --if-present` | PASS, 102 tests |
| `npm run typecheck --if-present` | PASS |
| `npm run lint --if-present` | PASS, 0 warnings |
| Prisma migrate status | PASS; database schema is up to date |
| Migraciones pendientes reales | no |
| `migrate deploy` ejecutado | no |
| Docker build | PASS |
| Docker stack deploy | PASS |
| `docker service update --force` | Ejecutado; task recreado |
| env-add manual needed | no |
| Secret scan de evidencia | PASS |

## 5. Flags finales

| Flag | Resultado |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | `false` |
| `CRM_WEBHOOK_QA_ONLY` | `true` |
| `CUSTOM_DOMAINS_ENABLED` | `false` |
| `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` | `false` |
| `META_CAPI_ENABLED` | `false` |
| `EMAIL_DELIVERY_MODE` | `disabled` |
| database url presente | yes |
| session secret presente | yes |
| app encryption key presente | yes |
| smtp password presente | no |

## 6. Smoke publico

| URL | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, database ok |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/forgot-password` | 200 |
| `https://jakawi.com/app` | 307 -> `/login` |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## 7. Email runtime smoke seguro

| Check | Resultado |
| --- | --- |
| Forgot-password page | 200 |
| Runtime `EMAIL_DELIVERY_MODE` | `disabled` |
| SMTP real usado | no |
| Emails reales enviados | no |
| external_email_sent | false |
| POST controlado | No ejecutado |
| Motivo | No habia ruta POST segura/simple para release smoke sin riesgo de capturar tokens, links o cookies completas en evidencia |
| token/link full visible | no |

## 8. Controles

- No push.
- No emails reales.
- No SMTP real.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos.
- No secrets expuestos.
- No migraciones Prisma ejecutadas.
- No `env-add` manual.

## 9. Siguiente hito recomendado

Manual Billing / Plan Ops v1, o Email SMTP QA v1 solo cuando haya proveedor/credenciales QA.
