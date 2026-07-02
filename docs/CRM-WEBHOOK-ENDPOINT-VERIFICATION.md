# CRM Webhook Endpoint Verification v1

Fecha de cierre: 2026-07-02
Repo: `/var/opt/jakawi.com`
CRM externo: `https://crm.jakawi.com`
Endpoint efectivo: `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`
Resultado: PASS 10/10

## 1. Resumen ejecutivo

Se cerro la verificacion del endpoint efectivo del CRM Bridge para recibir eventos de JAKAWI en el CRM externo.

El endpoint limpio `https://crm.jakawi.com/wp-json/jakawi-crm/v1/events` devuelve 404 actualmente por tema de permalinks/rewrite en WordPress. Por ahora la integracion debe usar el endpoint efectivo con `index.php`:

```text
https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events
```

La verificacion remota desde el servidor principal paso 10 de 10 checks con payloads QA fake, dry-run activo y sin mutacion de contactos.

## 2. CRM Bridge Plugin

Plugin existente en WordPress CRM:

```text
/home/crm.jakawi.com/public_html/wp-content/plugins/jakawi-crm-bridge
```

Estado confirmado del plugin:

| Item | Estado |
| --- | --- |
| Enabled | `true` |
| Dry Run | `true` |
| Allow Contact Mutation | `false` |
| Allow QA Events Only | `true` |
| Contactos FluentCRM | `0` |
| Emails enviados | `0` |
| Campanas activas | `0` |
| Secuencias activas | `0` |

## 3. Patch de compatibilidad validado

El patch de compatibilidad del CRM Bridge ya fue aplicado y validado en el CRM:

- `trim` del shared secret al guardar y validar.
- Lectura del raw body con `$request->get_body()`.
- Fallback a `php://input` cuando corresponda.
- Fingerprint seguro para diagnostico sin exponer secretos.
- Self-test admin-only con resultado PASS.
- `curl` local contra el bridge con resultado PASS.

## 4. Evidencia QA

- QA_DIR: `/var/backups/jakawi.com/qa/crm-webhook-endpoint-verification-v1/20260702-204024`
- Output final: `/var/backups/jakawi.com/qa/crm-webhook-endpoint-verification-v1/20260702-204024/evidence/crm-webhook-verification-output-after-bridge-patch.txt`
- Summary JSON: `/var/backups/jakawi.com/qa/crm-webhook-endpoint-verification-v1/20260702-204024/evidence/crm-webhook-summary.json`
- Resultado confirmado: PASS 10/10
- Summary: `total=10`, `passed=10`, `failed=[]`
- Payloads: QA fake payloads only.
- Mutacion de contactos: desactivada durante la verificacion.

## 5. Mappings confirmados

| Segmento | Lists confirmadas | Tags / senales confirmadas |
| --- | --- | --- |
| Bolivia / BOB | `JAKAWI Owners`, `JAKAWI Owners Bolivia`, `JAKAWI Trials`, `JAKAWI Onboarding`, `JAKAWI QA/Internal` | Bolivia, BOB; tags observados: `jakawi_market_bolivia`, `jakawi_country_bo`, `jakawi_currency_bob`, `jakawi_pricing_bob`, `jakawi_manual_bolivia`, `jakawi_trial`, `jakawi_trial_active`, `jakawi_onboarding_needed`, `jakawi_qa_test` |
| International / USD | `JAKAWI Owners`, `JAKAWI Owners International`, `JAKAWI Trials`, `JAKAWI Onboarding`, `JAKAWI QA/Internal` | International, USD; tags observados: `jakawi_market_international`, `jakawi_currency_usd`, `jakawi_pricing_usd_base`, `jakawi_international_base`, `jakawi_trial`, `jakawi_trial_active`, `jakawi_onboarding_needed`, `jakawi_qa_test` |
| Partner | `JAKAWI Partners`, `JAKAWI QA/Internal`; observado tambien `JAKAWI Owners Bolivia` en el summary JSON | partner lifecycle; tags observados: `jakawi_partner`, `jakawi_partner_active`, `jakawi_partner_portal_pending`, `jakawi_market_bolivia`, `jakawi_country_bo`, `jakawi_currency_bob`, `jakawi_qa_test` |

## 6. Seguridad

La clave temporal usada para QA fue visible durante la verificacion y no debe quedar como secret final de produccion.

Antes de conectar eventos reales desde JAKAWI se debe rotar el Shared Secret del plugin CRM Bridge y guardar el nuevo valor fuerte en `.env.stack` como:

```text
CRM_WEBHOOK_SECRET
```

No registrar el valor real del secret en docs, logs, commits, screenshots ni outputs compartidos.

## 7. Production Readiness Gate

Antes de habilitar eventos reales desde JAKAWI hacia el CRM:

- Rotar Shared Secret en WordPress CRM Bridge.
- Guardar el nuevo valor fuerte en `.env.stack` como `CRM_WEBHOOK_SECRET`.
- Mantener `Dry Run=true` hasta la primera prueba controlada.
- Desactivar `Allow QA Events Only` solamente cuando se vaya a activar trafico real.
- Validar que no haya mutacion accidental antes de permitir mutacion de contactos.
- Confirmar que el endpoint efectivo usado por JAKAWI sea `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`.

## 8. No changes performed

Esta tarea fue docs-only.

No se modifico app code, Prisma, Docker, deploy ni configuracion productiva. No se enviaron eventos reales y no se hizo push.

## 9. Siguiente paso sugerido

`JAKAWI CRM Event Webhook v1`
