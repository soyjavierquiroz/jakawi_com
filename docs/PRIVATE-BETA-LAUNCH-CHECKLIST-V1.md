# JAKAWI - Private Beta Launch Checklist v1

Fecha UTC: 2026-07-08
Estado: checklist operativo docs-only para lanzar una beta privada controlada.
Repo: `/var/opt/jakawi.com`

## 1. Objetivo

Este documento define el checklist minimo para operar una beta privada asistida de JAKAWI con 3-5 owners iniciales, sin implementar features nuevas y sin activar integraciones externas por defecto.

La beta debe mantenerse manual, controlada y owner-led:

- Owners seleccionados manualmente.
- Onboarding asistido negocio por negocio.
- Pagos manuales.
- Soporte directo.
- Sin checkout real.
- Sin emails reales.
- Sin custom domains activos.
- Sin APIs externas activas por defecto.

## 2. Estado actual

Beta Readiness QA v1 quedo en **WARN** con **GO CONDICIONADO**.

Motivo del WARN:

- No hubo browser real disponible para screenshots desktop/mobile.

Checks que pasaron:

- Tests PASS.
- Typecheck PASS.
- Lint PASS, 0 warnings observados.
- Prisma up to date.
- Produccion sana.
- Owner routes PASS.
- Storefront/product PASS.
- No scripts externos por defecto.
- Secrets no expuestos.
- Flags seguras.

Estado operativo aceptado:

- **GO para beta privada asistida** con 3-5 owners iniciales.
- **NO-GO para beta publica** o masiva hasta cerrar visual QA real y cualquier capacidad prometida al mercado.

## 3. Alcance beta

La beta privada v1 permite:

- Seleccionar owners manualmente.
- Crear o acompanar la creacion de cuenta owner.
- Configurar tienda y productos iniciales.
- Revisar storefront publico antes de compartirlo.
- Operar soporte por canal directo.
- Operar plan y pago de forma manual.
- Usar WhatsApp como cierre comercial principal.

La beta privada v1 no permite prometer:

- Checkout real.
- Pagos automaticos.
- Emails reales o automatizaciones de email.
- CRM activo.
- Custom domains activos.
- Meta CAPI, Meta Pixel, TikTok Events API, TikTok Pixel, Google tags o Cloudflare custom hostnames.
- Public launch masivo o self-service sin acompanamiento.

## 4. Criterios de entrada para un owner beta

Un owner puede entrar a beta privada solo si cumple:

- [ ] Tienda creada.
- [ ] WhatsApp comercial valido.
- [ ] Al menos 1 producto visible.
- [ ] Storefront revisado por JAKAWI.
- [ ] Owner entiende que los pagos son manuales.
- [ ] Owner entiende que no hay checkout real.
- [ ] Owner conoce el canal de soporte directo.
- [ ] Tracking externo apagado salvo configuracion explicita futura.
- [ ] Integraciones externas entendidas como opcionales/no obligatorias.

Recomendado antes de publicar:

- [ ] Logo o portada revisada.
- [ ] Producto principal destacado si aplica.
- [ ] Copy basico revisado.
- [ ] Precio o rango visible.
- [ ] CTA de WhatsApp probado.

## 5. Checklist pre-launch

Ejecutar antes de invitar o activar cada owner.

### Plataforma

- [ ] `/api/health` responde 200.
- [ ] `/login` responde 200.
- [ ] `/registro` responde 200.
- [ ] Flags seguras confirmadas:
  - [ ] `CRM_WEBHOOK_ENABLED=false`.
  - [ ] `CRM_WEBHOOK_QA_ONLY=true`.
  - [ ] `CUSTOM_DOMAINS_ENABLED=false`.
  - [ ] `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`.
  - [ ] `META_CAPI_ENABLED=false`.
  - [ ] `EMAIL_DELIVERY_MODE=disabled`.
- [ ] No secrets visibles en HTML, logs compartidos o evidencia.
- [ ] No pixel externo cargando por defecto.
- [ ] No scripts externos cargando por defecto en storefront/product.

### Owner/app

- [ ] Owner puede entrar a `/app`.
- [ ] Owner puede entrar a `/app/tienda`.
- [ ] Owner puede entrar a `/app/productos`.
- [ ] Owner puede entrar a `/app/plan`.
- [ ] Owner entiende que integraciones son opcionales/no obligatorias.

### Storefront QA

- [ ] Producto demo o tienda QA funcionando.
- [ ] Storefront del owner responde 200.
- [ ] Producto publico responde 200.
- [ ] WhatsApp CTA visible.
- [ ] WhatsApp CTA abre con numero correcto.
- [ ] Precio o informacion comercial visible.
- [ ] No datos demo/QA mezclados con negocio real.

## 6. Checklist onboarding owner

Ejecutar en vivo o de forma asistida con cada owner.

- [ ] Crear cuenta owner.
- [ ] Confirmar email owner.
- [ ] Configurar tienda:
  - [ ] Nombre comercial.
  - [ ] Slug.
  - [ ] Pais/moneda.
  - [ ] WhatsApp.
  - [ ] Descripcion corta.
  - [ ] Logo/portada si aplica.
- [ ] Crear producto:
  - [ ] Nombre.
  - [ ] Descripcion.
  - [ ] Precio o rango.
  - [ ] Imagen si aplica.
  - [ ] Visible.
- [ ] Probar WhatsApp CTA.
- [ ] Revisar storefront publico.
- [ ] Revisar pagina de producto publica.
- [ ] Revisar plan/pago manual.
- [ ] Confirmar que no hay checkout real.
- [ ] Confirmar que pagos se coordinan manualmente.
- [ ] Revisar integraciones como opcional/no obligatorio.
- [ ] Definir canal de soporte directo.
- [ ] Definir proxima revision con el owner.

## 7. Limites conocidos

- No checkout.
- No pagos automaticos.
- No emails reales.
- No CRM activo.
- No Meta CAPI QA.
- No TikTok Events API.
- No Google tags por defecto.
- No Cloudflare custom hostnames.
- No custom domains automaticos.
- No beta publica o masiva.
- Visual QA con browser real pendiente.

Estos limites no bloquean la beta privada asistida si se comunican antes de invitar al owner y no se prometen como disponibles.

## 8. Monitoreo durante beta

Revisar durante beta privada:

- [ ] `/api/health`.
- [ ] Docker service status.
- [ ] Logs web.
- [ ] Errores reportados por owners.
- [ ] Storefront 200 por owner activo.
- [ ] Producto 200 por owner activo.
- [ ] WhatsApp CTA funcional.
- [ ] No secrets en logs.
- [ ] No integraciones externas activadas accidentalmente.
- [ ] No pixels externos cargando por defecto.
- [ ] No emails reales enviados si `EMAIL_DELIVERY_MODE=disabled`.
- [ ] No pagos reales registrados sin evidencia manual externa.

Cadencia recomendada:

- Diaria mientras haya 1-5 owners activos.
- Inmediata si un owner reporta error de login, producto, storefront, WhatsApp o pago manual.
- Antes de ampliar de 3-5 owners a cualquier grupo mayor.

## 9. Rollback/pausa

Si aparece un incidente durante beta:

- Pausar nuevas invitaciones.
- Desactivar acceso owner manualmente si hace falta.
- Mantener flags externas apagadas.
- No activar CRM, Meta, TikTok, Google, Cloudflare, CAPI, emails reales ni checkout para mitigar sin plan aprobado.
- No hacer rollback DB destructivo sin backup verificado.
- Seguir `docs/DEPLOY-SAFETY-RUNBOOK-V1.md` si se requiere release o rollback de app.
- Guardar evidencia fuera del repo.
- No imprimir secrets, cookies, tokens ni URLs privadas en reportes.

## 10. GO/NO-GO

### GO

**GO para beta privada asistida** si:

- Se empieza con 3-5 owners seleccionados manualmente.
- Cada owner pasa el checklist de entrada.
- Onboarding es asistido.
- Pagos se mantienen manuales.
- Soporte es directo.
- No se promete checkout real.
- No se prometen emails reales.
- No se prometen custom domains activos.
- No se prometen integraciones externas activas.
- Flags externas permanecen apagadas por defecto.
- Se acepta el WARN de visual QA pendiente y se agenda el cierre.

### NO-GO

**NO-GO para beta publica** o masiva hasta:

- Completar **Visual QA v1** con browser real y screenshots desktop/mobile.
- Validar emails reales si se prometen emails.
- Validar pagos si se prometen pagos o checkout.
- Validar credenciales Meta/TikTok si se prometen integraciones.
- Validar Google/Cloudflare si se prometen esas integraciones.
- Tener soporte y monitoreo adecuados para el volumen esperado.

## 11. Siguiente hito recomendado

Elegir uno:

1. **Visual QA v1** con browser real.
2. **First Private Owner Onboarding v1** con el primer owner real o owner QA controlado.

Recomendacion: ejecutar **Visual QA v1** antes de ampliar owners, y ejecutar **First Private Owner Onboarding v1** antes de prometer cualquier flujo self-service.
