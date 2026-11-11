# Estado real de Isabella Genesis — actualizado 1 de noviembre de 2026

**Corte documental:** 1 de noviembre de 2026 (fusión de ISABELLA CERO); anterior: 31 de octubre de 2026 (verificación de persistencia durable en producción); anterior: 30 de octubre de 2026 (Kaos Audio System); anterior: 17 de octubre de 2026  
**Repositorio:** `OsoPanda1/ISABELLA-VERSION-TERMINUS-V6`  
**Rama principal consultada:** `main`  
**HEAD de main al consolidar:** `b30b915` + el commit de fusión de este corte; la verificación de producción sigue correspondiendo a `b30b915`  
**HEAD de la consolidación anterior:** `d1a557d`; antes `8124687`  
**Clasificación:** preproducción; no certificado para producción.

## Readiness reportada y límites

**Avance global para producción y despliegue: 62.6 %, calculado y no estimado.** El denominador que faltaba cuando este documento se negó a publicar una cifra agregada ya existe: `scripts/production-progress.mjs` mide cuatro ejes con peso declarado (superficie 0.2, pruebas 0.2, capacidades 0.15, despliegue 0.45) sobre artefactos del árbol y evidencia sellada en `docs/status/production-progress-evidence.json`. Se reproduce con `node scripts/production-progress.mjs` y `test/deployment/readiness-consistency.test.ts` falla si el README cita una cifra distinta a la calculada. Es avance ponderado, no aptitud: con la puerta `health_readiness` en `failed` el sistema sigue sin ser desplegable.

> Histórico: la tabla de dominios de abajo es la rúbrica sin pesos de este mismo documento (61/100). Convive con el 62.6 % porque responde a otra pregunta —qué dominios tienen evidencia— y no es un porcentaje de producción; no se suman ni se promedian entre sí. Ver `docs/history/archive/DIVERGENCIAS-2026-11-04.md`.

> Histórico: la versión de 12 de octubre de 2026 estimaba 46.25% con otra rúbrica (runtime 20, pruebas 20, seguridad 15, inferencia 15, persistencia 10, CI/Rust 10, operación 10). Se reemplazó para no mantener dos cifras contradictorias.

| Dominio | Obtenidos / disponibles |
|---|---:|
| Runtime, compilación y pruebas | 25 / 25 |
| Seguridad y CI | 16 / 20 |
| Persistencia e integridad de datos | 5 / 20 |
| Inferencia y conversación | 7 / 15 |
| Despliegue y recuperación | 5 / 10 |
| Observabilidad y operación | 3 / 10 |
| **Total** | **61 / 100** |

> La tabla anterior es la estimación del corte del 30 de octubre de 2026. La verificación de producción del 31 de octubre (abajo) aporta evidencia nueva de persistencia, pero no se traduce automáticamente en un porcentaje: no existe todavía un denominador ponderado reproducible para recalcularlo sin especular.

## Verificación de producción del 31 de octubre de 2026

Medición contra el alias `https://isabella-version-terminus-v6.vercel.app` y la base
Neon de producción, sobre el despliegue `dpl_EmHNfpFxWEy6qQ8wtDWFQcs83mAc`
(commit `b30b915`); la verificación de durabilidad inicial correspondió a
`dpl_EVczyonXW8WsGCuK3FWw73U95FgE` (commit `3da3f71`). Es evidencia observada, no
aprobación humana.

| Capacidad | Estado observado | Evidencia |
|---|---|---|
| Almacén durable de API keys | `tested` en producción | crear → fila en `public.isabella_api_keys`; autenticar → `200`; revocar → `revoked_at`; clave revocada → `401` |
| Almacén durable de federación | `tested` en producción | crear conector `webhook` → fila en `public.federation_connectors`; eliminar → `0` filas |
| BookPI pipeline durable | `healthy` | backend `POSTGRES`, cadena verificada, `eventCount: 0` |
| IKES | `healthy` en el primer probe del cold start | backend `SUPABASE`, `pending: false`, tras subir el timeout por petición a 10 s (`f52de5a`) |
| Auto-reparación de almacenes durables | `tested` (pruebas), no observada en producción | el backend ya no se abandona al primer timeout: reintento con retroceso 5→60 s y escrituras que fallan de forma visible mientras la base sigue caída (`b30b915`) |
| Admin y firma | `healthy` | `/api/v1/ops/preflight` = `401` sin token y `503` con token por los dos hallazgos de Stripe; `/api/isabella/crypto/sign` firma Ed25519 |
| Observabilidad | `degraded` | sin `OTEL_EXPORTER_OTLP_ENDPOINT`; la razón ahora se deriva del probe, no está fija |
| Ledger BookPI legacy | `degraded` | `VOLATILE_IN_MEMORY`; consumidores síncronos, migración asíncrona pendiente |

`GET /api/v1/readyz` sigue devolviendo **HTTP 503**: el ledger legacy es una
dependencia requerida y volátil; la observabilidad opcional degradada mantiene el
estado global en `degraded` sin añadirse como bloqueador. No se oculta ni se
reclasifica.

## Fusión ISABELLA CERO (1 de noviembre de 2026)

Origen auditado: `AnubisVillasenor1/proyecto-isabella-cero`, commit `ac6136f` (rama `main`).
Los dos documentos canónicos se conservan en `docs/canon/source/` con SHA-256; el dictamen
completo está en `docs/rfc/RFC-0011-fusion-isabella-cero.md`.

| Capacidad fusionada | Estado real | Evidencia | Límite declarado |
|---|---|---|---|
| Matriz de 10 roles CERO (`src/agents/mesh.ts`) | `tested (unit)` | `test/agents/mesh.test.ts` | No concede autoridad; `ALLOW` no ejecuta |
| Evaluación `ALLOW/DENY/ESCALATE` | `tested (unit)` | `test/agents/mesh.test.ts` | Aprobación solo desde bearer verificado |
| Orquestador con concurrencia y timeout | `tested (unit)` | `test/agents/mesh.test.ts` | Solo adaptadores registrados; `NO_ADAPTER` sin simulación |
| Sello BookPI por decisión | `tested (unit)` | `test/agents/mesh.test.ts` con `InMemoryBookPiLedger` | No cambia el bloqueo `bookpi-ledger:degraded` |
| Sandbox de archivos (`src/agents/sandbox.ts`) | `tested (unit)` | `test/agents/sandbox.test.ts` | No cableado a HTTP; no aplica parches |
| Planner y Reviewer deterministas | `tested (unit)` | `test/agents/mesh.test.ts` | Sin modelo, red ni shell |
| Coder-en-sandbox | `tested (unit)` | `test/agents/mesh.test.ts` vía adaptador | Solo escribe propuestas en sandbox; no registrado en el servidor |
| `GET /api/v1/agents/mesh` y `POST /api/v1/agents/mesh/evaluate` | `tested (contract)` | `test/routes/agents-mesh.test.ts` + inventario de rutas | `executionPerformed: false` siempre |

No se importó la aplicación Next.js de origen: su chat, su editor y su "capability deck" son
simulados (`sendPrompt` devuelve texto fijo, `runProject` solo cambia un estado visual y
`lib/kernel.ts`/`README.md` no existen en ese repositorio). Tampoco se importaron sus snippets
de `BookPILedger` ni `safeSandboxPath`, que contienen fallos verificables descritos en el RFC-0011.

La fusión **no** modifica la verificación de producción del 31 de octubre, **no** eleva
`/api/v1/readyz` y **no** declara ninguna capacidad nueva en producción. Sigue pendiente
observar el ciclo completo fallo→recuperación de los almacenes durables en una instancia real.

## Fusión Master Consolidated (1 de noviembre de 2026)

Documento fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, importado sin reescribir en
`docs/canon/source/ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED-03d11d.docx` (434 558 B, SHA-256
`03d11de521312e4fa90e8cbe87f3dcf199d0124d26211227d6d9e83205e378b1`). El dictamen completo está
en `docs/rfc/RFC-0012-infinity-master-consolidated.md`; el mapa operativo, en
`docs/infinity/README.md`.

| Capacidad fusionada | Estado real | Evidencia | Límite declarado |
|---|---|---|---|
| 14 capas Ω + 9 Fabrics (`src/infinity/architecture.ts`) | `tested (unit)` | `test/infinity/architecture-catalog.test.ts` | Registro de arquitectura; la auditoría falla si se declara `production` |
| Catálogo 10 skills + 18 tools + 14 primitivas + 12 servicios (`src/infinity/catalog.ts`) | `tested (unit)` | `test/infinity/architecture-catalog.test.ts` | Las tools `mapped` no tienen módulo ni ejecución |
| Constitución `ALLOW = ID × AUTH × POLICY × EVIDENCE × SAFETY` (`src/infinity/constitution.ts`) | `tested (unit)` | `test/infinity/constitution-skills.test.ts` | `ALLOW` no autoriza, no ejecuta ni sustituye CROWN |
| Ingesta de 14 etapas, licencias y trust asesor | `tested (unit)` | `test/infinity/constitution-skills.test.ts` | `ADMIT` documental; no descarga ni entrena |
| 10 skills nativas deterministas (`src/infinity/skills.ts`) | `tested (unit)` | `test/infinity/constitution-skills.test.ts` | `externalCalls: 0`; no buscan en red ni sintetizan audio/voz |
| Media Fabric (`src/infinity/media.ts`) | `tested (unit)` | `test/infinity/media-build-evolution.test.ts` | `pixelsModified: false`, `networkUsed: false`; no publica ni cobra |
| Build Fabric (`src/infinity/build.ts`) | `tested (unit)` | `test/infinity/media-build-evolution.test.ts` | Solo plan; no escribe sandbox, no ejecuta, no despliega |
| Evolution Fabric (`src/infinity/evolution-fabric.ts`) | `tested (unit)` | `test/infinity/media-build-evolution.test.ts` | Simulación en memoria; no publica, no adopta, no emite créditos |
| 7 rutas `/api/v1/infinity/*` (`src/routes/infinity.ts`) | `tested (contract)` | `test/routes/infinity.test.ts` + inventario de rutas | `production: false` y `executionPerformed: false` siempre |

Divergencia documentada: el resumen del documento dice “19 tools”, pero su tabla de la sección 16
enumera 18. El catálogo sigue la tabla y no inventa una herramienta para cuadrar la cifra. Las
capas Ω-4 y Ω-11 no se definen en el canon y no se inventaron.

El 20× se trata como **meta por capacidad**, no como resultado: no existe benchmark reproducible,
por lo que no se declara. Tampoco se implementaron ejecución real de agentes Coder/Tester/DevOps/
Operator, despliegue multi-destino, publicación de cápsulas, emisión de créditos, búsqueda/fetch
web regulada, `repo.*`, aprendizaje de estilo sobre píxeles, detección facial real ni aislamiento
gVisor/TPM.

Esta fusión **no** modifica la verificación de producción del 31 de octubre y **no** eleva
`/api/v1/readyz`. Sus rutas quedan en `implemented` + `tested (unit)` hasta que se verifiquen en
el despliegue; eso demuestra computación local, no producción.


## Evidencia disponible y estado no demostrado

- La documentación reporta un build aislado aprobado en un SHA anterior; el corte de 17 de octubre de 2026 fue documental y no ejecutó el código ni los tests (la consolidación de este corte sí los ejecutó en estación de trabajo: ver más abajo).
- El README registra que `/api/v1/readyz` devolvió HTTP 503 en un preview evaluado previamente; la medición del 31 de octubre vuelve a observar 503, ahora con `bookpi-ledger` como bloqueo requerido y observabilidad opcional degradada.
- La inferencia generativa externa no se considera verificada en producción; requiere proveedor configurado, prueba E2E y tratamiento comprobado de timeout, errores y fallback.
- La persistencia durable de claves de API, federación y BookPI pipeline dejó de ser una suposición: se probó contra la base de producción (ver arriba). Siguen pendientes backup/restore, comportamiento de RLS bajo el rol de servicio, migración asíncrona del ledger legacy, telemetría OTLP y despliegue/rollback reales.
- El aborto `This operation was aborted` que degradaba IKES en cold start se debía al timeout de 2 s del adaptador Supabase; el valor por defecto es ahora 10 s (`ISABELLA_IKES_REQUEST_TIMEOUT_MS`) y el primer probe del despliegue `b30b915` reportó IKES saludable.
- En una invocación fría aislada se observó además un timeout simultáneo de Supabase y Postgres. Los almacenes ya no se abandonan: reintentan con retroceso y las escrituras fallan de forma visible mientras la base siga caída. El ciclo completo fallo→recuperación en una instancia real todavía no se observó; solo está cubierto por pruebas.
- La PR de UI/chat #23 y los cambios de documentación deben evaluarse en su propio SHA; no equivalen a una fusión ni a una liberación.

## Consolidación del Kaos Audio System (30 de octubre de 2026)

Medición efectuada en estación de trabajo sobre el árbol de trabajo descrito arriba; **no** es CI
conservada ni evidencia firmada en el entorno objetivo.

| Capacidad | Estado medido | Prueba que la sustenta |
|---|---|---|
| DSP espectral (`src/tamv/dsp.ts`) | `tested` | `test/tamv/dsp.test.ts` con oráculo DFT ingenuo |
| Análisis, clasificador y perfil (`src/tamv/analysis.ts`) | `tested` | `test/tamv/analysis.test.ts` |
| Presets de fábrica y matriz acústica | `tested` | `test/tamv/presets.test.ts` (11 presets) |
| Preset adaptativo determinista | `tested` | `test/tamv/adaptive.test.ts` |
| Plan de redefinición y sus puertas | `tested` | `test/tamv/plan.test.ts` (8 etapas, 15 puertas) |
| Monitor de telemetría | `tested` | `test/tamv/monitor.test.ts` (10 lecturas; 4 de hardware declaradas no medidas) |
| Motor u orquestador | `tested` | `test/tamv/engine.test.ts` |
| Superficie HTTP `/api/v1/tamv` | `tested` | `test/routes/tamv.test.ts` + `docs/api/route-inventory.json` |
| Render de audio, síntesis de voz, separación de fuentes, HRTF, LUFS, háptica | `specified` | sin implementación; el motor lo declara en cada respuesta |
| Despliegue del Kaos Audio System en producción | `planned` | el 500 de `/` fue reproducido, corregido y verificado (RFC-0007); el Kaos Audio System aún no está desplegado |

Registros actualizados con la madurez real: `ΩX-26` en `src/platform/omega-canon.ts` y
`KaosAudioSystem` en `src/territory/tamv-integration.ts` (`tested`, con disclaimer de lo que no
hace). `pnpm typecheck` quedó sin errores y la suite TAMV en 125 pruebas verdes; `pnpm test`
completo sigue ejecutándose en CI sobre el SHA candidato antes de considerarse evidencia.

## Bloqueadores prioritarios

1. Ejecutar y conservar CI con pasos/logs válidos sobre el SHA candidato: typecheck, pruebas, build, seguridad y smokes.
2. Cerrar la persistencia restante: migrar el ledger legacy síncrono a un camino durable (requiere refactor asíncrono o decisión de arquitectura), aplicar/adaptar Atlas e IKES, y demostrar backup/restore. La durabilidad de API keys, federación y BookPI pipeline ya se probó en producción.
3. Configurar `OTEL_EXPORTER_OTLP_ENDPOINT` (o backend equivalente) y verificar exportación real; sin eso `observability` sigue degradada.
4. Resolver los dos bloqueadores de Stripe (`PF-STRIPE-WEBHOOK-MISSING`, `PF-STRIPE-TEST-KEY`) con acceso al panel y una clave de producción.
5. Demostrar una conversación generativa E2E con proveedor autorizado; comprobar fallback sin presentar la respuesta determinista local como inferencia de modelo.
6. Ejecutar E2E de navegador en desktop/móvil para navegación, conversación, accesibilidad y errores.
7. Medir latencia p50/p95/p99 y consumo bajo carga reproducible; no afirmar “latencia casi cero” sin datos.
8. Probar despliegue, monitorización, backup/restore y rollback en el entorno objetivo.
9. Resolver las 4 vulnerabilidades moderadas reportadas por Dependabot.

## Jerarquía de documentación

- [README](../README.md): resumen público, categoría, limitaciones y estimación global.
- [Índice canónico](README.md): mapa de fuentes y política de consolidación.
- [Mapa operativo](ARCHITECTURE-OPERATING-MAP.md): arquitectura y fronteras de integración.
- [Runbook de readiness](ops/PRODUCTION-READINESS-RUNBOOK.md): acciones para cerrar bloqueadores.
- [Auditoría técnico-operativa](audits/TECHNICAL-OPERATIONAL-AUDIT-2026-10-13.md) y [reducción de deuda técnica](audits/TECH-DEBT-REDUCTION-2026-10-13.md): hallazgos y cambios con alcance histórico.

## Regla de actualización

Actualizar este estado solo después de comprobar el SHA actual, los resultados reales de CI, el deployment y las dependencias externas. Separar siempre `IMPLEMENTED`, `TESTED`, `INTEGRATED`, `VERIFIED` y `DEPLOYED`. La existencia de código o documentación no satisface por sí sola ninguno de los gates externos.
