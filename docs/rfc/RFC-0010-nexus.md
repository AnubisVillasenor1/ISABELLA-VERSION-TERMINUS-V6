# RFC-0010 — Nexus: capa unificada de conocimiento, agente, workflows, antifragilidad y cuántica local

**Estado:** `draft | engine-generated`
**Autor del cambio:** agente de IA (sin aprobación humana nominal todavía)
**Fecha:** 2026-10-31
**Riesgo:** MEDIUM
**Gobernanza:** CROWN / Human Review Gate

> Regla aplicada sin excepciones:
> `SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION`
> `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE`
> Todo lo descrito aquí está **implementado** y cubierto por pruebas unitarias; **nada**
> se declara en producción ni en estado `verified`.

## 1. Intención

Unificar, dentro de Isabella, los patrones útiles de doce repositorios de referencia, sin
copiar código incompatible ni presentar la capacidad como autoridad. La capa se llama
**Nexus** y vive en `src/nexus/`, con superficie HTTP en `src/routes/nexus.ts`.

## 2. Revisión de los doce repositorios

Cada entrada distingue: qué se encontró, qué se adoptó como **patrón**, qué se implementó
como código original y qué se rechazó.

| Repositorio | Qué es realmente | Patrón adoptado | Implementación en Nexus | Rechazado |
|---|---|---|---|---|
| `NousResearch/hermes-agent` | Agente con herramientas y memoria de habilidades | Bucle de aprendizaje con skills y evidencia | `agent-loop.ts` (`SkillMemory`, `EvidenceLedger`, planner heurístico) | Ejecución de shell/red; modelos propietarios |
| `garrytan/gbrain` | Grafo de conocimiento personal | Hechos con procedencia, corrección sin borrado, retiro reversible | `knowledge-graph.ts` | Ingesta automática de datos personales |
| `nesquena/hermes-webui` | UI web para agentes | Patrón de UI (aún no adoptado) | — | Copiar componentes/licencias |
| `TransformerOptimus/SuperAGI` | Orquestación de agentes y tareas | DAG de tareas con dependencias y compensación | `workflow.ts` | Ejecución autónoma sin humano |
| `hyperspaceai/agi` | Red distribuida de cómputo | Antifragilidad y degradación por componente | `antifragile.ts` | Unirse a una red P2P de terceros |
| `enricoros/big-AGI` | Cliente multi-modelo | Patrón de UI y multi-proveedor (UI no adoptada) | — | Copiar su app/licencia |
| `google/agi` | **Android GPU Inspector** (no AGI) | Nada | — | Todo: no es un proyecto de IA |
| `microsoft/Quantum` | Lenguaje y simuladores Q# | Semántica de circuitos y verificación | `quantum.ts` (statevector local) | Runtime .NET/Q# |
| `tensorflow/quantum` | Simulación cuántica sobre TF | Modelo de circuito y muestreo | `quantum.ts` | Dependencia de TensorFlow |
| `microsoft/QuantumKatas` | Ejercicios de aprendizaje | Verificación tipo kata (`verifySimulation`) | `quantum.ts` | Contenido/licencia de katas |
| `w37fhy/QuantumultX` | Reglas de proxy para iOS | Nada | — | Todo: no es IA ni infraestructura reutilizable |
| `PennyLaneAI/pennylane` | Framework de quantum ML | Contrato de backend/adaptador opcional | Puente preexistente `src/quantum/pennylane-bridge.ts`, expuesto como capacidad `optional` | Copiar PennyLane |

Notas de honestidad:

- `google/agi` y `w37fhy/QuantumultX` **no** aportan capacidades de IA. Se documenta el
  hallazgo en lugar de fingir una integración.
- `TransformerOptimus/SuperAGI` no se pudo leer desde la ruta cruda esperada; se trató como
  referencia de patrón por conocimiento general y **no** se copió código.
- Ninguna licencia de terceros se incorporó al repositorio: todo el código de `src/nexus/`
  es original.

## 3. Componentes implementados

### 3.1 `src/nexus/knowledge-graph.ts`

- Un hecho requiere `subject`, `predicate`, `object`, `source` y `confidence`.
- Triple duplicado → `duplicate` (no se duplica almacenamiento).
- Mismo sujeto+predicado con otro objeto → `conflict`; **no se resuelve solo**.
- `correctFact()` crea una versión nueva y marca la anterior `superseded`.
- `withdrawFact()` retira con razón; el hecho nunca se borra.
- Búsqueda = 70 % embedding local determinista + 30 % solapamiento léxico.
- Cotas: 512 caracteres por campo, 2 048 por fuente, 10 000 hechos.

### 3.2 `src/nexus/tool-registry.ts`

- Solo se ejecuta una herramienta registrada.
- `requiresApproval` se decide **en el registro**, nunca desde el cuerpo HTTP.
- Techo de bytes de entrada, timeout por herramienta y cancelación por `AbortSignal`.
- Los errores se devuelven saneados (`TOOL_ERROR`), sin stack ni detalle interno.

### 3.3 `src/nexus/agent-loop.ts`

- Ciclo planificar → ejecutar → observar, con planner inyectable.
- `EvidenceLedger`: cadena de hashes SHA-256 append-only; `verify()` detecta alteración.
- `SkillMemory`: registra secuencias exitosas y las **sugiere**; no autoriza.
- El planner heurístico **no usa LLM ni red**; responde solo con hechos recuperados del grafo
  y declara explícitamente cuando no encontró evidencia.
- Cotas: 8 pasos máximo, 60 s de deadline máximo.

### 3.4 `src/nexus/workflow.ts`

- DAG validado antes de ejecutar; un ciclo se **rechaza** (`WORKFLOW_CYCLE_DETECTED`).
- Orden topológico determinista (Kahn, estable por declaración).
- Reintentos acotados (máx. 3) con el `retry()` existente de `src/resilience/retry.ts`.
- Si un paso falla, los completados se compensan en orden inverso (saga).
- Cotas: 32 pasos, 60 s de deadline.

### 3.5 `src/nexus/antifragile.ts`

- Ventana deslizante por componente, cortacircuitos con enfriamiento y estado `half-open`.
- `guard()` devuelve `source: 'primary' | 'fallback'`: un sustituto **nunca** se presenta
  como primario.
- `proposeRepairs()` propone reparaciones con `requiresHumanApproval: true`; no ejecuta nada.
- Sin señales, el reporte declara salud **no medida**, no "100 % sana por evidencia".

### 3.6 `src/nexus/quantum.ts`

- Simulador statevector local, determinista, hasta **12 qubits** y 512 compuertas.
- Compuertas: `h`, `x`, `y`, `z`, `s`, `t`, `rx`, `ry`, `rz`, `cnot`, `cz`.
- Muestreo con LCG sembrado: misma semilla → mismo resultado.
- `verifySimulation()` valida normalización y probabilidades en rango.
- **No** sustituye hardware cuántico real ni un backend PennyLane.

### 3.7 `src/nexus/runtime.ts`

Fachada única que compone todo lo anterior, registra cinco herramientas internas
(`knowledge.search`, `knowledge.assert`, `graph.stats`, `quantum.simulate`, `monitor.report`)
y un workflow `nexus.diagnostic` (lee, autoprueba y sella; no escribe ni despliega).

## 4. Superficie HTTP

Prefijo: `/api/v1/nexus`. Lecturas: 30 req/min. Escrituras: 10 req/min.

```text
GET  /api/v1/nexus
POST /api/v1/nexus/ask
GET  /api/v1/nexus/knowledge
POST /api/v1/nexus/knowledge
POST /api/v1/nexus/knowledge/:id/correct
POST /api/v1/nexus/knowledge/:id/withdraw
POST /api/v1/nexus/quantum/simulate
GET  /api/v1/nexus/health
GET  /api/v1/nexus/repairs
POST /api/v1/nexus/diagnostics
```

Autorización:

- Las escrituras (`POST /knowledge`, `correct`, `withdraw`) y `GET /repairs` exigen
  `GENESIS_ADMIN_API_TOKEN` verificado **en el servidor**.
- `POST /ask` funciona sin token, pero entonces `approvalGranted` es `false` y las
  herramientas de escritura se bloquean.
- El cuerpo HTTP **nunca** concede aprobación.

## 5. Pruebas

| Archivo | Qué prueba |
|---|---|
| `test/nexus/knowledge-graph.test.ts` | fuente obligatoria, duplicados, conflictos, corrección, retiro, ranking |
| `test/nexus/agent-loop.test.ts` | respuesta con fuente, ausencia honesta, bloqueo de escritura, techo de pasos, ledger |
| `test/nexus/workflow.test.ts` | ciclos, orden topológico, compensación, reintentos, workflow ausente |
| `test/nexus/antifragile.test.ts` | apertura de circuito, sustitución, `half-open`, propuestas de reparación |
| `test/nexus/quantum.test.ts` | Bell, X, RY, muestreo determinista, rechazos, hash reproducible |
| `test/routes/nexus.test.ts` | contrato exacto de 10 rutas, auth, conflictos 409, rate limit |

Resultado local de esta corrida: **35/35 pruebas Nexus en verde**. Un test verde demuestra
una capacidad computacional; **no** demuestra autoridad, ni facultad, ni producción.

## 6. Limitaciones declaradas

1. El grafo, el ledger y la memoria de skills viven **en memoria del proceso**: no son
   durables. Reiniciar el servidor pierde el contenido.
2. El planner heurístico no usa LLM. No hay razonamiento generativo en esta capa.
3. El workflow de diagnóstico no demuestra que el sistema esté listo para producción.
4. El simulador cuántico es local y acotado; no es un backend real ni reemplaza PennyLane.
5. La UI de big-AGI y hermes-webui **no** se adoptó todavía.
6. `production: false` en todas las capacidades: falta evidencia humana nominal.

## 7. Compensaciones

- Se eligió memoria en proceso antes que persistencia prematura para no declarar durabilidad
  sin migraciones aplicadas ni TLS verificado.
- Se eligió un planner heurístico honesto antes que un planner con LLM para que la capa
  funcione sin proveedor externo y sin inflar capacidad.
- Se acotaron los qubits a 12 para evitar explosión de memoria (2¹² amplitudes complejas).

## 8. Siguientes pasos (con dueño y fecha)

- **2026-11-15 · responsable: humano titular.** Persistir grafo y ledger en Postgres/Supabase
  con migración aplicada y recuperación probada.
- **2026-11-15 · responsable: humano titular.** Revisión humana nominal de esta capa para
  pasar de `draft` a `verified`.
- **2026-11-30 · responsable: agente + humano.** Evaluar la adopción de patrones de UI de
  big-AGI/hermes-webui sin copiar licencias.
