# Self-Service Cloudflare Custom Hostnames QA v1

Estado: WARN

Motivo del WARN: la validación funcional quedó PASS por pruebas automatizadas e inspección estática, pero no había sesión owner/superadmin segura para validación visual autenticada ni screenshots. No se fabricaron screenshots.

## QA

- QA_DIR: `/var/backups/jakawi.com/qa/self-service-cloudflare-custom-hostnames-qa-v1/20260709-233549`
- Commit validado: `0af4187adcdae91c56cb320c6762dfda6fcf2dd3`
- Deploy realizado: no
- Push realizado: no
- Datos reales modificados: no
- Cloudflare API real llamada: no
- DNS automático: no
- Tráfico custom activado: no
- Tokens/secrets exposed: no

## Validaciones base

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 144/144
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Cloudflare flag off result

PASS.

Con `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`, el cliente devuelve resultado seguro sin llamar `fetch`. El flujo owner crea/usa solicitudes e instrucciones DNS, pero no llama Cloudflare. La acción de verificar devuelve mensaje seguro cuando el flag está apagado.

## Cloudflare mock/client result

PASS.

Validado por tests con mocks:

- `createCloudflareCustomHostname()` construye request con `hostname`, `ssl.method`, `ssl.type=dv` y `min_tls_version` configurable.
- `getCloudflareCustomHostname()` / refresh usan timeout controlado.
- Hostname `active` + SSL `active` mapea como activable.
- Hostname `active` + SSL pendiente no marca `ACTIVE`.
- Respuesta failed mapea a `FAILED`.
- Errores se redactan sin `Authorization`, `Bearer` ni token.
- Instrucciones DNS extraen CNAME/TXT sin secrets.

## Owner flow result

PASS por tests e inspección.

- Owner opera únicamente dominios de su propia tienda.
- Owner puede solicitar dominio válido.
- Solicitud no queda `ACTIVE` automáticamente.
- Owner no puede marcar `ACTIVE`.
- Owner no puede marcar `primary` manualmente.
- Owner puede verificar sólo dominios propios.
- `/app/dominios` muestra CNAME esperado, TXT si existe, estado hostname, estado SSL/certificado, último check y botón “Verificar ahora”.

## Admin flow result

PASS por tests e inspección.

- `/app/admin/domains` requiere `requireSuperAdmin()`.
- Owner normal no accede a acciones admin.
- Superadmin puede ver estados y refrescar Cloudflare mediante acción explícita.
- Se muestra Cloudflare hostname id sólo redactado/parcial.
- No se expone token, header auth ni raw response privada.
- Owner email se mantiene redactado según el patrón admin existente.

## Resolver safety result

PASS.

El contrato runtime se mantiene:

- `CUSTOM_DOMAINS_ENABLED=false` retorna `null` temprano y no resuelve custom domains.
- `CUSTOM_DOMAINS_ENABLED=true` sólo resuelve `type=CUSTOM_DOMAIN`, `status=ACTIVE`, hostname exact match normalizado y tienda publicada.
- `PENDING`, `VERIFYING`, `VERIFIED`, `FAILED` y `DISABLED` no resuelven.
- `JAKAWI_SUBDOMAIN` no resuelve.
- Hosts reservados, localhost e IPs no resuelven como custom domain.

## Env/stack readiness result

PASS.

`app/.env.example` contiene placeholders sin valores reales para:

- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`
- `CUSTOM_DOMAIN_CNAME_TARGET`
- `CLOUDFLARE_CUSTOM_HOSTNAME_SSL_METHOD`
- `CLOUDFLARE_CUSTOM_HOSTNAME_MIN_TLS_VERSION`
- `CLOUDFLARE_API_TIMEOUT_MS`

`infra/docker-stack.yml` referencia las variables nuevas sin hardcodear valores reales.

## Visual/auth validation

- Visual/auth validation: no
- Screenshots: no
- Resultado: WARN visual/auth pendiente

No había sesión owner/superadmin segura disponible. Se validó por tests e inspección de auth/rutas, pero no se fabricaron screenshots.

## Seguridad y controles

- Cloudflare API real llamada: no
- DNS automático: no
- Tráfico custom activado: no
- Pagos/checkout/emails/CRM: no
- Tokens/secrets exposed: no
- `CUSTOM_DOMAINS_ENABLED` activado: no
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` activado: no

## Siguiente hito recomendado

Release Batch v17 si se acepta WARN sólo por visual/auth.
