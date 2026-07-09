# Email Delivery v1

Fecha UTC: 2026-07-09
Repo: `/var/opt/jakawi.com`
Default seguro: `EMAIL_DELIVERY_MODE=disabled`

## 1. Objetivo

Preparar el sistema de email transaccional real para password reset y verify email, manteniendo el envio externo desactivado por defecto hasta QA controlado.

## 2. Modos soportados

| Modo | Comportamiento |
| --- | --- |
| `disabled` | No envia email. Registra solo evento controlado y mantiene el comportamiento seguro actual. |
| `log` | No envia email externo. Registra destino saneado, asunto y previews redactados. |
| `smtp` | Prepara envio SMTP por variables de entorno. Si falta configuracion o falla el transporte, devuelve error controlado y no rompe el flujo de password reset o verify email. |

## 3. Variables env

```bash
EMAIL_DELIVERY_MODE=disabled
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_SECURE=false
EMAIL_SEND_TIMEOUT_MS=5000
```

`SMTP_PASSWORD` no debe imprimirse en logs ni documentos de QA. `EMAIL_SEND_TIMEOUT_MS` usa `5000` ms por defecto si no se define.

## 4. Redaccion de tokens

Los logs de `log` y `smtp` no imprimen tokens completos ni reset/verify links completos. Los valores `token=` se reemplazan por `[redacted]` y cualquier token conocido en el contenido se reemplaza por una marca redactada.

## 5. Lo que no hace

- No emails reales enviados durante esta implementacion.
- No deploy.
- No provider configurado.
- No push.
- No APIs externas reales.
- No secrets impresos.

## 6. QA futuro

1. Activar primero `EMAIL_DELIVERY_MODE=log` en un entorno controlado y verificar asunto, destino saneado y redaccion.
2. Configurar SMTP con credenciales de QA, `SMTP_FROM`, timeout razonable y `EMAIL_DELIVERY_MODE=smtp`.
3. Ejecutar un password reset y verify email de prueba con cuentas controladas.
4. Confirmar entrega, errores controlados y ausencia de tokens completos en logs.

## 7. Siguiente hito recomendado

Email Delivery Controlled QA v1
