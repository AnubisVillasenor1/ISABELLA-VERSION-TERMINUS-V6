# Estado real de Isabella Genesis — actualizado 31 de octubre de 2026

**Corte documental:** 31 de octubre de 2026 (verificación de persistencia durable en producción); anterior: 30 de octubre de 2026 (Kaos Audio System); anterior: 17 de octubre de 2026  
**Repositorio:** `OsoPanda1/ISABELLA-VERSION-TERMINUS-V6`  
**Rama principal consultada:** `main`  
**HEAD de main al consolidar:** `3da3f71`; este corte documental se commitea sobre ese SHA  
**HEAD de la consolidación anterior:** `8124687`  
**Clasificación:** preproducción; no certificado para producción.

## Readiness reportada y límites

**Avance global de implementación: no publicado como porcentaje único.** Mientras no exista un denominador de requisitos ponderados y reproducible, una cifra agregada sería especulación y no se presenta como hecho.

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
Neon de producción, sobre el despliegue `dpl_EVczyonXW8WsGCuK3FWw73U95FgE`
(commit `3da3f71`). Es evidencia observada, no aprobación humana.

| Capacidad | Estado observado | Evidencia |
|---|---|---|
| Almacén durable de API keys | `tested` en producción | crear → fila en `public.isabella_api_keys`; autenticar → `200`; revocar → `revoked_at`; clave revocada → `401` |
| Almacén durable de federación | `tested` en producción | crear conector `webhook` → fila en `public.federation_connectors`; eliminar → `0` filas |
| BookPI pipeline durable | `healthy` | backend `POSTGRES`, cadena verificada, `eventCount: 0` |
| IKES | `healthy` tras hidratación | el probe espera hasta 5 s la hidratación en curso; una falla se reporta como `degraded`, no como `pending` infinito |
| Admin y firma | `healthy` | `/api/v1/ops/preflight` = `401` sin token y `200` con token; `/api/isabella/crypto/sign` firma Ed25519 |
| Observabilidad | `degraded` | sin `OTEL_EXPORTER_OTLP_ENDPOINT`; la razón ahora se deriva del probe, no está fija |
| Ledger BookPI legacy | `degraded` | `VOLATILE_IN_MEMORY`; consumidores síncronos, migración asíncrona pendiente |

`GET /api/v1/readyz` sigue devolviendo **HTTP 503**: el ledger legacy es una
dependencia requerida y volátil, y la observabilidad opcional degradada mantiene
el estado global en `degraded`. No se oculta ni se reclasifica.

## Evidencia disponible y estado no demostrado

- La documentación reporta un build aislado aprobado en un SHA anterior; el corte de 17 de octubre de 2026 fue documental y no ejecutó el código ni los tests (la consolidación de este corte sí los ejecutó en estación de trabajo: ver más abajo).
- El README registra que `/api/v1/readyz` devolvió HTTP 503 en un preview evaluado previamente; la medición del 31 de octubre vuelve a observar 503, ahora con `bookpi-ledger` como bloqueo requerido y observabilidad opcional degradada.
- La inferencia generativa externa no se considera verificada en producción; requiere proveedor configurado, prueba E2E y tratamiento comprobado de timeout, errores y fallback.
- La persistencia durable de claves de API, federación y BookPI pipeline dejó de ser una suposición: se probó contra la base de producción (ver arriba). Siguen pendientes backup/restore, comportamiento de RLS bajo el rol de servicio, migración asíncrona del ledger legacy, telemetría OTLP y despliegue/rollback reales.
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
