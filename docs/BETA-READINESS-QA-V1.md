# JAKAWI - Beta Readiness QA v1

Fecha UTC: 2026-07-08 16:31-16:45 UTC
Repo: `/var/opt/jakawi.com`
Commit validado: `bc53cf0dcbd2e9e8d4768de7cba5c4d01f8daee1`
QA_DIR: `/var/backups/jakawi.com/qa/beta-readiness-qa-v1/20260708-163135`
Resultado global: **WARN**
Go/no-go beta privada: **GO CONDICIONADO**

## 1. Resumen ejecutivo

JAKAWI queda apto para una beta privada controlada, owner-led y asistida, sin checkout real, sin emails reales y sin integraciones externas activas.

El resultado es **WARN** y no **PASS** unicamente porque no hubo navegador real disponible en el host/app para capturar screenshots desktop/mobile. La validacion HTTP/HTML, runtime, owner autenticado, storefront/product, consentimiento/tracking y secret scan paso.

No se ejecuto deploy, push, APIs externas, CRM, Meta QA, TikTok API, Google, Cloudflare, CAPI QA, pagos reales, emails reales, migraciones Prisma ni cambios de codigo.

Mutaciones realizadas:

- Se creo una sesion temporal para `qa-owner-onboarding@example.com` y se elimino al final.
- Los GET publicos a storefront/product pueden registrar analytics internos de vista sobre data QA.
- No se creo data real.

## 2. Evidencia externa

La evidencia queda fuera del repo:

- Preflight git: `$QA_DIR/evidence/git-status-short.txt`, `$QA_DIR/evidence/git-head.txt`, `$QA_DIR/evidence/git-log-oneline-decorate-25.txt`
- Validaciones npm: `$QA_DIR/evidence/npm-test.txt`, `$QA_DIR/evidence/npm-typecheck.txt`, `$QA_DIR/evidence/npm-lint.txt`
- Prisma: `$QA_DIR/evidence/prisma-migrate-status.txt`
- Runtime: `$QA_DIR/evidence/health-body.json`, `$QA_DIR/evidence/docker-service-web.txt`, `$QA_DIR/evidence/runtime-flags-redacted.txt`
- HTTP publico: `$QA_DIR/evidence/http/`
- Owner autenticado: `$QA_DIR/evidence/owner/`
- Consent/tracking: `$QA_DIR/evidence/consent/`, `$QA_DIR/evidence/tracking-consent-summary.txt`
- Secret scan: `$QA_DIR/evidence/secret-scan-summary.txt`
- Visual: `$QA_DIR/evidence/visual-validation-summary.txt`

El working tree estaba limpio al inicio.

## 3. Validaciones tecnicas

| Check | Resultado | Evidencia |
| --- | --- | --- |
| `npm run test --if-present` | PASS | 96 tests, 96 pass, 0 fail |
| `npm run typecheck --if-present` | PASS | `tsc --noEmit` sin errores |
| `npm run lint --if-present` | PASS | `eslint`, 0 warnings detectados |
| Prisma migrate status | PASS | 23 migraciones; `Database schema is up to date!` |

Notas:

- Prisma se valido desde el runtime `jakawi_com_web` porque ahi resuelve `postgres:5432`.
- No se ejecuto `prisma migrate deploy`.
- Los notices de update de Prisma/npm no indican migraciones pendientes ni warning de lint.

## 4. Runtime health

| Check | Resultado |
| --- | --- |
| `https://jakawi.com/api/health` | 200, `database=ok` |
| Servicio `jakawi_com_web` | 1/1 |
| `UpdateStatus` | `completed` |
| Imagen activa | `jakawi-com-web:latest` |

Flags finales, redacted:

| Flag | Valor |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | `false` |
| `CRM_WEBHOOK_QA_ONLY` | `true` |
| `CUSTOM_DOMAINS_ENABLED` | `false` |
| `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` | `false` |
| `META_CAPI_ENABLED` | `false` |
| `EMAIL_DELIVERY_MODE` | `disabled` |
| `DATABASE_URL_present` | `yes` |
| `SESSION_SECRET_present` | `yes` |
| `APP_ENCRYPTION_KEY_present` | `yes` |

## 5. Smoke publico

| Ruta | Esperado | Resultado |
| --- | --- | --- |
| `/` | 200 | PASS, 200 |
| `/login` | 200 | PASS, 200 |
| `/registro` | 200 | PASS, 200 |
| `/app` | 307 a `/login` | PASS, 307 a `https://jakawi.com/login` |
| `/app/integraciones` | 307 a `/login` | PASS, 307 a `https://jakawi.com/login` |
| `/qa-onboarding-store` | 200 | PASS, 200 |
| `/qa-onboarding-store/p/qa-producto-demo` | 200 | PASS, 200 |

## 6. Owner authenticated QA

Sesion temporal:

- Usuario: `qa-owner-onboarding@example.com`
- Cookie/token/hash: no impresos, no guardados en evidencia.
- Cookie jar temporal: eliminado.
- Sesion temporal reciente: eliminada; conteo final `0`.

| Ruta | Resultado |
| --- | --- |
| `/app` | PASS, 200 |
| `/app/tienda` | PASS, 200 |
| `/app/productos` | PASS, 200 |
| `/app/integraciones` | PASS, 200 |
| `/app/plan` | PASS, 200 |

Checks HTML:

- Dashboard owner visible: PASS.
- Progreso/cards owner visibles: PASS.
- Producto base QA visible: PASS.
- Integraciones muestran estados owner-safe: PASS.
- Plan muestra upgrade/pagos manuales, sin checkout real: PASS.
- Strings internas ausentes del HTML capturado: `APP_ENCRYPTION_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `accessTokenEncrypted`, `Access token CAPI`, `access token`.

## 7. Storefront/product QA

| Check | Resultado |
| --- | --- |
| Tienda publica carga | PASS |
| Producto publico carga | PASS |
| WhatsApp CTA visible en HTML | PASS |
| Precio visible | PASS |
| Destacado visible | PASS |
| Scripts externos por defecto | PASS, `0` scripts externos |
| TikTok default loaded | PASS, no |
| Meta pixel/CAPI default loaded | PASS, no |
| Google default loaded | PASS, no |
| `META_CAPI_ENABLED` | PASS, `false` |

## 8. Consent/tracking safe check

| Check | Resultado |
| --- | --- |
| `/privacidad` | PASS, 200 |
| `/cookies` | PASS, 200 |
| Consent banner component referenciado | PASS |
| Default `marketing=false` | PASS por test automatizado |
| Pixel externo sin marketing | PASS, no |
| Scripts externos publicos | PASS, `0` |

## 9. Visual validation

Visual validation: **no**.

Motivo:

- No se encontro `chromium`, `chromium-browser`, `google-chrome`, `playwright` ni binario `app/node_modules/.bin/playwright`.
- No se instalaron dependencias ni browsers.
- No se bloquearon los resultados porque HTTP/HTML paso.

Estado visual: **WARN pendiente**.

## 10. Secret/token exposure

Token values exposed: **no**.

Secret scan:

- HTML capturado sin nombres internos prohibidos: PASS.
- Tokens largos `80+` en HTML capturado: `0`.
- Cookie jar restante: `0`.
- Cookies completas en evidencia: `0`.
- Flags de runtime se guardaron solo como valores esperados o `present=yes`; no se guardaron valores secretos.

## 11. Riesgos y pendientes

| Severidad | Area | Riesgo / pendiente | Bloquea beta privada |
| --- | --- | --- | --- |
| LOW | Visual QA | No hubo screenshots desktop/mobile en esta corrida por falta de browser real. | No, si se acepta WARN visual y se valida visualmente antes de abrir nuevos owners. |
| LOW | Tracking interno | Storefront/product GETs pueden registrar views internas sobre data QA. | No. |
| LOW | Operacion beta | Custom domains, Cloudflare, CRM, Meta CAPI, TikTok API, Google y emails reales siguen apagados. | No para beta asistida; si para escalamiento/marketing externo. |
| LOW | Pagos | No hay checkout real ni pagos reales en esta QA. | No, si beta mantiene pago manual. |

No se detectaron BLOCKER ni FAIL.

## 12. Recomendacion final

**GO CONDICIONADO** para beta privada controlada.

Condiciones:

- Mantener onboarding asistido.
- Mantener pagos manuales.
- Mantener CRM/Meta/TikTok/Google/Cloudflare/CAPI apagados.
- No prometer checkout, emails transaccionales ni automatizaciones externas.
- Ejecutar visual QA real con browser antes de ampliar la beta o despues de cualquier cambio UI relevante.

Siguiente hito recomendado: **Private Beta Launch Checklist v1** con evidencia por negocio real admitido.
