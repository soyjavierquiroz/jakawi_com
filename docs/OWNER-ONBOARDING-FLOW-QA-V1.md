# Owner Onboarding Flow QA v1

## Resultado

WARN - El flujo owner principal queda validado con data QA controlada. User, Store, dashboard, configuracion basica, producto y storefront respondieron correctamente. Se marca WARN porque la validacion uso un workaround seguro con Prisma desde el contenedor web existente y porque los GET publicos del storefront registran analytics internos.

## Contexto

- Fecha UTC: 2026-07-03T02:51:52+00:00
- Repo: `/var/opt/jakawi.com`
- Branch: `main`
- HEAD: `e6cef2932255eb867b1202cc68129210351f9093`
- QA_DIR: `/var/backups/jakawi.com/qa/owner-onboarding-flow-qa-v1/20260703-024640`
- Deploy: no ejecutado
- Push: no ejecutado
- Prisma migrate: no ejecutado
- Schema: sin cambios
- Docker: sin cambios de configuracion, imagenes, servicios o ciclo de vida; se uso `docker exec` solo como runtime existente para QA

## Data QA

- Email owner: `qa-owner-onboarding@example.com`
- Nombre: `QA Owner`
- Tienda: `QA Onboarding Store`
- Slug tienda: `qa-onboarding-store`
- Producto: `QA Producto Demo`
- Slug producto: `qa-producto-demo`
- Precio: `123`
- Moneda: `BOB`
- Pais: `Bolivia`
- Telefono/WhatsApp: valor fake QA requerido por formato, sin uso externo

## CRM

- Antes: `CRM_WEBHOOK_ENABLED=false`, `CRM_WEBHOOK_QA_ONLY=true`
- Despues: `CRM_WEBHOOK_ENABLED=false`, `CRM_WEBHOOK_QA_ONLY=true`
- Resultado CRM en alta QA: `sent=false`, `reason=disabled`
- No se envio CRM externo.

## Inspeccion segura

- `registerAction` valida campos owner, crea `User`, crea `Store`, crea atribucion interna, intenta CRM via `sendOwnerCrmEvent`, crea sesion y redirige a `/app`.
- No se encontro envio real de email en el camino de registro.
- No se ejecuto pago real.
- La creacion de producto sin imagen evita storage externo.
- Storefront publico ejecuta `trackEvent` en GET para `STORE_VIEW` y `PRODUCT_VIEW`; se documento como mutacion interna esperada.

## Flujo Validado

1. Registro owner QA
   - Se busco data existente por email/slug exactos: no existia.
   - Se creo `User` con email `qa-owner-onboarding@example.com`.
   - Se creo `Store` con slug `qa-onboarding-store`.
   - Plan inicial: `TRIAL`, status `TRIALING`.
   - CRM quedo apagado y sin envio.

2. Login/session
   - Se creo sesion QA controlada en DB para el owner exacto.
   - `/app` respondio `200`.
   - Texto esperado encontrado: `Hola`, `QA`, `Siguiente paso recomendado`, `Tu espacio comercial`.

3. Dashboard inicial
   - Dashboard owner accesible.
   - Renderizo cards/resumen inicial y siguiente paso recomendado.

4. Configuracion tienda
   - Se persistieron solo campos QA de la tienda: nombre, slug, descripcion, tagline, pais, moneda, locale/timezone y WhatsApp fake.
   - `/app/tienda` respondio `200`.
   - Texto esperado encontrado: `Mi espacio`, `QA Onboarding Store`, `Informacion basica`.

5. Producto QA
   - Se creo `QA Producto Demo`.
   - Precio persistido: `12300` centavos (`Bs. 123.00`).
   - Producto visible y destacado.
   - `/app/productos` respondio `200`.
   - Texto esperado encontrado: `Catalogo`, `QA Producto Demo`, `Bs. 123.00`.

6. Storefront
   - `/qa-onboarding-store` respondio `200`.
   - `/qa-onboarding-store/p/qa-producto-demo` respondio `200`.
   - Producto renderizo con placeholder local `placeholder-product.svg`.
   - No se hicieron clicks de WhatsApp.
   - No se ejecuto Seller AI con datos reales.

7. Limpieza
   - Decision: conservar data QA etiquetada para futuras pruebas.
   - No se borro data real.
   - Mutaciones realizadas solo sobre email/slug/producto QA exactos.

## Estado Final QA

- User: existe, role `OWNER`.
- Store: existe, owner `qa-owner-onboarding@example.com`, `isPublished=true`, `countryCode=BO`, `currency=BOB`.
- Product: existe, `isVisible=true`, `isFeatured=true`.
- Session QA: creada para validar rutas autenticadas.
- Analytics internos registrados por GET publico durante QA:
  - `STORE_VIEW`: 2
  - `PRODUCT_VIEW`: 2

## Evidencia Principal

- Preflight git: `$QA_DIR/evidence/git-state.txt`
- CRM antes: `$QA_DIR/evidence/crm-env-redacted-before.txt`
- Mapa codigo onboarding: `$QA_DIR/evidence/owner-onboarding-code-map.txt`
- Creacion/reuso data QA: `$QA_DIR/evidence/qa-data-create.json`
- HTTP flow summary: `$QA_DIR/evidence/http-flow-summary.json`
- DB final state: `$QA_DIR/evidence/db-final-state.json`
- CRM despues: `$QA_DIR/evidence/crm-env-redacted-after.txt`

## Tests y Typecheck

- `npm run test --if-present`: PASS
  - 6 tests, 6 pass, 0 fail.
  - Incluye cobertura de `CRM_WEBHOOK_ENABLED=false does not send`.
- `npm run typecheck --if-present`: PASS
  - `tsc --noEmit` sin errores.
- Lint: no ejecutado; no era requerido y se priorizo test/typecheck.

## Hallazgos

- El flujo owner core queda operativo con data QA controlada.
- El registro real depende de Server Actions y cookies de Next; para evitar credenciales expuestas y mantener control, la QA creo data por Prisma usando el contenedor web existente.
- Storefront publico registra analytics internos al hacer GET.
- Las CTAs de WhatsApp renderizan hrefs internos, pero no fueron clickeadas.

## Riesgos

- La validacion no ejercito el POST real de `registerAction`; ejercito su equivalente de persistencia con Prisma y valido el render real por HTTP.
- La sesion QA queda activa hasta su expiracion si no se limpia en una futura corrida.
- Los analytics QA permanecen asociados a la tienda QA.

## Pendientes

- Agregar una ruta/metodo QA oficial para onboarding owner end-to-end sin depender de scripts externos.
- Definir politica de limpieza periodica para sesiones y analytics QA.
- Evaluar una prueba HTTP real de registro cuando exista un harness seguro para Server Actions.

## Siguiente Hito Recomendado

Owner Catalog Management QA v1
