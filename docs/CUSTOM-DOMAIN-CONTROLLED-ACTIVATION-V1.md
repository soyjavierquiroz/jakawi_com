# Custom Domain Controlled Activation v1

Estado: BLOCKED

La activación controlada no se ejecutó porque faltan los datos obligatorios para activar un dominio personalizado real autorizado.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/custom-domain-controlled-activation-v1/20260709-213610`
- HEAD inicial: `ff8f2d2e5533ebe23cc0f04e3bdc6f86d226ef53`
- Working tree inicial: limpio

## Inputs requeridos

- `STORE_SLUG`: missing
- `CUSTOM_DOMAIN`: missing
- `OWNER_AUTHORIZED`: missing, requerido `yes`
- `DNS_ACCESS_CONFIRMED`: missing, requerido `yes`

Resultado de validación de inputs: BLOCKED

No se inventó dominio, no se usó dominio QA falso y no se activaron flags.

## Alcance ejecutado

- Preflight git: sí
- Validación de inputs: sí
- Validaciones técnicas completas: no, bloqueadas por inputs faltantes
- DB precheck: no
- DNS check: no
- Deploy realizado: no
- Modificación de `.env.stack`: no
- Modificación de DB: no

## Resolver safety result

No evaluado en esta corrida porque la activación quedó bloqueada antes de cualquier cambio técnico.

Siguiente intento debe validar que, con `CUSTOM_DOMAINS_ENABLED=true`, el resolver sólo resuelva dominios con:

- `type=CUSTOM_DOMAIN`
- `status=ACTIVE`
- hostname exact match normalizado
- ningún dominio `PENDING`, `VERIFYING`, `VERIFIED`, `FAILED` o `DISABLED`
- ningún dominio JAKAWI reservado

## DB state before/after redacted

No consultado ni modificado por falta de inputs autorizados.

- Before: not checked
- After: unchanged by this run
- StoreDomain final status: not changed
- `isPrimary` final: not changed

## DNS check result

No ejecutado. Falta `CUSTOM_DOMAIN` real y `DNS_ACCESS_CONFIRMED=yes`.

## Cloudflare

- Cloudflare API llamada: no
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` final: unchanged, expected `false`
- No se imprimieron tokens ni IDs privados.

## Flags finales esperados

Como no hubo activación:

- `CUSTOM_DOMAINS_ENABLED`: unchanged, expected `false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`: unchanged, expected `false`

## Validaciones

No ejecutadas por stop-rule de inputs faltantes:

- Prisma validate: not run
- Prisma generate: not run
- Tests: not run
- Typecheck: not run
- Lint: not run

## Smoke

No ejecutado porque no hubo deploy ni dominio real autorizado.

- Custom domain smoke result: not run
- Fallback `jakawi.com/$STORE_SLUG` result: not run

## Seguridad y secretos

- Secrets exposed: no
- No `DATABASE_URL`
- No `SESSION_SECRET`
- No `APP_ENCRYPTION_KEY`
- No cookies completas
- No tokens largos
- No `accessTokenEncrypted`
- No owner email completo

## Rollback

Rollback no requerido porque no hubo cambios de runtime ni DB.

Si un intento futuro llega a modificar estado y requiere rollback:

1. Set `StoreDomain.status` a `DISABLED` o al estado anterior documentado.
2. Restaurar `isPrimary` al valor anterior documentado.
3. Set `CUSTOM_DOMAINS_ENABLED=false` si fue activado.
4. Mantener `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false` salvo autorización explícita Cloudflare.
5. Cargar `.env.stack` en el mismo shell.
6. Ejecutar `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`.
7. Forzar `docker service update --force jakawi_com_web` si el task no se recrea.
8. Validar `/api/health`, fallback slug y que el dominio custom ya no resuelve storefront.

## Controles de alcance

- No push: sí
- No deploy: sí
- No DB writes: sí
- No flags changed: sí
- No Cloudflare API: sí
- No DNS automático: sí
- No pagos: sí
- No checkout: sí
- No emails reales: sí
- No SMTP real: sí
- No CRM: sí
- No Meta/TikTok/Google: sí
- No CAPI QA: sí

## Siguiente hito recomendado

Reintentar `Custom Domain Controlled Activation v1` sólo cuando existan valores reales y autorizados:

```bash
STORE_SLUG="<slug_real>"
CUSTOM_DOMAIN="<dominio_real>"
OWNER_AUTHORIZED="yes"
DNS_ACCESS_CONFIRMED="yes"
```

Si el próximo intento pasa inputs y luego falla en runtime/DNS, abrir `Custom Domain Fix v1`.
