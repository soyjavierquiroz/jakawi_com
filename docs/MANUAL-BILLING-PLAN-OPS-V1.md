# Manual Billing / Plan Ops v1

Fecha UTC: 2026-07-09
Repo: `/var/opt/jakawi.com`

## Objetivo

Dejar JAKAWI operable para beta privada asistida con estado de plan, trial, vencimiento e instrucciones de pago manual/asistido, sin checkout ni cobros automaticos.

## Alcance

- Owner ve su plan actual en `/app/plan`.
- Owner ve estado billing, trial, vencimiento, referencia visible e instrucciones de pago manual/asistido.
- Superadmin opera billing manual desde `/app/admin/billing`.
- Superadmin puede actualizar plan, estado, trial, vencimiento, referencia manual y nota interna.
- Los registros internos de billing se guardan como ajustes manuales de monto cero en `StorePayment` y no se muestran al owner.

## Que Implementa

- Reuso de campos existentes en `Store`:
  - `plan`
  - `planStatus`
  - `trialEndsAt`
  - `planRenewsAt`
  - `updatedAt`
- Reuso de `StorePayment` para referencia manual y nota interna de superadmin:
  - `externalReference`
  - `notes`
  - `description = "Manual Billing / Plan Ops v1"`
  - `amountCents = 0`
- Helper testeable en `app/src/lib/manual-billing.ts`.
- Accion server-side `updateManualBillingAction`, protegida por `requireSuperAdmin()`.
- Ruta admin `/app/admin/billing`.
- Copy owner-facing claro en `/app/plan`: pago manual/asistido y no checkout.

## Que NO Implementa

- no checkout
- no pasarela
- no pagos reales
- no emails
- no Stripe
- no PayPal
- no APIs externas
- no comprobantes/subidas de archivos
- no datos de tarjeta
- no datos bancarios sensibles

## Rutas Tocadas

- `/app/plan`
- `/app/admin/billing`
- Navegacion superadmin en `AdminNav`

## Permisos

- Owner:
  - Solo ve su propia tienda mediante `requireStore()`.
  - No puede modificar billing.
  - No ve notas internas.
- Superadmin:
  - Accede a `/app/admin/billing` mediante `requireSuperAdmin()`.
  - Puede actualizar plan, estado, trial, vencimiento, referencia manual y notas internas.

## Validaciones

- Estados permitidos: `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`.
- Fechas validadas con formato `YYYY-MM-DD`.
- Referencia manual rechaza patrones compatibles con numeros completos de tarjeta/cuenta.
- Registros internos de monto cero quedan fuera de los pagos visibles para owner.
- No se crean links de checkout ni links a pasarelas.

## Estado de Migracion

No hubo migracion Prisma. Se reutilizaron `Store` y `StorePayment`, que ya existian y cubren la persistencia minima segura para beta privada asistida.

## Validaciones Ejecutadas

- `npx prisma validate`: PASS con `DATABASE_URL` dummy local para cargar Prisma sin secretos.
- `npx prisma generate`: PASS con `DATABASE_URL` dummy local para cargar Prisma sin secretos.
- `npm run test --if-present`: PASS, 109 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, 0 warnings.

## Visual Validation

No ejecutada. No habia `DATABASE_URL` local real ni sesion QA autenticada disponible sin usar secretos.

Pendiente para Manual Billing QA v1:

- `/app/plan` autenticado como owner QA.
- `/app/admin/billing` autenticado como superadmin.

## Siguiente Hito Recomendado

Manual Billing QA v1, luego Release Batch v13.
