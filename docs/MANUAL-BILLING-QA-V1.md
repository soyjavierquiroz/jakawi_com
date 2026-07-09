# Manual Billing QA v1

Fecha UTC: 2026-07-09
Repo: `/var/opt/jakawi.com`
Resultado: **WARN**
QA_DIR: `/var/backups/jakawi.com/qa/manual-billing-qa-v1/20260709-111713`

## Commit Validado

`67499c5804624ea54def2588f5a67f5768587388`

## Motivo Del WARN

Las validaciones base, unitarias, estaticas y de seguridad pasaron. La validacion visual autenticada no se ejecuto porque no habia una base local real ni sesiones QA owner/superadmin disponibles sin usar secretos o tocar datos reales.

No se fabricaron screenshots.

## Pruebas Ejecutadas

- Prisma validate: PASS con URL dummy local sin secretos.
- Prisma generate: PASS con URL dummy local sin secretos.
- `npm run test --if-present`: PASS, 109 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, 0 warnings.
- `git diff --check`: PASS.
- Secret scan de evidencia: PASS.

## Owner `/app/plan`

Resultado: PASS por validacion estatica y tests.

- Requiere auth y tienda owner mediante `requireStore()`.
- Consulta pagos con `getStorePaymentsForOwner(store.id)`.
- Muestra plan, estado, trial, vencimiento, referencia visible e instrucciones de pago manual/asistido.
- No expone notas internas.
- No permite modificar billing.
- Registros internos de monto cero quedan fuera de pagos visibles owner-facing.

## Admin `/app/admin/billing`

Resultado: PASS por validacion estatica y tests.

- Requiere `requireSuperAdmin()`.
- Owner normal no tiene ruta ni accion de update billing.
- `updateManualBillingAction` requiere superadmin antes de mutar.
- Superadmin puede actualizar plan, estado, trial, vencimiento, referencia manual visible y nota interna.
- Estados invalidos fallan.
- Fechas invalidas fallan.

## StorePayment Interno

Resultado: PASS.

- Ajuste manual se guarda con `amountCents = 0`.
- `description = "Manual Billing / Plan Ops v1"`.
- `externalReference` puede alimentar la referencia visible owner-facing.
- `notes` queda solo para admin/superadmin.
- Los ajustes internos no aparecen como pagos normales owner-facing.

## No Checkout / No Pagos Reales

Resultado: PASS.

- No checkout.
- No pasarela.
- No Stripe.
- No PayPal.
- No pagos reales.
- No payment link externo.
- No cobro automatico.
- El texto `checkout` aparece solo en copy negativo indicando que no hay checkout.

## Seguridad

Resultado: PASS.

- Owner no puede actualizar billing.
- Owner no ve notas internas.
- Owner no ve datos de otras tiendas por el patron `requireStore()`.
- Superadmin required para `updateManualBillingAction`.
- Token values exposed: no.
- Secret scan de evidencia: no encontro cookies, headers auth, tokens ni valores sensibles.

## Visual Validation

Resultado: no ejecutada.

Motivo exacto: no habia base local real ni sesion QA owner/superadmin disponible sin usar secretos o tocar datos reales.

Pendiente controlado:

- Screenshot `/app/plan` como owner QA.
- Screenshot `/app/admin/billing` como superadmin.

## Controles

- No deploy.
- No push.
- No pagos reales.
- No checkout.
- No APIs externas.
- No emails reales.
- No CRM.
- No Meta/TikTok/Google/Cloudflare.
- No CAPI QA.
- No migraciones Prisma.
- No datos reales modificados.
- No secrets expuestos.

## Siguiente Hito Recomendado

Release Batch v13. El unico WARN es falta de browser/sesion local autenticada; validar screenshots en QA controlado post-release o durante el batch.
