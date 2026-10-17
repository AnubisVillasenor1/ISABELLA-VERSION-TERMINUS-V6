# Estado operativo real — Isabella TERMINUS V6

**Corte documental:** 17 de octubre de 2026  
**Repositorio:** `OsoPanda1/ISABELLA-VERSION-TERMINUS-V6`  
**Rama principal consultada:** `main`  
**HEAD de main al iniciar esta consolidación:** `94955427dc49cd4548100f7bca1d7d91dc457619`  
**Clasificación:** preproducción; no certificado para producción.

## Readiness reportada y límites

El README reporta **61.0%** como estimación ponderada de preparación operativa. Esa cifra procede del snapshot de build `7f88ce93417971580c96bdeeedb30a5102b46e20`; no se ha reproducido contra el HEAD de main indicado arriba durante esta consolidación. Se conserva como **última estimación documentada**, no como medida recién validada del HEAD actual.

Existe una inconsistencia de trazabilidad: el README menciona dos recuentos históricos de pruebas (`1,568/264 archivos` y `1,581/267 archivos`). Ninguno debe presentarse como resultado del HEAD actual hasta repetir instalación congelada, typecheck, suite completa, build, smoke y seguridad sobre un SHA único.

## Evidencia disponible y estado no demostrado

- La documentación reporta un build aislado aprobado en un SHA anterior; esta consolidación documental no ejecutó el código ni los tests.
- El README registra que `/api/v1/readyz` devolvió HTTP 503 en un preview evaluado previamente.
- La inferencia generativa externa no se considera verificada en producción; requiere proveedor configurado, prueba E2E y tratamiento comprobado de timeout, errores y fallback.
- Persisten gates documentados relacionados con `BOOKPI_INTEGRITY_SECRET`, migraciones y probes de Atlas/IKES, durabilidad global de BookPI, CI observable, telemetría y despliegue/rollback reales.
- La PR de UI/chat #23 y los cambios de documentación deben evaluarse en su propio SHA; no equivalen a una fusión ni a una liberación.

## Bloqueadores prioritarios

1. Ejecutar y conservar CI con pasos/logs válidos sobre el SHA candidato: typecheck, pruebas, build, seguridad y smokes.
2. Resolver y probar configuración de persistencia: secretos del servidor, migraciones aplicadas, readiness de Atlas/IKES y durabilidad/recuperación de BookPI.
3. Demostrar una conversación generativa E2E con proveedor autorizado; comprobar fallback sin presentar la respuesta determinista local como inferencia de modelo.
4. Ejecutar E2E de navegador en desktop/móvil para navegación, conversación, accesibilidad y errores.
5. Medir latencia p50/p95/p99 y consumo bajo carga reproducible; no afirmar “latencia casi cero” sin datos.
6. Probar despliegue, monitorización, backup/restore y rollback en el entorno objetivo.

## Jerarquía de documentación

- [README](../README.md): resumen público, categoría, limitaciones y estimación global.
- [Índice canónico](README.md): mapa de fuentes y política de consolidación.
- [Mapa operativo](ARCHITECTURE-OPERATING-MAP.md): arquitectura y fronteras de integración.
- [Runbook de readiness](ops/PRODUCTION-READINESS-RUNBOOK.md): acciones para cerrar bloqueadores.
- [Auditoría técnico-operativa](audits/TECHNICAL-OPERATIONAL-AUDIT-2026-10-13.md) y [reducción de deuda técnica](audits/TECH-DEBT-REDUCTION-2026-10-13.md): hallazgos y cambios con alcance histórico.
- [Archivo de auditorías históricas](archive/HISTORICAL-AUDITS-GENESIS-TINA-2026-10-08-12.md): snapshots anteriores o de otros repositorios.

## Regla de actualización

Actualizar este estado solo después de comprobar el SHA actual, los resultados reales de CI, el deployment y las dependencias externas. Separar siempre `IMPLEMENTED`, `TESTED`, `INTEGRATED`, `VERIFIED` y `DEPLOYED`. La existencia de código o documentación no satisface por sí sola ninguno de los gates externos.
