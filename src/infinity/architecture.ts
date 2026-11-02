/**
 * ISABELLA VILLASEÑOR AI™ — Arquitectura de 14 capas Ω + 9 Fabrics.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, secciones 3 y 4.
 * Este registro declara qué capa existe como código en ESTE repositorio y qué
 * capa solo está especificada. No se asigna `tested` sin módulo y evidencia.
 */
import {
  auditReport,
  isMaturityState,
  type AuditIssue,
  type AuditReport,
  type EvidenceRef,
  type MaturityState,
} from './types';

export interface OmegaLayer {
  readonly id: string;
  readonly name: string;
  readonly fn: string;
  readonly state: MaturityState;
  readonly modules: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly note: string;
}

export interface FabricDescriptor {
  readonly id: string;
  readonly name: string;
  readonly fn: string;
  readonly state: MaturityState;
  readonly modules: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly note: string;
}

const doc = (ref: string, proves: string): EvidenceRef => ({ kind: 'document', ref, proves });
const mod = (ref: string, proves: string): EvidenceRef => ({ kind: 'module', ref, proves });
const test = (ref: string, proves: string): EvidenceRef => ({ kind: 'test', ref, proves });

/**
 * 14 capas Ω. El documento numera Ω-0, Ω-0.5, Ω-1, Ω-2, Ω-3, Ω-5..Ω-10, Ω-12..Ω-14
 * (no existen Ω-4 ni Ω-11 en el canon consolidado); se conservan los huecos en
 * lugar de inventar capas.
 */
export const OMEGA_LAYERS: readonly OmegaLayer[] = [
  {
    id: 'Ω-0',
    name: 'Client Channels',
    fn: 'Web, móvil, XR, API, voz e IoT como puntos de entrada.',
    state: 'implemented',
    modules: ['src/server.ts', 'src/ui', 'src/routes'],
    evidence: [
      mod('src/server.ts', 'un único proceso Express sirve web, API y assets'),
      doc('docs/spec/BLUEPRINT-API-v4.2.0.md', 'contrato de la superficie HTTP'),
    ],
    note: 'No hay cliente XR ni IoT propio en este repositorio; la capa existe como HTTP/web.',
  },
  {
    id: 'Ω-0.5',
    name: 'API Gateway',
    fn: 'Política, rate limit, telemetría y bearer tokens.',
    state: 'tested',
    modules: ['src/security/api-token.ts', 'src/security/rate-limit.ts', 'src/server.ts'],
    evidence: [
      test('test/security/api-token.test.ts', 'verificación de bearer sin filtrar el token'),
      test('test/security/rate-limit.test.ts', 'ventana fija determinista'),
    ],
    note: 'El gateway es el propio Express endurecido; no existe un API gateway externo.',
  },
  {
    id: 'Ω-1',
    name: 'Memory Mesh (YUN)',
    fn: 'Memoria distribuida y persistente por niveles.',
    state: 'implemented',
    modules: ['src/memory', 'src/atlas/persistence', 'src/ikes'],
    evidence: [
      mod('src/memory', 'módulos de memoria local'),
      test('test/memory', 'pruebas de memoria'),
    ],
    note: 'La persistencia durable depende de Postgres; el ledger legacy sigue volátil.',
  },
  {
    id: 'Ω-2',
    name: 'Digital Twin',
    fn: 'Gemelos territoriales de mesh, comercio y sensores.',
    state: 'implemented',
    modules: ['src/atlas', 'src/territory'],
    evidence: [
      mod('src/atlas/persistence.ts', 'almacén de nodos y aristas HCU'),
      doc('docs/spec/GENESIS-V6-ARCHITECTURE.md', 'modelo territorial'),
    ],
    note: 'Modela grafos declarados; no hay gemelo en tiempo real conectado a sensores.',
  },
  {
    id: 'Ω-3',
    name: 'Knowledge Graph',
    fn: 'Grafo semántico con procedencia y citas.',
    state: 'tested',
    modules: ['src/nexus/knowledge-graph.ts', 'src/cognition/rag'],
    evidence: [
      test('test/nexus/knowledge-graph.test.ts', 'inserción y consulta determinista del grafo'),
    ],
    note: 'El grafo es local; no consulta un servicio externo de conocimiento.',
  },
  {
    id: 'Ω-5',
    name: 'Science Engine',
    fn: 'Investigación, hipótesis y verificación de citas.',
    state: 'tested',
    modules: ['src/infinity/skills.ts'],
    evidence: [
      test('test/infinity/skills.test.ts', 'IV_Research, IV_Bibliometrics, IV_OpenScience'),
    ],
    note: 'Verificación determinista de citas declaradas; no descubre papers por red.',
  },
  {
    id: 'Ω-6',
    name: 'Governance (CROWN)',
    fn: 'Política, riesgo y cumplimiento.',
    state: 'tested',
    modules: ['src/crown', 'src/infinity/constitution.ts'],
    evidence: [
      test('test/crown', 'evaluación de intención y verificación'),
      test(
        'test/infinity/constitution.test.ts',
        'ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY'
      ),
    ],
    note: 'CROWN decide; este repositorio no le concede autoridad a ningún agente.',
  },
  {
    id: 'Ω-7',
    name: 'EFM-CCI (BookPI)',
    fn: 'Evidencia encadenada e integridad.',
    state: 'tested',
    modules: ['src/bookpi'],
    evidence: [
      test('test/bookpi', 'cadena, verificación y storage'),
      doc('docs/reference/DURABLE-STORES-ON-VERCEL.md', 'límite de durabilidad en serverless'),
    ],
    note: 'El ledger legacy sigue `VOLATILE_IN_MEMORY`; `readyz` no se eleva por esta capa.',
  },
  {
    id: 'Ω-8',
    name: 'Reasoning Mesh',
    fn: 'Mezcla de expertos, router y consenso.',
    state: 'tested',
    modules: ['src/hypercore/micro-moe.ts', 'src/core', 'src/omega-runtime'],
    evidence: [
      test('test/hypercore', 'router y MoE deterministas'),
      test('test/omega-runtime', 'pipeline de razonamiento'),
    ],
    note: 'No es un modelo fundacional nuevo: orquesta y puntúa salidas.',
  },
  {
    id: 'Ω-9',
    name: 'CM-ET',
    fn: 'Costo, energía y métricas de cómputo.',
    state: 'implemented',
    modules: ['src/hypercore/energy.ts', 'src/hypercore/turbo-optimizer.ts'],
    evidence: [mod('src/hypercore/energy.ts', 'estimación de energía por operación')],
    note: 'Estimaciones deterministas, no medición de hardware real.',
  },
  {
    id: 'Ω-10',
    name: 'Identity & Ethics (EOCT)',
    fn: 'Identidad, ética y clasificadores.',
    state: 'implemented',
    modules: ['src/identity', 'src/privacy', 'src/governance'],
    evidence: [mod('src/identity', 'identidad y aprobación humana')],
    note: 'No existe un clasificador ético entrenado; hay reglas y gates explícitos.',
  },
  {
    id: 'Ω-12',
    name: 'AA-CD',
    fn: 'Aislamiento, sandbox y contención.',
    state: 'tested',
    modules: ['src/agents/sandbox.ts', 'src/security'],
    evidence: [
      test('test/agents/sandbox.test.ts', 'contención de rutas, tamaños y symlinks'),
      doc('docs/rfc/RFC-0011-fusion-isabella-cero.md', 'límite TOCTOU declarado'),
    ],
    note: 'El sandbox contiene agentes; no sustituye gVisor ni el aislamiento del sistema operativo.',
  },
  {
    id: 'Ω-13',
    name: 'IHEC',
    fn: 'Continuidad, snapshot y auto-reparación.',
    state: 'implemented',
    modules: ['src/ihec', 'src/resilience'],
    evidence: [mod('src/ihec', 'núcleo de emergencia y recuperación')],
    note: 'La recuperación se probó en unidades y en un arranque en frío; no hay prueba de desastre real.',
  },
  {
    id: 'Ω-14',
    name: 'Evolutionary Crisis Memory',
    fn: 'Memoria inmunológica de crisis y anticuerpos.',
    state: 'implemented',
    modules: ['src/nexus/antifragile.ts', 'src/infinity/evolution-fabric.ts'],
    evidence: [mod('src/nexus/antifragile.ts', 'registro de incidentes y anticuerpos')],
    note: 'Los anticuerpos se registran; convertirlos en cápsulas publicadas sigue `specified`.',
  },
];

export const FABRICS: readonly FabricDescriptor[] = [
  {
    id: 'cognition',
    name: 'Cognition Fabric',
    fn: 'Razonamiento y planificación.',
    state: 'tested',
    modules: ['src/agents/mesh.ts', 'src/omega-runtime'],
    evidence: [test('test/agents/mesh.test.ts', 'planner determinista y orquestación')],
    note: 'Planifica; no ejecuta herramientas externas.',
  },
  {
    id: 'memory',
    name: 'Memory Fabric',
    fn: 'Memoria soberana de 7 niveles.',
    state: 'implemented',
    modules: ['src/memory', 'src/ikes', 'src/atlas'],
    evidence: [mod('src/memory', 'niveles de memoria declarados en código')],
    note: 'Los 7 niveles no están certificados; la persistencia depende de Postgres.',
  },
  {
    id: 'agent',
    name: 'Agent Fabric',
    fn: 'Agent Mesh paralelo.',
    state: 'tested',
    modules: ['src/agents/mesh.ts', 'src/agents/mesh-adapters.ts'],
    evidence: [test('test/agents/mesh.test.ts', 'concurrencia acotada, timeout y BookPI')],
    note: 'Máximo configurable 32 por lote; el canon aspira a 20 simultáneos y se cumple.',
  },
  {
    id: 'governance',
    name: 'Governance Fabric',
    fn: 'CROWN + UAGP-1 + GAME OVER.',
    state: 'tested',
    modules: ['src/crown', 'src/gameover', 'src/infinity/constitution.ts'],
    evidence: [
      test('test/gameover', 'gate de aprobación humana'),
      test('test/infinity/constitution.test.ts', 'reglas de dominio'),
    ],
    note: 'Una aprobación solo vale desde un bearer o registro verificado en el servidor.',
  },
  {
    id: 'model',
    name: 'Model Fabric',
    fn: 'Multi-modelo, BYOK y router.',
    state: 'tested',
    modules: ['src/inference', 'src/hypercore/adaptive-model-router.ts'],
    evidence: [test('test/inference', 'cadena de proveedores y fallback local')],
    note: 'Si todos los proveedores fallan, responde el fallback declarado, no un modelo.',
  },
  {
    id: 'mcp',
    name: 'MCP Fabric',
    fn: 'Herramientas y federación MCP.',
    state: 'tested',
    modules: ['src/skills/mcp-server.ts'],
    evidence: [test('test/skills/mcp-server.test.ts', 'JSON-RPC y tools/call gobernado')],
    note: 'Fail-closed sin `MCP_SERVER_TOKEN`.',
  },
  {
    id: 'evolution',
    name: 'Evolution Fabric',
    fn: 'Gen, cápsula, A2A y GDI.',
    state: 'tested',
    modules: ['src/infinity/evolution-fabric.ts'],
    evidence: [test('test/infinity/evolution.test.ts', 'cápsulas validadas y selección natural')],
    note: 'Registro en memoria; no publica en un hub real ni emite créditos.',
  },
  {
    id: 'build',
    name: 'Build Fabric',
    fn: 'Workspace, sandbox, preview y deploy.',
    state: 'tested',
    modules: ['src/infinity/build.ts', 'src/agents/sandbox.ts'],
    evidence: [test('test/infinity/build.test.ts', 'plan de build sin ejecución')],
    note: 'Devuelve un plan; no levanta servidores ni despliega.',
  },
  {
    id: 'bookpi',
    name: 'BookPI Fabric',
    fn: 'Evidencia inmutable y genealogía.',
    state: 'tested',
    modules: ['src/bookpi'],
    evidence: [test('test/bookpi', 'cadena y verificación')],
    note: 'El pipeline durable es Postgres; el ledger legacy sigue degradado.',
  },
];

export interface ArchitectureSummary {
  readonly layers: number;
  readonly fabrics: number;
  readonly byState: Readonly<Record<string, number>>;
  readonly production: false;
}

export function summarizeArchitecture(): ArchitectureSummary {
  const byState: Record<string, number> = {};
  for (const item of [...OMEGA_LAYERS, ...FABRICS]) {
    byState[item.state] = (byState[item.state] ?? 0) + 1;
  }
  return { layers: OMEGA_LAYERS.length, fabrics: FABRICS.length, byState, production: false };
}

/**
 * Un registro no puede declarar más de lo que puede mostrar. `tested` exige
 * módulo y evidencia; `implemented` exige módulo; `production` está prohibido
 * mientras no exista un despliegue con rollback probado.
 */
export function auditArchitecture(): AuditReport {
  const issues: AuditIssue[] = [];
  const seen = new Set<string>();

  for (const item of [...OMEGA_LAYERS, ...FABRICS]) {
    if (seen.has(item.id)) {
      issues.push({ code: 'DUPLICATE_ID', subject: item.id, detail: 'id repetido' });
    }
    seen.add(item.id);
    if (!isMaturityState(item.state)) {
      issues.push({ code: 'UNKNOWN_STATE', subject: item.id, detail: item.state });
    }
    if (!item.fn.trim()) {
      issues.push({ code: 'EMPTY_FUNCTION', subject: item.id, detail: 'sin función declarada' });
    }
    if ((item.state === 'implemented' || item.state === 'tested') && item.modules.length === 0) {
      issues.push({
        code: 'MODULE_REQUIRED',
        subject: item.id,
        detail: `${item.state} exige al menos un módulo`,
      });
    }
    if (item.state === 'tested' && item.evidence.length === 0) {
      issues.push({
        code: 'EVIDENCE_REQUIRED',
        subject: item.id,
        detail: 'tested exige evidencia declarada',
      });
    }
    if (item.state === 'production') {
      issues.push({
        code: 'PRODUCTION_NOT_CLAIMED',
        subject: item.id,
        detail: 'esta fusión no declara producción',
      });
    }
  }

  if (OMEGA_LAYERS.length !== 14) {
    issues.push({
      code: 'LAYER_COUNT',
      subject: 'omega',
      detail: `se esperaban 14 capas, hay ${OMEGA_LAYERS.length}`,
    });
  }
  if (FABRICS.length !== 9) {
    issues.push({
      code: 'FABRIC_COUNT',
      subject: 'fabrics',
      detail: `se esperaban 9 fabrics, hay ${FABRICS.length}`,
    });
  }

  return auditReport(issues);
}
