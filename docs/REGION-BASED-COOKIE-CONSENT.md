# Region-Based Cookie Consent

JAKAWI vende por WhatsApp, asi que el consentimiento no debe bloquear la conversion en regiones no estrictas.

## Comportamiento

- LATAM y regiones `default_all`: no muestran popup de cookies.
- En `default_all`, el consentimiento first-party se crea por defecto con `necessary=true`, `analytics=true`, `marketing=true`, `source=region_default` y `regionMode=default_all`.
- Regiones strict muestran el banner de consentimiento antes de analytics o marketing.
- En strict, `necessary=true` siempre; `analytics=false` y `marketing=false` hasta aceptacion o guardado manual.
- Las preferencias manuales del visitante se respetan aunque la region actual sea `default_all`.
- El boton discreto de privacidad permite cambiar preferencias cuando ya hay consentimiento guardado.

## Regiones Strict

Las regiones strict son:

- Estados Unidos: `US`
- Canada: `CA`
- Reino Unido: `GB`
- Suiza: `CH`
- EEA/EU: `AT`, `BE`, `BG`, `HR`, `CY`, `CZ`, `DK`, `EE`, `FI`, `FR`, `DE`, `GR`, `HU`, `IE`, `IT`, `LV`, `LT`, `LU`, `MT`, `NL`, `PL`, `PT`, `RO`, `SK`, `SI`, `ES`, `SE`, `IS`, `LI`, `NO`

Todo lo demas usa `default_all`.

## Deteccion

La clasificacion usa `CF-IPCountry` de Cloudflare. Si el pais es desconocido, el fallback viene de `COOKIE_CONSENT_UNKNOWN_REGION_MODE`; si no esta configurado o es invalido, el default seguro es `strict`.

Para QA existe `?cookieRegion=CO`, `?cookieRegion=US` o `?cookieRegion=ES`, pero solo funciona fuera de produccion o con `COOKIE_CONSENT_QA_REGION_OVERRIDE_ENABLED=true`. No hay UI publica para este override.

## QA Produccion

Smoke esperado para Exitosos:

- `https://exitosos.com` sigue mostrando la tienda Exitosos.
- `https://exitosos.com/p/caesar-with-chicken` sigue cargando producto.
- LATAM/default_all no muestra el texto visible `Consentimiento de tracking`.
- LATAM/default_all no bloquea UI.
- Strict muestra popup y no activa marketing antes de aceptar.

No se requieren migraciones. No se exponen secrets.
