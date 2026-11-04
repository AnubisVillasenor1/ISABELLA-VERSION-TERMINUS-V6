# Canon ISABELLA CERO — procedencia y conciliación

**Estado:** `draft | engine-generated` (importado y auditado, sin aprobación humana nominal).
**Fecha de fusión:** 1 de noviembre de 2026.
**Origen:** `https://github.com/AnubisVillasenor1/proyecto-isabella-cero`, rama `main`, commit `ac6136faaec91c89cacd50fff36b32e863ed21a0`.
**Autor del material de origen:** Edwin Oswaldo Castillo Trejo (Anubis Villaseñor), ORCID `0009-0008-5050-1539`, ISNI `0000 0005 3169 9229`.
**Nodo Cero:** Mineral del Monte, Hidalgo, México.

## 1. Qué se conserva del repositorio de origen

Los dos documentos canónicos se conservan **sin reescribir**, como artefactos de procedencia:

| Archivo | Documento | Bytes | SHA-256 |
|---|---|---:|---|
| `source/ISABELLA_CERO_FINAL_COMPLETE_FILE-4256b9.docx` | `ISABELLA-CERO-V1.0-FINAL-COMPLETE` · `CANON-EOC-ISABELLA-CERO-TIME-TO-WAKE-UP-2026-V1.0-FINAL` | 1 008 723 | `208b0936858655379b51dbf64e9d38c556b9e63f5aeb01515817839f80fb1f5e` |
| `source/ISABELLA_CERO_FOUNDATIONAL_DELIVERY_HCT_X3-d3144b.docx` | `ISABELLA-CERO-V1.1-FOUNDATIONAL-DELIVERY` · `CANON-EOC-ISABELLA-CERO-HCT-X3-LLM-2026-V1.0` | 356 308 | `9b6f0dd0bf541b24501de1fbf7ef028b0ec86b56b16dead24904c3af4b057f47` |

También se conserva el principio rector de ambos documentos:

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
UNA META DE RENDIMIENTO NO ES UN RESULTADO
```

## 2. Qué se fusionó de verdad

La fusión no importa el maquetado Next.js ni declara implementadas las 100 capacidades del
"capability deck". Importa la **matriz de permisos de 10 roles** y la convierte en código
ejecutable, probado y sin autoridad implícita.

| Componente CERO | Implementación en este repositorio | Madurez real |
|---|---|---|
| Matriz de roles Planner…Operator (sección 21) | `src/agents/mesh.ts` · `DEV_AGENT_PROFILES` | `implemented` · `tested (unit)` |
| Evaluación de política ALLOW/DENY/ESCALATE (secciones 8 y 26) | `src/agents/mesh.ts` · `evaluateMeshAction` | `implemented` · `tested (unit)` |
| Orquestador de agentes con concurrencia acotada (sección 29) | `src/agents/mesh.ts` · `DevAgentMesh` | `implemented` · `tested (unit)` |
| Evidencia por decisión (sección 18, BookPI) | `DevAgentMesh` + `src/bookpi/ledger.ts` | `implemented` · `tested (unit)` |
| Sandbox de archivos con contención de rutas (sección 32) | `src/agents/sandbox.ts` | `implemented` · `tested (unit)` |
| Planner determinista objetivo → pasos (sección 25) | `src/agents/mesh-adapters.ts` | `implemented` · `tested (unit)` |
| Reviewer determinista de hallazgos (sección 25) | `src/agents/mesh-adapters.ts` | `implemented` · `tested (unit)` |
| Coder que solo escribe propuestas en sandbox (sección 30) | `src/agents/mesh-adapters.ts` | `implemented` · `tested (unit)`; **no cableado a HTTP** |
| Catálogo y evaluación por HTTP | `src/routes/agents-mesh.ts` | `implemented` · `tested (contract)` |
| TTS GÉNESIS, VOX Ω, IEGS, IMRCF, IUEF, Federación, PQC | Ya existían como RFC/spec en este repositorio | sin cambio; siguen `specified` o `research` |

La superficie HTTP nueva es deliberadamente **solo de lectura y evaluación**:

```text
GET  /api/v1/agents/mesh              catálogo de roles y adaptadores registrados
POST /api/v1/agents/mesh/evaluate     evalúa política; no autoriza ni ejecuta
```

`executionPerformed` es siempre `false`. Una decisión `ALLOW` no es una autorización: CROWN
sigue siendo la autoridad y toda ejecución requiere una superficie que hoy no existe.

## 3. Qué se rechazó y por qué

| Material de origen | Dictamen | Motivo verificable |
|---|---|---|
| `app/page.tsx` (IDE simulado) | **No importado** | Es una maqueta de v0: `sendPrompt` devuelve una frase fija, `runProject` solo cambia un estado visual y el "capability deck" son 100 cadenas sin prueba. Presentarlo como producto violaría el contrato de evidencia. |
| `lib/kernel.ts` y `README.md` citados en la maqueta | **No existen** | `app/page.tsx` los lista en el explorador, pero el repositorio no los contiene. |
| App Next.js 16 + Tailwind 4 | **No importado** | Este repositorio despliega una sola función (`api/index.js` → `dist/server.js`) con `framework: null`. Añadir un segundo framework rompería la topología declarada en `vercel.json` sin aportar capacidad de runtime. |
| `safeSandboxPath` del canon | **Reimplementado** | `resolved.startsWith(root)` acepta un hermano como `/tmp/sandbox-evil` cuando la raíz es `/tmp/sandbox`. La versión fusionada usa `path.relative`, rechaza `..`, rutas absolutas, NUL y symlinks. |
| `BookPILedger` del canon | **No copiado** | `JSON.stringify(entry, Object.keys(entry).sort())` usa el segundo argumento como lista blanca de propiedades, no como orden; además `.sort()` muta el arreglo. Se usa el ledger real de `src/bookpi/ledger.ts`. |
| `CoderAgent` del canon | **No copiado** | Devuelve `hash: "pending-implementation"` como si fuera evidencia. Un hash pendiente no es evidencia. |
| `createTask` del canon | **No copiado** | El fragmento publicado contiene una variable indefinida (`agent: s…`) y no compila tal como está impreso. |
| 100 capacidades del deck | **No declaradas** | Son nombres aspiracionales. Permanecen como backlog `mapped`, no como capacidades implementadas (ver [`CAPABILITY-DECK-BACKLOG.md`](CAPABILITY-DECK-BACKLOG.md)). |

## 4. Licencias y atribución

El material de origen declara **CC BY 4.0 para documentación** y **Apache 2.0 para software**,
sin archivo `LICENSE` en la raíz del repositorio de origen. Ambos repositorios pertenecen al
mismo autor y titular de derechos. La incorporación de los `.docx` se hace por el titular y
**no relicencia este repositorio**: `LICENSE` y `NOTICE.md` de este proyecto siguen vigentes.
La atribución al canon CERO se conserva en este archivo y en `docs/rfc/RFC-0011-fusion-isabella-cero.md`.

## 5. Estado agregado de la fusión

| Categoría | Resultado |
|---|---|
| Código nuevo ejecutable | 4 módulos: `mesh.ts`, `mesh-adapters.ts`, `sandbox.ts`, `routes/agents-mesh.ts` |
| Pruebas nuevas | `test/agents/mesh.test.ts`, `test/agents/sandbox.test.ts`, `test/routes/agents-mesh.test.ts` |
| Capacidades simuladas | 0 |
| Capacidades declaradas en producción por esta fusión | 0 |
| Repositorio de origen modificado | 0 archivos |

## 6. Master Consolidated (importado 1 de noviembre de 2026)

| Archivo | Documento | Bytes | SHA-256 |
|---|---|---:|---|
| `source/ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED-03d11d.docx` | `ISABELLA VILLASEÑOR AI™ — MASTER CONSOLIDATED` (`ISABELLA-MASTER-V1.0-CONSOLIDATED`) | 434 558 | `03d11de521312e4fa90e8cbe87f3dcf199d0124d26211227d6d9e83205e378b1` |

El documento se conserva sin reescribir. La fusión ejecutable vive en `src/infinity/` y
`src/routes/infinity.ts`; el dictamen está en
[`docs/rfc/RFC-0012-infinity-master-consolidated.md`](../rfc/RFC-0012-infinity-master-consolidated.md)
y el mapa operativo en [`docs/infinity/README.md`](../infinity/README.md).

| Componente | Implementación | Madurez real |
|---|---|---|
| 14 capas Ω + 9 Fabrics | `src/infinity/architecture.ts` | `implemented` + auditoría `tested` |
| Catálogo consolidado | `src/infinity/catalog.ts` (10 skills, 18 tools, 14 primitivas, 12 servicios) | `implemented` + auditoría `tested` |
| Constitución y 14 etapas de ingesta | `src/infinity/constitution.ts` | `tested (unit)` |
| 10 skills nativas | `src/infinity/skills.ts` | `tested (unit)`, sin red |
| Media Fabric | `src/infinity/media.ts` | `tested (unit)`, sin píxeles ni red |
| Build Fabric | `src/infinity/build.ts` | `tested (unit)`, solo plan |
| Evolution Fabric | `src/infinity/evolution-fabric.ts` | `tested (unit)`, en memoria |
| Superficie HTTP | `src/routes/infinity.ts` (7 rutas) | `tested (contract)` |

**Divergencia documentada:** el resumen del documento dice “19 tools”, pero su tabla
enumera 18. El catálogo sigue la tabla; no se inventó una herramienta para cuadrar la
cifra. Tampoco se declara el 20×: no existe un benchmark reproducible que lo respalde.

La importación **no relicencia** este repositorio y **no** declara producción. El
material de origen pertenece al mismo titular; `LICENSE` y `NOTICE.md` siguen vigentes.
