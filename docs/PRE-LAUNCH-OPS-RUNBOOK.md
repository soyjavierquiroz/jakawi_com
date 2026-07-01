# JAKAWI - Pre-Launch Ops Runbook

Estado: draft operativo para private beta controlada.
Ultima actualizacion: 2026-07-01.

Este runbook ordena la operacion manual necesaria antes de pilotos reales. No reemplaza revision legal, contable ni financiera.

## 1. Objetivo

- Operar pilotos privados con pocos negocios reales.
- Evitar confundir revenue real con datos QA/demo.
- Registrar pagos, comisiones, recompensas y suggested actions de forma consistente.
- Mantener decisiones manuales hasta que existan checkout, webhooks y automatizaciones probadas.

## 2. Estado de beta

- JAKAWI no es self-service masivo todavia.
- Los planes pagados se activan manualmente.
- Las comisiones y recompensas se registran manualmente.
- Suggested actions ayudan a detectar trabajo pendiente, pero no ejecutan pagos ni beneficios.
- El soporte debe acompanar cada negocio piloto.

## 3. Roles operativos

- Owner: negocio que administra su espacio comercial.
- Superadmin: operador interno que revisa cuentas, pagos, partners, commissions, rewards y revenue.
- Partner: aliado que comparte links de partner o destinations.
- Soporte: persona responsable de responder problemas de acceso, productos, Seller AI, WhatsApp y pago manual.

## 4. Checklist diario

- Revisar health publico.
- Revisar nuevos registros y espacios comerciales.
- Revisar leads o journeys con errores reportados.
- Revisar pagos manuales pendientes.
- Revisar suggested actions nuevas.
- Revisar clicks/referrals si hay campana activa.
- Registrar cualquier incidencia relevante.

## 5. Checklist semanal

- Revisar pagos confirmados, cancelados y reembolsados.
- Revisar commissions `PENDING`, `PAID` y `CANCELLED`.
- Revisar rewards `PENDING`, `APPLIED` y `CANCELLED`.
- Separar datos QA/demo de metricas comerciales reales.
- Revisar soporte abierto y tiempos de respuesta.
- Confirmar que backups se ejecutaron y que hay evidencia.

## 6. Como operar un piloto

1. Confirmar que el negocio entiende que JAKAWI esta en private beta.
2. Crear o revisar cuenta owner.
3. Validar nombre, slug, WhatsApp, pais, moneda y plan inicial.
4. Cargar o revisar productos principales.
5. Publicar el espacio comercial solo cuando el owner confirme copy e imagenes.
6. Probar link publico, producto detalle, Seller AI si aplica y handoff a WhatsApp.
7. Acordar canal de soporte y horario.
8. Registrar cualquier excepcion manual en notas internas.

## 7. Atencion de soporte

Solicitar siempre:

- Nombre del negocio.
- Email de cuenta.
- Slug del espacio comercial.
- Ruta o pantalla afectada.
- Descripcion del problema.

Nunca solicitar:

- Passwords.
- Claves bancarias.
- Datos completos de tarjeta.
- Secretos de `.env`.
- Acceso personal innecesario.

Verificar que `soporte@jakawi.com` existe antes de pilotos pagos.

## 8. Pago manual

El pago manual es una operacion externa coordinada con soporte. Registrar un pago manual en JAKAWI no ejecuta cobros automaticos.

Proceso:

1. Owner crea cuenta y espacio comercial.
2. Owner indica plan deseado.
3. Soporte confirma precio, moneda y canal externo acordado.
4. Owner envia referencia o comprobante si se solicita.
5. Superadmin registra el pago manual en el ledger.
6. Superadmin marca estado segun evidencia: `CONFIRMED`, `CANCELLED` o `REFUNDED`.
7. Superadmin actualiza plan si corresponde.
8. Soporte confirma al owner que el plan quedo operativo.

Datos minimos del pago:

- Store.
- Plan.
- Monto.
- Moneda.
- Estado.
- Referencia externa no sensible.
- Nota operativa clara.

## 9. Confirmar, cancelar o reembolsar pagos

- `CONFIRMED`: usar solo con evidencia externa suficiente.
- `CANCELLED`: usar cuando el pago no se completo o fue anulado antes de activar beneficio.
- `REFUNDED`: usar cuando hubo devolucion externa confirmada.

No registrar referencias que contengan passwords, tokens, claves, datos completos de tarjeta o credenciales bancarias.

## 10. Actualizar plan

La activacion de plan sigue siendo manual:

1. Confirmar pago o decision comercial.
2. Entrar como superadmin.
3. Revisar store, plan actual y estado.
4. Actualizar plan/status si corresponde.
5. Confirmar con owner por soporte.
6. Registrar nota operativa si el cambio fue excepcional.

## 11. Attribution

Revisar attribution antes de crear commission o reward:

- Store referral: viene de links `/r/:storeSlug`.
- Partner: viene de links `/partner/:code` o destinations.
- Si la attribution parece QA/demo, no usar para obligacion comercial real sin revision.
- Si hay conflicto entre partner y referral, escalar antes de registrar dinero o beneficio.

## 12. Comision manual

Usar commissions para obligaciones con partners. No son revenue del negocio.

Proceso:

1. Verificar partner activo.
2. Verificar pago confirmado asociado.
3. Revisar attribution.
4. Calcular monto segun politica comercial aprobada.
5. Crear commission manual con estado inicial prudente.
6. Marcar `PAID` solo cuando el pago externo al partner este confirmado.
7. Marcar `CANCELLED` si no corresponde.

## 13. Recompensa manual

Usar rewards para beneficios a stores referidoras. No son payout a partner.

Proceso:

1. Verificar store referidora.
2. Verificar store referida y pago confirmado.
3. Revisar attribution.
4. Confirmar politica de beneficio.
5. Crear reward manual.
6. Marcar `APPLIED` solo cuando el beneficio se aplico realmente.
7. Marcar `CANCELLED` si no corresponde.

## 14. Suggested actions

Suggested actions son ayudas de revision:

- `SUGGESTED`: hay una accion posible que revisar.
- `COVERED`: ya existe commission/reward relacionado.
- `NEEDS_REVIEW`: requiere criterio humano.
- `NOT_APPLICABLE`: no corresponde accion automatica.

No ejecutar pagos, comisiones ni recompensas solo porque aparece una sugerencia. Siempre revisar evidence, attribution y data QA.

## 15. Revenue vs commission vs reward

- Revenue: dinero recibido o gestionado por plan de store.
- Commission: obligacion o pago a partner.
- Reward: beneficio aplicado a una store referidora.

No mezclar estos conceptos en reportes comerciales.

## 16. Datos QA/demo

- Mantener identificados stores, partners, pagos, commissions, rewards y clicks demo.
- No usar datos QA como revenue real.
- No borrar datos de produccion sin plan aprobado.
- Antes de reporting comercial, excluir o etiquetar QA.

## 17. Que NO hacer

- No activar self-service masivo.
- No prometer ventas garantizadas.
- No prometer checkout automatico.
- No prometer comisiones automaticas.
- No modificar pagos reales sin evidencia.
- No borrar data QA sin aprobacion.
- No restaurar backups sobre produccion sin ventana y aprobacion.
- No exponer secretos o dumps.

## 18. Incidentes y escalamiento

Escalar inmediatamente si ocurre:

- Health falla o DB no responde.
- Error que impide login o ventas publicas.
- Sospecha de abuso, spam o scraping.
- Pago con evidencia contradictoria.
- Partner reclama commission no conciliada.
- Owner reclama plan pagado no activo.
- Exposicion accidental de dato sensible.

Registrar: fecha UTC, impacto, rutas afectadas, usuario/store si aplica, acciones tomadas y responsable.

## 19. Checklist antes de admitir un negocio real

- Legal/privacidad/cookies/contacto publicados.
- Soporte operativo y email confirmado.
- Backup y restore drill documentados.
- QA mobile basico hecho.
- QA autenticado owner hecho.
- Pago manual explicado al owner.
- Store demo/QA separada de datos reales.
- Owner entiende beta y operacion manual.
