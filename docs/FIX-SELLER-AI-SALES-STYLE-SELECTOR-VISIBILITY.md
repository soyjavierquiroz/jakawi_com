# Fix Seller AI Sales Style Selector Visibility

Estado: PASS.

QA_DIR: `/var/backups/jakawi.com/qa/fix-seller-ai-sales-style-selector-visibility/20260711-035056`

## Causa encontrada

El selector existía en el código v1, pero estaba dentro de un `SellerAiSection` basado en `<details>` cerrado y aparecía después de “Notas de voz”. En móvil el control quedaba oculto hasta expandir esa sección, por lo que no era visible de forma clara.

Durante la verificación también se detectó que el contenedor web activo conservaba un Prisma Client anterior sin `sellerAiSalesStyle`; el artefacto activo no incorporaba completamente el selector v1 aunque la migración de base ya existía.

## Fix aplicado

- Se movió el selector a una tarjeta independiente, inmediatamente después de Estado, siempre visible en `/app/seller-ai`.
- Título visible: `Estilo de venta del asistente`.
- Texto visible: `Elige cómo debe vender el asistente. JAKAWI mantiene las reglas y prompts seguros.`
- El select muestra el preset actual y sólo permite `CONSULTATIVE`, `DIRECT`, `PREMIUM_TRUST`, `FAST_CLOSE` y `EXPERT`.
- La acción existente mantiene validación de valores y condición `storeId + ownerId`; no existen prompts libres ni se tocan productos, leads o dominios.

## Exitosos

- `slug=javier`
- Estilo anterior: `CONSULTATIVE`.
- Estilo nuevo: `DIRECT`.
- Verificación posterior: `sellerAiSalesStyle=DIRECT`.

## Validación

- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npm run test --if-present`: PASS, 144 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS.
- Migración nueva: no.
- `migrate deploy`: no ejecutado.

## Deploy y smoke

- Docker build: PASS.
- Docker stack deploy: PASS, con `.env.stack` cargado sin imprimir valores.
- `docker service update --force jakawi_com_web`: ejecutado.
- Servicio final: 1/1, update `completed`, imagen activa igual a la construida.
- `https://jakawi.com/api/health`: PASS.
- `https://www.exitosos.com`: PASS.
- `https://www.exitosos.com/p/caesar-with-chicken`: PASS.
- `/app/seller-ai` sin sesión: PASS, redirige a `/login`.
- Sin una sesión owner segura disponible, la visibilidad se confirmó por el código desplegado/render integrado y por el valor persistido de tienda.
- Chat simple `¿Cuánto cuesta?`: PASS, `rules`.
- Objeción `Está caro, ¿por qué me conviene?`: PASS, `openai`.

## Issues

- No hay blockers.
- Prompts libres permitidos: no.
- Secrets exposed: no.
- No hubo push, n8n, WhatsApp bot/API, pagos, emails, CRM externo ni cambios de Cloudflare.
