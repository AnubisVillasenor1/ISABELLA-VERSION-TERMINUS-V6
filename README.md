# Isabella V6 · TINA — Genesis Runtime

> **Trusted Intelligence, Native & Adaptive.** Runtime modular de asistencia y orquestación de IA con separación explícita entre capacidad, autoridad, ejecución, evidencia y producción.

[![Repository Assurance](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml)

- **Proyecto:** Isabella Villaseñor AI — Genesis TINA V6
- **Repositorio:** [OsoPanda1/isabella-V6-TINA-h6](https://github.com/OsoPanda1/isabella-V6-TINA-h6)
- **Rama de evolución:** \`evolution/runtime-hardening-2026-10\`
- **Stack principal:** TypeScript, Node.js 24, Express, Vitest, esbuild y pnpm.
- **Workspace experimental adicional:** IGE-Ω en Rust, separado del runtime TypeScript.
- **Estado:** beta de ingeniería / Preview; **no declarar listo para producción** hasta superar todos los gates de esta documentación.

> **Contrato de veracidad:** \`SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED\`. Un esquema, mock, hash o endpoint no demuestra por sí solo una integración de extremo a extremo.

## Estado global para producción y despliegue

**Estimación de readiness de producción: 44% (evaluación ponderada).** Es una puntuación de preparación de ingeniería, no el porcentaje de código escrito ni una certificación. Se actualizó tras el Preview del SHA d71f89ca296552d90fa80f39adad7ead5f0caaca: build completado, 519 pruebas en 100 archivos aprobadas, smoke local y guardrails aprobados y endpoints de salud HTTP 200. El smoke de inferencia externa fue omitido por falta de credenciales gratuitas elegibles; GitHub Actions y el workspace Rust siguen bloqueados.

| Dimensión ponderada | Peso | Evaluación actual | Aporte |
|---|---:|---:|---:|
| Runtime HTTP y flujo local | 20% | 75% | 15.0 |
| Pruebas y validación automatizada | 20% | 75% | 15.0 |
| Seguridad y guardrails | 15% | 45% | 6.75 |
| Inferencia externa real verificada | 15% | 0% | 0.0 |
| Persistencia durable y recuperación | 10% | 20% | 2.0 |
| CI reproducible y workspace Rust | 10% | 20% | 2.0 |
| Operación, observabilidad y rollback | 10% | 35% | 3.5 |
| **Total ponderado** | **100%** |  | **44.25% (≈44%)** |

La puntuación se basa en gates ponderados explícitos y en la evidencia disponible, no en una medición científica. El Preview del SHA d71f89ca296552d90fa80f39adad7ead5f0caaca completó el script de build: TypeScript compiló, Vitest reportó 519 pruebas aprobadas en 100 archivos y los smoke markers LOCAL_CONVERSATION_SMOKE_OK, PUBLIC_API_GUARDRAILS_OK y OPENROUTER_PAID_ID_BLOCK_OK aparecieron en los logs. /health y /api/v1/health devolvieron HTTP 200 y las cabeceras de seguridad estaban presentes. El smoke de inferencia externa fue omitido por falta de credenciales elegibles. GitHub Actions devolvió startup_failure sin jobs y ige-omega/Cargo.lock no existe en la rama inspeccionada. Preview READY no equivale a producción lista.

### Bloqueadores de liberación

1. Conseguir una ejecución válida y verde de GitHub Actions para el SHA de liberación.
2. Generar y revisar \`ige-omega/Cargo.lock\` con Cargo; después ejecutar fmt, Clippy, tests y build release con \`--locked\`.
3. Configurar un proveedor externo elegible en Preview y demostrar una respuesta real. Nunca pegar secretos en el repositorio ni en conversaciones.
4. Probar timeout, HTTP 429, HTTP 5xx, contenido vacío, modelo no permitido y fallback al siguiente proveedor / motor local.
5. Demostrar persistencia durable, aislamiento por workspace, backup, restauración y comportamiento fail-closed.
6. Completar revisión de seguridad, observabilidad, límites de coste, rollback y validación de runtime en el entorno objetivo.
7. Revisar manualmente el diff y los resultados del SHA exacto antes de cualquier promoción.

## 1. Propósito y límites

Isabella Genesis es un runtime/plano de control que coordina asistencia conversacional y adaptadores de IA bajo políticas, identidad, seguridad, herramientas y evidencia. El objetivo es que la presencia de una capacidad técnica no implique automáticamente permiso para ejecutarla ni autoridad para presentar un resultado como verdad.

Invariante central:

\`CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION\`

**No se afirma** que este repositorio sea un modelo fundacional propio, AGI, un motor neuronal entrenado nativamente, una plataforma certificada o un sistema federado completo. El routing entre proveedores no equivale a entrenamiento de ML propio.

## 2. Arquitectura de referencia

\`\`\`text
Cliente / API
    |
    v
Validación de entrada y límites
    |
    v
Identidad, scopes, consentimiento y autoridad
    |
    v
C.R.O.W.N. — admisión, política y riesgo
    |
    v
AEGIS — inspección de seguridad
    |
    v
ISA / runtime conversacional / adaptador de inferencia
    |
    v
VERITAS — comprobaciones deterministas disponibles
    |
    v
BookPI — evidencia cuando el almacenamiento está configurado
    |
    v
Respuesta + correlación + telemetría
    |
    v
YUN — contrato de eventos; bus y persistencia requieren integración
\`\`\`

El diagrama representa separación de responsabilidades; no significa que cada componente esté conectado de extremo a extremo en todas las rutas.

## 3. Estado real por subsistema

| Área | Estado actual | Lo que falta para declarar producción |
|---|---|---|
| Runtime HTTP | Express y rutas de runtime en TypeScript | Pruebas integrales por ruta y entorno |
| Conversación local | Fallback determinista; no es un LLM | No sustituye inferencia generativa |
| OpenRouter | Adaptador opcional; router gratuito por defecto | Credencial de Preview y respuesta externa observada |
| Hugging Face | Adaptador opcional para modelos configurados explícitamente | Verificar coste, disponibilidad y permisos de cada modelo |
| AI Gateway / Gemini | Sujeto a configuración; fallback de pago requiere opt-in | Prueba de coste y autorización explícita |
| Política de proveedor | Guardas de ID de modelo, timeout, cooldown y extracción de texto | Pruebas de fallos reales y contract tests de red |
| C.R.O.W.N. | Módulos de política/autoridad en el repositorio | Confirmar cobertura efectiva de cada endpoint |
| AEGIS | Reglas y guardrails existentes | No equivale a clasificador ML adversarial completo |
| IKES / memoria | Implementación parcial y contexto acotado | Persistencia, scopes, retención y recuperación probadas |
| BookPI | Huellas/eventos parciales | Almacenamiento durable, retención, backup y restore |
| YUN | Constructor/validador local de eventos con hash SHA-256 | Bus real, firma digital, persistencia y entrega distribuida |
| IGE-Ω Rust | Workspace preproducción y crates iniciales | Lockfile, CI verde, pruebas y gateway release |
| ML nativo / GPU | No acreditado como serving de producción en esta rama | Modelo/pesos, entrenamiento o serving y benchmark reproducible |
| Criptografía poscuántica | No declarar activa sin evidencia de implementación | Biblioteca, parámetros, formato, pruebas y revisión |
| Operación | Preview y smoke tests en commits previos | CI verde, alertas, SLO, rollback y pruebas de recuperación |

## 4. Gateway de inferencia y costes

El runtime admite proveedores externos opcionales. Las credenciales se configuran en el entorno de ejecución; nunca se guardan en el repositorio.

| Variable | Función | Regla |
|---|---|---|
| \`OPENROUTER_API_KEY\` | Habilita OpenRouter | Guardar como secreto del entorno |
| \`OPENROUTER_FREE_MODEL\` | ID de modelo de OpenRouter | Predeterminado: \`openrouter/free\`; un ID con \`:free\` se acepta como explícitamente gratuito |
| \`HF_TOKEN\` | Habilita Hugging Face | No implica cuota ilimitada |
| \`HF_FREE_MODELS\` | Lista de modelos de HF configurados | No incluir un modelo hasta verificar el coste efectivo |
| \`INFERENCE_TIMEOUT_MS\` | Timeout del proveedor | Limitado a 3–30 segundos; predeterminado 8 segundos |
| \`PROVIDER_FAILURE_COOLDOWN_MS\` | Enfriamiento tras fallos | Limitado a 10–300 segundos; predeterminado 60 segundos |
| \`ALLOW_PAID_PROVIDER_FALLBACK\` | Autoriza rutas sujetas a pago | Debe ser \`true\` sólo tras aprobación explícita |

La disponibilidad y el precio de los modelos gratuitos pueden cambiar. El código de enrutamiento no demuestra que una credencial exista, que el modelo esté disponible ni que el proveedor devuelva una respuesta.

### Comportamiento de fallo

- Si falta configuración elegible, el runtime vuelve al fallback local.
- El fallback local informa sus límites y no se presenta como LLM.
- Se aplican timeout y cooldown para limitar esperas repetidas.
- Se rechazan IDs de OpenRouter que no parezcan gratuitos mientras no exista opt-in de pago.
- El parser de respuesta sólo acepta contenido textual no vacío en formatos compatibles.
- Las pruebas unitarias cubren reglas de configuración y extracción de contenido; no sustituyen pruebas de red contra un proveedor real.

## 5. Contrato de eventos YUN

\`src/federation/yun-event.ts\` define un contrato local con:

- Identificador de evento y versión de esquema.
- Campos obligatorios validados y timestamp UTC.
- Severidad limitada a valores enumerados.
- Payload JSON con límite de tamaño.
- Canonicalización determinista por orden de claves.
- Digest SHA-256 para detectar modificaciones al contenido canonizado.
- Congelación del objeto en memoria para evitar mutaciones accidentales.

**Límites:** el hash no es una firma digital, no identifica al autor, no prueba la verdad del evento, no almacena de forma durable y no publica a un bus. Es una primitiva local de integridad que debe integrarse con identidad, claves, ledger y persistencia para ampliar sus garantías.

## 6. Endpoints y observabilidad

Consulta el inventario de rutas en \`scripts/route-inventory.mjs\` y la implementación en \`src/server.ts\`. Entre los endpoints documentados en el runtime están:

| Endpoint | Función | Límite |
|---|---|---|
| \`GET /health\` | Liveness del proceso | No demuestra readiness integral |
| \`GET /api/v1/readyz\` | Estado de dependencias | Puede devolver 503 si falta evidencia obligatoria |
| \`GET /api/v1/ops/snapshot\` | Estado operativo evaluado | Depende de los probes configurados |
| \`GET /api/v1/ops/latency\` | Latencias p50/p95/p99 y errores por ruta | Requiere \`OPS_API_TOKEN\` |
| \`GET /api/v1/hsf/status\` | Estado del Hyper Skill Fabric | No implica que proveedores externos estén conectados |
| \`POST /api/v1/hsf/invoke\` | Invocación gobernada de una capacidad | Requiere autorización y configuración |

No se deben declarar rutas adicionales como disponibles sin verificar el registro real en el servidor.

## 7. Seguridad

- Mantener secretos fuera de Git y del frontend.
- No confiar en roles, scopes o identidades enviados sin verificación por el cliente.
- Tratar mensajes externos, documentos recuperados y resultados de herramientas como datos no confiables.
- Requerir consentimiento y autoridad contextual para operaciones privilegiadas.
- Mantener separación entre liveness, readiness, disponibilidad de inferencia y persistencia.
- Evitar que errores de proveedor registren claves, tokens o cuerpos sensibles.
- No afirmar procedencia remota verificada si sólo se calculó un hash local.
- No declarar certificaciones, cumplimiento normativo o criptografía poscuántica activa sin auditoría y evidencia independientes.

Referencias: [SECURITY.md](SECURITY.md), [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## 8. Stack y comandos

- Node.js 24.x (según \`package.json\`).
- pnpm 10.28.0 con \`pnpm-lock.yaml\`.
- TypeScript, Express, Vitest y esbuild.
- Workspace Rust IGE-Ω independiente.

\`\`\`bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm run security:suite
pnpm run production:evidence
pnpm run validate
\`\`\`

Estos comandos son el procedimiento de validación; sólo los logs con código de salida cero prueban que pasaron en el entorno correspondiente. CI debe usar el mismo SHA que se pretende liberar.

## 9. IGE-Ω Rust MVP

El workspace \`ige-omega/\` contiene crates para shared, neurokernel, cognition, memory, worldmodel, ABX, BookPI y gateway Axum. Está clasificado como preproducción y no debe confundirse con un sistema cognitivo autónomo validado.

El CI de Rust exige \`Cargo.lock\` y utiliza \`--locked\`. El lockfile no estaba presente en la rama al iniciar este incremento. Debe generarse con Cargo real, revisarse y subirse; no se debe inventar manualmente ni eliminar la guarda de CI.

- [Especificación IGE-Ω](ige-omega/docs/IGE-OMEGA-v2.0.0.md)
- [Auditoría criptográfica](ige-omega/docs/CRYPTOGRAPHIC-AUDIT.md)
- [Simulación y arbitraje](ige-omega/docs/SIMULATION-ARBITRATION.md)

## 10. Documentación operativa

- [Especificación C.R.O.W.N. e Isabella VΩ](docs/CROWN-ISABELLA-VOMEGA-OPERATING-SPEC.md)
- [Estado real y gates de liberación](docs/ESTADO-REAL-ACTUAL.md)
- [Auditoría del plano de aseguramiento](docs/ASSURANCE-CONTROL-PLANE.md)
- [Integración Genesis + MAGPIE-X](docs/architecture/GENESIS-MAGPIE-INTEGRATION.md)
- [Hyper Skill Fabric](docs/ISABELLA_HYPER_SKILL_FABRIC.md)
- [Configuración de entorno](docs/ENVIRONMENT.md)
- [Política de seguridad](SECURITY.md)
- [Auditoría de repositorios y bloqueos](docs/audits/PROFILE-ECOSYSTEM-REVIEW-2026-10.md)
- [Gate manual de inferencia externa](.github/workflows/beta-live-model-gate.yml)
- [Runbook del gate de inferencia](docs/runbooks/BETA-LIVE-MODEL-GATE.md)

## 11. Plan de liberación

1. **Reproducibilidad:** instalar con lockfiles y fijar Node/pnpm/Rust.
2. **CI:** resolver \`startup_failure\`, ejecutar typecheck, pruebas, build y suite de seguridad en un SHA.
3. **Proveedores:** probar respuesta externa real, timeout, 429, 5xx, cuerpo vacío, cooldown y fallback.
4. **Persistencia:** probar aislamiento, escritura/lectura, backup y restore.
5. **Seguridad:** revisar autorización por ruta, secretos, RLS, rate limiting y amenazas de prompt injection.
6. **Operaciones:** configurar logs redactados, métricas, alertas, límites de gasto y rollback.
7. **Release candidate:** validar Preview con datos no sensibles y registrar evidencia asociada al SHA.
8. **Producción:** sólo después de que los gates obligatorios estén verdes y exista aprobación explícita de release.

## 12. Licencia y procedencia

El repositorio declara MIT mediante \`LICENSE\`. Revisar cada dependencia, dataset, marca y activo antes de redistribuirlo. Los documentos canónicos del ecosistema no sustituyen las licencias aplicables ni conceden automáticamente derechos sobre código de terceros.

## Principio de liberación

La arquitectura sólo se considera operativa en el grado que demuestren el código, las pruebas, la integración y la evidencia reproducible del commit exacto. Una compilación de Preview es un resultado útil, pero no certifica seguridad, persistencia, inferencia externa ni readiness de producción.
