# JAKAWI — Commercial Experience Platform

Plataforma de experiencia comercial para negocios que venden por conversación.

## 1. Vision general

JAKAWI es una plataforma de experiencia comercial para negocios que venden por conversacion. Permite crear un **Commercial Space** publico, presentar **Commercial Items**, reducir incertidumbre con Seller AI y cerrar la venta por WhatsApp con mas contexto.

JAKAWI no es:

- una tienda online generica
- un marketplace
- un chatbot
- un CRM tradicional
- solo un boton de WhatsApp

JAKAWI es para negocios pequenos y medianos que venden por confianza, asesoria, disponibilidad, precio, delivery, reservas, cotizaciones o cierre humano. La propuesta de valor es ayudar al cliente a decidir mejor antes de escribir, y ayudar al vendedor a recibir una consulta mas clara.

## 2. Principios de producto

- **Customer Journey primero:** cada interaccion debe reducir incertidumbre y acercar al cliente a una decision.
- **Commercial Space:** la tienda publica no es solo catalogo; es un espacio comercial con identidad, contexto y CTA.
- **Commercial Items:** productos, categorias y destacados se ordenan para facilitar exploracion y decision.
- **Seller AI prepara:** detecta necesidad, objeciones, intent score y productos relevantes.
- **La voz del vendedor genera confianza:** notas de voz del vendedor humanizan el recorrido sin reemplazar el cierre.
- **WhatsApp cierra:** WhatsApp es el canal final de cierre, no el cerebro del sistema.
- **JAKAWI recuerda:** journeys, leads, snapshots y eventos guardan senales utiles.
- **Growth/revenue ops manual primero:** partners, referidos, comisiones, rewards y pagos existen como operaciones controladas antes de automatizar dinero.

## 3. Estado actual del producto

JAKAWI esta en **MVP avanzado / private beta readiness** con produccion activa en `https://jakawi.com`.

Listo hoy:

- Commercial Spaces publicos por slug.
- Product detail pages con CTA.
- Backoffice owner para tienda, productos, categorias, Seller AI, WhatsApp, leads, plan y referrals.
- Seller AI con widget, chat, eventos, handoff a WhatsApp y limites por plan.
- Imagenes optimizadas a WebP y audio de voz del vendedor transcodificado a MP3.
- Superadmin console para tiendas, referrals, partners, commissions, rewards, payments y revenue.
- Partner/referral attribution con cookies, tracking de clicks y metricas de conversion.
- Ledger manual de pagos, comisiones y rewards.
- Suggested commission/reward actions cuando un pago confirmado tiene atribucion comercial.
- QA Data Labeling/Cleanup v1 para separar datos `REAL`, `DEMO`, `QA`, `INTERNAL` y `NEEDS_REVIEW` sin borrar produccion.

Manual o limitado hoy:

- Pagos y revenue son manuales; no hay checkout real ni webhooks.
- Comisiones y rewards son manuales; no hay auto-payout.
- Aplicacion de plan desde pago confirmado no esta automatizada.
- Observabilidad es basica: health endpoint y logs Docker.
- La suite automatizada parece limitada; se debe fortalecer antes de self-service masivo.

## 4. Stack tecnico

| Capa | Implementacion |
| --- | --- |
| Frontend | Next.js App Router, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js route handlers y server actions |
| ORM/database | Prisma 6, PostgreSQL 16 |
| Storage | MinIO S3 compatible, AWS SDK S3 client |
| Cache/session support | Redis 7 disponible en stack; sesiones persistidas en PostgreSQL |
| Media | Sharp para imagenes, ffmpeg/ffprobe para audio |
| Infra | Docker Swarm, Traefik, overlay networks |
| Deploy | Imagen `jakawi-com-web:latest`, stack Swarm `jakawi_com` |
| Observabilidad actual | `/api/health`, `docker service logs`, metricas internas admin |

Scripts reales en `app/package.json`:

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm seed`

## 5. Arquitectura de alto nivel

JAKAWI corre como una app Next.js unica. El frontend publico, dashboard, superadmin, partner portal y APIs viven en `app/src/app`.

Flujo basico:

1. Traefik recibe trafico HTTPS para `jakawi.com`, `www.jakawi.com`, `media.jakawi.com` y `minio.jakawi.com`.
2. El servicio `jakawi_com_web` atiende rutas Next.js y route handlers.
3. Prisma lee/escribe en `jakawi_com_postgres`.
4. Media se sube a MinIO usando variables S3 y se sirve por `media.jakawi.com`.
5. Redis esta disponible en el stack para soporte operacional/cache, aunque la sesion actual usa tabla `Session`.
6. Superadmin opera growth/revenue desde rutas protegidas por `requireSuperAdmin`.

Servicios Docker esperados:

- `jakawi_com_web`
- `jakawi_com_postgres`
- `jakawi_com_redis`
- `jakawi_com_minio`
- `jakawi_com_minio_init`

Dominios:

- `jakawi.com` y `www.jakawi.com`: web Next.js
- `media.jakawi.com`: API/public media MinIO
- `minio.jakawi.com`: consola MinIO protegida por basic auth Traefik

## 6. Estructura del repositorio

- `/app`: aplicacion Next.js.
- `/app/src/app`: rutas App Router, APIs, public spaces, dashboard, admin y partner portal.
- `/app/src/components`: componentes UI, storefront templates, Seller AI widget, growth/share kit, dashboard y admin.
- `/app/src/lib`: server actions, auth, Prisma client, Seller AI, attribution, growth, revenue, media y helpers.
- `/app/src/config`: planes, paises, pricing regional, templates comerciales, navegacion, landing, Seller AI y payment routing.
- `/app/prisma`: schema, migraciones y seed.
- `/app/Dockerfile`: build multi-stage con Node 22 Alpine, pnpm, Prisma, Next build y migrate deploy al iniciar.
- `/app/.dockerignore`: excluye dependencias, builds, logs, `.git`, `.env*` salvo `.env.example`.
- `/infra/docker-stack.yml`: stack Swarm `jakawi_com`.

## 7. Modulos implementados

### A. Public Commercial Spaces

- `/[storeSlug]` renderiza el Commercial Space publico.
- `/[storeSlug]/p/[productSlug]` renderiza detalle de producto.
- Templates disponibles: `SHOWCASE`, `BOUTIQUE`, `APP_COMMERCE`.
- Templates definidos pero no disponibles: `COMPACT_CATALOG`, `SOCIAL_DROP`.
- Identidad visual por tienda: colores, preset, logo, portada y tagline.
- Productos destacados con `isFeatured`, `featuredAt` y `sortOrder`.
- CTA WhatsApp directo o asistido segun plan.
- Seller AI launcher/widget integrado en storefront.

### B. Backoffice Owner

Rutas owner principales:

- `/app`: dashboard owner.
- `/app/tienda`: datos de tienda, pais, moneda, identidad visual, template.
- `/app/productos`: catalogo.
- `/app/productos/nuevo` y `/app/productos/[productId]/editar`: alta/edicion de productos.
- `/app/categorias`: categorias.
- `/app/seller-ai`: configuracion Seller AI.
- `/app/whatsapp`: configuracion WhatsApp.
- `/app/leads` y `/app/leads/[leadId]`: leads y estados.
- `/app/plan`: plan, uso y pagos.
- `/app/referrals`: link de referido, share kit y metricas.
- `/app/agente`: ruta existente relacionada con agente/Seller AI.

### C. Seller AI

- Modos: `DISCOVERY`, `PRODUCT_ADVISOR`, `DECISION_SUPPORT`, `CLOSING_PREP`.
- Widget publico con quick replies, captura de telefono y CTA WhatsApp.
- APIs: `/api/seller-ai/opening`, `/api/seller-ai/chat`, `/api/seller-ai/events`, `/api/seller-ai/lead`, `/api/seller-ai/continue-whatsapp`.
- Voice notes: intro, guidance y handoff con avatar opcional.
- Handoff WhatsApp genera contexto y snapshot comercial.
- Limites por plan con enforcement server-side.
- Audio upload/transcoding usa ffmpeg para generar MP3 mono, 24 kHz, 48 kbps, maximo 15 segundos.
- Nota UX/privacidad: Seller AI no debe inventar disponibilidad, precio no publicado, envio, tallas, garantias ni condiciones que el vendedor deba confirmar.

### D. Commercial Items / Products

- Catalogo por tienda con `Product`.
- Categorias opcionales por `Category`.
- Productos visibles/invisibles.
- Productos destacados y orden manual.
- Precio en centavos y moneda por producto/tienda.
- Imagenes validadas, recortables desde UI y optimizadas a WebP.
- Safe delete de media anterior cuando el objeto pertenece a la tienda.

### E. Leads / Customer Signals

- `CustomerJourney` registra recorrido por session/visitor.
- `Lead` resume contacto, intencion, producto actual/seleccionado y WhatsApp.
- `LeadEvent` y `JourneyEvent` registran vistas, mensajes, recomendaciones, clicks y cambios.
- `CommercialSnapshot` prepara handoff a canal.
- `visitorId` conecta visitas y actividad sin depender solo de login.
- Senales relevantes: contactable, WhatsApp started/clicked, intentScore, viewedProducts, recommendedProducts, objections, budget, urgency.

### F. Plans / Limits

Planes en config:

| Plan | Productos | Seller AI | Conversaciones mensuales | WhatsApp |
| --- | ---: | --- | ---: | --- |
| TRIAL | 5 | No | 0 | Directo |
| BASIC | 10 | No | 0 | Directo |
| PRO | 30 | Si | 20 | Asistido + directo secundario |
| PREMIUM | 50 | Si | 100 | Bot/seguimiento preparado |

Notas:

- `LAUNCH` se normaliza a `TRIAL`.
- `SELLER_AI` se normaliza a `PRO`.
- `SCALE` se normaliza a `PREMIUM`.
- Trial vencido bloquea creacion de productos y Seller AI.
- Enforcement ocurre server-side en helpers como `assertCanCreateProduct` y `assertCanUseSellerAi`.

### G. Regional Pricing / Country

- Configuracion por pais: `BO`, `PE`, `CO`, `EC`, `AR`, `CL`, `MX`, `US`, `OTHER`.
- Cada pais define moneda, locale, timezone, telefono y proveedor default.
- Bolivia usa `MANUAL_BOLIVIA`.
- Internacional prepara `HOTMART`; US prepara `STRIPE`.
- Los `checkoutUrl` actuales estan en `null`; el flujo real sigue siendo registro/pago manual.

### H. Superadmin

Rutas:

- `/app/admin`
- `/app/admin/stores`
- `/app/admin/referrals`
- `/app/admin/partners`
- `/app/admin/commissions`
- `/app/admin/rewards`
- `/app/admin/payments`
- `/app/admin/revenue`

Capacidades:

- Ver tiendas, planes, trials, Seller AI activo y WhatsApp clicks.
- Operar referrals, attributions, partners y destinations.
- Crear/actualizar comisiones, rewards y pagos manuales.
- Ver revenue attribution y growth conversion metrics.
- Acceso protegido por `requireSuperAdmin`; usuarios no superadmin reciben `notFound()`.

### I. Partner / Referral Growth

- `/r/[storeSlug]`: link de referido de tienda.
- `/partner/[code]`: link default partner.
- `/partner/[code]/[destinationSlug]`: partner destination especifica.
- Cookies HttpOnly con duracion de 30 dias para attribution.
- Modelos: `Partner`, `PartnerDestination`, `AcquisitionAttribution`, `GrowthLinkClick`.
- Partner Portal en `/app/partner`, ligado por `portalUserId`.
- Share Kit con copy, links y QR.
- Tracking de clicks guarda source, partner/referrer, destination, landing, target, referrer, userAgent, ipHash y visitorId.
- Metricas de conversion agrupan clicks, signups, activations y paid attribution.

### J. Commission / Reward Ops

- `PartnerCommission` registra comisiones manuales.
- `StoreReferralReward` registra rewards manuales a tiendas referidoras.
- Estados operativos definidos en helpers, guardados como `String` en Prisma.
- No hay auto-payout.
- Suggested actions sugieren comision/reward cuando un `StorePayment` confirmado tiene atribucion partner/store referral y aun no esta cubierto.
- Las sugerencias comerciales excluyen datos demo, QA e internos.

### K. Revenue Ops

- `StorePayment` es ledger manual de pagos.
- Soporta payment type, method, planKey, status, periodo, monto y referencia externa.
- Owner ve historial de pagos en plan.
- Superadmin ve pagos, revenue attribution y acciones sugeridas.
- No hay checkout real, no webhooks, no facturacion automatica y no aplicacion automatica del plan desde pago.

### L. Media Pipeline

- MinIO S3 compatible sirve media.
- Imagenes: JPG, PNG, WebP, GIF, AVIF, HEIC/HEIF hasta 10MB; salida WebP optimizada con Sharp.
- Perfiles: producto 1200x1200, cover 1600x900, logo/avatar 512x512, categoria 800x800.
- Cropper UI en componentes de imagen.
- Audio Seller Voice: MP3/M4A/MP4/WebM/WAV/OGG hasta 8MB; salida MP3 optimizada.
- Safe delete valida dominio, bucket, prefijos permitidos y pertenencia a storeId antes de borrar.

### M. Authentication / Authorization

- Login con email/password y bcrypt.
- Sesiones con token aleatorio, hash SHA-256 en DB y cookie HttpOnly `SESSION_COOKIE_NAME`.
- Roles principales: `OWNER` y `SUPER_ADMIN`.
- Owner scoping por `requireStore`.
- Partner portal scoping por `Partner.portalUserId`.
- Admin scoping por `requireSuperAdmin`.
- Attribution cookies son HttpOnly, SameSite Lax y secure en produccion.

## 8. Rutas principales

Publicas:

| Ruta | Proposito |
| --- | --- |
| `/` | Landing |
| `/registro` | Registro de owner/store |
| `/login` | Login |
| `/[storeSlug]` | Commercial Space publico |
| `/[storeSlug]/p/[productSlug]` | Detalle de producto |
| `/r/[storeSlug]` | Referral de tienda |
| `/partner/[code]` | Partner link default |
| `/partner/[code]/[destinationSlug]` | Partner destination |
| `/api/health` | Health DB/app |
| `/demo` | Ruta demo/redirect existente |

Owner:

- `/app`
- `/app/tienda`
- `/app/productos`
- `/app/productos/nuevo`
- `/app/productos/[productId]/editar`
- `/app/categorias`
- `/app/seller-ai`
- `/app/whatsapp`
- `/app/leads`
- `/app/leads/[leadId]`
- `/app/plan`
- `/app/referrals`
- `/app/agente`

Partner:

- `/app/partner`

Superadmin:

- `/app/admin`
- `/app/admin/stores`
- `/app/admin/referrals`
- `/app/admin/partners`
- `/app/admin/commissions`
- `/app/admin/rewards`
- `/app/admin/payments`
- `/app/admin/revenue`

APIs relevantes:

- `/api/health`
- `/api/visitor`
- `/api/uploads/seller-voice`
- `/api/seller-ai/opening`
- `/api/seller-ai/chat`
- `/api/seller-ai/events`
- `/api/seller-ai/lead`
- `/api/seller-ai/continue-whatsapp`
- `/api/whatsapp/click`
- Public tracking redirects: `/r/[storeSlug]`, `/partner/[code]`, `/partner/[code]/[destinationSlug]`

## 9. Modelo de datos principal

- `User`: owner o superadmin. Guarda identidad, email, passwordHash, telefono, pais, moneda, role, ipHash y relacion con sesiones, stores, attribution y partner portal.
- `Session`: sesion persistida. Guarda tokenHash y expiracion; se relaciona con `User`.
- `Store`: Commercial Space. Relaciona owner, productos, categorias, leads, journeys, attribution, commissions, payments y rewards.
- `Product`: Commercial Item. Pertenece a store, puede tener category, imagen, precio, visibilidad, destacado y orden.
- `Category`: agrupacion de productos por tienda; tambien puede aparecer en journey events.
- `AnalyticsEvent`: eventos simples de tienda/producto como store view, product view y WhatsApp click.
- `Lead`: senal comercial accionable. Resume contacto, estado, intentScore, producto, snapshot, conversacion y eventos.
- `LeadEvent`: timeline asociado a lead/session/store.
- `CustomerJourney`: recorrido anonimo o semi-identificado por session/visitor; contiene stage, status, necesidad, objeciones e intentScore.
- `JourneyEvent`: eventos finos del journey: vistas, mensajes, necesidad detectada, recomendacion, channel click.
- `CommercialSnapshot`: resumen para handoff a WhatsApp u otro canal; captura contexto, items, objeciones y mensaje.
- `Conversation`: conversacion Seller AI por lead, con modelo/costos estimados.
- `ConversationMessage`: mensajes `USER`, `ASSISTANT` o `SYSTEM` dentro de la conversacion.
- `Partner`: partner comercial con code, estado, commissionRateBps y usuario de portal opcional.
- `PartnerDestination`: destino/landing de partner con slug, targetUrl, estado y default.
- `AcquisitionAttribution`: atribucion de una store creada a organic, store referral, partner o manual.
- `GrowthLinkClick`: click tracking de referral/partner con hashes y metadata truncada.
- `PartnerCommission`: ledger manual de comisiones por partner/store/attribution.
- `StoreReferralReward`: ledger manual de reward para tienda referidora.
- `StorePayment`: ledger manual de pagos por tienda, plan, estado, monto y periodo.

## 10. Flujos clave

### A. Registro de tienda

1. Usuario visita `/registro`.
2. Formulario captura identidad, email, password, telefono, storeName, storeSlug, pais, moneda y plan.
3. Se normalizan pais, moneda, telefono, slug y plan.
4. Se crea `User`, `Store`, `Session` y `AcquisitionAttribution`.
5. Cookies de attribution se limpian tras registro.
6. Usuario entra a `/app`.

### B. Public space -> Seller AI -> WhatsApp

1. Cliente entra a `/[storeSlug]` o producto.
2. Storefront renderiza template, productos destacados y CTA.
3. Seller AI abre discovery/advisor segun contexto.
4. Cliente responde; se actualizan lead, journey, conversation y eventos.
5. `continue-whatsapp` prepara snapshot/mensaje.
6. WhatsApp abre como canal final de cierre.

### C. Cliente interactua -> Journey/Lead/Snapshot

- Eventos publicos y Seller AI alimentan `CustomerJourney`.
- `Lead` se asegura cuando hay chat o senal accionable.
- `CommercialSnapshot` resume decision, producto, objeciones, presupuesto, urgencia y mensaje de canal.

### D. Owner gestiona productos/space/Seller AI

- Owner edita store, template, identidad visual y WhatsApp.
- Owner gestiona productos, categorias, destacados e imagenes.
- Owner configura Seller Voice notes y ve leads.
- Plan limits bloquean exceso de productos o Seller AI cuando aplica.

### E. Partner link -> cookies -> registro -> attribution

1. Click en `/partner/[code]` o destination.
2. Se valida partner/destination activa.
3. Se registra `GrowthLinkClick`.
4. Se setean cookies HttpOnly.
5. Registro crea `AcquisitionAttribution` source `PARTNER`.

### F. Store referral link -> cookies -> registro -> rewards

1. Click en `/r/[storeSlug]`.
2. Se registra click source `STORE_REFERRAL`.
3. Cookies guardan referrerStoreId/code.
4. Registro crea attribution si no es self-referral.
5. Superadmin puede crear reward manual.

### G. Click tracking -> conversion metrics

- `GrowthLinkClick` alimenta totales, ultimos 7/30 dias y agrupaciones.
- Conversion metrics cruzan clicks con attribution signed up/active/paid.

### H. Pago manual -> revenue attribution

- Superadmin crea `StorePayment`.
- El pago puede apuntar a plan, tipo, metodo, periodo y referencia.
- Revenue attribution conecta pago con attribution de la store.

### I. Pago confirmado -> suggested commission/reward action

- Si `StorePayment.status` es `CONFIRMED` y la store tiene attribution partner/store referral, se sugiere accion.
- Si ya existe commission/reward relacionado, queda cubierto.
- Si falta relacion critica, queda `NEEDS_REVIEW`.

### J. Superadmin opera growth/revenue

- Admin revisa stores, partners, referrals, clicks, conversion, payments, revenue y acciones sugeridas.
- Las metricas ejecutivas separan datos comerciales reales de demo/QA/internal mediante badges y filtros centralizados.
- Operacion sigue manual para evitar automatizar pagos antes de control y QA.

## 11. Variables de entorno

Listar nombres, no valores. `.env.stack` no se commitea.

Aplicacion:

- `NODE_ENV`
- `PORT`
- `APP_URL`
- `PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `CRON_SECRET`
- `UPLOAD_SECRET`
- `OPENAI_API_KEY`

Database/cache:

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_URL`
- `REDIS_PASSWORD`

MinIO/S3:

- `S3_ENDPOINT`
- `S3_PUBLIC_URL`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_FORCE_PATH_STYLE`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_BROWSER_REDIRECT_URL`
- `MINIO_SERVER_URL`
- `MINIO_BASIC_AUTH_USER`
- `MINIO_BASIC_AUTH_PASSWORD`
- `MINIO_BASIC_AUTH_HASH`

Regla: no exponer secretos, cookies reales, tokens, credenciales DB, access keys, private keys ni valores de `.env.stack`.

## 12. Desarrollo local

Desde el repo:

```bash
cd /var/opt/jakawi.com/app
pnpm install
pnpm prisma:generate
pnpm dev
```

Comandos soportados:

```bash
pnpm lint
pnpm build
pnpm prisma:migrate
pnpm seed
```

Health local depende del entorno y puerto:

```bash
curl http://localhost:3000/api/health
```

Notas:

- Verificar DB local segun entorno local; produccion usa Docker Swarm.
- No inventar variables: usar `.env.example` como referencia de nombres, no de valores reales.
- `pnpm build` ejecuta Next build; el Dockerfile tambien ejecuta `pnpm prisma generate` y `pnpm build`.

## 13. Produccion / Deploy

Health:

```bash
curl https://jakawi.com/api/health
```

Build de imagen:

```bash
cd /var/opt/jakawi.com
docker build --progress=plain -t jakawi-com-web:latest ./app
```

Deploy stack:

```bash
cd /var/opt/jakawi.com
set -a
source .env.stack
set +a
docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com
```

Forzar recreacion del servicio web cuando la imagen local ya fue construida:

```bash
docker service update --force jakawi_com_web
```

Inspeccion:

```bash
docker stack services jakawi_com
docker service ps jakawi_com_web --no-trunc
docker service logs jakawi_com_web --tail 100 -f
```

Advertencias:

- Confirmar `docker context` antes de operar produccion.
- No ejecutar `docker stack rm jakawi_com` salvo plan de rollback/destruccion aprobado.
- No ejecutar `docker system prune --volumes`.
- No tocar stacks externos ni redes compartidas como `drenvex_network` sin runbook.
- No commitear `.env`, `.env.stack` ni secretos.

## 14. Validacion / QA

Checklist minimo:

- `git status -sb` limpio antes de deploy.
- `pnpm lint`.
- `pnpm build`.
- `pnpm prisma:migrate` o `prisma migrate deploy` solo cuando hay cambios de schema/migraciones.
- `curl https://jakawi.com/api/health`.
- Landing `/`, registro `/registro`, login `/login`.
- Public space `/[storeSlug]` y producto `/[storeSlug]/p/[productSlug]`.
- Owner dashboard, tienda, productos, categorias, Seller AI, WhatsApp, leads, plan y referrals.
- Superadmin dashboard, stores, referrals, partners, commissions, rewards, payments y revenue.
- Partner portal `/app/partner` con usuario ligado a `portalUserId`.
- Redirects `/r/[storeSlug]`, `/partner/[code]`, `/partner/[code]/[destinationSlug]`.
- Upload de imagen producto/logo/cover/avatar.
- Upload de audio intro/guidance/handoff.
- Seller AI opening, chat, events, lead y continue WhatsApp.
- WhatsApp click tracking.
- Creacion/confirmacion manual de pagos.
- Suggested actions para commission/reward.
- Mobile QA completa en storefront, widget Seller AI, dashboard owner y admin.

## 15. Seguridad y privacidad

- `SUPER_ADMIN` requerido para rutas admin.
- Owner scoping por `ownerId` y `requireStore`.
- Partner portal scoping por `portalUserId`.
- Passwords con bcrypt.
- Sesiones guardan hash del token, no token plano.
- Cookies de sesion y attribution son HttpOnly; secure en produccion.
- IP cruda no se persiste en usuario/growth; se usa `ipHash` SHA-256 con salt.
- Minimal Rate Limiting v1 protege login, registro, Seller AI, uploads y tracking.
- QA Data Labeling/Cleanup v1 evita que demo, QA, fixtures, rate-limit tests y datos internos contaminen metricas comerciales reales.
- Metadata de click se trunca para reducir riesgo.
- MinIO safe delete evita borrar assets globales o de otra tienda.
- `.env.stack` no se commitea.
- No hay auto-payments ni auto-payout.
- No debe haber endpoints admin publicos sin auth.
- Referencias de pago sensibles se deben evitar; el codigo detecta patrones tipo tarjeta en referencias manuales.

## 16. Limitaciones actuales

- Pagos son manuales.
- No hay checkout real.
- No hay webhooks de Hotmart/Stripe.
- No hay facturacion/comprobantes automaticos.
- No hay emails transaccionales automaticos.
- No hay analytics avanzado tipo cohortes/funnels completos.
- No hay deduplicacion fuerte de `GrowthLinkClick`; cada click se registra.
- QR analytics avanzado no esta separado como campana propia.
- Partner onboarding automatico no esta completo.
- Rewards/commissions no se aplican/pagan automaticamente.
- Plan application desde pagos confirmados no esta automatizada.
- Puede existir data QA/demo en produccion, pero debe verse con badge y quedar fuera de metricas comerciales reales.
- Puede haber warnings preexistentes de `<img>` o deuda visual no bloqueante.
- Falta suite automatizada fuerte si se quiere escalar self-service.
- Redis esta desplegado, pero no toda la app depende de Redis todavia.

## 17. Deuda tecnica

### A. Tecnica

- Tests automatizados unit/integration para helpers criticos.
- E2E Playwright ampliado para registro, owner, public, Seller AI, partner y admin.
- Observabilidad/logging estructurado.
- Manejo de errores mas consistente en APIs y server actions.
- Redis distributed rate limiting v2 cuando haya multiples replicas.
- Transactional Email System v1 con AWS SES queda como prioridad pre-launch futura.
- JAKAWI First-Party Audiences v1 queda como prioridad futura para audiencias propias sin depender de marketplaces.
- Multi-domain v1 queda como prioridad futura para soportar dominios comerciales propios por tienda/segmento.
- Store Ads Integrations v1 queda como prioridad futura: Meta Pixel/CAPI + TikTok Pixel/Events API.
- Deduplicacion de `GrowthLinkClick` por ventana/session/visitor.
- Overrides persistidos para calidad de datos si los badges deterministicos no alcanzan.
- Typed enums para statuses operativos que hoy estan como `String` en Prisma.
- Mejor separacion services/actions en areas admin.
- Performance de metricas cuando crezcan clicks, payments y attributions.
- Auditoria mas completa de cambios admin y operaciones revenue.

### B. Producto

- Checkout/payment providers reales.
- Aplicacion automatica payment-to-plan.
- Emails/notificaciones transaccionales.
- First-party audiences.
- Multi-domain.
- Meta Pixel/CAPI y TikTok Pixel/Events API por tienda cuando exista consentimiento y base legal.
- Partner onboarding.
- Owner reward rules configurables.
- Commission rules configurables.
- QR campaigns.
- UTM builder.
- Guided setup para onboarding owner.
- Resource kit para partners.
- Refinamiento de templates comerciales.

### C. Operacion

- Runbooks de deploy, rollback, incidentes y soporte.
- Backups y restore drills para Postgres y MinIO.
- Procedimientos superadmin para payments, commissions y rewards.
- Politicas de limpieza/retencion de datos.
- Procedimiento de calidad de datos para demo/QA/internal antes y durante private beta.
- Proceso de soporte de lanzamiento.
- Checklist comercial para pilotos.

## 18. Que falta para lanzar

### A. Must-have antes de vender publicamente

- QA end-to-end: registro -> publicar space -> producto -> Seller AI -> WhatsApp.
- Flujo de pago manual claro para owner y operador.
- Etiquetado visible de datos QA/demo/internal y metricas comerciales reales separadas.
- Copy legal basico: terminos, privacidad, cookies/attribution y contacto.
- Canal de soporte/contacto visible.
- Monitoreo de health/logs y alerta basica.
- Backup DB/MinIO verificado con restore drill.
- Cuenta demo estable.
- Checklist onboarding owner.
- Revision mobile completa.
- Runbook de superadmin para pagos, comisiones y rewards.

### B. Should-have

- Onboarding partner.
- Transactional Email System v1 con AWS SES.
- JAKAWI First-Party Audiences v1.
- Multi-domain v1.
- Store Ads Integrations v1: Meta Pixel/CAPI + TikTok Pixel/Events API.
- Export CSV admin para payments/partners/revenue.
- Mejores tests automatizados.
- Rate limiting.
- Metricas de errores.
- Docs operativas internas.
- Seed/demo data controlada.
- Screenshots QA por template.

### C. Later

- Checkout real.
- Hotmart/Stripe integration.
- Webhooks.
- Facturas/comprobantes.
- Automation rules.
- QR campaigns.
- Analytics avanzado.
- Marketplace solo si algun dia se decide; no es foco actual.

## 19. Roadmap recomendado

### Fase 0: Hardening pre-launch

Objetivo: reducir riesgo operativo antes de pilotos pagos.

Entregables:

- QA end-to-end documentado.
- Backups y restore drill.
- Legal basico.
- Rate limiting minimo en rutas sensibles.
- Limpieza/etiquetado QA data.
- Runbook deploy/rollback/support.

Criterios de salida:

- Un negocio real puede registrarse, publicar, recibir leads y cerrar por WhatsApp sin intervencion tecnica.
- Superadmin puede registrar pago manual y atribucion sin ambiguedad.

### Fase 1: Private beta Bolivia

Objetivo: validar negocio con tiendas reales y operacion manual controlada.

Entregables:

- 5-20 tiendas piloto.
- Onboarding owner asistido.
- Pago manual Bolivia documentado.
- Dashboard admin usado semanalmente.
- Feedback de Seller AI y WhatsApp handoff.

Criterios de salida:

- Tiendas reciben consultas reales.
- Hay evidencia de activacion y pagos manuales.
- Los problemas repetidos estan clasificados y priorizados.

### Fase 2: Partner-led acquisition

Objetivo: crecer con partners y referidos sin perder control.

Entregables:

- Partner portal estable.
- Share kit y QR operativo.
- Reglas comerciales de comision/reward.
- Reporte admin recurrente.

Criterios de salida:

- Partners generan registros atribuibles.
- Comisiones/rewards manuales son auditables.
- Conversion por partner/referral se entiende.

### Fase 3: Revenue automation

Objetivo: automatizar cobro y aplicacion de plan.

Entregables:

- Checkout Hotmart/Stripe o proveedor elegido.
- Webhooks.
- Payment-to-plan application.
- Estados de pago confiables.
- Emails de confirmacion.

Criterios de salida:

- Pago confirmado actualiza plan sin operacion manual.
- Revenue attribution se mantiene correcto.
- Fallos de webhook tienen retry/reconciliation.

### Fase 4: Advanced analytics and automation

Objetivo: mejorar decision comercial, retencion y ops.

Entregables:

- Funnels y cohortes.
- Campanas QR/UTM.
- Automatizaciones de follow-up.
- Alertas de intent/lead.
- Auditoria admin ampliada.

Criterios de salida:

- Owners y superadmin pueden tomar decisiones con metricas confiables.
- Automatizaciones reducen trabajo manual sin romper confianza.

## 20. Runbooks rapidos

Health:

```bash
curl https://jakawi.com/api/health
```

Git status:

```bash
git status
PAGER=cat git log --oneline -8
```

Build:

```bash
docker build --progress=plain -t jakawi-com-web:latest ./app
```

Deploy:

```bash
set -a
source .env.stack
set +a
docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com
docker service update --force jakawi_com_web
```

Services:

```bash
docker service ls | grep jakawi_com
docker service ps jakawi_com_web --no-trunc
docker service logs jakawi_com_web --tail 100 -f
docker service logs jakawi_com_postgres --tail 100
docker service logs jakawi_com_minio --tail 100
```

DB query pattern:

```bash
docker run --rm --network jakawi_com_jakawi_internal -e PGPASSWORD="$POSTGRES_PASSWORD" postgres:16-alpine psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT 1;'
```

Warnings:

- No `docker stack rm`.
- No `docker system prune --volumes`.
- No commit de envs/secrets.
- No deploy sin confirmar branch, status, health y contexto Docker.

## 21. Release history

Repositorio remoto detectado: `git@github.com:soyjavierquiroz/jakawi_com.git`.

Hitos recientes detectados en git:

| Commit/tag | Hito |
| --- | --- |
| `2e39c594` / `suggested-growth-actions-v1-20260701-201527` | Suggested commission / reward actions |
| `8385632d` / `revenue-attribution-metrics-v1-20260701-190109` | Revenue attribution metrics |
| `4f40ee4a` / `manual-revenue-ledger-v1-20260701-183154` | Manual revenue ledger |
| `08393275` / `growth-link-share-kit-v1-20260701-162226` | Growth link share kit |
| `41d6b002` / `growth-conversion-metrics-v1-20260701-155858` | Growth conversion metrics |
| `8055b93c` / `referral-partner-event-tracking-v1-20260701-153236` | Referral / partner event tracking |
| `c581eea2` / `store-referral-rewards-v1-20260701-140032` | Store referral rewards |
| `68b1ee9e` / `partner-portal-v1-20260701-132213` | Partner portal |
| `ad1e86d9` / `partner-commission-ledger-v1-20260701-122829` | Manual partner commission ledger |
| `922d245e` / `partner-destinations-admin-polish-v1-20260701-115146` | Partner destinations |
| `8a9da302` / `referral-partner-attribution-v1-20260701-021318` | Referral / partner attribution |
| `d36fd230` / `superadmin-console-polish-v1-20260701-014320` | Superadmin console |

Checkpoint de este sprint:

- `checkpoint-before-jakawi-readme-launch-readiness-v1-20260701-202301`

## 22. Estado de lanzamiento

JAKAWI esta en **MVP avanzado / private beta readiness**.

Evaluacion honesta:

- No esta listo todavia para self-service masivo sin operacion manual.
- Si esta listo para pilotos controlados con negocios reales.
- El producto ya tiene suficiente base para aprender de conversion, leads, Seller AI, WhatsApp handoff, referrals, partners y revenue manual.
- El siguiente foco debe ser hardening, QA, datos reales, soporte y claridad comercial.

Prioridad recomendada:

1. Cerrar QA end-to-end y mobile.
2. Formalizar operacion manual de pagos/rewards/commissions.
3. Verificar backups y restore.
4. Preparar legal/support.
5. Lanzar private beta Bolivia con pocos negocios y medicion semanal.

## 23. Pre-launch ops docs

- `PRE-LAUNCH-AUDIT.md`
- `docs/PRE-LAUNCH-OPS-RUNBOOK.md`
- `docs/BACKUP-RESTORE-RUNBOOK.md`
- `docs/PRIVATE-BETA-CHECKLIST.md`
- `docs/OWNER-ONBOARDING-CHECKLIST.md` - guia para activar negocios reales en private beta con onboarding asistido.
