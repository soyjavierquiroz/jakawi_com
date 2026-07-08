# JAKAWI - Beta Readiness QA v1

Fecha UTC: 2026-07-08 16:48-16:55 UTC
Repo: `/var/opt/jakawi.com`
Commit validado: `0ea61e5cc4cb1210b56077fd0193743e2347685f`
QA_DIR: `/var/backups/jakawi.com/qa/beta-readiness-qa-v1/20260708-164803`
Resultado global: **WARN**
Go/no-go beta privada: **GO CONDICIONADO**

## 1. Resumen ejecutivo

JAKAWI queda preparado para una beta privada controlada, owner-led y asistida, sin checkout real, sin emails reales y sin integraciones externas activas.

El resultado es **WARN** y no **PASS** porque no hubo navegador real disponible en el host para capturar screenshots desktop/mobile. La validacion tecnica, Prisma, runtime health, flags, smoke publico, owner autenticado, storefront/product, consentimiento/tracking y secret scan paso.

No se ejecuto deploy, push, APIs externas, CRM, Meta QA, TikTok API, Google, Cloudflare, CAPI QA, pagos reales, emails reales, secretos, migraciones Prisma ni cambios de codigo.

Mutaciones realizadas:

- Se creo una sesion temporal para `qa-owner-onboarding@example.com` y se elimino al final.
- Los GET publicos a storefront/product pueden registrar analytics internos sobre data QA.
- No se creo data real.

## 2. Evidencia externa

La evidencia queda fuera del repo:

- Preflight git: `evidence/git-status-short.txt`, `evidence/git-head.txt`, `evidence/git-log-oneline-decorate-25.txt`
- Validaciones npm: `evidence/npm-test.txt`, `evidence/npm-typecheck.txt`, `evidence/npm-lint.txt`, `evidence/npm-command-status.txt`
- Prisma: `evidence/prisma-migrate-status-runtime.txt`
- Runtime: `evidence/health.body`, `evidence/docker-service-ls-jakawi.txt`, `evidence/docker-service-ps-jakawi-com-web.txt`, `evidence/docker-service-update-status-jakawi-com-web.json`, `evidence/docker-service-image-jakawi-com-web.txt`, `evidence/runtime-flags-redacted.txt`
- Smoke publico: `evidence/public-smoke-summary.tsv` y HTML/headers saneados por ruta
- Owner autenticado: `evidence/owner/owner-route-summary.tsv`, `evidence/owner/owner-html-checks.txt`, `evidence/qa-session-create.json`, `evidence/qa-session-delete.json`
- Storefront/product: `evidence/storefront/storefront-product-checks.txt`
- Consent/tracking: `evidence/consent/consent-summary.txt`, `evidence/consent/local-consent-code-evidence.txt`, `evidence/consent/consent-banner-code-evidence.txt`
- Visual: `evidence/browser-availability.txt`
- Secret scan: `evidence/secret-scan-summary.txt`, `evidence/html-forbidden-string-scan.txt`, `evidence/cookie-value-scan.txt`, `evidence/long-token-candidates-all.txt`

El working tree estaba limpio al inicio.

## 3. Validaciones tecnicas

| Check | Resultado | Evidencia |
| --- | --- | --- |
| `npm run test --if-present` | PASS | 96 tests, 96 pass, 0 fail |
| `npm run typecheck --if-present` | PASS | `tsc --noEmit`, exit 0 |
| `npm run lint --if-present` | PASS | `eslint`, exit 0, 0 warnings observados |
| Prisma migrate status | PASS | 23 migraciones; `Database schema is up to date!` |

Notas:

- Prisma se valido desde el runtime `jakawi_com_web`, donde resuelve `postgres:5432`.
- No se ejecuto `prisma migrate deploy`.
- No hay migraciones pendientes reales.

## 4. Runtime health

| Check | Resultado |
| --- | --- |
| `https://jakawi.com/api/health` | PASS, 200, `database=ok` |
| Servicio `jakawi_com_web` | PASS, `1/1` |
| `UpdateStatus` | PASS, `completed` |
| Imagen activa | PASS, `jakawi-com-web:latest` |

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
| `/app` | 307 a `/login` | PASS, 307 a `/login` |
| `/app/integraciones` | 307 a `/login` | PASS, 307 a `/login` |
| `/qa-onboarding-store` | 200 | PASS, 200 |
| `/qa-onboarding-store/p/qa-producto-demo` | 200 | PASS, 200 |

## 6. Owner authenticated QA

Sesion temporal:

- Usuario: `qa-owner-onboarding@example.com`
- Cookie/token/hash: no impresos.
- Archivos temporales de token/hash: eliminados.
- Sesion temporal eliminada: `temporarySessionDeleted=1`, `temporarySessionRemaining=0`.

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
- Plan no muestra checkout real: PASS.
- Strings internas ausentes del HTML capturado: `APP_ENCRYPTION_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `accessTokenEncrypted`, `Access token CAPI`, `access token`.
- Candidatos de token largo en HTML owner: `0`.

## 7. Storefront/product QA

| Check | Resultado |
| --- | --- |
| Tienda publica carga | PASS |
| Producto publico carga | PASS |
| WhatsApp CTA visible en HTML | PASS |
| Precio visible | PASS |
| Destacado visible si aplica | PASS |
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
| Consent banner disponible | PASS por codigo: `ConsentBanner` esta montado en `app/src/app/layout.tsx` |
| Default `marketing=false` | PASS por helper/test local |
| Pixel externo sin `marketing=true` | PASS, no detectado en HTML publico |
| Scripts externos publicos | PASS, `0` |

Nota: el texto del banner no aparece como HTML server-rendered en `curl`; su disponibilidad queda validada por codigo local y queda pendiente de visual/browser real.

## 9. Visual validation

Visual validation: **no**.

Motivo:

- No se encontro `agent-browser`, `chromium`, `chromium-browser`, `google-chrome`, `playwright` ni `app/node_modules/.bin/playwright`.
- No se instalaron dependencias ni browsers.
- No se bloquearon los resultados porque HTTP/HTML paso.

Estado visual: **WARN pendiente**.

## 10. Secret/token exposure

Token values exposed: **no**.

Secret scan:

- HTML capturado sin strings internas prohibidas: PASS, `0` matches.
- Tokens largos candidatos en evidencia/HTML: `0`.
- Cookies completas sin redaccion en headers de evidencia: `0`.
- Archivos temporales de sesion restantes: `0`.
- Flags de runtime se guardaron solo como valores esperados o `present=yes`.
- La evidencia tiene 4 menciones conceptuales a `access token` en nombres de tests de `npm run test`; no son valores de token ni secretos.

## 11. Riesgos y pendientes

| Severidad | Area | Riesgo / pendiente | Bloquea beta privada |
| --- | --- | --- | --- |
| LOW | Visual QA | No hubo screenshots desktop/mobile en esta corrida por falta de browser real. | No, si se acepta WARN visual y se valida visualmente antes de ampliar owners. |
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

Siguiente hito recomendado: **Private Beta Launch Checklist v1**.
