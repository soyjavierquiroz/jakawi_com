# QA Data Labeling/Cleanup v1

Fecha: 2026-07-02

## Objetivo

Separar datos comerciales reales de datos demo, QA e internos antes de private beta, sin borrar produccion y sin modificar pagos, planes, attribution, partners, comisiones, rewards, Seller AI, WhatsApp payloads ni tracking cookies.

## Que Problema Resuelve

Evita que `partner-demo`, `megalon`, pagos manuales de prueba, fixtures, clicks de QA, rate-limit tests y leads de prueba contaminen revenue, growth, suggested actions y metricas headline.

## Labels Usados

| Label | Uso |
| --- | --- |
| `REAL` | Dato comercial real. Es el unico label con `isCommercial = true`. |
| `DEMO` | Usuario/store/partner demo explicito o texto demo claro. |
| `QA` | Prueba, test, rate-limit, fixture o seed indicado en campos existentes. |
| `INTERNAL` | Dato interno marcado explicitamente como internal/interno. |
| `NEEDS_REVIEW` | Senal ambigua visible para operacion. No se persiste en DB. |

## DEMO

Se clasifica como `DEMO`:

- Usuario `demo@jakawi.com`.
- Store slug `megalon`.
- Partner code `partner-demo`.
- Texto con marcador claro `demo` en campos operativos.

`ejemplo` queda como `NEEDS_REVIEW` si aparece solo como slug, salvo que tenga otra evidencia demo/QA clara. `javier` no se clasifica automaticamente.

## QA

Se clasifica como `QA` cuando aparecen patrones explicitos:

- `qa`
- `test`
- `rate-limit`
- `fixture`
- `seed`
- Lead code conocido `JAK-WJFA`

Los patrones se aplican a campos existentes como notas, referencias, codigos, slugs, landing paths, descripcion, session/visitor/source de leads y metadata textual de growth clicks. No se usa IP cruda.

## Metricas Que Excluyen DEMO/QA/INTERNAL

- Revenue headline y revenue attribution.
- Store payment stats headline.
- Growth conversion summaries y top converters.
- Suggested commission/reward actions.
- Partner commission stats.
- Store referral reward stats.
- Superadmin dashboard: tiendas reales, senales reales, WhatsApp clicks reales, payments/revenue/clicks excluidos.

`NEEDS_REVIEW` aparece visible para revision. Las metricas headline usan helpers centralizados para excluir solo datos no comerciales claros (`DEMO`, `QA`, `INTERNAL`).

## Que NO Hace Este Sprint

- No borra datos.
- No cambia estados de pagos.
- No cambia planes.
- No cambia attribution.
- No modifica partners reales.
- No modifica comisiones/rewards reales.
- No toca Seller AI logic.
- No toca WhatsApp payload.
- No toca tracking cookies.
- No crea migraciones ni cambia Prisma schema.
- No implementa AWS SES, pixels, first-party audiences ni multidominio.

## Evidencia Externa

La auditoria DB se guarda fuera del repo:

```text
QA_ROOT=/var/backups/jakawi.com/qa/data-labeling-cleanup-v1
QA_DIR=$QA_ROOT/<timestamp UTC>
QA_EVIDENCE_DIR=$QA_DIR/evidence
```

Archivo esperado:

```text
$QA_EVIDENCE_DIR/data-quality-audit.txt
```

No se guardan dumps ni secretos. Emails se truncan o hashean; telefonos completos no deben imprimirse.

## Como Revisar En Superadmin

- `/app/admin/stores`: badge por tienda.
- `/app/admin/payments`: badge por pago y resumen real vs excluido.
- `/app/admin/revenue`: revenue real headline y seccion de revenue demo/QA excluido.
- `/app/admin/referrals`: badge por attribution.
- `/app/admin/partners`: badge por partner/destino.
- `/app/admin/commissions`: badge por comision.
- `/app/admin/rewards`: badge por reward.

Los registros siguen visibles y operables. El badge solo separa lectura de metricas.

## Riesgos / Limitaciones

- La clasificacion v1 es deterministica y no persistida.
- No hay override manual por registro.
- No hay filtro avanzado por label en UI.
- Los patrones textuales deben usarse con cuidado en datos reales.
- `NEEDS_REVIEW` requiere criterio operativo posterior.

## Pendientes

- Schema persistente de labels si se necesita override.
- Filtros avanzados por data quality.
- Cleanup real con aprobacion manual.
- Export CSV de datos QA.
- Redis rate limiting v2 para multiples replicas.
- Transactional Email System v1 — AWS SES.
- JAKAWI First-Party Audiences v1.
- Multi-domain v1.
- Store Ads Integrations v1 — Meta Pixel/CAPI + TikTok Pixel/Events API.
