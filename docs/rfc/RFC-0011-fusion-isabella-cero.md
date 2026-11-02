# RFC-0011 — Fusión de ISABELLA CERO: Agent Mesh, sandbox y canon

**Estado:** `draft | engine-generated`
**Autor del cambio:** agente de IA (sin aprobación humana nominal todavía)
**Fecha:** 2026-11-01
**Riesgo:** MEDIUM
**Gobernanza:** CROWN / Human Review Gate

> Regla aplicada sin excepciones:
> `SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION`
> `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE`
> Lo descrito aquí está **implementado** y cubierto por pruebas unitarias o de contrato;
> **nada** se declara en producción ni en estado `verified`.

## 1. Intención

Fusionar `AnubisVillasenor1/proyecto-isabella-cero` con este runtime para que exista **una sola
Isabella funcional**, sin duplicar módulos, sin importar una maqueta y sin rebajar el contrato de
evidencia. El material de origen contiene dos documentos canónicos y una aplicación Next.js de
demostración. La fusión conserva lo primero, audita lo segundo e implementa solo lo que puede
probarse.

## 2. Inventario real del repositorio de origen

Commit auditado: `ac6136faaec91c89cacd50fff36b32e863ed21a0` (rama `main`, 1.5 MB, sin `README.md`
ni `LICENSE` en la raíz).

| Ruta | Qué es | Dictamen |
|---|---|---|
| `data/*.docx` (2 archivos) | Canon `V1.0-FINAL-COMPLETE` y `V1.1-FOUNDATIONAL-DELIVERY` | **Conservados** en `docs/canon/source/` con SHA-256 |
| `app/page.tsx` | Maqueta de IDE: editor, chat y "100 capacidades" | **No importado**: la interacción es simulada |
| `app/layout.tsx`, `app/globals.css` | Shell visual de la maqueta | **No importado** |
| `components/ui/button.tsx`, `lib/utils.ts` | Utilidades shadcn | **No importadas**: no hay funcionalidad de runtime |
| `next.config.mjs`, `postcss.config.mjs`, `pnpm-lock.yaml` | Toolchain Next.js 16 / Tailwind 4 | **No importado**: rompería la topología de una sola función |
| `public/*.svg` | Placeholders | **No importados** |

Hallazgos verificables de la maqueta:

- `sendPrompt()` agrega un mensaje fijo; no llama a ningún modelo ni API.
- `runProject()` solo alterna un estado visual durante 1 200 ms.
- El explorador lista `lib/kernel.ts` y `README.md`, que **no existen** en el repositorio.
- El "capability deck" son 100 cadenas agrupadas en 10 tarjetas; ninguna tiene prueba, módulo ni
  endpoint asociado.

Presentar esa maqueta como producto funcional violaría el contrato de evidencia del repositorio.

## 3. Decisión de arquitectura

### 3.1 Lo que se implementa

| Módulo | Responsabilidad | Estado |
|---|---|---|
| `src/agents/mesh.ts` | Matriz de 10 roles, evaluación ALLOW/DENY/ESCALATE, orquestador con concurrencia y timeout, sello BookPI | `implemented` · `tested (unit)` |
| `src/agents/mesh-adapters.ts` | Planner, Reviewer y Coder-en-sandbox deterministas | `implemented` · `tested (unit)` |
| `src/agents/sandbox.ts` | Contención de rutas, límites de tamaño, SHA3-512, rechazo de symlinks | `implemented` · `tested (unit)` |
| `src/routes/agents-mesh.ts` | Catálogo y evaluación de política por HTTP | `implemented` · `tested (contract)` |
| `test/agents/mesh.test.ts` | 10 roles, escalamiento, timeout, concurrencia, evidencia | `tested (unit)` |
| `test/agents/sandbox.test.ts` | Traversal, rutas absolutas, NUL, tamaño, symlinks | `tested (unit)` |
| `test/routes/agents-mesh.test.ts` | Validación, aprobación administrativa, no ejecución | `tested (contract)` |

### 3.2 Lo que NO se implementa

| Capacidad CERO | Estado | Motivo |
|---|---|---|
| Ejecución remota de agentes | `SPECIFIED` | No existe transporte, sandbox de proceso ni aprobación operativa |
| Coder que aplique parches al repositorio | `SPECIFIED` | El adaptador solo escribe propuestas en sandbox; aplicarlas requiere PR + revisión |
| Tester y DevOps ejecutables | `SPECIFIED` | Sin adaptador registrado; `submit` devuelve `NO_ADAPTER` |
| GÉNESIS TTS > 4.8 MOS, WER < 1.5 % | `RESEARCH` | Son metas de diseño, no mediciones |
| Hyper Core Turbo 3× | `RESEARCH` | No hay benchmark reproducible en este cambio |
| IEGS, IMRCF, IUEF, Federación, PQC | `SPECIFIED` | Ya existían como RFC/spec; esta fusión no los implementa |
| Las 100 capacidades del deck | `mapped` | Nombres aspiracionales sin evidencia |

## 4. Correcciones aplicadas al material de origen

| Patrón del canon | Problema | Corrección |
|---|---|---|
| `safeSandboxPath` con `startsWith` | Acepta un hermano con prefijo común (`/tmp/sandbox-evil`) | `path.relative` + rechazo de `..`, absolutas, NUL y symlinks |
| `BookPILedger` con `JSON.stringify(obj, keys.sort())` | El segundo argumento es lista blanca, no orden; `.sort()` muta | Se usa el ledger canónico `src/bookpi/ledger.ts` |
| `CoderAgent` con `hash: "pending-implementation"` | Un hash pendiente no es evidencia | El adaptador calcula SHA3-512 del contenido escrito |
| `createTask` impreso con variable indefinida | No compila tal como se publica | `DevAgentMesh.submit` valida rol, acción y riesgo en runtime |
| `CrownPolicyEngine` sin validación de rol | Un rol inventado devuelve `[]` y falla abierto en la práctica | `evaluateMeshAction` devuelve `DENY / UNKNOWN_ROLE` |
| Aprobación leída del cuerpo | Permitiría autoconcederse autoridad | La aprobación se decide desde un bearer verificado en el servidor |

## 5. Invariantes de la superficie

1. `GET /api/v1/agents/mesh` es lectura y catálogo; no autoriza.
2. `POST /api/v1/agents/mesh/evaluate` **evalúa** política; `authorizationPerformed` y
   `executionPerformed` son siempre `false`.
3. `ALLOW` significa que la política se satisface, no que exista autoridad o ejecución.
4. `ESCALATE` es el resultado por defecto ante riesgo superior al techo del rol o scope crítico.
5. Sin adaptador registrado no hay ejecución simulada: `BLOCKED / NO_ADAPTER`.
6. Cada decisión ejecutada por `DevAgentMesh` se sella en BookPI con `type`, `principal`,
   `riskTier` y `status`; el ledger no se sustituye por un hash local.
7. El sandbox rechaza symlinks y rutas fuera de la raíz; escribir en el sandbox no es producción.

## 6. Evidencia

- `test/agents/mesh.test.ts`: 11 pruebas.
- `test/agents/sandbox.test.ts`: 8 pruebas.
- `test/routes/agents-mesh.test.ts`: 6 pruebas.
- `test/deployment/route-inventory.test.ts`: inventario congelado actualizado (2 rutas nuevas).

Ejecución local (estación de trabajo, no CI conservada):

```text
vitest run test/agents/mesh.test.ts test/agents/sandbox.test.ts \
  test/routes/agents-mesh.test.ts test/deployment/route-inventory.test.ts
→ 4 archivos, 31 pruebas aprobadas
```

## 7. Riesgos y límites declarados

- El Agent Mesh no está conectado al runtime conversacional ni a CROWN más allá de la evaluación
  de política; su valor actual es de librería y contrato HTTP.
- El adaptador Coder-en-sandbox no se registra en `src/server.ts` para no prometer escrituras en
  un entorno serverless de solo lectura. Su prueba usa un directorio temporal.
- El timeout de adaptador no aborta trabajo cooperativo que ignore la señal; el contrato exige
  que los adaptadores sean deterministas y acotados.
- La comprobación de symlinks del sandbox es previa a la operación: queda una ventana TOCTOU
  frente a un proceso hostil con control concurrente del mismo directorio. El sandbox contiene
  agentes, no sustituye el aislamiento del sistema operativo.
- La fusión **no** eleva `readyz` ni cambia el estado de producción. El bloqueo por
  `bookpi-ledger:degraded` sigue vigente y documentado en `docs/ESTADO-REAL-ACTUAL.md`.
