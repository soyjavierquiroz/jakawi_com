# CRM + Email Automation Runbook

Estado: runbook operativo docs-only para `crm.jakawi.com`; no guardar credenciales ni secretos en este documento.

## 1. Accesos y responsabilidades

- No escribir credenciales, passwords, tokens, claves AWS, webhook URLs sensibles ni secrets en repo.
- Definir responsable de administrar WordPress/FluentCRM.
- Definir responsable de administrar AWS SES.
- Definir responsable de aprobar secuencias, copy y segmentacion.
- Mantener JAKAWI App como fuente de verdad; CRM solo recibe eventos/listas/tags.

## 2. Checklist post-instalación crm.jakawi.com

- [ ] HTTPS activo y sin errores de certificado.
- [ ] WordPress actualizado.
- [ ] FluentCRM Pro activo.
- [ ] FluentSMTP activo.
- [ ] AWS SES configurado.
- [ ] DKIM/SPF/DMARC revisados.
- [ ] Admin 2FA activo.
- [ ] Backups CRM separados.
- [ ] Plugins minimos.
- [ ] Login attempts limitados.
- [ ] XML-RPC desactivado si no se usa.
- [ ] Firewall/WAF activo si esta disponible.

## 3. Crear listas y tags

Listas recomendadas:

```text
JAKAWI Owners
JAKAWI Trials
JAKAWI Paid Owners
JAKAWI Onboarding
JAKAWI Leads/Signals Owners
JAKAWI Partners/Future
```

Tags recomendados:

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

Convencion:

- Usar prefijo `jakawi_*`.
- No crear tags con datos personales.
- No crear tags que contengan referencias de pago, telefonos completos o mensajes de leads.

## 4. Crear secuencia welcome owner

Secuencia minima:

- Day 0: bienvenida, link a `/app`, explicar beta asistida.
- Day 1: pedir agregar o revisar productos principales.
- Day 3: pedir configurar WhatsApp y revisar el espacio en mobile.
- Day 7: pedir revisar leads, preguntas frecuentes y ajustes.

Reglas de copy:

- No prometer ventas garantizadas.
- No prometer checkout automatico.
- No prometer emails automaticos si aun no estan activos para owners.
- No incluir passwords.
- Usar lenguaje de beta privada y soporte asistido.

## 5. Crear incoming webhook / endpoint

- Si FluentCRM permite incoming webhook, crear uno para recibir eventos de JAKAWI.
- Guardar URL fuera del repo.
- Crear secret fuera del repo.
- Si el webhook de FluentCRM no valida firma HMAC SHA-256, usar bridge protegido o plugin pequeno en WordPress.
- No pegar URL real ni secret en docs.
- Exigir idempotencia por `event_id` cuando el endpoint lo soporte.
- Mantener timeout corto y tolerar reintentos.

Headers esperados en la futura integracion:

```text
X-JAKAWI-Signature
X-JAKAWI-Timestamp
X-JAKAWI-Event-Id
```

## 6. Test manual seguro

- [ ] Crear contacto test interno.
- [ ] Enviar evento fake sin datos reales.
- [ ] Confirmar que se crea/actualiza contacto.
- [ ] Confirmar listas.
- [ ] Confirmar tags.
- [ ] Confirmar email de prueba.
- [ ] Eliminar o etiquetar test como QA.
- [ ] No usar owners reales para pruebas destructivas.
- [ ] No guardar payloads completos con PII en evidencia.

## 7. Operación diaria/semanal

Diario:

- Revisar bounces.
- Revisar unsubscribes.
- Revisar automations activas.
- Revisar failed webhook events cuando exista log en JAKAWI.
- Revisar incidentes de envio o quejas de owners.

Semanal:

- Revisar reputation SES.
- Revisar tasas de apertura/click solo como senal auxiliar.
- Revisar copy de secuencias contra feedback real.
- Revisar que tags/listas no crezcan con datos QA/demo sin etiqueta.
- Confirmar que CRM no se usa como fuente de verdad de pagos/planes.

## 8. Incidentes

SES bounce spike:

- Pausar campanas no criticas.
- Revisar dominio, DKIM/SPF/DMARC y reputation.
- Separar rebotes temporales vs permanentes.
- No reintentar masivamente sin diagnostico.

CRM caido:

- Mantener JAKAWI funcionando.
- Pausar reintentos agresivos.
- Registrar incidente y ventana afectada.
- Reconciliar eventos cuando vuelva el CRM.

WordPress comprometido:

- Aislar acceso admin.
- Rotar credenciales fuera del repo.
- Revisar usuarios admin y plugins.
- Restaurar desde backup limpio si corresponde.
- No confiar en CRM para estados de JAKAWI.

Secuencia incorrecta enviada:

- Pausar automation.
- Documentar audiencia afectada.
- Enviar correccion solo si ayuda y fue aprobada.
- Ajustar tags/listas y copy.

Webhook spam:

- Rotar secret fuera del repo.
- Activar rate limit/WAF en endpoint.
- Revisar firmas y timestamps.
- Invalidar endpoint si fue expuesto.

Unsubscribe/legal issue:

- Respetar baja inmediatamente.
- Revisar consentimiento y base legal.
- Pausar campanas relacionadas.
- Escalar a responsable legal/operativo.

## 9. Backups CRM

Respaldar:

- DB WordPress.
- `wp-content/uploads`.
- plugins/config.
- configuracion relevante de FluentCRM/FluentSMTP si la herramienta lo permite.

Requisitos:

- Destino externo.
- Acceso restringido.
- Evidencia fuera del repo.
- Restore test periodico.
- No mezclar backups CRM con dumps de JAKAWI sin plan aprobado.

## 10. Seguridad

- 2FA para wp-admin.
- Updates de WordPress, plugins y temas.
- Usuarios admin minimos.
- Plugins minimos.
- Limitar wp-admin por firewall/WAF si esta disponible.
- No XML-RPC si no se usa.
- Logs de acceso y cambios administrativos.
- Secrets fuera del repo.
- No exponer webhook URLs sensibles en documentos, issues o capturas.

## 11. Pendientes

- JAKAWI CRM Event Webhook v1.
- Password reset nativo JAKAWI.
- Verify email nativo JAKAWI.
- Bounce/complaint integration.
- Consent preferences.
- First-party audiences.
- Meta/TikTok integrations.
