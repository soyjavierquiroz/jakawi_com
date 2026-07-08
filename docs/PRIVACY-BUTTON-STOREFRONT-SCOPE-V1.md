# Privacy Button Storefront Scope v1

Fecha UTC: 2026-07-08
Repo: `/var/opt/jakawi.com`
QA_DIR: `/var/backups/jakawi.com/qa/privacy-button-storefront-scope-v1/20260708-225624`
Resultado: **PASS**

## Objetivo

Limitar el boton flotante `Privacidad` al home publico de una tienda en el
host de plataforma, evitando que aparezca globalmente en productos, dashboard,
autenticacion o paginas de JAKAWI.

## Regla final de visibilidad

`ConsentBanner` conserva su comportamiento de consentimiento y usa
`usePathname()` solo para decidir si renderiza el boton flotante.

El helper `shouldShowPrivacyFloatingButton(pathname)` devuelve `true` cuando:

- El pathname contiene exactamente un segmento.
- El segmento tiene formato valido de slug de tienda.
- El segmento no es un slug reservado ni una pagina de plataforma.

La raiz `/` devuelve `false`. El soporte del boton en el root de un custom
domain queda pendiente porque `usePathname()` no permite distinguir por si solo
el home de JAKAWI del home de una tienda servido en `/`. Esa señal de storefront
debera agregarse de forma explicita antes de habilitarlo.

## Rutas donde aparece

- `/{storeSlug}`
- Caso validado por tests: `/qa-onboarding-store`

## Rutas donde no aparece

- `/{storeSlug}/p/{productSlug}`
- `/p/{productSlug}`
- `/app` y `/app/*`
- `/login`
- `/registro`
- `/`
- `/api/*`
- `/admin` y rutas admin/superadmin bajo `/app`
- `/privacidad`
- `/cookies`
- Otras paginas reservadas de la plataforma.

## Cambio aplicado

- Se agrego un helper puro para resolver el scope por pathname.
- Se agregaron tests para storefront, producto, dashboard, autenticacion,
  plataforma y legales.
- El render del boton flotante ahora requiere que el helper permita la ruta.

## Que no se cambio

- No se eliminaron helpers de consentimiento.
- No se cambio la cookie `jakawi_tracking_consent`.
- No se cambio el default `marketing=false`.
- No se cambio la logica de consentimiento ni tracking.
- No se habilitaron scripts externos.
- Meta y TikTok siguen bloqueados cuando `marketing=false`.
- No se toco backend.
- No se agregaron dependencias.
- No se ejecutaron migraciones Prisma.
- No deploy.
- No push.
- No APIs externas.
- No CRM.
- No Meta/TikTok/Google/Cloudflare.
- No CAPI QA.
- No pagos.
- No emails.
- No secrets.

## Validaciones

| Check | Resultado |
| --- | --- |
| Preflight working tree limpio | PASS |
| Tests del helper | PASS, incluidos en la suite |
| `npm run test --if-present` | PASS, 100 tests |
| `npm run typecheck --if-present` | PASS |
| `npm run lint --if-present` | PASS, 0 warnings |
| Validacion visual local | No completada |

La validacion visual queda pendiente para release. El browser real esta
disponible, pero el entorno local no dispone de `DATABASE_URL` y datos
accesibles para renderizar el storefront. No se uso produccion porque este
cambio aun no fue desplegado.

## Siguiente hito recomendado

Release Batch v11.
