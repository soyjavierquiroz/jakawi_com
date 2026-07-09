# Custom Domain Controlled Activation v1 Retry - Exitosos

Estado: BLOCKED

La activación controlada de `www.exitosos.com` para la tienda `javier` no se ejecutó porque el resolver runtime no cumple el requisito estricto de seguridad definido para este retry.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/custom-domain-controlled-activation-v1-retry-exitosos/20260709-214515`
- HEAD inicial: `2c54d055cb05ea4c66b1d0cda00b000b1f2e7b63`
- Working tree inicial: limpio

## Inputs autorizados

- `STORE_SLUG=javier`
- `CUSTOM_DOMAIN=www.exitosos.com`
- Owner authorized: yes
- DNS access confirmed: yes
- Dominio normalizado: `www.exitosos.com`
- No es `localhost`: sí
- No es IP: sí
- No es dominio JAKAWI reservado: sí

## Validaciones técnicas

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 127/127
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Resolver safety result

Resultado: FAIL

Checks observados:

- `CUSTOM_DOMAINS_ENABLED=false` retorna `null` temprano: PASS
- Sólo consulta `status=ACTIVE`: PASS
- Usa hostname normalizado exact match: PASS
- Bloquea hosts plataforma/reservados/locales/IP antes de consultar DB: PASS
- Sólo resuelve `type=CUSTOM_DOMAIN`: FAIL

Motivo del bloqueo:

`resolveStoreFromHost()` actualmente consulta dominios con:

```ts
type: { in: ["CUSTOM_DOMAIN", "JAKAWI_SUBDOMAIN"] }
```

El contrato de esta activación exige que, con `CUSTOM_DOMAINS_ENABLED=true`, el resolver sólo resuelva dominios:

- `type=CUSTOM_DOMAIN`
- `status=ACTIVE`
- hostname exact match normalizado

Por esa diferencia, no se activó tráfico custom y no se modificaron DB ni flags.

## DNS record observado

No se ejecutó lookup DNS en esta corrida porque el stop-rule de resolver safety falló antes de los gates de DB/DNS/activación.

Dato declarado por owner, pendiente de validar en el siguiente intento:

- `www.exitosos.com`
- CNAME
- `jakawi.com`
- Cloudflare DNS only

## DB before/after redacted

No se consultó ni modificó DB porque resolver safety falló antes del DB precheck.

- Store slug: `javier`
- Domain: `www.exitosos.com`
- Before: not checked
- After: unchanged by this run
- StoreDomain status final: unchanged / not created by this run
- `isPrimary` final: unchanged / not set by this run

## Flags finales

No se modificó `.env.stack`.

- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`

## Cloudflare / DNS / tráfico custom

- Cloudflare API llamada: no
- DNS automático: no
- Tráfico custom activado: no
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` activado: no

## Deploy

- Deploy realizado: no
- Image id: n/a
- Motivo: bloqueado por resolver safety antes de cualquier cambio runtime.

## Smoke

No ejecutado por bloqueo previo a activación.

- `jakawi.com/javier`: not run in this retry
- `www.exitosos.com`: not run in this retry
- TLS result: not run
- Custom domain smoke result: not run

## Seguridad y secretos

- Secrets exposed: no
- No se imprimió `DATABASE_URL`
- No se imprimió `SESSION_SECRET`
- No se imprimió `APP_ENCRYPTION_KEY`
- No se imprimió `CLOUDFLARE_API_TOKEN`
- No se imprimió `SMTP_PASSWORD`
- No cookies completas
- No tokens largos
- No `accessTokenEncrypted`
- No owner email completo

## Rollback

Rollback no requerido porque no hubo cambios de DB, flags ni deploy.

Si un intento futuro activa y luego requiere rollback:

1. Poner `StoreDomain www.exitosos.com` en `DISABLED` o restaurar el estado anterior documentado.
2. Restaurar `isPrimary` al valor anterior.
3. Set `CUSTOM_DOMAINS_ENABLED=false` en `.env.stack` si fue activado.
4. Mantener `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`.
5. Cargar `.env.stack` en el mismo shell.
6. Ejecutar `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`.
7. Ejecutar `docker service update --force jakawi_com_web` si el task no se recrea.
8. Validar `https://jakawi.com/api/health`.
9. Validar que `Host: www.exitosos.com` ya no resuelve storefront si flags quedan off.

## Siguiente hito recomendado

Abrir `Custom Domain Runtime Safety Fix v1` antes de reintentar activación.

El fix recomendado debe hacer que la activación controlada pueda habilitar sólo dominios `CUSTOM_DOMAIN` activos, sin habilitar simultáneamente `JAKAWI_SUBDOMAIN` ni otra clase de dominio.

Después del fix, reintentar:

- `Custom Domain Controlled Activation v1 Retry - www.exitosos.com`

Si DNS/TLS falla después del fix:

- `Cloudflare Custom Hostname Activation v1` si el problema es certificado/TLS.
- `Custom Domain Fix v1` si aparece bug funcional.
