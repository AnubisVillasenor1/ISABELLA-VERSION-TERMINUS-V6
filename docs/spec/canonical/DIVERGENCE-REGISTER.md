# Registro de divergencias código ↔ especificación

**Estado:** `draft` · **Autoría:** ingeniería de IA · **Requiere arbitraje humano** (AGENTS.md §2 y §6).

> En conflicto entre código y spec, gana la spec; el conflicto **se archiva aquí como
> divergencia pendiente de arbitraje humano** (AGENTS.md §6). Este registro **no**
> renombra ni reescribe código: documenta y espera decisión humana.

## DIV-0001 — Gramática de la "identidad de método" (TINA / YUN)

- **Estado:** arbitrado en parte (2026-11-01, ver «Arbitraje») para los literales que llegan
  al parser; sigue **abierto** el namespace textual `TINA.YUN.*` (opción C pendiente) ·
  **Severidad:** media · **Detectado:** 2026-10-15
- **Especificación:**
  - AGENTS.md §5: `[TINA].[YUN].[MODULO].[FUNCION].[VERSION].[RISK_TIER].[GOVERNANCE_TIER]`.
  - `docs/spec/ISABELLA-CANON-v40-source.txt`: TINA = *Trusted Intelligence, Native & Adaptive*.
- **Código (parser estricto, `src/authority/method-id.ts:107` `parseMethodId`):**
  - 1er segmento ∈ `TINA_TYPES = ["T","I","N","A"]`.
  - 2º segmento ∈ `YUN_FEDERATIONS = [IDENTITY, PATRIMONY, TOURISM, ECONOMY, TWINS, COLLECTIVE_INTELLIGENCE, RESILIENCE]`.
  - Último ∈ `GOVERNANCE_TIERS = [CONSTITUTIONAL, TERRITORIAL, INSTITUTIONAL, OPERATIONAL, AUTONOMOUS]`.

### Literales de method-id que `parseMethodId` rechazaría

*(las «Ubicación» son las líneas de la revisión de 2026-10-15; el estado actual de cada
literal lo decide el arbitraje de abajo.)*

| # | Literal | Ubicación | Motivo del rechazo |
|---|---|---|---|
| 1 | `Q.QUANTUM.E20_EXECUTION.execute_pennylane.v1.0.0.MEDIUM.INSTITUTIONAL` | `src/server.ts:537`, `src/server.ts:554`, `src/server.ts:1587` | `Q` ∉ TINA_TYPES; `QUANTUM` ∉ YUN_FEDERATIONS |
| 2 | `TINA.YUN.FABRIC.append_event.v1.0.0.MEDIUM.HUMAN_IN_THE_LOOP` | `src/server.ts:823` | `TINA` ∉ TINA_TYPES; `YUN` ∉ YUN_FEDERATIONS; `HUMAN_IN_THE_LOOP` ∉ GOVERNANCE_TIERS |
| 3 | `TINA.YUN.<MODULO>.*` | `src/gameover/types.ts:19-23`, `src/hypercore/types.ts:26-31`, `src/hypercore/index.ts:39`, `src/osiris/types.ts:18-20` | 1er y 2º segmento literales |
| 4 | `TINA.YUN.TEST.append.v0.1.0.LOW.AUTONOMOUS` | `test/bookpi/durable-ledger.test.ts:18`, `test/bookpi/retention.test.ts:12` | idem; usado como metadata del ledger BookPI |
| 5 | `T.TOOL.<toolId>.execute.v1.0.0.LOW.TERRITORIAL` | `src/server.ts:878` | `TOOL` ∉ YUN_FEDERATIONS |

### Naturaleza de la divergencia

Los literales de (1), (2), (3), (4) y (5) se usan como **etiquetas de namespace /
metadata** (manifiestos de skill, eventos BookPI); **no** se pasan por `parseMethodId`.
El parser estricto solo se invoca en `src/crown/index.ts:47` y `src/pipeline/conductor.ts:14`.
Por tanto, hoy conviven dos convenciones: un *namespace* textual (`TINA.YUN.*`, `Q.*`)
y una gramática estricta de 7 segmentos.

### Opciones para arbitraje humano (ninguna aplicada)

- **A.** Ampliar la spec/parser para admitir los tokens `TINA`/`YUN` literales y un tier
  `HUMAN_IN_THE_LOOP` explícito.
- **B.** Migrar todos los literales no conformes a la gramática estricta (implica cambiar
  firmas y tests existentes de BookPI).
- **C.** Formalizar el *namespace* textual como convención separada y declararlo en la spec.

### Acción tomada por ahora

- Documentar esta divergencia en este registro (cumple §6: **archivar, no adivinar**).
- Retirar el único uso muerto relacionado: el `import { parseMethodId }` en
  `src/server.ts` (no se invocaba; su retiro no cambia comportamiento).
- **Sin renombres** de literales hasta que un humano arbitre entre A / B / C.

### Arbitraje (2026-11-01) — opción B aplicada de forma selectiva

Orden del owner en chat: *«suma dos methodId inválidos y elige una evolución tipo TINA para
Q»*. Se arbitra **solo** sobre los literales que llegan al parser, porque son los únicos cuyo
incumplimiento tiene un efecto de producción.

**Se corrigen (3 literales, todos llave literal del gate de CROWN):**

| Antes | Después | Motivo del nuevo valor |
|---|---|---|
| `A.COGNITION.E14_COGNITIVE_SAFETY.mediate_isabella.…` | `A.COLLECTIVE_INTELLIGENCE.E14_COGNITIVE_SAFETY.…` | `COGNITION` no es federación; la mediación soberana de Isabella es una función de inteligencia colectiva. |
| `A.COGNITION.E19_CAPABILITY.invoke_hsf.…` | `A.COLLECTIVE_INTELLIGENCE.E19_CAPABILITY.…` | idem; el Hyper Skill Fabric es la capacidad de composición colectiva. |
| `Q.QUANTUM.E20_EXECUTION.execute_pennylane.…` | `A.TWINS.E20_EXECUTION.…` | Ver el criterio de TINA más abajo. |

**Criterio para el tipo TINA de la ejecución cuántica.** `Q` no existía en la gramática, así
que la pregunta real era a qué tipo pertenece ejecutar un circuito PennyLane. Se descarta
crear un octavo token (`Q`) porque la spec fija cuatro tipos y ampliarlos es la opción A,
no arbitrada. Entre los existentes: `T` (Territorial) ataría una capacidad de cómputo a un
nodo físico; `I` (Institucional) es gobernanza entre organismos; `N` (Normativa) es
validación de reglas. El cálculo cuántico en este runtime se invoca sobre **gemelos**
(estados espejo de un territorio o sistema real) y su salida describe ese gemelo, no el
suelo ni la norma. Por eso `A` (Auto-cognitiva) con federación `TWINS`: la capacidad es un
modo de razonar sobre el espejo, y queda dentro de la jerarquía `A.*` que ya usan
mediación e HSF. Si el arbitraje humano prefiere anclarlo al nodo físico, el cambio es
`T.TWINS.E20_EXECUTION…` — una sustitución literal en tres sitios (descriptor del gate,
registro de skill y ruta HTTP) más el test de `governance-method-ids.test.ts`.

**No se renombran (etiquetas de metadata que nunca llegan a `parseMethodId`):**
`COMMERCE_METHOD_IDS` (`TINA.YUN.COMMERCE.*`), `T.TOOL.<toolId>.execute`, manifiestos de
skill y los literales de `test/bookpi/*`. Estos valores se escriben dentro de eventos del
ledger BookPI y forman parte del material que se hashea: renombrarlos **invalidaría la
integridad de evidencia ya sellada** sin ganar ninguna conformidad de parser. Quedan como
namespace textual, pendiente de la opción C (declararlo explícito en la spec).

**Afirmación corregida:** la sección «Naturaleza de la divergencia» afirmaba que estos
literales *no* se pasan por `parseMethodId`. Eso era falso desde que `callGate`/`verifyMethod`
evalúan la mediación, el HSF y la ejecución cuántica: un literal no canónico se traducía en
un `403` silencioso e irrecuperable para el operador. Para que ese modo de fallo no pueda
repetirse, `/api/v1/healthz` ahora observa la conformancia de todo el registro de
capacidades (`probeMethodIdConformance`, dependencia requerida) y `scripts/runtime-smoke.mjs`
falla el build si alguna capacidad queda fuera del canon.

## DIV-0002 — "Cognitive Civilization Runtime (CCR-1)": 12 vs 13 capas Ω

- **Estado:** abierto · **Severidad:** baja · **Detectado:** 2026-10-15
- **Especificación:** `ISABELLA Ω · COGNITIVE CIVILIZATION RUNTIME (CCR-1)` v2.0.0,
  §"Capas": titula **"12 capas Ω"** pero su tabla enumera **Ω-0 … Ω-12**
  (Sovereign Kernel, Cognitive Memory Mesh, Reality Digital Twin, Planetary
  Knowledge Graph, Meta-Reasoning Engine, Autonomous Science Engine, Civilization
  Policy Compiler, Trust Fabric, Multi-Agent Federated Intelligence, Economic
  Consciousness Engine, Neural Governance Layer, Self-Evolution Engine,
  Antifragility Core) — **13 filas**.
- **Código (`src/civilization/layers.ts`):** se registran las **13** capas
  (`CIVILIZATION_LAYER_COUNT = 13`) y se declara la discrepancia con la constante
  `CCR_DECLARED_LAYERS = 12`, en lugar de silenciarla o renumerar la spec.
- **Naturaleza de la divergencia:** desajuste interno de la propia especificación
  (título vs. tabla), no un conflicto código↔spec. Puede resolverse renumerando
  Ω-1..Ω-12 (sin Ω-0) o corrigiendo el título a "13 capas".
- **Opción tomada por ahora (cumple §6):** registrar ambas cifras de forma explícita
  y honesta; **sin** modificar la estructura. Pendiente de arbitraje humano para
  fijar la numeración canónica.

## DIV-0003 — "IHEC v3.1 (Edición Perplexity)": lenguaje, criptografía y conteo de capas

- **Estado:** abierto · **Severidad:** media · **Detectado:** 2026-10-15
- **Especificación:** `Isabella Ω · Cognitive Civilization Runtime v3.1`
  (`isabella-core-ccr-ihec-perplexity`, §7) aporta un módulo de referencia en
  **Python** (`isabella_omega_ihec.py`), 12 subsistemas IHEC, un supuesto "14 capas Ω"
  y 10 "Regalos de Perplexity". El sello de snapshots se describe como
  **BLAKE3 + ZSTD + XChaCha20**.
- **Código (`src/ihec/`):** portado a **TypeScript** estricto y determinista; el sello
  usa la criptografía **REAL** del repo (**SHA3-512** vía `bookpi/crypto`). Se
  registran las capas **Ω-13** (IHEC) y **Ω-14** (Evolutionary Crisis Memory) como
  extensión de las 13 ya registradas por CCR-1. Las divergencias se declaran en
  `src/ihec/contract.ts` (`IHEC_DIVERGENCES`, `IHEC_SPEC_DECLARED_LAYERS = 14`).
- **Naturaleza de la divergencia:**
  1. **Lenguaje:** la spec es Python; el repo es TypeScript sin `any`. Se porta el
     comportamiento (y se amplía) sin romper la invariante de tipos.
  2. **Criptografía:** BLAKE3 / ZSTD / XChaCha20 **no existen** en el repo; no se
     simulan. Se usa SHA3-512 real y se declara la parte no soportada.
  3. **Conteo de capas:** la spec titula "14 capas Ω" pero su diagrama enumera 10
     (Ω-1..Ω-10) + Ω-13 + Ω-14; CCR-1 ya usa Ω-0..Ω-12. Choque de numeraciones.
  4. **Ventaja cuántica:** el "Q-ECTS" no se reclama aquí; el sustrato es clásico.
- **Opción tomada por ahora (cumple §6):** implementar los 12 subsistemas y los 10
  regalos de forma honesta en proceso, declarar las cuatro divergencias arriba y en
  el código, y **no** renombrar las capas existentes. Pendiente de arbitraje humano
  para fijar numeración canónica, lenguaje y criptografía objetivo. La quinta
  entrega (BLAKE3/ZSTD/XChaCha20) queda **SPECIFIED**, nunca simulada.

## DIV-0004 — Corpus externo pide «PEDAGOG» y ocho controles ISA que el repo no conoce

- **Estado:** abierto · **Severidad:** media · **Detectado:** 2026-11-03
- **Procedencia del documento:** **no vive en el repo.** Llega de archivos sueltos en
  `C:\Users\tamvo\OneDrive` (carpeta «Archivos de Microsoft Copilot Chat» y su entorno). Se
  declara aquí antes de dictaminar, porque un hueco citado desde un documento externo no es
  una regresión del repositorio.
- **Especificación (según ese corpus):** un módulo/área «PEDAGOG» y una puerta «Pedagogía»,
  más los controles `ISA-014`, `ISA-015`, `ISA-017`, `ISA-019`, `ISA-021`, `ISA-022`,
  `ISA-024`, `ISA-025`.
- **Medida en el árbol actual (`5e6fe2f5`):** `pedagog` en cualquier forma, sensible o
  insensible a mayúsculas, **0 coincidencias** en todo el repo incluidos `docs/`. Esos ocho
  identificadores, **0 coincidencias** en `src/**`. Los controles ISA que sí existen usan
  otros rangos: ISA-002…013, ISA-016, ISA-077 (`src/cognition/**`), ISA-159, ISA-199/203/205,
  ISA-210, ISA-216/217 (`src/commerce/**`), ISA-259, ISA-371, ISA-451/455/457/458
  (`src/companion/**`), ISA-500.
- **Naturaleza de la divergencia:** el corpus numera una serie de controles que el repo nunca
  adoptó. No hay un homónimo «que sí hace lo afirmado con otro nombre» — se buscó.
- **Dictamen:** **NO IMPLEMENTADO**.
- **Opciones para arbitraje humano (ninguna aplicada):** (A) reconocer la serie ISA-014…025
  como canon y escribir los controles que faltan; (B) declarar que el canon de identificadores
  es el del repo y corregir el corpus; (C) publicar el corpus dentro de `docs/spec/` para que
  la comparación sea versionable.
- **Acción tomada por ahora:** archivar. No se crea `src/pedagog/` ni se inventan ocho
  controles para darle razón al documento (AGENTS.md §6: capacidad nueva es diseño, exige
  decisión humana).

## DIV-0005 — La lista `exclude` de tsconfig no es una frontera de cobertura

- **Estado:** arbitrado en parte (se promueven las capas verdes; el texto de STATUS sigue
  derivado de la lista) · **Severidad:** alta · **Detectado:** 2026-11-03
- **Especificación del repo:** `docs/STATUS.md`, generada por `scripts/generate-status.mjs:14`
  desde `tsconfig.json:exclude`, titula «Áreas fuera del typecheck principal» y sentencia que
  una capa excluida «no puede declararse lista para producción». `ci.yml` llamaba *advisory* al
  job de capas «hasta que estén verdes».
- **Medida:** con `tsc --listFilesOnly`, el programa contenía **621** archivos bajo `src/` antes
  de retirar las 15 exclusiones y **625** después. Un archivo importado desde una raíz entra al
  programa aunque figure en `exclude`, así que la tabla de STATUS describía una frontera que el
  compilador no estaba aplicando. Además, esas 15 capas ya daban exit 0 en
  `tsconfig.layers.json` **antes** del cambio.
- **Acción tomada:** `tsconfig.json:exclude` pasa de 23 a 8 entradas (sólo las seis áreas que
  están realmente fuera y el par `node_modules`/`dist`); `ci.yml` retira `continue-on-error`.
  `docs/STATUS.md` regenerada. El guard
  `test/deployment/hardening-guards.test.ts:38` (coherencia tsconfig↔layers) sigue en verde.
- **Pendiente de arbitraje humano:** la cobertura real que no da el typecheck principal son
  **508 de 1133** archivos `.ts/.tsx` de `src/` (44,8 %), concentrados en `src/lib/lib` (323) y
  `src/components/**` (~150). Ninguna de esas cifras está en STATUS.md hoy, y ninguna debe
  leerse como «el repo no typechea»: son subtrees que no alcanzan las puertas.

## DIV-0006 — ~150 componentes `.tsx` sin React y sin opción `jsx`

- **Estado:** abierto · **Severidad:** alta · **Detectado:** 2026-11-03
- **Especificación:** `package.json` declara puertas de lint/format sobre `{ts,tsx,js,jsx}` y
  `README.md` presenta superficies de UI; `src/components/**` contiene ~150 archivos `.tsx`.
- **Medida:** `tsconfig.json` no define `compilerOptions.jsx`. El grafo de dependencias no
  incluye `react`, `react-dom`, `@types/react` ni `@types/react-dom` (ausentes en
  `package.json` y en `node_modules/.pnpm`). Un sondeo con `"jsx"` activado devolvió 21 561
  errores, de los que 12 244 son `TS7026` (no existe `JSX.IntrinsicElements`) y 7 769 `TS17004`
  (falta `--jsx`). `tsconfig.build.json` excluye `src/components` y ninguna ruta del servidor
  los importa: la UI servida vive en `src/ui/*.js`.
- **Naturaleza de la divergencia:** hay código implementado que **no puede** pasar por la
  escalera `IMPLEMENTED → TESTED`, porque falta el sustrato (framework y opción de compilado).
  No es un fallo de esas clases; es una capacidad declarada en el árbol pero inverificable.
- **Dictamen:** **IMPLEMENTED pero NO VERIFICABLE** — no asciende a `TESTED` ni a `VERIFIED`.
- **Opciones para arbitraje humano:** (A) adoptar React + `@types/react` y `"jsx": "react-jsx"`,
  con la pasada de errores que eso abra; (B) retirar `src/components/**` y declarar `src/ui/*.js`
  como única superficie; (C) dejarlo como archivo histórico y etiquetarlo como tal en STATUS.
- **Acción tomada:** archivar. No se añade React por cuenta propia (decisión de pila, AGENTS.md
  §6) y no se borran 150 archivos rastreados sin orden del owner.

## DIV-0007 — Árbol espejo byte a byte en `src/components/isabella/`

- **Estado:** abierto · **Severidad:** media · **Detectado:** 2026-11-03
- **Medida:** `diff -rq src/components/isabella src/components/isabella/isabella` no reporta
  ninguna diferencia de contenido: 38 componentes duplicados. Ningún import del repo apunta a
  `isabella/isabella` (buscado en `src`, `test`, `scripts`). Forma de directorio doble, sin
  duplicación de contenido, en `src/lib/lib`, `src/core/core`, `src/hooks/hooks`,
  `src/components/ui/ui`, `src/components/navigation/navigation`, `src/components/intro/intro`,
  `src/authz-runtime/authz-runtime`, `src/hypercore-runtime/hypercore-runtime`.
- **Riesgo concreto:** infla conteos de capacidad cuando un inventario se hace por archivo y no
  por registro (AGENTS.md §1: CAPABILITY ≠ EXECUTION), y conserva copias que no evolucionan
  juntas.
- **Acción tomada:** archivar y reportar. El borrado es candidato mecánico de 38 archivos
  rastreados; se hace sólo con orden del owner, porque tocar el árbol de UI se confunde con la
  decisión pendiente de DIV-0006.

