# Isabella Villaseñor AI — TERMINUS V6 / Genesis TINA

**Sistema de orquestación cognitiva, gobernanza verificable y trazabilidad de operaciones de IA.** Proyecto de TAMV Online orientado a construir una plataforma modular que combina interacción con modelos, memoria recuperable, controles de autorización, evidencia auditable, resiliencia de servicios y operación supervisada por personas.

> **Principio de diseño:** capacidad técnica no equivale a autoridad ni a permiso de ejecución. Una respuesta generada o una capacidad registrada no constituye por sí misma autorización para realizar una acción externa.

## Estado de madurez

**Contrato de evidencia:** SPECIFIED ≠ IMPLEMENTED ≠ TESTED. Una especificación no demuestra implementación y una implementación no demuestra que se haya probado.

**Avance global estimado para producción y despliegue: 61.0%.**

Estimación ponderada de preparación operativa —no es una métrica de calidad del modelo ni una garantía de disponibilidad— calculada sobre el build aislado del SHA `e70487a1d59ecc4d36414feff0fbca19e19a2ed6`. En Node 24.21.0 y pnpm 10.28.0, `pnpm install --frozen-lockfile && pnpm run build` terminó con código 0: **1,579 pruebas en 266 archivos**, **42/42 comprobaciones estructurales**, **14/14 invariantes de seguridad**, typecheck de compilación, bundle del servidor, smoke de interfaz/conversación y suite de seguridad aprobados. Se corrigió el build para que la suite de seguridad invoque el gestor pnpm fijado en `packageManager`, evitando que una versión global distinta convierta un build verde en fallo. El smoke HTTP del grafo de integración también pasó: 21 nodos, 19 aristas, autorización por token verificada, estados de BookPI consistentes y readiness correctamente degradado en ausencia de dependencias remotas. Se añadió un probe HTTP acotado para el health/readiness del gateway Rust IGE-Ω; el estado actual es `NOT_CONFIGURED` porque `IGE_OMEGA_GATEWAY_URL` no está configurada, y no se afirma que la inferencia autenticada esté conectada.

**Estado: preproducción; no declarar listo para producción.** El preview más reciente disponible, SHA `a8a5c580ed2d54ef87b1a80c0074c974d52cd726`, está `READY`, pero `/api/v1/readyz` devuelve HTTP 503: Atlas/Supabase e IKES responden HTTP 404, falta `BOOKPI_INTEGRITY_SECRET` de al menos 32 caracteres, el ledger BookPI síncrono heredado sigue siendo volátil y la exportación de telemetría no está verificada. El smoke generativo externo se omitió por ausencia de credenciales de proveedor. Vercel rechazó el build del SHA final por cuota de builds/despliegues; el SHA `fe0f8809` pasó la compilación y suite completa en un sandbox aislado, pero no tiene un preview remoto propio. GitHub Actions sigue sin proporcionar una ejecución válida con pasos/logs y `main` requiere protección.

- Repositorio: https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6
- Rama principal: main
- Stack declarado: TypeScript/Node.js, Express, Vitest, PostgreSQL, Redis/Upstash, AI SDK/Gateway, Google GenAI y manifiestos Kubernetes.
- El porcentaje no sustituye el estado de CI, el estado de un despliegue ni una auditoría independiente.

## Qué es

Isabella TERMINUS V6 es un proyecto de software para orquestar capacidades de IA con capas de control, memoria, evidencia, seguridad y operación. No debe describirse como un modelo fundacional propio: las dependencias declaran SDKs y proveedores de modelos, no evidencia de entrenamiento de un modelo base propietario.

El propósito arquitectónico es delimitar qué puede proponer un componente, qué autoridad tiene, qué evidencia se conserva y qué acciones necesitan validación humana. Su categoría principal es **plataforma de orquestación y gobernanza de IA**, con componentes de memoria/evidencia, resiliencia de backend y controles operativos. Términos como “cognitivo”, “civilizatorio” o “soberano” expresan la visión del proyecto, pero no constituyen certificaciones técnicas ni acreditaciones externas.

## Qué hace y cómo se organiza

La versión anterior enumeraba los siguientes módulos y rutas. La presencia de un archivo no demuestra por sí sola que su comportamiento esté integrado, sea seguro o esté validado en producción.

| Dominio | Módulos / rutas | Propósito previsto |
|---|---|---|
| Resiliencia | src/resilience/retry.ts, src/resilience/bulkhead.ts | Reintentos acotados y aislamiento de carga. |
| Entrada de eventos | src/ingress/webhook-inbox.ts | Deduplificación y tratamiento ordenado de webhooks. |
| Preparación operativa | src/health/preflight.ts | Comprobaciones previas al arranque o despliegue. |
| Privacidad | src/privacy/pii-redactor.ts | Redacción de patrones CURP, RFC y CLABE; requiere pruebas de falsos positivos y negativos. |
| Observabilidad | src/observability/slo.ts | Cálculo de señales relacionadas con SLO y burn-rate. |
| Memoria | src/memory/bm25.ts, src/memory/temporal-cognition.ts, src/memory/ikes.ts | Recuperación léxica, señales temporales y componentes de memoria. |
| Gobernanza | src/governance/feature-flags.ts, src/governance/permission-map.ts, src/governance/constitutional-governance-fabric.ts | Flags, permisos y evaluación de reglas. |
| Economía | src/inference/cost-budget.ts, src/economy/treasury.ts, src/economy/cognitive-capital-market.ts | Presupuestos por tenant y componentes económicos; no prueba monetización operativa. |
| Evidencia | src/bookpi/evidence-bundle.ts, src/bookpi/ledger.ts, src/civilization/evidence-graph.ts | Paquetes de evidencia, ledger y relaciones de evidencia. |
| Seguridad | src/crown/capability.ts, src/gameover/gateway.ts, src/security/http-hardening.ts | Capacidades, puerta de control y endurecimiento HTTP. |
| Retención y constitución | src/terminus/retention.ts, src/omega/constitution.ts | Políticas de retención y reglas del sistema. |
| Federación | src/federation/registry.ts, src/fabric/citemesh.ts | Registro federado y conexiones/eventos. |
| Motor cognitivo | src/hypercore/hypercore.ts, src/core/cognitive-fabric-engine.ts, src/isabella/library.ts | Coordinación y biblioteca/motor de Isabella. |

El documento de arquitectura agrupa estas funciones en seis macrodominios: Ω-CORE, Ω-GOVERNANCE, Ω-KNOWLEDGE, Ω-ECONOMY, Ω-IMMUNITY y Ω-EXPERIENCE. Debe verificarse mediante pruebas de integración que las fronteras entre módulos se respeten en flujos reales.

## Arquitectura y flujo esperado

La aplicación declara un servidor Node.js con Express y TypeScript. Incluye scripts para pruebas, compilación, comprobaciones de UI/runtime, seguridad, evidencia de producción y validación de PostgreSQL, además de manifiestos Kubernetes y workflows de GitHub Actions.

1. Recibir una petición y validar contexto y límites de entrada.
2. Aplicar autenticación, permisos, presupuesto y políticas relevantes.
3. Invocar el componente interno o proveedor de IA configurado.
4. Procesar la respuesta y, cuando corresponda, recuperar memoria o asociar evidencia.
5. Registrar resultados operativos y devolver la respuesta.
6. Exigir autorización explícita para acciones sensibles o externas; no inferir consentimiento a partir de una salida del modelo.

Este flujo describe el objetivo de arquitectura. La persistencia, el aislamiento por tenant, las integraciones y el comportamiento ante fallos deben demostrarse con pruebas de extremo a extremo y configuración de despliegue.

## Instalación y validación local

Requisitos declarados: Node.js 24.x y pnpm 10.28.0. Los workflows principales y el ingest de Atlas quedaron alineados en esta rama con Node 24 y una instalación reproducible mediante pnpm; la alineación debe confirmarse con una ejecución CI verde.

    corepack enable
    pnpm install --frozen-lockfile
    pnpm typecheck
    pnpm test
    pnpm build

Scripts adicionales definidos en package.json:

- pnpm run security:suite — suite de seguridad.
- pnpm run smoke:runtime — smoke test del runtime.
- pnpm run smoke:ui — comprobación sintáctica y smoke de UI.
- pnpm run production:evidence — generación de evidencia de producción.
- pnpm run postgres:e2e — E2E de PostgreSQL; requiere entorno apropiado.
- pnpm run deploy:verify — construcción Docker, smoke de runtime y validación Kubernetes; requiere Docker y configuración Kubernetes compatibles.
- pnpm run verify:production — verificación adicional.

No se publican recuentos de pruebas exitosas sin una ejecución reciente y reproducible del SHA evaluado. La existencia de un script o un build histórico no acredita una liberación actual.

## Configuración e integraciones

Las variables que el README previo declara incluyen:

| Variable | Uso declarado | Precaución |
|---|---|---|
| DATABASE_URL | PostgreSQL, incluida opción Neon | TLS, mínimo privilegio, migraciones controladas y secretos gestionados. |
| REDIS_URL | Redis/Upstash | Autenticación, límites, expiración y comportamiento ante indisponibilidad. |
| ISABELLA_KEYLESS_FREE_PROVIDER | Inferencia externa gratuita sin clave | Desactivada por defecto. Configurar explícitamente `pollinations`, `on`, `true` o `1` sólo si el operador autoriza enviar prompt/historial acotados a ese proveedor. |
| BOOKPI_LEDGER_PATH | Ledger síncrono heredado; JSONL local cuando se configura | No es almacenamiento compartido en serverless. Requiere volumen persistente y recuperación verificada. |
| BOOKPI_INTEGRITY_SECRET | Secreto de integridad para eventos BookPI PostgreSQL | Requiere al menos 32 caracteres, generación segura y gestión sólo en el servidor. Sin él, el probe de PostgreSQL permanece degradado y no se sella ningún evento. |
| BOOKPI_PIPELINE_STORAGE | Adaptador del pipeline: `postgres`, `jsonl` o `memory`; selección automática de PostgreSQL cuando existe `DATABASE_URL` | Para despliegue multiinstancia usar PostgreSQL; el runtime detecta `DATABASE_URL`, `POSTGRES_URL` (Vercel) o `POSTGRES_URL_NON_POOLING`, en ese orden. Aplicar `infra/db/migrations/001_create_bookpi_events.sql` y `002_bookpi_canonical_immutability.sql`. Memoria no está lista para producción. |
| SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY | Atlas y persistencia de IKES del lado servidor | Nunca exponer la service-role key al navegador. Aplicar migraciones Supabase y validar RLS/probes.
| STRICT_PREFLIGHT=1 | Abortar el arranque si preflight detecta errores bloqueantes | Confirmar que identifica dependencias realmente obligatorias. |
| NODE_ENV=production | Activar validaciones de producción | No sustituye configuración segura ni gestión de secretos. |

No incluyas claves, tokens ni credenciales en el repositorio. Verifica nombres y valores efectivos contra los módulos de configuración antes de preparar un entorno real.

## API y operación

El README previo declara GET /api/v1/ops/preflight protegido por token administrativo. Antes de exponerlo, verifica en código y pruebas que la autenticación y autorización se aplican realmente, que los errores no revelan secretos y que usuarios no autorizados no pueden consultar detalles internos. Confirma también qué rutas registra el servidor y añade pruebas de contrato para cada endpoint público.

Diagnóstico de interconexión: `GET /api/v1/integrations/graph` requiere `GENESIS_ADMIN_API_TOKEN` y devuelve los módulos, tools, skills, protocolos, aristas de integración y evidencia de readiness observada. `WIRED` significa que existe un camino de código; no implica que la base remota, los secretos, los proveedores ni el despliegue estén saludables.

## Seguridad, privacidad y límites

- **Autoridad separada de capacidad:** un módulo que propone una acción no adquiere permiso para ejecutarla.
- **Intervención humana:** las operaciones de impacto necesitan controles explícitos, registro de la decisión y revocación.
- **Datos personales:** la redacción por patrones no garantiza anonimización ni detección exhaustiva.
- **Memoria y evidencia:** definir clasificación, acceso, retención, eliminación, recuperación y protección frente a manipulación.
- **Aislamiento multi-tenant:** verificar controles en consultas, cachés, claves, eventos y artefactos.
- **Proveedores de IA:** disponibilidad, privacidad, costos, residencia de datos y fallback dependen de la configuración y los contratos efectivos. El proveedor keyless externo queda desactivado por defecto y requiere opt-in explícito del operador.
- **Criptografía:** no afirmar resistencia poscuántica, certificaciones ni cumplimiento normativo sin implementación revisada, parámetros explícitos y pruebas reproducibles.
- **Auditoría:** demostrar integridad, procedencia, control de acceso y recuperación del ledger/evidencia.
- **Disponibilidad:** retries y bulkheads no sustituyen pruebas de carga, límites globales, observabilidad ni recuperación.

## CI/CD: bloqueos identificados

La inspección estática de los workflows encontró puntos que deben resolverse antes de afirmar que el despliegue es automático y productivo:

1. **Runtime y gestor — corregidos en esta rama:** package.json y los workflows principales/Atlas declaran Node 24; Atlas usa pnpm con lockfile congelado. Falta confirmar los cambios con CI verde.
2. **Compilación TypeScript — corrección aplicada, pendiente de revalidación:** el build de Vercel reportó TS2308 por exportaciones ambiguas de ConfidenceLevel entre comercio y memoria en src/index.ts. Se hizo explícita la exportación canónica del tipo comercial y se conservaron alias por dominio.
3. **GitHub Actions sin ejecución de pasos:** en el SHA `0b55ce24244b2b92539197e1bdde604b2061ccb2`, tanto CI como Repository Assurance terminaron en `failure`, incluso tras reintento. Los jobs devuelven `runner_id: 0`, `steps: []` y el endpoint de logs responde 404; no hay evidencia suficiente para atribuir la causa al código. Revisar configuración/servicio de runners y permisos de Actions, y exigir una ejecución con pasos y logs antes de mergear.
4. **Despliegue real no demostrado:** .github/workflows/deploy-production.yml valida evidencia y llega a un paso de handoff; no prueba una promoción real a producción. Un gate de aceptación no equivale a publicar una versión en un proveedor.
5. **Protección de rama:** la consulta de GitHub indicó que main no tenía protección habilitada. Exigir revisiones, checks obligatorios, evitar pushes directos y aplicar permisos mínimos.
6. **Evidencia por SHA:** pruebas, SBOM, escaneo de secretos y evidencia de producción deben corresponder al mismo commit candidato.
7. **Integraciones externas:** validar PostgreSQL, Redis, proveedores de modelos, secretos, almacenamiento, Kubernetes y observabilidad en staging, incluyendo recuperación y rollback.
8. **Interacción funcional:** comprobar una conversación de extremo a extremo con configuración real, timeouts, manejo de errores y fallback; una interfaz visible no prueba que la inferencia esté operativa.

**Readiness operativo observado:** el último preview medido devolvió HTTP 503 en `/api/v1/readyz`. Esta rama conecta el almacenamiento del pipeline a un adaptador PostgreSQL transaccional (si se configura `DATABASE_URL`) y conecta IKES con persistencia Supabase, hidratación validada por hash, cola de escritura y errores visibles. Todavía no se ha demostrado que las migraciones estén aplicadas en la base remota, que los probes pasen ni que el ledger síncrono heredado deje de ser volátil. Las migraciones requeridas son `supabase/migrations/20261017000000_atlas-store-core.sql`, `supabase/migrations/20261017000001_ikes-memory.sql` e `infra/db/migrations/001_create_bookpi_events.sql` + `002_bookpi_canonical_immutability.sql` para PostgreSQL. Seguir [el runbook de cierre de bloqueos](docs/ops/PRODUCTION-READINESS-RUNBOOK.md).

### Gates pendientes para liberar

Los siguientes criterios deben quedar verificados antes de autorizar producción.

- [ ] Node y pnpm alineados entre manifiesto, CI, contenedor y runtime (workflows corregidos en esta rama; validación integral pendiente).
- [ ] Typecheck, suite completa, build, smoke y seguridad en verde sobre el mismo SHA.
- [ ] E2E contra PostgreSQL y Redis cuando formen parte del modo productivo.
- [ ] Conversación real con proveedor configurado, timeout, presupuesto y fallback verificable.
- [ ] Escaneo de secretos, análisis de dependencias y SBOM de la misma versión.
- [ ] Secretos fuera del código y permisos mínimos.
- [ ] Health/readiness, métricas, logs sin PII/secretos, alertas y SLO medidos.
- [ ] Migraciones, backups, restauración, rollback y recuperación ensayados.
- [ ] Despliegue real en staging y producción, con URL, versión y commit verificables.
- [ ] Revisión de seguridad y privacidad, más aceptación operativa del responsable.

## Categoría y competencia

**Categoría primaria:** plataforma de orquestación y gobernanza de IA.

**Categorías secundarias:** framework de agentes/herramientas, memoria y recuperación, evidencia/auditoría, backend resiliente y experiencia de interacción con modelos cuando el flujo completo esté habilitado.

| Segmento | Referencias comparables | Criterios de comparación |
|---|---|---|
| Orquestación y aplicaciones LLM | LangChain/LangGraph, LlamaIndex, Vercel AI SDK | Integraciones, control de flujo, herramientas, observabilidad y facilidad de desarrollo. |
| Modelos y plataformas de IA | OpenAI platform, Google Gemini, Anthropic Claude | Calidad del modelo, herramientas, confiabilidad, costos y experiencia. Isabella no debe presentarse como modelo base equivalente. |
| Evaluación y observabilidad LLM | LangSmith, Arize Phoenix, Weights & Biases Weave | Trazas, evaluación, depuración, políticas y evidencia. |
| Políticas y seguridad | Open Policy Agent (OPA), Cedar y controles de identidad cloud | Expresividad, garantías de autorización, auditoría e integración. |
| Infraestructura | Kubernetes y plataformas gestionadas de nube | Despliegue, escalado, resiliencia, seguridad y recuperación. |

Son referencias por segmento, no un ranking ni una afirmación de superioridad. Una comparación válida exige casos de uso equivalentes, benchmarks públicos, métricas reproducibles, costos totales, latencia p50/p95/p99, evaluación de calidad, seguridad y carga operativa.

## Posicionamiento global

La diferenciación que el proyecto busca construir es integrar en un mismo plano de control la orquestación de IA, los límites de autoridad, la gobernanza, la memoria, la evidencia y la resiliencia. Es una **hipótesis de posicionamiento**, no una posición de mercado demostrada. Para sostener afirmaciones globales hacen falta adopción externa, documentación reproducible, benchmarks, auditorías independientes y una versión desplegada de forma estable.

No se afirma liderazgo mundial, superioridad frente a proveedores consolidados ni certificación de seguridad. El valor potencial debe evaluarse por la eficacia con que Isabella hace más controlables, trazables y operables los flujos de IA en casos reales.

## Medición del avance real

El porcentaje sólo debe subir cuando una capacidad funcional nueva o una mejora relevante quede implementada y validada con evidencia. La documentación, el número de archivos, las declaraciones arquitectónicas y los tests que no se ejecutan no incrementan por sí solos el avance.

La estimación de **61.0%** usa esta rúbrica ponderada (puntos disponibles = peso del dominio). El total incorpora el build reproducible del SHA validado y las pruebas ejecutadas; no equivale a despliegue productivo:

| Dominio | Puntos obtenidos / disponibles | Evidencia y limitación principal |
|---|---:|---|
| Runtime, compilación y pruebas | 25 / 25 | Build completo, typecheck, 1,568 pruebas en 264 archivos, bundle y smoke local aprobados; faltan E2E con dependencias productivas. |
| Seguridad y CI | 16 / 20 | 42/42 checks estructurales y 14/14 invariantes de seguridad aprobados; GitHub Actions sigue sin ejecución válida y main requiere protección. |
| Persistencia e integridad de datos | 5 / 20 | Adaptadores BookPI/IKES implementados y probados, pero Atlas/IKES remoto devuelve 404, falta BOOKPI_INTEGRITY_SECRET y el ledger síncrono heredado sigue volátil. |
| Inferencia y conversación | 7 / 15 | Chat local y seguimiento funcionan; smoke generativo externo omitido por falta de credenciales configuradas. |
| Despliegue y recuperación | 5 / 10 | Preview READY; no se ha demostrado promoción real a producción ni rollback. |
| Observabilidad y operación | 3 / 10 | Readiness y métricas en proceso disponibles; exportación OTLP y alertas no verificadas. |
| **Total** | **61 / 100** | **Preproducción; no certificado para producción.** |

Para elevar la cifra de nuevo, exigir build verde del SHA final, CI/CD verde, migración aplicada y probe Atlas saludable, persistencia durable/recuperación de BookPI e IKES, smoke generativo aprobado, telemetría exportada y despliegue/rollback reales.

## Licencias y uso

El README anterior declara software bajo Apache-2.0 y documentación bajo CC BY 4.0. Verifica los archivos de licencia presentes y el alcance de cada licencia antes de redistribuir código, documentación, marcas o activos de terceros.

---

**Transparencia:** este README documenta la arquitectura y las señales visibles en los archivos consultados. No sustituye una ejecución completa de la suite, una auditoría línea por línea de todo el repositorio ni una prueba de despliegue real. Cada capacidad debe considerarse implementada sólo en el grado que la evidencia reproducible correspondiente demuestre.
