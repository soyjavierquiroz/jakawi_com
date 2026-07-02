# JAKAWI - Private Beta Checklist

Estado: checklist operativo para pilotos controlados.
Ultima actualizacion: 2026-07-01.

## 1. Antes de sumar un negocio

- Confirmar que el negocio entiende la private beta.
- Confirmar canal de soporte.
- Verificar que `soporte@jakawi.com` existe y recibe mensajes.
- Confirmar legal/privacidad/cookies/contacto publicados.
- Confirmar backup reciente y restore drill documentado antes de piloto pago.
- Verificar que el negocio no depende de checkout automatico.
- Explicar que plan, pagos, commissions y rewards son manuales durante beta.
- Confirmar que no se usaran datos QA como metricas reales.

## 2. Durante onboarding

- Crear cuenta owner o acompanar registro.
- Revisar nombre comercial, slug, pais, moneda y WhatsApp.
- Cargar productos principales con imagenes razonables.
- Revisar precios, disponibilidad y descripciones con el owner.
- Activar Seller AI solo si el plan lo permite.
- Probar espacio publico en mobile.
- Probar producto detalle.
- Probar handoff a WhatsApp.
- Confirmar que el owner sabe editar productos y revisar leads.

## 3. Despues de publicar

- Abrir el link publico desde mobile.
- Revisar que no haya scroll horizontal obvio.
- Revisar CTA sticky mobile.
- Revisar que imagenes carguen.
- Revisar que productos demo no se mezclen con productos reales.
- Confirmar que WhatsApp abre con contexto correcto.
- Registrar fecha UTC de publicacion.

## 4. Despues del primer lead

- Confirmar que el lead aparece para owner.
- Revisar journey y eventos.
- Confirmar que no hay datos sensibles innecesarios.
- Preguntar al owner si la consulta llego clara.
- Ajustar copy/productos si el cliente hizo preguntas repetidas.

## 5. Despues del primer pago manual

- Confirmar evidencia externa.
- Registrar pago manual en superadmin.
- Actualizar plan si corresponde.
- Confirmar al owner.
- Revisar attribution.
- Revisar suggested actions.
- Crear commission o reward manual solo si corresponde.
- Documentar cualquier excepcion.

## 6. Criterios para pasar de 1-3 negocios a 5-20

- Backups diarios operando.
- Restore drill exitoso en entorno separado.
- Legal/support/pago manual publicados y entendidos.
- QA mobile y authenticated owner/admin/partner completada.
- Rate limiting minimo implementado o trafico muy controlado.
- Soporte responde dentro del SLA operativo acordado.
- Revenue, commissions y rewards separados correctamente.
- Data QA etiquetada, excluida o documentada.
- No hay incidentes criticos abiertos.

## 7. Criterios para NO escalar

- No hay backup reciente.
- No hay restore probado.
- Soporte no responde.
- Owners no entienden pago manual.
- Hay confusiones entre revenue, commission y reward.
- Seller AI entrega informacion comercial incorrecta sin mitigacion.
- Mobile bloquea flujos clave.
- Datos QA contaminan reportes comerciales.
- Hay abuso en auth, tracking, uploads o Seller AI sin control.
- Falta revision legal antes de apertura publica masiva.

## 8. Execution report

Execution v1 completed in `docs/PRIVATE-BETA-LAUNCH-CHECKLIST-EXECUTION.md`.

## 9. Owner onboarding

Owner Onboarding Checklist v1: `docs/OWNER-ONBOARDING-CHECKLIST.md`.
