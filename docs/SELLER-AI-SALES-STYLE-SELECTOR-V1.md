# Seller AI Sales Style Selector v1

Estado: PASS.

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-sales-style-selector-v1/20260711-032453`

## Alcance

- Estilos disponibles: `CONSULTATIVE`, `DIRECT`, `PREMIUM_TRUST`, `FAST_CLOSE` y `EXPERT`.
- Cada tienda persiste `sellerAiSalesStyle` con default `CONSULTATIVE`.
- El dashboard `/app/seller-ai` permite elegir sólo uno de los cinco presets.
- No existe prompt libre, instrucciones arbitrarias ni edición del system prompt por el owner.
- El contexto LLM mantiene sus límites: tienda acotada, producto actual, hasta cuatro candidatos visibles de la misma tienda y hasta seis mensajes recientes.
- La memoria conversacional no cambia: `ConversationMessage` sigue persistiendo mensajes USER/ASSISTANT y el summary se genera en el handoff a WhatsApp.
- El router de costo no cambia: preguntas simples siguen reglas; objeciones, comparación, indecisión y cierre complejo pueden usar OpenAI.

## Seguridad

La acción de guardado valida el estilo contra la lista centralizada y actualiza con `id` de tienda y `ownerId` del usuario autenticado. No toca productos, leads, dominios ni prompts.

## Validación

- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npm run test --if-present`: PASS, 144 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS.
- La primera pasada host-side no tenía `DATABASE_URL` cargada; se repitió cargando `.env.stack`, sin imprimir valores.

## Migración

- Migración: sí, `000025_add_store_seller_ai_sales_style`.
- Campo: `Store.sellerAiSalesStyle TEXT NOT NULL DEFAULT 'CONSULTATIVE'`.
- `scripts/run-prisma-migrate-deploy.sh` se ejecutó explícitamente, pero el host no alcanza `postgres:5432` porque la base sólo está en la red interna del stack.
- La misma secuencia explícita (`migrate status` → `migrate deploy` → `migrate status`) se completó desde un contenedor temporal con la imagen local, código montado de sólo lectura y red `jakawi_com_jakawi_internal`; no se usó migración en startup.
- Estado previo: sólo `000025_add_store_seller_ai_sales_style` pendiente. Estado posterior: PASS / schema up to date.

## Deploy y smoke

- Docker build: PASS (`jakawi-com-web:latest`).
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: PASS, con `.env.stack` cargado en la misma shell.
- `docker service update --force jakawi_com_web`: ejecutado.
- Servicio final: `jakawi_com_web` 1/1, update `completed`, imagen activa igual a la construida.
- `https://www.exitosos.com`: PASS.
- `https://www.exitosos.com/p/caesar-with-chicken`: PASS.
- `https://jakawi.com/api/health`: PASS, database `ok`.
- `/app/seller-ai` sin sesión: PASS, redirige a `/login`.
- Chat simple `¿Cuánto cuesta?`: PASS, proveedor persistido `rules`.
- Objeción `Está caro, ¿por qué me conviene?`: PASS, proveedor persistido `openai`.

## Seguridad

Secrets exposed: no. No hubo push, n8n, bot/API de WhatsApp, pagos, emails, CRM externo ni cambios de Cloudflare.
