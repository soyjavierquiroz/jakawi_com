# Password Reset + Verify Email v1

## Objetivo

Implementar recuperacion de password y verificacion de email nativas para owners/admins de JAKAWI, sin CRM, multidominio, Pixel, CAPI, Cloudflare, pagos, deploy, push ni envio real de emails.

## Rutas nuevas

- `/forgot-password`: solicita recuperacion por email con respuesta generica.
- `/reset-password?token=...`: permite definir un nuevo password con token valido.
- `/verify-email?token=...`: consume el token y marca el email como verificado.
- `/login`: incluye link a recuperacion y mensaje de exito post-reset.

## Prisma

Migracion local creada:

- `app/prisma/migrations/000020_add_auth_tokens/migration.sql`

Cambios:

- `User.emailVerifiedAt DateTime?`
- `AuthTokenType`: `PASSWORD_RESET`, `EMAIL_VERIFY`
- `AuthToken`:
  - `id`
  - `userId`
  - `type`
  - `tokenHash`
  - `expiresAt`
  - `usedAt`
  - `createdAt`

Indices:

- `AuthToken_tokenHash_key`
- `AuthToken_userId_type_idx`
- `AuthToken_expiresAt_idx`

No aplicar `prisma migrate deploy` en produccion sin aprobacion explicita.

## Env vars

Agregadas en `app/.env.example`:

```env
APP_BASE_URL=https://jakawi.com
EMAIL_DELIVERY_MODE=disabled
```

`EMAIL_DELIVERY_MODE=disabled` es el default seguro. No envia emails reales.

Modos previstos:

- `disabled`: prepara el evento y no envia.
- `log`: no envia; puede mostrar URL completa solo con `EMAIL_QA_LOG_TOKENS=true` y fuera de produccion.
- `smtp` / `provider`: reservados para un mailer seguro futuro; hoy no envian.

## Seguridad de tokens

- Token random fuerte con `randomBytes(32).toString("base64url")`.
- Se persiste solo `tokenHash` SHA-256.
- Tokens de password reset expiran en 30 minutos.
- Tokens de verificacion de email expiran en 24 horas.
- Tokens son de uso unico mediante `usedAt`.
- Solicitud de reset no revela si el email existe.
- Password nuevo usa el hash seguro existente del repo (`bcryptjs`, costo 12).
- Reset exitoso invalida sesiones existentes del usuario borrando registros `Session` por `userId`.
- Rate limit basico reutiliza el mecanismo existente para reset por IP/email e IP.

## Como probar sin enviar email real

Default seguro:

```bash
EMAIL_DELIVERY_MODE=disabled
```

QA local/controlada, sin envio real:

```bash
EMAIL_DELIVERY_MODE=log
EMAIL_QA_LOG_TOKENS=true
NODE_ENV=development
```

Ese modo permite ver el link completo localmente. No usarlo en produccion. No guardar tokens completos en docs, tickets, commits ni logs productivos.

Validacion local recomendada:

```bash
cd /var/opt/jakawi.com/app
npx prisma validate
npx prisma generate
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

## Pendiente

- Conectar un mailer real seguro despues de aprobar proveedor, dominio remitente, plantillas y politica de logs.
- Ejecutar `prisma migrate deploy` en produccion solo con aprobacion y ventana controlada.
- Agregar UI autenticada para reenviar verificacion si se decide exponerla a owners.

## Siguiente hito

Multi-domain Foundation v1.
