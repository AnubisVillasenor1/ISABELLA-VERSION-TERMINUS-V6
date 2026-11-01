# `src/infinity` — Master Consolidated (estado real)

**Estado:** `draft | engine-generated`.
**RFC:** [`docs/rfc/RFC-0012-infinity-master-consolidated.md`](../rfc/RFC-0012-infinity-master-consolidated.md).
**Producción:** **no**. Ninguna entrada de este subsistema declara `production`.

Este directorio implementa la parte ejecutable del documento
`ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx` sin convertir especificaciones
en capacidades. Todo es determinista, local y sin red.

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
UNA META DE 20× NO ES UN RESULTADO
```

## Mapa de módulos

| Módulo | Responsabilidad | Ejecuta acciones externas |
|---|---|---|
| `types.ts` | Vocabulario de madurez/ejecución y auditoría | No |
| `architecture.ts` | 14 capas Ω + 9 Fabrics con evidencia | No |
| `catalog.ts` | 10 skills, 18 tools, 14 primitivas, 12 servicios | No |
| `constitution.ts` | ALLOW/DENY, ingesta de 14 etapas, licencias, trust | No |
| `skills.ts` | 10 skills nativas deterministas | No (`externalCalls: 0`) |
| `media.ts` | Cull, estilo, retoque, galería, cotización, face-index | No (`pixelsModified: false`) |
| `build.ts` | Plan de workspace/sandbox/preview/deploy | No (solo plan) |
| `evolution-fabric.ts` | Cápsulas, GDI, selección y A2A en memoria | No (simulación) |
| `index.ts` | Exportaciones y `describeInfinity()` | No |

## Uso

```ts
import {
  describeInfinity,
  evaluateConstitutional,
  runNativeSkill,
  planBuild,
  evolvePopulation,
} from './src/infinity';

const summary = describeInfinity();
// summary.production === false

const decision = evaluateConstitutional({
  action: 'create',
  vectors: { identity: true, authority: true, policy: true, evidence: true, safety: true },
});
// decision.verdict === 'ALLOW'  (ALLOW no autoriza ni ejecuta)

const research = runNativeSkill('IV_Research', {
  sources: [{ id: 's1', title: 'Memoria territorial', abstract: '...' }],
  claims: [{ id: 'c1', text: 'Memoria territorial', sourceId: 's1' }],
});
// research.executionPerformed === false
```

## HTTP

```text
GET  /api/v1/infinity
POST /api/v1/infinity/constitution/evaluate
POST /api/v1/infinity/skills/run
POST /api/v1/infinity/media/evaluate
POST /api/v1/infinity/build/plan
POST /api/v1/infinity/evolution/evolve
POST /api/v1/infinity/a2a/evaluate
```

Todas las respuestas incluyen `production: false` y `executionPerformed: false`.
`deploy`/`payment` requieren un bearer administrativo verificado en el servidor;
el cuerpo HTTP nunca concede aprobación.

## Límites declarados

- **Sin benchmarks de 20×.** No hay medición reproducible; no se declara.
- **Sin ejecución de agentes.** Coder/Tester/DevOps/Operator siguen `specified`.
- **Sin despliegue.** Build Fabric devuelve un plan; no levanta nada.
- **Sin publicación ni créditos.** Evolution Fabric simula en memoria.
- **Sin visión ni audio reales en Media Fabric.** Usa features y metadatos
  declarados; no modifica píxeles.
- **Sin federación pública verificada.** La hidratación durable se recupera tras
  fallos, pero no hay evidencia de producción.
- **El ledger de Evolution Fabric es en memoria.** No sustituye BookPI.

## Pruebas

```bash
corepack pnpm vitest run test/infinity test/routes/infinity.test.ts
```

Evidencia esperada: 67 pruebas en 5 archivos, incluidas las auditorías de
arquitectura y catálogo.
