# GAME OVER — Universal Agent Governance Protocol (UAGP-1)

> **Estado:** `state: draft | engine-generated`. La capa TypeScript está
> **implementada y probada** (gates verdes). El plugin Jenkins está
> **implementado como código fuente** pero **no fue compilado** en este entorno
> (sin JDK 17 / Maven). Ver la sección *Contrato de fidelidad*.

## 1. Qué es GAME OVER / UAGP-1

GAME OVER es la **meta-capa de gobernanza cognitiva** de Isabella V6 / TINA /
Genesis. Su primer punto de control operativo es un **gate de gobernanza** que se
ejecuta **antes** de un build o un deploy: valida la **identidad del agente (AI
Passport)**, su **trust score**, el **riesgo**, la **ética**, la **aprobación
humana** y deja **auditoría** append-only (BookPI) de la decisión.

Invariante de protocolo:

```text
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION
```

UAGP-1 **decide, puntúa y registra**. **No ejecuta** la acción gobernada y **no
certifica** resultados. Un outcome `ACCEPT` es una **recomendación de
autorización** sujeta a la autoridad humana.

## 2. Pipeline de decisión

```text
validate → passport → ethics → trust → risk → adjudicate → human approval → explain → audit
```

| Etapa | Motor | Salida |
|---|---|---|
| validate | `UagpValidator` | errores estructurales |
| passport | `PassportAuthority` | `valid`, certificación, motivo |
| ethics | `EthicsEngine` | violaciones de reglas |
| trust | `TrustEngine` | score 0..100 + nivel |
| risk | `RiskEngine` | score 0..1 + nivel |
| adjudicate | `CognitiveCourt` | `ACCEPT` / `REJECT` / `ESCALATE` |
| human approval | `HumanApprovalGate` | aprobador presente y coincidente |
| explain | `ExplainabilityEngine` | narrativa determinista |
| audit | `AuditService` | hash + secuencia en ledger |

### Reglas de la corte cognitiva

- Violación ética → `REJECT`.
- Riesgo `CRITICAL` con trust `< 85` → `ESCALATE`.
- Riesgo `HIGH` con trust `< 70` → `REJECT`.
- En otro caso → `ACCEPT`.
- Si se requiere aprobación humana y el aprobador falta o no coincide → `ESCALATE`.

### Pesos declarados (no son precisión medida)

Trust: `integrity 0.30 · competence 0.20 · alignment 0.15 · transparency 0.15 ·
humanOversight 0.10 · incidentRecord 0.10`.

Riesgo base por criticidad: `LOW 0.10 · MEDIUM 0.35 · HIGH 0.65 · CRITICAL 0.90`,
más una penalización por capacidades `min(0.35, n*0.08)`.

## 3. Implementación en el runtime (TypeScript)

Directorio `src/gameover/` (implementado y probado):

- `types.ts` — constantes, `UAGP_PROTOCOL = "UAGP-1"`, method ids, tipos.
- `constitution.ts` — constitución tipada + `riskLevelFor`.
- `trust-engine.ts`, `risk-engine.ts`, `ethics-engine.ts`,
  `explainability-engine.ts`, `cognitive-court.ts`.
- `passport-authority.ts` — registro en memoria de AI Passports.
- `validator.ts`, `human-approval-gate.ts`.
- `audit.ts` — `AuditService` sobre el ledger append-only BookPI.
- `gateway.ts` — `UagpGateway.govern(...)` orquesta el pipeline.
- `index.ts` — barril; exporta `uagpGateway` y `passportAuthority` de proceso.

Tests: `test/gameover/*.test.ts` (43 casos).

### Endpoints HTTP (admin-gated, bearer `GENESIS_ADMIN_API_TOKEN`)

- `GET /api/v1/gameover/constitution`
- `GET /api/v1/gameover/passports`
- `POST /api/v1/gameover/passports`
- `POST /api/v1/gameover/passports/revoke`
- `POST /api/v1/gameover/govern`

En el runtime, el admin autenticado se trata como el **principal de autoridad
humana** (`genesis-admin`); una acción de alto riesgo exige `humanApprover`
coincidente.

## 4. Implementación Jenkins (`gameover-jenkins-plugin/`)

Plugin `gameover-governance` (`packaging: hpi`, `jenkins.version 2.440.3`,
`java.level 17`) que expone el step `gameOverGovernance`:

```groovy
def decision = gameOverGovernance(
  passportId: 'GOP-agent-builder',
  objectiveTitle: 'Deploy to production',
  agentId: 'ci-builder', agentName: 'CI Builder Agent',
  agentOwner: 'platform-team', agentOrganization: 'TAMV',
  capabilities: 'build,test,package', actions: 'deploy',
  criticality: 'HIGH', failOnReject: true
)
```

Si `failOnReject` es verdadero (por defecto), el build **falla en cerrado**
(`AbortException`) ante cualquier outcome distinto de `ACCEPT`.

Estructura: `model/`, `engine/`, `passport/`, `audit/`, `approval/`,
`GovernanceStep(.Descriptor)`, `GameOverGlobalConfiguration`, `GameOverPlugin`,
`GameOverDescriptor`, `UagpGateway`, `UagpValidator`; recursos en
`src/main/resources/` (incluida `gameover/constitution.yml`); tests JUnit 5 en
`src/test/java/ai/gameover/`.

Compilación (requiere JDK 17 + Maven, **no disponible en este entorno**):

```
cd gameover-jenkins-plugin
mvn -B test
mvn -B -DskipTests package   # target/gameover-governance.hpi
```

## 5. Contrato de fidelidad

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED
```

| Componente | SPECIFIED | IMPLEMENTED | TESTED | INTEGRATED |
|---|---|---|---|---|
| Motor UAGP-1 (TypeScript) | sí | sí | sí (43) | sí (barril + HTTP + BookPI) |
| Plugin Jenkins (`.hpi`) | sí | sí (fuente) | sí (fuente JUnit 5) | no |
| Compilación `.hpi` | sí | — | — | no (sin JDK/Maven) |
| Firma/CA criptográfica del passport | sí | no | no | no |
| Registro externo (Zenodo/Figshare) | sí | — | — | pendiente (humano) |

Notas honestas:

- `TrustEngine`/`RiskEngine` usan **pesos heurísticos declarados**, no precisión
  medida.
- `PassportAuthority` y `BookPILedger` del plugin son **espejos en memoria a
  nivel de aplicación**; el ledger autoritativo vive en BookPI de Isabella.
- La aprobación humana en Jenkins usa `User.current()`; **verifica presencia y
  coincidencia**, no autentica criptográficamente.

## 6. Registro académico

- Autor: Edwin Oswaldo Castillo Trejo (alias Anubis Villaseñor).
- ORCID: **0009-0008-5050-1539**.
- ISNI: **0000 0005 3169 9229**.
- Afiliación: TAMV Online Enterprise · RDM Digital Hub · Nodo Cero, Mineral del
  Monte (Real del Monte), Hidalgo, México.
- DOI (registro Isabella V6): `10.5281/zenodo.20606361`.
- Citación: ver `CITATION.cff`.
