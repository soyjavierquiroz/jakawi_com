# JAKAWI Release Batch v14

Fecha UTC: 2026-07-09  
Resultado: **WARN**

El release se desplegó y pasó las validaciones técnicas, de runtime, convergencia, smoke público, protección de ruta, read-only y exposición de secretos. El único pendiente es la validación visual/autenticada de `/app/admin/beta`: no había una sesión superadmin segura reutilizable ni navegador CLI disponible, por lo que no se intentó login ni se fabricó un screenshot.

## Trazabilidad

- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v14/20260709-125936`
- Commit desplegado: `01448ce484de9e8256ed95b3acd12cdf039f9856`
- Image ID construido y activo: `sha256:186046e90a88af0331cf4fd373d639083ef13e1ea389712acfa6f871dea253bf`
- Cambios incluidos:
  - Admin Beta Operations v1: `4dc9d4f3b7bbc87057bf97c7980b94ee2514a915`
  - Admin Beta Operations QA v1: `01448ce484de9e8256ed95b3acd12cdf039f9856`
- `scripts/deploy-preflight.sh`: PASS
- `.env.stack` cargado antes de `docker stack deploy`: sí
- `env-add` manual: no
- Push: no

## Validaciones

| Control | Resultado |
| --- | --- |
| Prisma validate | PASS |
| Prisma generate | PASS |
| Tests | PASS, 117/117 |
| Typecheck | PASS |
| Lint | PASS, 0 warnings |
| Prisma migrate status desde runtime | PASS, 23 migraciones, schema al día |
| Prisma migrate deploy ejecutado | No; no había migraciones pendientes |
| Docker build | PASS |
| Servicio `jakawi_com_web` | PASS, 1/1 |
| UpdateStatus | PASS, completed |
| Image ID activo vs build | PASS, coincide |
| Secret scan de evidencia | PASS |

El primer intento host-side de `prisma validate` devolvió P1012 porque esa subshell no tenía `DATABASE_URL` cargada. Se repitió con `.env.stack` cargado en la misma shell y pasó. La comprobación de migraciones se hizo read-only dentro del runtime, donde `postgres:5432` es resoluble.

`docker stack deploy` conservó inicialmente el mismo task ID, por lo que se ejecutó `docker service update --force jakawi_com_web`. El servicio convergió a 1/1 con `UpdateStatus=completed` y el contenedor activo usa exactamente el image ID construido.

## Smoke público

| Ruta | Esperado | Resultado |
| --- | --- | --- |
| `/` | 200 | PASS |
| `/api/health` | 200, database ok | PASS |
| `/login` | 200 | PASS |
| `/registro` | 200 | PASS |
| `/forgot-password` | 200 | PASS |
| `/app` | 307 a `/login` | PASS |
| `/app/plan` | 307 a `/login` | PASS |
| `/app/admin/billing` | 307 a `/login` | PASS |
| `/app/admin/beta` | 307 a `/login` | PASS |
| `/qa-onboarding-store` | 200 | PASS |
| `/qa-onboarding-store/p/qa-producto-demo` | 200 | PASS |

## Admin Beta post-deploy

- Protección sin sesión: PASS; `307` a `https://jakawi.com/login`.
- `requireSuperAdmin()` se ejecuta antes de consultar snapshots: sí.
- Datos admin renderizados públicamente: no.
- Ruta y loader read-only: sí; solo `findMany` y `groupBy`, sin llamadas Prisma de mutación.
- Valores de tokens expuestos: no.
- Emails completos de owners expuestos públicamente: no.
- `accessTokenEncrypted` seleccionado o expuesto: no.
- Notas internas de billing seleccionadas o expuestas: no.
- Escrituras DB ejecutadas por Admin Beta: no.
- Integraciones activadas: no.
- Checkout o pagos reales: no.
- Validación visual/auth superadmin: no, WARN.
- Screenshot autenticado: no; no se fabricó evidencia.

## Flags finales del runtime

```text
DATABASE_URL_present=yes
SESSION_SECRET_present=yes
APP_ENCRYPTION_KEY_present=yes
CRM_WEBHOOK_ENABLED=false
CRM_WEBHOOK_QA_ONLY=true
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
EMAIL_DELIVERY_MODE=disabled
```

Los valores secretos no se imprimieron ni se guardaron. Solo se registró presencia para variables sensibles.

## Controles de alcance

- No pagos reales.
- No checkout.
- No emails reales ni SMTP real.
- No APIs externas ni activación de integraciones.
- No CRM.
- No Meta, TikTok, Google, Cloudflare ni CAPI QA.
- No modificación de datos reales.
- No migraciones Prisma ejecutadas.
- No secretos en evidencia.
- No push.

## Siguiente hito recomendado

- Product/Storefront UX v2; o
- Billing/Admin Authenticated QA Retry si aparece una sesión superadmin segura.
