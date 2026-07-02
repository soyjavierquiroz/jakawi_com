# Minimal Rate Limiting v1

Fecha: 2026-07-02

## Objetivo

Reducir abuso básico antes de private beta y tráfico público más amplio en login, registro, Seller AI, uploads y tracking, sin cambiar schema, pagos, planes ni lógica comercial.

## Implementación

- Helper central: `app/src/lib/rate-limit.ts`.
- Configuración: `app/src/config/rate-limits.ts`.
- Estrategia actual: fallback in-memory process-local con `Map`.
- No se guarda IP cruda en DB.
- Las keys se derivan con SHA-256 desde IP/email/store/user/session según disponibilidad.
- Si el limiter falla internamente, opera fail-open y registra solo un warning genérico.
- Las respuestas 429 incluyen `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset`.
- El `Map` limpia buckets expirados periódicamente.

No hay dependencia Redis usable en `app/package.json`, por eso v1 no instala paquetes ni usa Redis distribuido.

## Políticas Actuales

| Política | Límite | Ventana | Key principal |
| --- | ---: | ---: | --- |
| `LOGIN` | 10 | 10 min | IP + email normalizado |
| `LOGIN_IP` | 50 | 10 min | IP |
| `REGISTER` | 5 | 1 hora | IP |
| `REGISTER_STORE_SLUG` | 3 | 1 hora | storeSlug normalizado |
| `SELLER_AI_OPENING` | 60 | 10 min | IP + storeSlug/storeId |
| `SELLER_AI_CHAT` | 30 | 1 min | IP + storeSlug + visitor/session/lead |
| `SELLER_AI_EVENTS` | 120 | 1 min | IP + storeSlug/storeId |
| `SELLER_AI_LEAD` | 20 | 10 min | IP + storeSlug + visitor/session |
| `SELLER_AI_CONTINUE_WHATSAPP` | 20 | 10 min | IP + lead/journey |
| `SELLER_VOICE_UPLOAD` | 10 | 1 hora | user + store |
| `SELLER_VOICE_UPLOAD_IP` | 30 | 1 hora | IP |
| `WHATSAPP_CLICK` | 120 | 1 min | IP + storeSlug |
| `GROWTH_REDIRECT` | 180 | 1 min | IP + source/code |

## Rutas Protegidas

- `registerAction` y `loginAction` en `app/src/lib/actions.ts`.
- `POST /api/seller-ai/opening`.
- `POST /api/seller-ai/chat`.
- `POST /api/seller-ai/events`.
- `POST /api/seller-ai/lead`.
- `POST /api/seller-ai/continue-whatsapp`.
- `POST /api/uploads/seller-voice`.
- `GET /api/whatsapp/click`.
- `GET /r/[storeSlug]`.
- `GET /partner/[code]`.
- `GET /partner/[code]/[destinationSlug]`.

## Errores

APIs:

```json
{
  "ok": false,
  "error": "RATE_LIMITED",
  "message": "Demasiadas solicitudes. Intenta nuevamente en unos minutos."
}
```

Server actions:

```text
Demasiados intentos. Intenta nuevamente en unos minutos.
```

## Cómo Probar 429

En entorno local o producción recién desplegada, usar un endpoint protegido y payload benigno con `storeSlug` inexistente para evitar crear leads o mensajes. Ejemplo con Seller AI opening:

```bash
for i in $(seq 1 65); do
  curl -i -sS https://jakawi.com/api/seller-ai/opening \
    -H 'content-type: application/json' \
    -d '{"sessionId":"rate-limit-test-session","visitorId":"rate-limit-test-visitor","storeSlug":"rate-limit-test-store-does-not-exist"}' \
    | grep -E 'HTTP/|Retry-After|X-RateLimit|RATE_LIMITED' || true
done
```

No usar `/api/health`; no está rate limited.

## Limitaciones v1

- Process-local: suficiente para una réplica web, no distribuido entre réplicas.
- Un restart del proceso limpia los contadores.
- No hay allowlist/bypass admin.
- No hay dashboard de abuso.
- No deduplica clicks legítimos de referrals; solo limita bursts.

## Pendiente

- Redis distribuido para múltiples réplicas.
- CAPTCHA si aparece abuso real en auth/registro.
- Métricas y logs estructurados de abuso.
- Allowlist/bypass administrativo si operaciones legítimas lo requieren.
