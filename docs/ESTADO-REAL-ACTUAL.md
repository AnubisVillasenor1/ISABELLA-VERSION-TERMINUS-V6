# Estado real de Isabella Genesis — 12 de octubre de 2026

**Repositorio:** `OsoPanda1/Isabella-V6-TINA-h6`  
**Rama de runtime validada:** `main`  
**SHA de runtime TypeScript validado:** `03e6f68ebc3ee5bec39bd42a69c0d704b40aff76`  
**Deployment Vercel:** [READY](https://vercel.com/isabella-mexa/isabella-v6-tina/HAC1kk2Ha1T5ukJNjRXiWjW8RwVq)  
**Clasificación:** beta de ingeniería con validación de build; no producción certificada.

## Readiness estimada

**46.25% ponderado (≈46%) de preparación para producción.** Es una evaluación de gates, no una métrica científica ni un porcentaje de funcionalidades. No se incrementa por el mero aumento del número de pruebas: siguen abiertos la inferencia externa real, CI reproducible, la validación Rust, el E2E de persistencia y la prueba operativa de recuperación.

| Dimensión | Peso | Puntaje | Aporte |
|---|---:|---:|---:|
| Runtime HTTP y flujo local | 20 | 75 | 15 |
| Pruebas y validación automatizada | 20 | 75 | 15 |
| Seguridad y guardrails | 15 | 45 | 6.75 |
| Inferencia externa real verificada | 15 | 0 | 0 |
| Persistencia durable y recuperación | 10 | 40 | 4 |
| CI reproducible y workspace Rust | 10 | 20 | 2 |
| Operación, observabilidad y rollback | 10 | 35 | 3.5 |
| **Total** | **100** |  | **46.25** |

## Evidencia del SHA validado

- Vercel: deployment del runtime `03e6f68` en estado **READY**. Los commits posteriores son documentación, hardening/fuentes del plugin Jenkins y configuración CI; el plugin Java requiere el nuevo job Maven/JUnit para su verificación.
- Vitest: **746 pruebas aprobadas en 135 archivos**.
- Build: TypeScript, bundle esbuild y comprobación sintáctica de la interfaz completados.
- Smoke de interfaz: `UI_NAVIGATION_SMOKE_OK` y `CINEMATIC_INTRO_12_SCENES_OK`.
- Smoke de runtime: `LOCAL_CONVERSATION_SMOKE_OK`, `PUBLIC_API_GUARDRAILS_OK` y `OPENROUTER_PAID_ID_BLOCK_OK`.
- Suite estática de seguridad: **14 passed, 0 failed, 0 not_applicable**. SEC-12 confirma el guard compartido de AEGIS y el rechazo de decisiones distintas de `ALLOW` en Tools/Skills.
- Se agregaron pruebas para autorización de HyperCore antes de la caché/ejecución, entradas AEGIS no serializables, decisiones `REVIEW`, mutabilidad del registro CROWN y carreras de invalidación single-flight.
- GAME OVER/UAGP-1 endureció el gate humano (principal autenticado requerido), la política de aprobación no rebajable, la validación de criticidad, el vínculo entre pasaporte/identidad/capacidades y el límite de confianza del emisor.
- El endpoint HTTP de GAME OVER ya no trata el token administrativo como aprobación humana: requiere `GENESIS_HUMAN_APPROVAL_TOKEN` y `GENESIS_HUMAN_APPROVER_ID` independientes; sin ellos, una acción que necesita aprobación se escala.
- El plugin Jenkins recibió controles equivalentes en fuente y nuevas pruebas JUnit. Su compilación sigue pendiente hasta observar un job verde de Maven/JUnit en GitHub Actions.
- `ige-omega/Cargo.lock` **sí existe en main**, pero su presencia no demuestra que `cargo fmt`, Clippy, los tests ni el build `--locked` hayan pasado.
- `LLM_GATEWAY_SMOKE_SKIPPED`: no había credenciales elegibles configuradas; no se demuestra inferencia externa real.
- La validación de interfaz es smoke de markup/código, no E2E real con navegador, micrófono y dispositivos móviles.
- GitHub Actions no tiene evidencia de una ejecución verde con jobs para el SHA final; ejecuciones previas registraron `startup_failure` y cero jobs.

## Cambios P0 registrados

- AEGIS: Tools y Skills sólo continúan con veredicto `ALLOW`; `REVIEW`, `MODIFY`, `BLOCK` y fallo de serialización no ejecutan la capacidad.
- CROWN: rechazo de IDs duplicados, política de aprobación coherente, roles congelados y vista de registro de sólo lectura.
- HyperCore: autorización antes del predictor, la caché y la ejecución de expertos; tareas de riesgo alto/crítico exigen autorización incluso si el request intenta desactivarla.
- Caché single-flight: una generación anterior no puede sobrescribir el resultado después de `invalidate()`.
- Build de producción: ejecuta la suite de seguridad estática como parte de `pnpm run build`.

El detalle de hallazgos, cambios y gates pendientes está en [la auditoría P0/P1](audits/P0-ARCHITECTURE-HARDENING-2026-10-12.md).

## Gates pendientes

1. Conseguir una ejecución de GitHub Actions con jobs y conclusión verde sobre el SHA de liberación, incluido `jenkins-plugin-verify` (Maven/JUnit y empaquetado HPI).
2. Ejecutar `cargo fmt --all -- --check`, Clippy, tests y build release en `ige-omega` con `--locked`.
3. Configurar credenciales elegibles sólo en el entorno de despliegue y probar una inferencia real, además de timeout, 429/5xx, respuesta vacía, cooldown y fallback.
4. Validar persistencia durable end-to-end, aislamiento multi-tenant/RLS, recuperación, retención y backup/restore bajo fallos.
5. Añadir E2E de navegador para navegación, chat, Skills/Tools, permisos y responsive.
6. Recuperar y verificar la fuente CITEMESH; mantener `E0 NOT FETCHED` hasta tener evidencia.
7. Verificar artefactos MoE reales (versiones, hash, licencia, pesos y evaluación); no etiquetar un router heurístico como MoE entrenado.
8. Medir p50/p95/p99 end-to-end separando CPU, red, proveedor de inferencia, cold start y persistencia. Los benchmarks locales no justifican la afirmación “latencia casi cero”.
9. Ensayar rollback y documentar RTO/RPO antes de promoción productiva.

## Interpretación

El build READY demuestra que el código incluido en ese SHA compiló y pasó los gates registrados allí. No demuestra por sí solo producción certificada, disponibilidad del proveedor de inferencia, persistencia distribuida ni operación de todas las integraciones de interfaz.
