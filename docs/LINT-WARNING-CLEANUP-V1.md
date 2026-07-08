# Lint Warning Cleanup v1

## Resultado

PASS.

Se eliminaron los warnings existentes de `@next/next/no-img-element` reemplazando usos de `<img>` por `next/image` sin cambiar logica funcional, tracking, integraciones, pagos, auth ni catalogo.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/lint-warning-cleanup-v1/20260708-104548`
- Repo: `/var/opt/jakawi.com`
- HEAD inicial: `e0537e863fd5441015b2f4b92d1fc102913eaf1a`

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/lint-before.txt`
- `evidence/img-tags-before.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint-after.txt`
- `evidence/img-tags-after.txt`

## Objetivo

Dejar `npm run lint --if-present` limpio antes de Release Batch v7, eliminando los warnings existentes por `<img>` sin desactivar reglas ni hacer refactors amplios.

## Warnings

- Antes: 23 warnings `@next/next/no-img-element`.
- Despues: 0 warnings `@next/next/no-img-element`.
- `<img>` en `src` antes: 23.
- `<img>` en `src` despues: 0.

## Archivos Tocados

- `app/src/app/(dashboard)/app/leads/[leadId]/page.tsx`
- `app/src/app/(dashboard)/app/productos/page.tsx`
- `app/src/components/ProductImageInput.tsx`
- `app/src/components/dashboard/SellerVoiceNotesSettings.tsx`
- `app/src/components/dashboard/StoreImageInputs.tsx`
- `app/src/components/images/ImageCropperDialog.tsx`
- `app/src/components/seller-ai/SellerAiVoiceNote.tsx`
- `app/src/components/seller-ai/SellerAiWidget.tsx`
- `app/src/components/storefront/templates/AppCommerceTemplate.tsx`
- `app/src/components/storefront/templates/ShowcaseTemplate.tsx`
- `app/src/components/storefront/templates/components.tsx`
- `app/src/lib/storefront-pages.tsx`

## Estrategia

- Se importo `Image` desde `next/image` en los archivos con warnings.
- Se usaron `width`/`height` para miniaturas, avatares y previews con dimensiones conocidas.
- Se uso `fill` cuando el contenedor ya tenia tamano y posicionamiento controlado.
- Se agrego `relative` solo en contenedores que lo necesitaban para `fill`.
- Se preservo `alt=""` en imagenes decorativas.
- Se uso `unoptimized` para mantener comportamiento de URLs existentes, previews locales y media ya servida, sin tocar `next.config`.

## Validaciones

- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, sin warnings.
- `grep -R "<img" -n src`: 0 resultados.
- `git diff --check`: PASS.

## Que No Se Cambio

- No deploy.
- No push.
- No APIs externas.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No pagos.
- No emails.
- No secrets.
- No migraciones Prisma.
- No cambios de tracking.
- No cambios de integraciones.
- No cambios de pagos.
- No cambios de auth.
- No cambios de logica de catalogo.
- No cambios en `next.config`.
- No se desactivo la regla ESLint.
- No se agregaron `eslint-disable` masivos.

## Siguiente Hito Recomendado

- Release Batch v7.
