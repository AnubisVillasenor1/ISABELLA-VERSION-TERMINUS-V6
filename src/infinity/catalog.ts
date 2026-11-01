/**
 * ISABELLA VILLASEÑOR AI™ — catálogo integral consolidado.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, secciones 15–18.
 * El catálogo NO acredita capacidades: registra qué existe, dónde y con qué
 * evidencia. Los componentes sin módulo quedan `mapped` o `specified` y su
 * `execution` es `none`.
 */
import {
  auditReport,
  isExecutionMode,
  isMaturityState,
  type AuditIssue,
  type AuditReport,
  type EvidenceRef,
  type ExecutionMode,
  type MaturityState,
} from './types';

export type ComponentKind = 'skill' | 'tool' | 'primitive' | 'service';

export interface CatalogEntry {
  readonly id: string;
  readonly kind: ComponentKind;
  readonly name: string;
  readonly description: string;
  readonly state: MaturityState;
  readonly execution: ExecutionMode;
  /** Module path that implements it, or `null` when it is only mapped. */
  readonly module: string | null;
  readonly evidence: readonly EvidenceRef[];
  readonly permission: string | null;
  readonly note: string;
}

const t = (ref: string, proves: string): EvidenceRef => ({ kind: 'test', ref, proves });
const m = (ref: string, proves: string): EvidenceRef => ({ kind: 'module', ref, proves });

const NATIVE_SKILLS: readonly CatalogEntry[] = [
  {
    id: 'IV_Research',
    kind: 'skill',
    name: 'Research',
    description: 'Verificación determinista de citas declaradas contra fuentes declaradas.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [
      t('test/infinity/skills.test.ts', 'soporte léxico, DOI y negativa a inventar fuentes'),
    ],
    permission: 'knowledge.read',
    note: 'No descubre papers por red; solo contrasta lo que el llamador aporta.',
  },
  {
    id: 'IV_MusicStudio',
    kind: 'skill',
    name: 'Music Studio',
    description: 'Plan de arreglo y separación de stems; no sintetiza audio en esta capa.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'plan determinista acotado por tempo y duración')],
    permission: 'tamv.generate',
    note: 'La síntesis real vive en `src/tamv` y `src/multimodal/stepaudio`.',
  },
  {
    id: 'IV_VoiceStudio',
    kind: 'skill',
    name: 'Voice Studio',
    description: 'Gate de consentimiento y marca de agua para síntesis de voz.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'bloqueo sin consentimiento verificable')],
    permission: 'voice.synthesize',
    note: 'No clona voces: devuelve un plan bloqueado o aprobado, sin audio.',
  },
  {
    id: 'IV_LegalResearch',
    kind: 'skill',
    name: 'Legal Research',
    description: 'Matriz de trazabilidad de fuentes jurídicas declaradas.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'valida jurisdicción, fecha y URL oficial')],
    permission: 'knowledge.read',
    note: 'No es asesoría jurídica ni sustituye a un abogado.',
  },
  {
    id: 'IV_Bibliometrics',
    kind: 'skill',
    name: 'Bibliometrics',
    description: 'h-index, g-index, i10 y grafo de colaboración sobre obras declaradas.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'índices calculados con orden y empates')],
    permission: 'knowledge.read',
    note: 'No consulta Scopus, ORCID ni DOI resolvers.',
  },
  {
    id: 'IV_OpenScience',
    kind: 'skill',
    name: 'Open Science',
    description: 'Manifiesto de reproducibilidad y checklist FAIR sobre metadatos.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'manifiesto SHA3-512 y campos faltantes')],
    permission: 'knowledge.read',
    note: 'No aloja datasets ni ejecuta el estudio.',
  },
  {
    id: 'IV_Governance',
    kind: 'skill',
    name: 'Governance',
    description: 'Evaluación constitucional por lotes con vectores de seguridad.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'ALLOW/DENY por vector nulo')],
    permission: 'crown.evaluate',
    note: 'Evalúa; no concede autoridad ni ejecuta la acción.',
  },
  {
    id: 'IV_PromptEngineering',
    kind: 'skill',
    name: 'Prompt Engineering',
    description: 'Reestructuración determinista de prompts y detección de inyección.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'secciones, límites y guardas de inyección')],
    permission: 'cognition.prompt',
    note: 'No evalúa calidad semántica con un modelo.',
  },
  {
    id: 'IV_Multimodal',
    kind: 'skill',
    name: 'Multimodal',
    description: 'Plan de enrutamiento multimodal con límites por modalidad.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'rutas y límites por modalidad')],
    permission: 'cognition.multimodal',
    note: 'No procesa píxeles, audio ni video en esta capa: solo planifica.',
  },
  {
    id: 'IV_KnowledgeIngestion',
    kind: 'skill',
    name: 'Knowledge Ingestion',
    description: 'Pipeline de 14 etapas con licencia, procedencia, PII y derecho al olvido.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'rechazo por licencia, PII y evasión')],
    permission: 'knowledge.ingest',
    note: 'No descarga contenido; audita la declaración de la fuente.',
  },
];

const TOOLS: readonly CatalogEntry[] = [
  {
    id: 'memory.search',
    kind: 'tool',
    name: 'Buscar memoria',
    description: 'Búsqueda léxica/vectorial local sobre memoria declarada.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/memory/retrieval.ts',
    evidence: [m('src/memory/retrieval.ts', 'recuperación local acotada')],
    permission: 'memory.read',
    note: 'Vectores hashed locales; no son embeddings semánticos de un modelo.',
  },
  {
    id: 'memory.remember',
    kind: 'tool',
    name: 'Recordar contexto',
    description: 'Propuesta de memoria sujeta a revisión; no escribe memoria canónica.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/memory/proposals.ts',
    evidence: [m('src/memory/proposals.ts', 'cola de propuestas acotada')],
    permission: 'memory.write',
    note: 'Una propuesta no equivale a conocimiento verificado.',
  },
  {
    id: 'crown.evaluate',
    kind: 'tool',
    name: 'Evaluar CROWN',
    description: 'Evaluación de intención, riesgo y capacidad.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/crown/index.ts',
    evidence: [t('test/crown/facade.test.ts', 'decisión de CROWN')],
    permission: 'crown.evaluate',
    note: 'Decide política; no ejecuta.',
  },
  {
    id: 'bookpi.seal',
    kind: 'tool',
    name: 'Sellar BookPI',
    description: 'Evento encadenado en el ledger append-only.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/bookpi/ledger.ts',
    evidence: [t('test/bookpi/durable-ledger.test.ts', 'cadena y verificación durable')],
    permission: 'bookpi.write',
    note: 'El ledger legacy sigue volátil; el pipeline usa Postgres.',
  },
  {
    id: 'repo.read',
    kind: 'tool',
    name: 'Leer repositorio',
    description: 'Lectura acotada de archivos del repositorio.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'repo.read',
    note: 'No existe una herramienta HTTP que lea el repositorio; el sandbox solo lee su raíz.',
  },
  {
    id: 'repo.write_sandbox',
    kind: 'tool',
    name: 'Escribir en sandbox',
    description: 'Escritura contenida con límites y digest SHA3-512.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/agents/sandbox.ts',
    evidence: [t('test/agents/sandbox.test.ts', 'contención y límites de escritura')],
    permission: 'sandbox.write',
    note: 'No aplica parches al repositorio ni escribe en producción.',
  },
  {
    id: 'repo.run_tests',
    kind: 'tool',
    name: 'Ejecutar pruebas',
    description: 'Ejecución de suites de prueba.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'test.run',
    note: 'Existe como script de CI, no como herramienta invocable por un agente.',
  },
  {
    id: 'repo.create_pr',
    kind: 'tool',
    name: 'Abrir Pull Request',
    description: 'Apertura de PR en GitHub.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'pr.create',
    note: 'Sin token de GitHub ni flujo de aprobación implementado.',
  },
  {
    id: 'web.search',
    kind: 'tool',
    name: 'Buscar en web',
    description: 'Búsqueda regulada en web pública.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'web.read',
    note: 'Sin proveedor de búsqueda configurado ni política de robots aplicada.',
  },
  {
    id: 'web.fetch',
    kind: 'tool',
    name: 'Extraer web',
    description: 'Extracción respetando robots.txt.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'web.read',
    note: 'No implementado: no hay fetcher con robots ni allowlist.',
  },
  {
    id: 'tamv.analyze',
    kind: 'tool',
    name: 'Analizar audio TAMV',
    description: 'Análisis espectral determinista de señales.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv/analysis.ts',
    evidence: [m('src/tamv/analysis.ts', 'análisis espectral local')],
    permission: 'tamv.analyze',
    note: 'Procesa señales provistas; no captura audio.',
  },
  {
    id: 'tamv.generate',
    kind: 'tool',
    name: 'Generar audio TAMV',
    description: 'Síntesis y generación sonora local.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv/engine.ts',
    evidence: [m('src/tamv/engine.ts', 'motor DSP local')],
    permission: 'tamv.generate',
    note: 'La calidad musical no está certificada; no usa un modelo generativo.',
  },
  {
    id: 'tamv.modify',
    kind: 'tool',
    name: 'Modificar audio TAMV',
    description: 'Filtrado y transformación de pistas.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv/dsp.ts',
    evidence: [m('src/tamv/dsp.ts', 'primitivas DSP')],
    permission: 'tamv.modify',
    note: 'Separación de stems por modelo no está implementada; solo DSP clásico.',
  },
  {
    id: 'knowledge.ingest',
    kind: 'tool',
    name: 'Ingerir conocimiento',
    description: 'Ingesta gobernada con procedencia y licencia.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', '14 etapas y rechazo fail-closed')],
    permission: 'knowledge.ingest',
    note: 'Audita la declaración; no descarga ni entrena.',
  },
  {
    id: 'knowledge.query',
    kind: 'tool',
    name: 'Consultar conocimiento',
    description: 'Consulta al grafo con procedencia.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/nexus/knowledge-graph.ts',
    evidence: [t('test/nexus/knowledge-graph.test.ts', 'consulta del grafo')],
    permission: 'knowledge.read',
    note: 'El grafo es local y no incluye conocimiento global.',
  },
  {
    id: 'security.scan',
    kind: 'tool',
    name: 'Escanear seguridad',
    description: 'Detección estática de secretos y patrones peligrosos.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/security/secret-scanner.ts',
    evidence: [t('test/security/secret-scanner.test.ts', 'detección y redacción')],
    permission: 'security.scan',
    note: 'No sustituye un SAST completo.',
  },
  {
    id: 'deploy.request',
    kind: 'tool',
    name: 'Solicitar despliegue',
    description: 'Solicitud de despliegue sujeta a aprobación humana.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: 'deploy.request',
    note: 'Build Fabric devuelve un plan; no despliega.',
  },
  {
    id: 'payment.execute',
    kind: 'tool',
    name: 'Ejecutar pago',
    description: 'Transacción con autorización humana y guardia de margen.',
    state: 'implemented',
    execution: 'human',
    module: 'src/economy/profit-guard.ts',
    evidence: [t('test/infinity/media.test.ts', 'cotización nunca por debajo del costo')],
    permission: 'payment.execute',
    note: 'Requiere proveedor de pagos y aprobación; no se ejecuta en esta fusión.',
  },
];

const PRIMITIVES: readonly CatalogEntry[] = [
  {
    id: 'planTask',
    kind: 'primitive',
    name: 'planTask',
    description: 'Descompone un objetivo en pasos ordenados.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/agents/mesh-adapters.ts',
    evidence: [t('test/agents/mesh.test.ts', 'descomposición determinista')],
    permission: null,
    note: 'No es un DAG con dependencias explícitas; es una secuencia acotada.',
  },
  {
    id: 'evaluateRisk',
    kind: 'primitive',
    name: 'evaluateRisk',
    description: 'Matriz de riesgo por rol y acción.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/agents/mesh.ts',
    evidence: [t('test/agents/mesh.test.ts', 'ALLOW/DENY/ESCALATE')],
    permission: null,
    note: 'El riesgo se declara; no se infiere de un modelo.',
  },
  {
    id: 'calculateTrust',
    kind: 'primitive',
    name: 'calculateTrust',
    description: 'TrustScore ponderado a partir de señales declaradas.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/constitution.ts',
    evidence: [t('test/infinity/constitution.test.ts', 'bandas y pesos')],
    permission: null,
    note: 'Las señales las aporta el llamador; no se miden solas.',
  },
  {
    id: 'sealEvidence',
    kind: 'primitive',
    name: 'sealEvidence',
    description: 'Digest SHA3-512 y evento BookPI.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/bookpi/crypto.ts',
    evidence: [t('test/bookpi/crypto.test.ts', 'hash canónico')],
    permission: null,
    note: 'Un digest no es prueba de verdad; prueba integridad del contenido.',
  },
  {
    id: 'searchMemory',
    kind: 'primitive',
    name: 'searchMemory',
    description: 'Similitud léxica y vectorial local.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/memory/retrieval.ts',
    evidence: [m('src/memory/retrieval.ts', 'recuperación local')],
    permission: null,
    note: 'Embeddings hashed; no semánticos.',
  },
  {
    id: 'ingestSource',
    kind: 'primitive',
    name: 'ingestSource',
    description: 'Pipeline de 14 etapas de ingesta gobernada.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'etapas y veredicto')],
    permission: null,
    note: 'Evalúa metadatos; no descarga.',
  },
  {
    id: 'validateLicense',
    kind: 'primitive',
    name: 'validateLicense',
    description: 'Valida declaración de licencia y permiso expreso.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/constitution.ts',
    evidence: [t('test/infinity/constitution.test.ts', 'licencias aceptadas y rechazadas')],
    permission: null,
    note: 'No sustituye revisión legal.',
  },
  {
    id: 'generateAudio',
    kind: 'primitive',
    name: 'generateAudio',
    description: 'Síntesis DSP local.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv/engine.ts',
    evidence: [m('src/tamv/engine.ts', 'motor DSP')],
    permission: null,
    note: 'No es un modelo generativo de música.',
  },
  {
    id: 'modifyAudio',
    kind: 'primitive',
    name: 'modifyAudio',
    description: 'Transformación y filtrado de pistas.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv/dsp.ts',
    evidence: [m('src/tamv/dsp.ts', 'filtros DSP')],
    permission: null,
    note: 'Sin separación de stems por modelo.',
  },
  {
    id: 'runTests',
    kind: 'primitive',
    name: 'runTests',
    description: 'Ejecución de suites de prueba.',
    state: 'mapped',
    execution: 'none',
    module: null,
    evidence: [],
    permission: null,
    note: 'Solo existe en CI, no en runtime.',
  },
  {
    id: 'routeModel',
    kind: 'primitive',
    name: 'routeModel',
    description: 'Selección de tier de modelo.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/hypercore/adaptive-model-router.ts',
    evidence: [t('test/hypercore/adaptive-model-router.test.ts', 'selección de tier')],
    permission: null,
    note: 'No garantiza que el proveedor elegido esté disponible.',
  },
  {
    id: 'cacheLookup',
    kind: 'primitive',
    name: 'cacheLookup',
    description: 'Caché semántica gobernada por umbral.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/hypercore/governed-semantic-cache.ts',
    evidence: [t('test/hypercore/governed-semantic-cache.test.ts', 'umbral y gobernanza')],
    permission: null,
    note: 'La similitud usa el espacio local declarado, no un embedding externo.',
  },
  {
    id: 'speculativePlan',
    kind: 'primitive',
    name: 'speculativePlan',
    description: 'Ramas de ejecución anticipada.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/hypercore/speculative-draft-engine.ts',
    evidence: [t('test/hypercore/speculative-draft-engine.test.ts', 'borrador especulativo')],
    permission: null,
    note: 'No acelera un LLM externo por sí mismo.',
  },
  {
    id: 'verifyCitations',
    kind: 'primitive',
    name: 'verifyCitations',
    description: 'Contraste léxico entre afirmaciones y fuentes declaradas.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/infinity/skills.ts',
    evidence: [t('test/infinity/skills.test.ts', 'soporte y fuente ausente')],
    permission: null,
    note: 'No prueba verdad factual; mide soporte textual.',
  },
];

const SERVICES: readonly CatalogEntry[] = [
  {
    id: 'isabella-core',
    kind: 'service',
    name: 'Núcleo cognitivo',
    description: 'Planner, orquestador, verificador y CROWN en un proceso.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/server.ts',
    evidence: [m('src/server.ts', 'proceso único que compone el runtime')],
    permission: null,
    note: 'Monolito modular; no hay microservicios separados.',
  },
  {
    id: 'isabella-api',
    kind: 'service',
    name: 'API Gateway',
    description: 'Superficie REST del runtime.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/routes',
    evidence: [m('src/routes', 'módulos de rutas registrados')],
    permission: null,
    note: 'gRPC no está implementado.',
  },
  {
    id: 'isabella-web',
    kind: 'service',
    name: 'Interfaz web',
    description: 'Consola y cliente web.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/ui',
    evidence: [m('src/ui', 'assets y cliente web')],
    permission: null,
    note: 'No incluye una TUI separada.',
  },
  {
    id: 'isabella-mcp',
    kind: 'service',
    name: 'Gateway MCP',
    description: 'Puente JSON-RPC de skills.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/skills/mcp-server.ts',
    evidence: [t('test/skills/mcp-server.test.ts', 'tools/list y tools/call')],
    permission: null,
    note: 'Fail-closed sin token.',
  },
  {
    id: 'isabella-agents',
    kind: 'service',
    name: 'Agent Mesh',
    description: 'Malla de agentes con política y concurrencia.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/agents/mesh.ts',
    evidence: [t('test/agents/mesh.test.ts', 'mesh y adaptadores')],
    permission: null,
    note: 'Solo dos adaptadores deterministas; el resto `NO_ADAPTER`.',
  },
  {
    id: 'isabella-memory',
    kind: 'service',
    name: 'Memoria',
    description: 'Persistencia relacional y recuperación local.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/memory',
    evidence: [m('src/memory', 'módulos de memoria')],
    permission: null,
    note: 'Sin despliegue vectorial dedicado.',
  },
  {
    id: 'isabella-bookpi',
    kind: 'service',
    name: 'BookPI',
    description: 'Sellado y verificación de evidencia.',
    state: 'tested',
    execution: 'deterministic',
    module: 'src/bookpi',
    evidence: [t('test/bookpi/durable-ledger.test.ts', 'cadena durable')],
    permission: null,
    note: 'El ledger legacy sigue degradado.',
  },
  {
    id: 'isabella-tamv',
    kind: 'service',
    name: 'TAMV Audio',
    description: 'Procesamiento de audio local.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/tamv',
    evidence: [m('src/tamv', 'análisis, DSP y motor')],
    permission: null,
    note: 'No es un servicio de streaming.',
  },
  {
    id: 'isabella-native-llm',
    kind: 'service',
    name: 'LLM nativo',
    description: 'Orquestación de proveedores y fallback local.',
    state: 'tested',
    execution: 'external',
    module: 'src/inference/foundational-llm.ts',
    evidence: [t('test/inference/foundational-llm.test.ts', 'cadena y fallback declarado')],
    permission: null,
    note: 'Depende de proveedores externos; sin ellos responde el fallback local.',
  },
  {
    id: 'isabella-hct',
    kind: 'service',
    name: 'Hyper Core Turbo',
    description: 'Aceleración de inferencia en proceso.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/performance/hypercore-turbo.ts',
    evidence: [t('test/performance', 'métricas y saturación')],
    permission: null,
    note: 'No promete 3× ni 20×; no hay benchmark reproducible en esta fusión.',
  },
  {
    id: 'isabella-security',
    kind: 'service',
    name: 'Seguridad',
    description: 'OSIRIS, AEGIS y escaneo de secretos.',
    state: 'implemented',
    execution: 'deterministic',
    module: 'src/security',
    evidence: [m('src/security', 'controles y escáner')],
    permission: null,
    note: 'Sentinel-X y AEGIS no están certificados como productos separados.',
  },
  {
    id: 'isabella-federation',
    kind: 'service',
    name: 'Federación',
    description: 'Conectores y eventos entre nodos TAMV.',
    state: 'implemented',
    execution: 'external',
    module: 'src/federation',
    evidence: [m('src/federation/connectors.ts', 'registro y webhooks')],
    permission: null,
    note: 'La hidratación durable se recupera tras fallos; no hay federación pública verificada.',
  },
];

export const CATALOG: readonly CatalogEntry[] = [
  ...NATIVE_SKILLS,
  ...TOOLS,
  ...PRIMITIVES,
  ...SERVICES,
];

export function catalogByKind(kind: ComponentKind): readonly CatalogEntry[] {
  return CATALOG.filter((entry) => entry.kind === kind);
}

export interface CatalogSummary {
  readonly total: number;
  readonly byKind: Readonly<Record<ComponentKind, number>>;
  readonly byState: Readonly<Record<string, number>>;
  readonly production: false;
}

export function summarizeCatalog(): CatalogSummary {
  const byKind: Record<ComponentKind, number> = { skill: 0, tool: 0, primitive: 0, service: 0 };
  const byState: Record<string, number> = {};
  for (const entry of CATALOG) {
    byKind[entry.kind] += 1;
    byState[entry.state] = (byState[entry.state] ?? 0) + 1;
  }
  return { total: CATALOG.length, byKind, byState, production: false };
}

/**
 * El catálogo no puede declarar `tested` sin evidencia, `implemented` sin
 * módulo, un modo de ejecución desconocido ni `production`.
 */
export function auditCatalog(): AuditReport {
  const issues: AuditIssue[] = [];
  const seen = new Set<string>();

  for (const entry of CATALOG) {
    if (seen.has(entry.id)) {
      issues.push({ code: 'DUPLICATE_ID', subject: entry.id, detail: 'id repetido' });
    }
    seen.add(entry.id);
    if (!isMaturityState(entry.state)) {
      issues.push({ code: 'UNKNOWN_STATE', subject: entry.id, detail: entry.state });
    }
    if (!isExecutionMode(entry.execution)) {
      issues.push({ code: 'UNKNOWN_EXECUTION', subject: entry.id, detail: entry.execution });
    }
    if (entry.state === 'tested' && entry.evidence.length === 0) {
      issues.push({ code: 'EVIDENCE_REQUIRED', subject: entry.id, detail: 'tested sin evidencia' });
    }
    if ((entry.state === 'implemented' || entry.state === 'tested') && !entry.module) {
      issues.push({
        code: 'MODULE_REQUIRED',
        subject: entry.id,
        detail: `${entry.state} sin módulo`,
      });
    }
    if (entry.state === 'mapped' && entry.module) {
      issues.push({
        code: 'MAPPED_WITH_MODULE',
        subject: entry.id,
        detail: 'mapped no debe declarar módulo',
      });
    }
    if (entry.state === 'production') {
      issues.push({
        code: 'PRODUCTION_NOT_CLAIMED',
        subject: entry.id,
        detail: 'no hay producción',
      });
    }
  }

  return auditReport(issues);
}
