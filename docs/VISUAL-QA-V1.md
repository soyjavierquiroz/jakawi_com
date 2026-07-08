# JAKAWI - Visual QA v1

Fecha UTC: 2026-07-08T20:35:16Z
Repo: `/var/opt/jakawi.com`
HEAD inicial: `0f8cce1bbddf5a8d8b370f74bfb09a5791529789`
QA_DIR: `/var/backups/jakawi.com/qa/visual-qa-v1/20260708-202707`
Resultado global: **WARN**

## 1. Resumen

Se ejecuto Visual QA v1 con browser real para cerrar la cobertura visual pendiente en storefront, producto publico y dashboard owner basico.

- Browser usado: `Google Chrome for Testing 149.0.7827.55`
- Browser binary: `/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
- Screenshots generadas: si, 8
- Rutas validadas: 8
- Console/page errors criticos: 0
- Overflow horizontal grave: no
- Scripts externos inesperados: no
- Token values exposed: no
- Sesion QA temporal eliminada: si
- Deploy: no ejecutado
- Push: no ejecutado
- APIs externas: no ejecutadas
- Secrets impresos: no

El resultado queda en **WARN menor** por un issue visual mobile: el boton flotante `Privacidad` queda superpuesto al CTA sticky inferior de la pagina de producto mobile y tapa parte del texto del CTA. No se observo pagina rota, overflow grave, error critico ni bloqueo total de la accion.

## 2. Preflight

| Check | Resultado |
| --- | --- |
| Working tree inicial | limpio |
| Branch inicial | `main...origin/main [ahead 46]` |
| `https://jakawi.com/api/health` | PASS, 200, `database=ok` |
| Browser real disponible | PASS, Chrome for Testing |
| Evidencia fuera del repo | PASS, `QA_DIR/evidence` |

No se instalaron dependencias dentro del repo.

## 3. Rutas y screenshots

| Ruta | Viewport | Screenshot | Resultado |
| --- | --- | --- | --- |
| `https://jakawi.com/qa-onboarding-store` | desktop `1440x1000` | `evidence/screenshots/storefront-desktop.png` | PASS |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | desktop `1440x1000` | `evidence/screenshots/product-desktop.png` | PASS |
| `https://jakawi.com/qa-onboarding-store` | mobile `390x844` | `evidence/screenshots/storefront-mobile.png` | PASS |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | mobile `390x844` | `evidence/screenshots/product-mobile.png` | WARN menor |
| `https://jakawi.com/app` | desktop `1440x1000` | `evidence/screenshots/app-dashboard-desktop.png` | PASS |
| `https://jakawi.com/app/productos` | desktop `1440x1000` | `evidence/screenshots/app-products-desktop.png` | PASS |
| `https://jakawi.com/app/integraciones` | desktop `1440x1000` | `evidence/screenshots/app-integrations-desktop.png` | PASS |
| `https://jakawi.com/app/plan` | desktop `1440x1000` | `evidence/screenshots/app-plan-desktop.png` | PASS |

Nota: para revisar el layout real sin overlay, el browser cerro el banner de consentimiento con `Solo necesarias`. No se habilito marketing.

## 4. Checks visuales

| Check | Resultado |
| --- | --- |
| Storefront hero/header visible | PASS |
| Storefront WhatsApp CTA visible | PASS |
| Storefront producto QA visible | PASS |
| Storefront precio visible | PASS |
| Producto publico header/volver visible | PASS |
| Producto publico WhatsApp CTA visible | PASS |
| Producto publico precio visible | PASS |
| Producto publico destacado visible | PASS |
| Mobile no overflow grave | PASS |
| Dashboard owner carga | PASS |
| Cards/progreso owner visibles | PASS |
| Producto base visible en owner productos | PASS |
| Integraciones owner-safe visibles | PASS |
| Plan manual visible | PASS |
| Checkout real visible | no |

## 5. Issues visuales encontrados

| Severidad | Area | Issue | Impacto |
| --- | --- | --- | --- |
| LOW | Producto mobile | El boton flotante `Privacidad` se superpone al CTA sticky inferior `Consultar por WhatsApp` y tapa parte del texto. | No bloquea toda la accion, pero reduce claridad y debe pulirse antes de ampliar owners o usar mobile screenshots como evidencia comercial. |

No se detectaron otros problemas visuales graves en desktop/mobile.

## 6. Console/page errors

| Check | Resultado |
| --- | --- |
| Critical console/page errors | 0 |
| Rutas con error critico | ninguna |
| Chrome stderr relevante | sin evidencia de fallo de pagina |

## 7. Scripts externos y tracking

| Check | Resultado |
| --- | --- |
| Storefront/product external scripts | 0 |
| Meta script cargado por defecto | no |
| TikTok script cargado por defecto | no |
| Google script cargado por defecto | no |
| Consentimiento marketing | no habilitado |
| Tracking permitido | solo first-party interno |

La pagina de integraciones muestra labels de plataformas como configuracion owner-safe, pero no cargo scripts externos.

## 8. Sesion QA temporal

Se uso sesion QA temporal segura para `qa-owner-onboarding@example.com`.

- Cookie/token/hash impresos: no
- Sesion creada para validar rutas owner: si
- Sesion eliminada al final: si
- `temporarySessionDeleted=1`
- `temporarySessionRemaining=0`

## 9. Secret scan

| Check | Resultado |
| --- | --- |
| Token values exposed | no |
| Cookies completas en evidencia | no |
| Secret-like assignments | 0 |
| Forbidden internal strings en HTML/evidencia | 0 |

El scan final se hizo despues de eliminar archivos temporales de token/hash.

## 10. Controles respetados

- No deploy.
- No push.
- No APIs externas.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos.
- No emails.
- No secrets.
- No migraciones Prisma.
- No cambios de codigo.
- No dependencias instaladas dentro del repo.

## 11. Go / No-Go actualizado

**GO CONDICIONADO** para el siguiente owner privado asistido.

Condicion:

- Corregir o aceptar explicitamente el solapamiento mobile del boton `Privacidad` con el CTA sticky antes de ampliar owners o usar screenshots mobile como material comercial.

**NO-GO** para beta publica o ampliacion mayor hasta resolver ese polish visual y mantener la cobertura visual en futuras rutas owner reales.

## 12. Siguiente hito recomendado

1. **Privacy floating CTA mobile polish v1**.
2. **Second Private Owner Onboarding v1** con owner autorizado y onboarding asistido/manual.
