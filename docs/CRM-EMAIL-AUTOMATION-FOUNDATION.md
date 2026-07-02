# JAKAWI — CRM + Email Automation Foundation v1

Fecha: 2026-07-02
Estado: arquitectura/runbook docs-only; no implementado en app todavia.
Dominio CRM: `https://crm.jakawi.com`

## 1. Decisión arquitectónica

- JAKAWI App es la fuente de verdad para auth, owners, stores, leads, pagos, planes y estados operativos.
- FluentCRM Pro en `crm.jakawi.com` maneja contactos CRM, listas, tags, secuencias y campañas.
- AWS SES sera el motor de entrega mediante FluentSMTP o configuracion equivalente.
- WordPress/FluentCRM vive fuera del servidor principal de JAKAWI y no debe bloquear la app principal.
- Si CRM falla, JAKAWI debe seguir registrando owners, leads, pagos y planes.

```text
JAKAWI App
  -> CRM Event Dispatcher
    -> Secure Webhook/API Client
      -> crm.jakawi.com / FluentCRM
        -> tags/lists/automations
          -> AWS SES delivery
```

## 2. Principios

- No duplicar fuente de verdad.
- No guardar secretos en repo.
- No enviar datos sensibles innecesarios.
- No enviar passwords, tokens, cookies ni mensajes completos de Seller AI.
- No bloquear registro/pago/leads si CRM esta caido.
- Registrar intentos/fallos en JAKAWI cuando se implemente.
- Diferenciar emails transaccionales criticos vs automation/marketing.
- Respetar privacidad/cookies/consentimiento antes de audiencias/pixeles.

## 3. Qué vive en JAKAWI

JAKAWI conserva:

- auth
- sesiones
- password reset token
- email verification token
- owner/store/product/lead/payment/plan state
- data quality labels
- revenue attribution
- suggested actions
- logs/auditoria futuros

## 4. Qué vive en FluentCRM

FluentCRM maneja:

- contactos CRM
- listas
- tags
- secuencias de onboarding
- campanas educativas
- trial nurture
- paid owner nurture
- reactivacion
- segmentacion inicial para futuras audiencias
- seguimiento manual/comercial

## 5. Emails por tipo

| Email | Owner | Canal recomendado v1 | Razón |
| ----- | ----- | -------------------- | ----- |
| Password reset | JAKAWI | Nativo JAKAWI | Cambia acceso; debe funcionar aunque CRM falle. |
| Email verification | JAKAWI | Nativo JAKAWI | Identidad y seguridad de cuenta pertenecen a la app. |
| Security/access alert | JAKAWI | Nativo JAKAWI | Evento critico de seguridad/acceso. |
| Payment confirmed | JAKAWI | Iniciado por JAKAWI | Afecta plan/revenue; CRM puede recibir copia/tag. |
| Trial expired if it changes access/plan | JAKAWI | Iniciado por JAKAWI | Puede cambiar permisos; no debe depender de WordPress. |
| Critical support/access messages | JAKAWI/Soporte | Nativo JAKAWI o soporte directo | Mensaje operativo critico; debe ser confiable y auditable. |
| Welcome sequence | Growth/Ops | FluentCRM | Educacion y onboarding no critico. |
| Owner onboarding day 0/day 1/day 3/day 7 | Growth/Ops | FluentCRM | Secuencia educativa y asistida. |
| Trial education | Growth/Ops | FluentCRM | Nurture de activacion. |
| Trial ending reminder | Growth/Ops | FluentCRM | Recordatorio comercial; no debe cambiar acceso por si solo. |
| Owner with no products reminder | Growth/Ops | FluentCRM | Activacion del owner. |
| Owner with products but no leads reminder | Growth/Ops | FluentCRM | Mejora operativa/comercial. |
| Lead received summary/nudge | Product/Ops | FluentCRM con evento JAKAWI | Nudge no critico; el lead real vive en JAKAWI. |
| Paid owner success sequence | Success/Ops | FluentCRM | Educacion post-pago. |
| Weekly insights/nurture | Success/Ops | FluentCRM | Contenido de seguimiento. |
| Re-activation | Growth/Ops | FluentCRM | Campana comercial con consentimiento/copy aprobado. |
| Newsletters | Marketing | FluentCRM later | Campana masiva; requiere consentimiento y legal. |
| Product education | Marketing/Success | FluentCRM later | Educacion no critica. |
| Partner campaigns | Partnerships | FluentCRM later | Requiere reglas comerciales y consentimiento. |
| Winback | Growth | FluentCRM later | Requiere segmentacion y baja/unsubscribe claro. |
| First-party audiences prep | Growth/Data | Later, no email directo | No activar sin consentimiento y politica aprobada. |

## 6. Eventos mínimos JAKAWI -> CRM

Contrato logico inicial:

```text
owner.registered
store.created
store.published
product.first_created
seller_ai.enabled
lead.received
payment.pending
payment.confirmed
trial.started
trial.ending
trial.expired
plan.upgraded
owner.onboarding.completed
```

Payload minimo permitido:

- `external_id`: `User.id` o `Store.id`, no secuencial si se puede evitar
- `email`
- `first_name` si existe
- `business_name`
- `store_slug`
- `country`
- `currency`
- `plan_key`
- `plan_status`
- `seller_ai_enabled`
- `lead_count_bucket`
- `product_count_bucket`
- `source`/`attribution_type` si existe
- `created_at` ISO
- `event_id` idempotente

No incluir:

- password
- token
- cookie
- session id
- full lead message
- full WhatsApp message
- sensitive payment reference
- full phone unless explicitly approved later

| Event | Trigger | Payload mínimo | Tags sugeridos | Lista sugerida | Prioridad |
| --- | --- | --- | --- | --- | --- |
| `owner.registered` | Registro de owner/store completado. | email, external_id, first_name, business_name, country, currency, plan_key, source, created_at, event_id | `jakawi_owner`, `jakawi_onboarding_needed`, country/attribution tags | JAKAWI Owners, JAKAWI Onboarding | Alta |
| `store.created` | Store creada en registro o por superadmin. | store id, email, business_name, store_slug, country, currency, plan_key, created_at, event_id | `jakawi_store_created`, `jakawi_owner` | JAKAWI Owners | Alta |
| `store.published` | Store publica lista para compartir. | store id, email, business_name, store_slug, plan_key, product_count_bucket, seller_ai_enabled, created_at, event_id | `jakawi_store_published`, `jakawi_has_products` si aplica | JAKAWI Onboarding | Media |
| `product.first_created` | Primer producto real creado por una store. | store id, email, business_name, store_slug, product_count_bucket, plan_key, created_at, event_id | `jakawi_has_products` y remover/evitar `jakawi_no_products` | JAKAWI Onboarding | Media |
| `seller_ai.enabled` | Owner activa Seller AI o plan habilita uso. | store id, email, business_name, store_slug, plan_key, seller_ai_enabled, created_at, event_id | `jakawi_seller_ai_enabled`, plan tag | JAKAWI Owners | Media |
| `lead.received` | Lead accionable o senal comercial relevante. | store id, email owner, business_name, store_slug, lead_count_bucket, plan_key, created_at, event_id | `jakawi_received_lead` | JAKAWI Leads/Signals Owners | Alta |
| `payment.pending` | Pago manual registrado como pendiente. | store id, email, business_name, store_slug, plan_key, plan_status, currency, created_at, event_id | `jakawi_payment_pending` | JAKAWI Owners | Media |
| `payment.confirmed` | Pago manual confirmado por superadmin. | store id, email, business_name, store_slug, plan_key, plan_status, currency, attribution_type, created_at, event_id | `jakawi_payment_confirmed`, `jakawi_paid`, plan tag | JAKAWI Paid Owners | Alta |
| `trial.started` | Trial creado o normalizado. | store id, email, business_name, store_slug, plan_key, plan_status, created_at, event_id | `jakawi_trial`, `jakawi_trial_active` | JAKAWI Trials | Alta |
| `trial.ending` | Trial cerca de vencer. | store id, email, business_name, store_slug, plan_key, plan_status, product_count_bucket, lead_count_bucket, created_at, event_id | `jakawi_trial`, `jakawi_trial_active` | JAKAWI Trials | Media |
| `trial.expired` | Trial vencido. | store id, email, business_name, store_slug, plan_key, plan_status, created_at, event_id | `jakawi_trial_expired` | JAKAWI Trials | Alta |
| `plan.upgraded` | Plan cambia a pago/superior. | store id, email, business_name, store_slug, plan_key, plan_status, seller_ai_enabled, created_at, event_id | `jakawi_paid`, plan tag | JAKAWI Paid Owners | Alta |
| `owner.onboarding.completed` | Operador marca onboarding completado. | store id, email, business_name, store_slug, plan_key, product_count_bucket, seller_ai_enabled, created_at, event_id | `jakawi_onboarding_completed` | JAKAWI Onboarding | Media |

## 7. Tags iniciales en FluentCRM

```text
jakawi_owner
jakawi_trial
jakawi_trial_active
jakawi_trial_expired
jakawi_paid
jakawi_plan_basic
jakawi_plan_pro
jakawi_plan_premium
jakawi_store_created
jakawi_store_published
jakawi_has_products
jakawi_no_products
jakawi_seller_ai_enabled
jakawi_received_lead
jakawi_payment_pending
jakawi_payment_confirmed
jakawi_onboarding_needed
jakawi_onboarding_completed
jakawi_partner_attributed
jakawi_store_referral_attributed
jakawi_bolivia
```

Listas iniciales:

```text
JAKAWI Owners
JAKAWI Trials
JAKAWI Paid Owners
JAKAWI Onboarding
JAKAWI Leads/Signals Owners
JAKAWI Partners/Future
```

## 8. Secuencias mínimas

1. Welcome / Owner Onboarding

- day 0: bienvenida y link a `/app`
- day 1: agrega productos
- day 3: configura WhatsApp y revisa mobile
- day 7: revisa leads y ajustes

2. Trial Activation

- trial started
- no products reminder
- first product encouragement
- trial ending
- trial expired

3. Paid Owner Success

- payment confirmed
- how to get first leads
- how to improve products/photos
- weekly check-in

4. Lead Nudge

- lead received
- revisar leads
- responder rapido por WhatsApp
- ajustar preguntas frecuentes

## 9. Seguridad de webhooks

- Usar `CRM_WEBHOOK_URL`.
- Usar `CRM_WEBHOOK_SECRET`.
- Firmar payload con HMAC SHA-256.
- Enviar header `X-JAKAWI-Signature`.
- Enviar header `X-JAKAWI-Timestamp`.
- Enviar header `X-JAKAWI-Event-Id`.
- Rechazar replay por timestamp si FluentCRM/endpoint intermedio lo soporta.
- En JAKAWI, futuro retry con backoff.
- Usar timeout corto.
- Fail-open: si CRM falla, no romper registro/pago/leads.
- No loggear payload completo si contiene PII.
- Idempotencia por `event_id`.

Nota: si FluentCRM incoming webhook no valida HMAC de forma nativa, usar un endpoint intermedio protegido o plugin pequeno en WordPress antes de pasar a FluentCRM.

## 10. Configuración recomendada en CRM

- WordPress actualizado.
- FluentCRM Pro activo.
- FluentSMTP configurado.
- AWS SES conectado.
- Dominio/email verificado.
- DKIM/SPF/DMARC revisados.
- From name: JAKAWI.
- From email recomendado:
- `hola@jakawi.com` o `soporte@jakawi.com` para relacion humana.
- `no-reply@jakawi.com` solo para mensajes automaticos donde no se espera respuesta.
- Reply-to: `soporte@jakawi.com`.
- wp-admin protegido con 2FA.
- usuarios admin minimos.
- backups CRM separados.
- firewall/WAF si disponible.
- desactivar XML-RPC si no se usa.
- limitar login attempts.
- no usar plugins innecesarios.

## 11. Configuración AWS SES

- Verificar dominio `jakawi.com` o subdominio dedicado.
- Configurar DKIM.
- Configurar SPF.
- Configurar DMARC.
- Sacar SES de sandbox.
- Revisar region elegida.
- Configurar bounce/complaint handling.
- No mezclar correos masivos con transaccionales criticos sin segmentacion.
- Monitorear reputation.

No guardar claves AWS en repo.

## 12. Modelo futuro en JAKAWI

Tabla futura propuesta:

```text
CrmEventLog
- id
- eventType
- eventId
- status
- attempts
- relatedUserId
- relatedStoreId
- relatedLeadId
- relatedPaymentId
- payloadHash
- lastError
- sentAt
- createdAt
- updatedAt
```

Config/env futura propuesta:

```text
CRM_INTEGRATION_ENABLED
CRM_WEBHOOK_URL
CRM_WEBHOOK_SECRET
CRM_WEBHOOK_TIMEOUT_MS
CRM_WEBHOOK_MAX_RETRIES
```

## 13. Primer sprint técnico sugerido

Despues de este documento:

`JAKAWI CRM Event Webhook v1`

Debe implementar:

- env vars
- helper `crm-events.ts`
- no dependencia fuerte
- event log si se aprueba migracion
- eventos iniciales: `owner.registered`, `store.created`, `payment.confirmed`, `lead.received`
- fail-open
- QA con endpoint mock antes de CRM real

## 14. Qué NO activar todavía

- No audiencias publicitarias todavia.
- No Meta/TikTok Pixel todavia.
- No subir customer lists todavia.
- No enviar leads de tiendas a audiencias JAKAWI.
- No usar CRM como fuente de plan/payment truth.
- No depender de WordPress para password reset.
- No abrir campanas masivas sin legal/consentimiento.

## 15. Decisiones abiertas

- ¿Usar `crm.jakawi.com` o endpoint intermedio tipo `events.jakawi.com`?
- ¿Qué email remitente sera oficial?
- ¿SES region?
- ¿Quién administra WordPress?
- ¿Cómo se haran backups CRM?
- ¿Qué secuencias se activan primero?
- ¿Se usara FluentCRM incoming webhooks directo o un bridge validado?
- ¿Se sincroniza telefono completo o solo email al inicio?

## 16. Criterios GO para implementación técnica

GO si:

- CRM responde por HTTPS.
- FluentCRM Pro activo.
- FluentSMTP/AWS SES configurado.
- From/reply-to definido.
- Webhook o API path definido.
- Secret creado fuera del repo.
- Politica de PII aceptada.
- Secuencias iniciales definidas.

NO-GO si:

- CRM no tiene HTTPS.
- WordPress admin no esta protegido.
- SES no esta listo o esta en sandbox sin plan.
- No hay secret/endpoint seguro.
- Se pretende enviar passwords/tokens/cookies.
- El CRM seria fuente de verdad en vez de JAKAWI.
