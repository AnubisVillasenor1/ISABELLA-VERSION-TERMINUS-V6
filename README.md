# Isabella Villaseñor AI — Genesis TINA / Terminus Ω

**Ω∞ Sovereign Cognitive Civilization Fabric** — núcleo gobernado de Isabella.
Toda la superficie explica sus cálculos, falla cerrado y separa capacidad de
autoridad. Ningún módulo mueve dinero ni concede autoridad por sí solo.

---

## Estado honesto de producción

Isabella **no está lista para producción ni para despliegue**. Este repositorio
demuestra capacidades computacionales locales, verificables y auditables. **No**
demuestra autoridad, aprendizaje ni producción.

| Gate | Estado |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | **1420 aprobadas / 236 archivos** |
| `pnpm run build` | exit 0 (tsc + vitest + esbuild + smoke UI + smoke runtime) |
| `pnpm run security:suite` | **14 passed / 0 failed / 0 not_applicable** |
| Rutas HTTP registradas (lista congelada) | **138** |

El readiness local ronda el ~66% (estimación de ingeniería, no certificación). El
resto lo bloquean dominios externos, no más código: integraciones sin
credenciales, CI/CD y entorno objetivo de despliegue.

---

## Invariante Operativo

**CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION**

- Las inteligencias **sugieren**, **calculan** y **evalúan**.
- La conciencia humana **decide**, **aprueba**, **arbitra** y **ejecuta**.
- Registrar una capacidad **no** la autoriza, **no** la instala, **no** la
  ejecuta y **no** mueve fondos. Cada respuesta de cómputo declara
  `authorizationPerformed:false` y `fundsMoved:false`.
- Un test verde demuestra una capacidad computacional local, **no** una facultad,
  **no** una autoridad y **no** producción.

---

## Qué es Isabella

Isabella es un runtime de civilización cognitiva soberana: un monolito TypeScript
(estricto, ESM) con superficies gobernadas para inferencia, gobernanza,
economía, memoria, confianza y federación territorial. Reutiliza primitivas
existentes en lugar de duplicarlas, y todo estado se registra en ledgers
append-only con hash encadenado (BookPI / EconomicLedger).

---

## Qué hace (capacidades reales, no facultades)

- **Inferencia de texto** gobernada (`/api/v1/cognition/*`), con proveedor
  *keyless* verificado en vivo (Pollinations, `responseEngine:"keyless-free"`).
- **Visión (imagen→texto)** y **voz** (TTS/STT) con adapters; la imagen se
  analiza por `POST /api/v1/cognition/vision`, el audio por
  `POST /api/v1/cognition/transcribe`.
- **Economía SCER**: valuación de activos cognitivos, precios dinámicos,
  regalías exactas por basis points y tesorería con saldos internos.
- **Constitución Ω∞**: diez artículos obligatorios y un flujo ineludible
  (Constitución → Política → Mandato → Capacidad → Ejecución).
- **Federación de gemelos digitales**, **memoria multimapa**, **malla de
  confianza**, **motor de investigación autónomo** y **malla civilizatoria
  territorial** — todos cálculos puros, deterministas y explicables.

---

## Arquitectura y módulos

```
src/
├── routes/        superficies HTTP extraídas del monolito (openai, economy,
│                  treasury, omega, pipeline, yun-events, …)
├── economy/       SCER: types, valuation, pricing, royalty, ledger,
│                  treasury, affiliates, fraud
├── omega/         Ω∞: constitution, simulation, capital, civilization,
│                  twins, memory, trust, research, territory, nexus
├── commerce/      antifraude reutilizado por la economía
├── governance/    permission map con consentimiento humano
├── intelligence/  turbo planner federado y ético
├── messaging/     MAGPIE-X, bus de eventos gobernado en proceso
├── pipeline/      conductor de pipeline de seis etapas
├── security/      rate-limit, document-seal, firmas
├── veritas/       grounding guard fail-closed
├── inference/     política de proveedores, multimodal, voz, keyless
└── ui/            app-shell + asset Nexus Ω∞
```

---

## Núcleo económico SCER (`/api/v3/economy`, `/api/v3/treasury`)

| Endpoint | Método | Quién |
| --- | --- | --- |
| `/api/v3/economy/calculate` | POST | viewer |
| `/api/v3/economy/settle` | POST | admin |
| `/api/v3/economy/ledger` | GET | viewer |
| `/api/v3/treasury/balance/:partyId` | GET | admin |
| `/api/v3/treasury/{credit,debit}` | POST | admin |
| `/api/v3/affiliates/{register,attribute}` | POST | admin |
| `/api/v3/fraud/analyze` | POST | admin |

Invariante económico: **no se mueven fondos reales** (`fundsMoved:false`). El
ledger económico (`EconomicLedger`) es hash-chained y `verifyIntegrity()` detecta
cualquier alteración. La tesorería falla cerrado con
`TREASURY_INSUFFICIENT_FUNDS` y responde **409** en caso de insuficiencia.

---

## Ω∞ Sovereign Cognitive Civilization Fabric (`/api/v3/omega`)

| Capa | Módulo | Propósito | Fail-closed |
| --- | --- | --- | --- |
| Ω∞-15 | `constitution.ts` | 10 artículos + flujo obligatorio | propuesta incompleta → `allowed:false` |
| Ω∞-16 | `twins.ts` | federación de gemelos digitales | sin concesión humana vigente → sin arista |
| Ω∞-17 | `simulation.ts` | hiper-simulación de mandatos | entradas fuera de rango → error |
| Ω∞-18 | `memory.ts` | memoria multimapa en proceso | IDs duplicados e importancias inválidas → error |
| Ω∞-19 | `trust.ts` | malla de confianza agregada | lo no verificado no aporta |
| Ω∞-20 | `capital.ts` | capital cognitivo | componentes fuera de `[0,100]` → error |
| Ω∞-21 | `research.ts` | LUMINA/ORACLE/AXIOM/PRISMA | sin evidencia suficiente → no se selecciona |
| Ω∞-22 | `nexus.ts` + `ui/nexus.js` | modelo de vista de consola | modelo de vista, no autoriza |
| Ω∞-23 | `territory.ts` | índice civilizatorio territorial | `deploymentAuthorized` siempre `false` |
| Ω∞ | `civilization.ts` | ecuación maestra | un factor en cero anula el valor |

**Ecuación maestra Ω∞**

```
CivilizationalValue =
  Intelligence × Governance × Evidence × Trust × Economy × Memory × Resilience × TerritorialImpact
```

Si **cualquier** factor es 0, el valor civilizatorio es 0 (fail-closed
civilizatorio). El resultado incluye `zeroFactors` para explicabilidad.

**Endpoints Ω∞** (`methodId` con formato `[TINA].[YUN].[MODULO].[FUNCION].[VERSION].[RISK_TIER].[GOVERNANCE_TIER]`):

```
GET  /api/v3/omega/constitution
POST /api/v3/omega/constitution/evaluate   (422 cuando se incumple)
POST /api/v3/omega/simulation/run
POST /api/v3/omega/capital/value
POST /api/v3/omega/civilization/value
GET  /api/v3/omega/nexus
POST /api/v3/omega/twins/federate
POST /api/v3/omega/memory/store
POST /api/v3/omega/memory/query
POST /api/v3/omega/trust/analyze
POST /api/v3/omega/research/run
POST /api/v3/omega/territory/fabricate
```

Ninguno de estos endpoints autoriza, ejecuta ni transfiere fondos.

---

## Autenticación y datos

- **Admin**: `Authorization: Bearer $GENESIS_ADMIN_API_TOKEN`. Sin token
  configurado, el módulo falla cerrado (503).
- **Keyless**: el proveedor libre se activa con
  `ISABELLA_KEYLESS_FREE_PROVIDER=pollinations`.
- Todo `process.env.X` usado en `src/` debe existir en `.env.example`
  (`test/deployment/env-documentation.test.ts`).
- `.env` sólo se carga en `pnpm run dev|start`; `pnpm test` no carga entorno.

---

## Verificación

```bash
pnpm typecheck
pnpm test
pnpm run build
pnpm run security:suite
pnpm exec vitest run test/omega test/routes/omega.test.ts
```

E2E local verificado contra `dist/server.js`:

```
OMEGA_FABRIC_E2E_OK {"panels":8,"twinAuthorized":true,"memoryCount":1,
  "trustScore":1,"selected":"h1","deploy":false}
SCER_ECONOMY_E2E_OK {"calculate":200,"settle":200,"fundsMoved":false,"integrity":true}
SCER_TREASURY_E2E_OK {"credit":200,"debit":200,"insufficient":409,"fraud":"review"}
```

Inferencia externa verificada en vivo: Groq (`HTTP 200`,
`openai/gpt-oss-20b`), Ollama Cloud (`responseEngine:"open-science"`), STT de
Groq (`whisper-large-v3`) y visión con Ollama local (`qwen2.5vl:7b`). Hugging
Face autentica pero devuelve `HTTP 402`; el TTS de Groq exige aceptar términos.
La síntesis de imagen sigue sin proveedor.

---

## Contrato de evidencia

Este repositorio distingue **SPECIFIED ≠ IMPLEMENTED ≠ TESTED**:

| Estado | Significado |
| --- | --- |
| `draft \| engine-generated` | generado por máquina, sin revisión humana |
| `implemented` | implementado con tests verdes |
| `verified` | evidencia reproducida + aprobación humana con nombre |
| `wired` | habilitado para producción |

Un archivo generado que no fue revisado se declara `state: draft`. La historia no
se borra. Un `TODO` sin dueño y sin fecha no se admite.

---

## Instalación reproducible

```bash
pnpm install --frozen-lockfile
pnpm run dev        # arranca con .env cargado
pnpm run build      # gates completos
```

---

## Gates pendientes para liberar

1. **Credenciales**: aprovisionar proveedor de inferencia, visión y voz en el
   entorno objetivo.
2. **CI/CD**: CI estable en la cuenta (las acciones actuales fallan ~3s).
3. **Despliegue**: entorno objetivo real; Vercel requiere setear
   `ISABELLA_KEYLESS_FREE_PROVIDER` y las demás variables en Project Vars.
4. **Dependabot**: cerrar `dependabot/14` (moderate).
5. **Revisión humana**: pasar `draft` → `verified` con aprobación con nombre.

---

## Estructura relevante

```
src/omega/            Ω∞ (constitution, simulation, capital, civilization,
                      twins, memory, trust, research, territory, nexus)
src/economy/          SCER (valuation, pricing, royalty, ledger, treasury,
                      affiliates, fraud)
src/routes/           superficies HTTP (138 rutas registradas)
test/omega/           pruebas de dominio Ω∞
test/routes/          pruebas de superficie
test/deployment/      lista de rutas congelada + locks de entorno y contrato
scripts/              repository-assurance, security-suite, smokes
```

---

## Contribución y gobernanza

Todo cambio de estado de capacidad se registra en un ledger append-only. Los
PRs no se aprueban sin revisión. En conflicto entre código y especificación,
gana la especificación; el conflicto se archiva como divergencia pendiente de
arbitraje humano.

---

## Legado y dedicatoria

Isabella Villaseñor, con amor y memoria. El tejido Ω∞ existe para que cada
decisión inteligente sea **explicable**, **auditable** y **sujeta a un ser
humano**.

### Alianzas LATAM y el mundo
