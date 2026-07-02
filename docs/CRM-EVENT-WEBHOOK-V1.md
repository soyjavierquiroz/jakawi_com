# CRM Event Webhook v1

Fecha: 2026-07-02
Repo: `/var/opt/jakawi.com`
Endpoint efectivo: `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`

## Objetivo

Implementar en JAKAWI el emisor interno de eventos server-side hacia el CRM Bridge externo, dejando el envio preparado y apagado por defecto. Esta tarea no habilita trafico real de produccion.

## Variables env

```env
CRM_WEBHOOK_ENABLED=false
CRM_WEBHOOK_URL=https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events
CRM_WEBHOOK_SECRET=
CRM_WEBHOOK_TIMEOUT_MS=5000
CRM_WEBHOOK_QA_ONLY=true
```

Estados seguros por defecto:

- `CRM_WEBHOOK_ENABLED=false` impide cualquier envio.
- `CRM_WEBHOOK_SECRET=` vacio impide enviar aunque `CRM_WEBHOOK_ENABLED=true`.
- `CRM_WEBHOOK_QA_ONLY=true` permite solo eventos marcados explicitamente como QA/internal/test.
- El secret no se expone al browser y no debe registrarse en logs, docs, commits ni outputs.

## Payload v1

El CRM Bridge validado actualmente usa contrato plano. Por compatibilidad, JAKAWI envia `event` y no `event_type`.

```json
{
  "event": "owner.registered",
  "event_id": "owner.registered:user-id:store-id",
  "email": "owner@example.com",
  "first_name": "Optional",
  "last_name": "Optional",
  "business_name": "Store name",
  "store_slug": "store-slug",
  "country": "Bolivia",
  "country_code": "BO",
  "currency": "BOB",
  "market_segment": "BOLIVIA",
  "pricing_region": "BOB",
  "payment_route": "MANUAL_BOLIVIA",
  "plan_key": "TRIAL",
  "plan_status": "TRIALING",
  "seller_ai_enabled": false,
  "product_count_bucket": "0",
  "lead_count_bucket": "0",
  "attribution_type": "QA",
  "source_flow": "QA",
  "created_at": "2026-07-02T00:00:00.000Z",
  "qa": true
}
```

## Headers y firma

El raw body firmado es exactamente el JSON enviado.

```text
Content-Type: application/json
X-JAKAWI-Event-Id: <event_id>
X-JAKAWI-Timestamp: <unix-seconds>
X-JAKAWI-Signature: sha256=<hmac_sha256(timestamp + "." + raw_json_body)>
```

## Eventos soportados/preparados

- `qa.crm_webhook.test`: evento QA manual, fake, server-side y protegido por superadmin.
- `owner.registered`: evento real equivalente a owner creado/registrado segun el contrato validado del Bridge. Esta cableado al registro, pero queda bloqueado por defecto por `CRM_WEBHOOK_ENABLED=false` y por `CRM_WEBHOOK_QA_ONLY=true`.
- `partner.activated`: preparado y cableado al alta de partner, con los mismos guards.
- `trial.started`: builder preparado, sin hook productivo automatico en v1. El Bridge validado ya deriva senales de trial desde `owner.registered` cuando `plan_key=TRIAL`.
- `onboarding.needed`: builder preparado, sin hook productivo automatico en v1.

## QA/manual sin eventos reales

1. Confirmar en WordPress CRM Bridge: `Dry Run=true`, `Allow Contact Mutation=false`, `Allow QA Events Only=true`.
2. Usar un Shared Secret rotado y guardado localmente como `CRM_WEBHOOK_SECRET`.
3. Mantener `CRM_WEBHOOK_QA_ONLY=true`.
4. Habilitar temporalmente `CRM_WEBHOOK_ENABLED=true` solo en entorno controlado.
5. Ejecutar un `POST` autenticado como superadmin contra:

```text
/api/admin/crm-webhook/qa-test
```

El evento usa email reservado `qa-crm-webhook-test@example.com`, `attribution_type=QA`, `source_flow=QA` y `qa=true`.

## Gate de produccion

Antes de activar trafico real:

- Rotar el Shared Secret en CRM Bridge.
- Guardar el nuevo secret fuerte en `.env.stack` como `CRM_WEBHOOK_SECRET`.
- Mantener `CRM_WEBHOOK_ENABLED=false` hasta activacion controlada.
- Mantener `CRM_WEBHOOK_QA_ONLY=true` hasta terminar la primera prueba controlada.
- Confirmar CRM Bridge `Dry Run=true`.
- Confirmar CRM Bridge `Allow QA Events Only=true` antes de QA.
- Solo despues evaluar trafico real.
- Desactivar `Allow QA Events Only` y `Dry Run` unicamente cuando exista una ventana de activacion aprobada.

## No real production CRM events were enabled by this task.

Esta tarea no hizo deploy, no hizo push, no registro secrets reales, no modifico Prisma y no activo eventos reales de produccion.
