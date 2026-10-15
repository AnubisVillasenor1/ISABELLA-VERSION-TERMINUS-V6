# Registro de divergencias código ↔ especificación

**Estado:** `draft` · **Autoría:** ingeniería de IA · **Requiere arbitraje humano** (AGENTS.md §2 y §6).

> En conflicto entre código y spec, gana la spec; el conflicto **se archiva aquí como
> divergencia pendiente de arbitraje humano** (AGENTS.md §6). Este registro **no**
> renombra ni reescribe código: documenta y espera decisión humana.

## DIV-0001 — Gramática de la "identidad de método" (TINA / YUN)

- **Estado:** abierto · **Severidad:** media · **Detectado:** 2026-10-15
- **Especificación:**
  - AGENTS.md §5: `[TINA].[YUN].[MODULO].[FUNCION].[VERSION].[RISK_TIER].[GOVERNANCE_TIER]`.
  - `docs/spec/ISABELLA-CANON-v40-source.txt`: TINA = *Trusted Intelligence, Native & Adaptive*.
- **Código (parser estricto, `src/authority/method-id.ts:107` `parseMethodId`):**
  - 1er segmento ∈ `TINA_TYPES = ["T","I","N","A"]`.
  - 2º segmento ∈ `YUN_FEDERATIONS = [IDENTITY, PATRIMONY, TOURISM, ECONOMY, TWINS, COLLECTIVE_INTELLIGENCE, RESILIENCE]`.
  - Último ∈ `GOVERNANCE_TIERS = [CONSTITUTIONAL, TERRITORIAL, INSTITUTIONAL, OPERATIONAL, AUTONOMOUS]`.

### Literales de method-id que `parseMethodId` rechazaría

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
