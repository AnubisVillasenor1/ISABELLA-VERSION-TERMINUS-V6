# Estado real de Isabella Genesis — 11 de octubre de 2026

**Repositorio:** \`OsoPanda1/isabella-V6-TINA-h6\`  
**Rama inspeccionada:** \`evolution/runtime-hardening-2026-10\`  
**SHA de referencia previo a este incremento:** \`e1c09b6f4569b6e4d845eba8dff902f16a1c8d45\`  
**Clasificación:** beta de ingeniería / Preview; no producción certificada.

## Readiness estimada

**44.25% ponderado (≈44%) de preparación para producción.** Esta cifra es una evaluación de gates, no una métrica científica ni porcentaje de funcionalidades. Se calculó con los siguientes pesos y estimaciones de evidencia del estado anterior a este commit.

| Dimensión | Peso | Puntaje | Aporte |
|---|---:|---:|---:|
| Runtime HTTP y flujo local | 20 | 75 | 15 |
| Pruebas y validación automatizada | 20 | 75 | 15 |
| Seguridad y guardrails | 15 | 45 | 6.75 |
| Inferencia externa real verificada | 15 | 0 | 0 |
| Persistencia durable y recuperación | 10 | 20 | 2 |
| CI reproducible y workspace Rust | 10 | 20 | 2 |
| Operación, observabilidad y rollback | 10 | 35 | 3.5 |
| **Total** | **100** |  | **44.25** |

## Evidencia observada

- El Preview asociado al SHA de referencia figuraba como \`READY\` en Vercel.
- El smoke test del runtime local y las guardas de API estaban incorporados en el proceso de build.
- Las pruebas de YUN cubren validación, hash determinista y detección de alteración.
- GitHub Actions devolvió ejecuciones con conclusión \`startup_failure\` y cero jobs para los run IDs inspeccionados.
- \`ige-omega/Cargo.lock\` no existía en la rama inspeccionada.
- No había evidencia de una respuesta real generada por un proveedor externo elegible en Preview.
- La presencia de módulos BookPI, IKES o YUN no demuestra persistencia durable ni integración federada completa.

## Cambios de este incremento

- Extracción de reglas de configuración de inferencia a \`src/inference/provider-policy.ts\`.
- Pruebas unitarias para límites de timeout/cooldown, guardas de modelos de OpenRouter y extracción de contenido textual.
- Integración de esas funciones compartidas en el runtime HTTP.
- Reescritura del README para diferenciar componentes ejecutables, objetivos arquitectónicos y bloqueos de producción.

## Evidencia de Preview — SHA ff2ed47

- Vercel deployment del SHA `ff2ed475163dc4949b6c13dabf63cd2e1200b8f0`: **READY**.
- `pnpm run build` completó TypeScript, Vitest, bundle esbuild, `node --check src/ui/app.js`, smoke de UI y smoke de runtime.
- Vitest: **519 pruebas aprobadas, 100 archivos de prueba aprobados**.
- `UI_NAVIGATION_SMOKE_OK`, `LOCAL_CONVERSATION_SMOKE_OK`, `PUBLIC_API_GUARDRAILS_OK` y `OPENROUTER_PAID_ID_BLOCK_OK` presentes.
- `GET /`, `/ui/app.js`, `/styles/cinematic.css` y `/api/v1/health`: HTTP 200; cabeceras de seguridad presentes en API.
- `LLM_GATEWAY_SMOKE_SKIPPED`: no hay credenciales gratuitas elegibles; la inferencia externa no está demostrada.
- GitHub Actions sigue devolviendo `startup_failure` sin jobs.
- `ige-omega/Cargo.lock` sigue ausente.
- El smoke UI valida enlaces/anclas, elementos de control y cableado estático; no sustituye una prueba E2E real en navegadores móviles y de escritorio.

## Gates pendientes

- Obtener ejecución de CI con jobs y conclusión verde sobre el SHA actual.
- Ejecutar y registrar \`pnpm typecheck\`, \`pnpm test\`, \`pnpm build\` y \`pnpm run security:suite\` sobre el SHA actual.
- Generar \`Cargo.lock\` mediante Cargo, revisar cambios y superar fmt/Clippy/tests/build.
- Ejecutar el gate manual de modelo con credenciales configuradas en el entorno, nunca en Git.
- Probar fallos de proveedor simulados y reales: timeout, 429, 5xx, respuesta vacía, cooldown y fallback.
- Validar persistencia, aislamiento multi-tenant, recuperación, observabilidad, rate limits y rollback.

## Interpretación

El porcentaje se debe actualizar cuando se obtenga nueva evidencia. Un build exitoso de Preview no aumenta automáticamente los puntajes de persistencia, CI, seguridad o inferencia externa. No promover a producción mientras haya gates obligatorios pendientes.
