/**
 * Nexus Runtime — fachada única sobre grafo, agente, workflows, monitoreo y
 * simulador cuántico. state: draft | engine-generated.
 *
 * Esta capa NO crea autoridad nueva: expone capacidades locales, deterministas
 * y acotadas, con una declaración honesta de lo que está implementado, probado
 * y pendiente de aprobación humana.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EvidenceLedger,
  NexusAgentLoop,
  SkillMemory,
  heuristicPlanner,
  type AgentLoopRequest,
  type AgentLoopResult,
} from './agent-loop';
import { AntifragileMonitor } from './antifragile';
import {
  NexusKnowledgeGraph,
  type AssertFactInput,
  type AssertFactResult,
  type KnowledgeFact,
  type QueryHit,
  createKnowledgeGraph,
} from './knowledge-graph';
import {
  simulateCircuit,
  verifySimulation,
  type NexusCircuit,
  type SimulationResult,
} from './quantum';
import {
  NexusToolRegistry,
  toolDefinition,
  type NexusTool,
  type ToolContext,
} from './tool-registry';
import { NexusWorkflowEngine, type WorkflowDefinition } from './workflow';
import { CapabilityEngine, createCapabilityEngine } from './capability-engine';
import type { CapabilityExecutionResult } from './capability-engine';
import {
  defineCapabilityContract,
  describeContract,
  type CapabilityContract,
} from './capability-contract';
import {
  OpenAgentFabric,
  loadFabricManifestFromEnv,
  type FabricAgentView,
  type FabricLoadOutcome,
  type FabricManifestSource,
} from './open-agent-fabric';
import { egressPolicyFromEnv, type EgressPolicy } from '../security/egress-policy';
import { z } from 'zod';

/** Techo de resolución de la fábrica: el árbol de trabajo del proceso. */
const DEFAULT_REPO_ROOT = process.cwd();

export const NEXUS_VERSION = '0.1.0' as const;
export const NEXUS_DIAGNOSTIC_WORKFLOW = 'nexus.diagnostic' as const;

export interface NexusRuntimeOptions {
  readonly graph?: NexusKnowledgeGraph;
  readonly monitor?: AntifragileMonitor;
  readonly now?: () => number;
  /** Raíz contra la que se resuelven las rutas de evidencia de un contrato. */
  readonly repoRoot?: string;
  /** Falso en pruebas que no deben poblar la fábrica: deja la lista vacía. */
  readonly builtinCapabilities?: boolean;
  /**
   * Manifiesto de agentes externos. `undefined` = se intenta leer la ruta declarada
   * en `ISABELLA_AGENT_FABRIC_FILE`; `null` = fábrica explícitamente vacía.
   */
  readonly fabricSource?: FabricManifestSource | null;
  readonly egressPolicy?: EgressPolicy;
  readonly fabricEnv?: Readonly<Record<string, string | undefined>>;
  readonly fabricFetch?: typeof fetch;
}

export interface NexusCapability {
  readonly id: string;
  readonly description: string;
  readonly implemented: true;
  readonly testedBy: string;
  readonly production: false;
  readonly externalDependency: 'none' | 'optional';
}

export class NexusRuntime {
  readonly graph: NexusKnowledgeGraph;
  readonly tools: NexusToolRegistry;
  readonly capabilities: CapabilityEngine;
  readonly monitor: AntifragileMonitor;
  readonly skills: SkillMemory;
  readonly ledger: EvidenceLedger;
  readonly agent: NexusAgentLoop;
  readonly workflows: NexusWorkflowEngine;
  readonly fabric: OpenAgentFabric;
  readonly egressPolicy: EgressPolicy;
  readonly repoRoot: string;
  /** Declaración legible de qué capacidades de fábrica sobrevivieron a la verificación. */
  capabilityNotice = 'fábrica de capacidades desactivada en esta instancia';
  /** Resultado del cruce manifiesto × compuerta de egreso; vacío si no hubo manifiesto. */
  fabricReport: FabricLoadOutcome = {
    loaded: [],
    rejected: [{ id: '(ninguno)', code: 'FABRIC_MANIFEST_ABSENT' }],
    total: 0,
  };
  private capabilityIds: readonly string[] = [];

  constructor(options: NexusRuntimeOptions = {}) {
    this.repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
    this.graph = options.graph ?? createKnowledgeGraph();
    this.monitor = options.monitor ?? new AntifragileMonitor();
    this.skills = new SkillMemory();
    this.ledger = new EvidenceLedger();
    this.tools = new NexusToolRegistry();
    this.capabilities = createCapabilityEngine({
      tools: this.tools,
      ledger: this.ledger,
      monitor: this.monitor,
      repoRoot: this.repoRoot,
      ...(options.now ? { now: options.now } : {}),
    });
    this.agent = new NexusAgentLoop(this.tools, this.ledger, this.skills);
    this.workflows = new NexusWorkflowEngine();
    this.registerBuiltinTools();
    if (options.builtinCapabilities !== false) this.registerBuiltinCapabilities();
    this.egressPolicy =
      options.egressPolicy ?? egressPolicyFromEnv(options.fabricEnv ?? process.env);
    this.fabric = new OpenAgentFabric({
      tools: this.tools,
      capabilities: this.capabilities,
      policy: this.egressPolicy,
      repoRoot: this.repoRoot,
      ...(options.fabricEnv ? { env: options.fabricEnv } : {}),
      ...(options.fabricFetch ? { fetchImpl: options.fabricFetch } : {}),
    });
    this.loadFabric(options);
    this.registerDiagnosticWorkflow();
  }

  /**
   * El manifiesto se cruza con la política de egreso antes de registrar nada. Un
   * archivo declarado pero ilegible NO tumba el arranque ni se ignora: se publica
   * como rechazo en el informe, porque un operador con la ruta mal escrita necesita
   * saberlo por la superficie de lectura, no por un proceso que no sube.
   */
  private loadFabric(options: NexusRuntimeOptions): void {
    const source =
      options.fabricSource === undefined
        ? this.readDeclaredManifest(options)
        : options.fabricSource;
    if (!source) return;
    try {
      this.fabricReport = this.fabric.load(source);
    } catch (error) {
      this.fabricReport = {
        loaded: [],
        rejected: [
          {
            id: source.uri.slice(0, 80),
            code: (error instanceof Error ? error.message : 'FABRIC_LOAD_FAILED').slice(0, 80),
          },
        ],
        total: source.manifest.agents.length,
      };
    }
  }

  private readDeclaredManifest(options: NexusRuntimeOptions): FabricManifestSource | null {
    const env = options.fabricEnv ?? process.env;
    try {
      return loadFabricManifestFromEnv(env);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FABRIC_MANIFEST_UNREADABLE';
      this.monitor.record('fabric.manifest', false, 0);
      this.fabricReport = {
        loaded: [],
        rejected: [{ id: '(manifiesto declarado)', code: message.slice(0, 80) }],
        total: 0,
      };
      return null;
    }
  }

  async ask(request: AgentLoopRequest): Promise<AgentLoopResult> {
    const startedAt = Date.now();
    const result = await this.agent.run(request, heuristicPlanner(this.graph));
    this.monitor.record(
      'agent.loop',
      result.status === 'completed' && result.ok,
      Date.now() - startedAt
    );
    return result;
  }

  assertFact(input: AssertFactInput, approvalGranted: boolean): AssertFactResult {
    if (!approvalGranted) {
      return { ok: false, status: 'rejected', reason: 'FACT_APPROVAL_REQUIRED' };
    }
    return this.graph.assertFact(input);
  }

  correctFact(
    id: string,
    patch: { object?: string; confidence?: number; source?: string },
    actor: string,
    approvalGranted: boolean
  ): KnowledgeFact | null {
    if (!approvalGranted) return null;
    return this.graph.correctFact(id, patch, actor);
  }

  withdrawFact(id: string, reason: string, approvalGranted: boolean): KnowledgeFact | null {
    if (!approvalGranted) return null;
    return this.graph.withdrawFact(id, reason);
  }

  query(text: string, limit = 5): QueryHit[] {
    return this.graph.query({ text, limit });
  }

  simulate(circuit: NexusCircuit): SimulationResult {
    const startedAt = Date.now();
    const result = simulateCircuit(circuit, startedAt);
    this.monitor.record('quantum.simulate', result.ok, Date.now() - startedAt);
    return result;
  }

  /** Workflow de diagnóstico: lee, autoprueba y sella; no escribe ni despliega. */
  async runDiagnostic(): Promise<ReturnType<NexusWorkflowEngine['run']>> {
    return this.workflows.run(NEXUS_DIAGNOSTIC_WORKFLOW, { deadlineMs: 5_000 });
  }

  describe() {
    return {
      name: 'Isabella Nexus Runtime',
      version: NEXUS_VERSION,
      state: 'draft' as const,
      installedAt: '2026-10-31' as const,
      capabilities: this.declaredCapabilities(),
      capabilityContracts: this.capabilityList(),
      capabilityNotice: this.capabilityNotice,
      openAgentFabric: this.fabric.summary(),
      openAgentFabricReport: this.fabricReport,
      egress: {
        schemes: this.egressPolicy.schemes,
        allowedHosts: this.egressPolicy.allowedHosts,
        allowPrivateNetworks: this.egressPolicy.allowPrivateNetworks,
      },
      tools: this.tools.list(),
      workflows: this.workflows.describe(),
      knowledge: this.graph.snapshot().byStatus,
      learnedSkills: this.skills.size(),
      evidenceHead: this.ledger.headHash(),
      invariants: [
        'CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ PRODUCTION',
        'Ningún hecho existe sin fuente declarada.',
        'Ninguna reparación se ejecuta sin aprobación humana.',
        'El simulador cuántico es local y no sustituye hardware real.',
        'Una capacidad se ejecuta por la herramienta enlazada del registro o no se ejecuta.',
        'Ninguna confianza sale de un valor por defecto: cada término es un hecho observable.',
        'Ninguna llamada sale del proceso sin pasar por la compuerta de egreso y el manifiesto del operador.',
        'El descubrimiento de herramientas (`tools/list`) es evidencia, no permiso: se puede llamar a lo declarado.',
      ],
      limitations: [
        'El grafo y el ledger viven en memoria del proceso: no son durables.',
        'El planner heurístico no usa LLM: solo recupera hechos registrados.',
        'El workflow de diagnóstico no demuestra producción.',
        'La simulación de capacidades es estática: no mide fuga de privacidad, costo real ni impacto.',
        'A4 y A5 están fuera del techo de este motor: se despliegan por operación humana.',
        'La compuerta de egreso valida la dirección literal del URL, no la resolución DNS: el allowlist lo fija el operador, nunca el cuerpo de una petición.',
      ],
    };
  }

  /** Inventario gobernable: estado canónico y confianza observable por capacidad. */
  capabilityList() {
    return this.capabilities.list();
  }

  capabilityDescribe(id: string) {
    const contract = this.capabilities.get(id);
    if (!contract) return null;
    return { ...describeContract(contract), decision: this.capabilities.summary(id) };
  }

  capabilitySimulate(id: string) {
    return this.capabilities.simulate(id);
  }

  /**
   * Estado de la fábrica de agentes externos. Solo lectura: la invocación de un
   * agente pasa por `capabilityExecute`, que es la única compuerta con aprobación,
   * techos, esquema y evidencia.
   */
  fabricStatus() {
    return {
      ...this.fabric.summary(),
      report: this.fabricReport,
      egress: {
        schemes: this.egressPolicy.schemes,
        allowedHosts: this.egressPolicy.allowedHosts,
        ports: this.egressPolicy.ports,
        allowPrivateNetworks: this.egressPolicy.allowPrivateNetworks,
        maxRedirects: this.egressPolicy.maxRedirects,
        maxResponseBytes: this.egressPolicy.maxResponseBytes,
        timeoutMs: this.egressPolicy.timeoutMs,
      },
      agents: this.fabric.list(),
    };
  }

  fabricDescribe(agentId: string): FabricAgentView | null {
    return this.fabric.describe(agentId);
  }

  async capabilityExecute(
    id: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<CapabilityExecutionResult> {
    const startedAt = Date.now();
    const result = await this.capabilities.execute(id, args, context);
    this.monitor.record(`capability:${id}`, result.ok, Date.now() - startedAt);
    // La reputación de una capacidad se mide sobre la herramienta que realmente
    // corrió. Sin esta línea una capacidad en `shadow` no tendría jamás cómo salir
    // de `shadow`: la compuerta exigiría muestras que nadie registra.
    const contract = this.capabilities.get(id);
    if (contract) {
      this.monitor.record(contract.body.toolId, result.ok, Date.now() - startedAt);
    }
    return result;
  }

  async capabilityRollback(id: string, context: ToolContext): Promise<CapabilityExecutionResult> {
    return this.capabilities.rollback(id, context);
  }

  private declaredCapabilities(): NexusCapability[] {
    return [
      {
        id: 'nexus.knowledge_graph',
        description:
          'Hechos con fuente, corrección por versión y retiro auditable; búsqueda léxica + embedding local.',
        implemented: true,
        testedBy: 'test/nexus/knowledge-graph.test.ts',
        production: false,
        externalDependency: 'none',
      },
      {
        id: 'nexus.agent_loop',
        description:
          'Bucle planificar-ejecutar-observar con ledger de evidencia y memoria de skills sugeridas.',
        implemented: true,
        testedBy: 'test/nexus/agent-loop.test.ts',
        production: false,
        externalDependency: 'none',
      },
      {
        id: 'nexus.workflow',
        description: 'DAG determinista con reintentos acotados y compensación en orden inverso.',
        implemented: true,
        testedBy: 'test/nexus/workflow.test.ts',
        production: false,
        externalDependency: 'none',
      },
      {
        id: 'nexus.antifragile',
        description:
          'Cortacircuitos, salud por componente y propuestas de reparación con aprobación.',
        implemented: true,
        testedBy: 'test/nexus/antifragile.test.ts',
        production: false,
        externalDependency: 'none',
      },
      {
        id: 'nexus.quantum_simulator',
        description: 'Simulación statevector local de hasta 12 qubits con muestreo determinista.',
        implemented: true,
        testedBy: 'test/nexus/quantum.test.ts',
        production: false,
        externalDependency: 'none',
      },
      {
        id: 'nexus.pennylane_bridge',
        description:
          'Adaptador opcional al servicio PennyLane existente; sin endpoint configurado se declara no disponible.',
        implemented: true,
        testedBy: 'test/quantum (adaptador preexistente)',
        production: false,
        externalDependency: 'optional',
      },
    ];
  }

  private registerBuiltinTools(): void {
    this.registerTool(
      toolDefinition({
        id: 'knowledge.search',
        description: 'Busca hechos con fuente en el grafo local.',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async (args) => {
          const query = typeof args.query === 'string' ? args.query : '';
          const limit = typeof args.limit === 'number' ? args.limit : 5;
          const hits = this.graph.query({ text: query, limit });
          return {
            ok: true,
            summary: `${hits.length} hecho(s) recuperado(s) del grafo local.`,
            output: {
              hits: hits.map((hit) => ({
                id: hit.fact.id,
                subject: hit.fact.subject,
                predicate: hit.fact.predicate,
                object: hit.fact.object,
                source: hit.fact.source,
                confidence: hit.fact.confidence,
                score: hit.score,
              })),
              count: hits.length,
            },
          };
        },
      })
    );

    this.registerTool(
      toolDefinition({
        id: 'knowledge.assert',
        description: 'Registra un hecho con fuente. Requiere aprobación humana.',
        risk: 'MEDIUM',
        sideEffect: 'write',
        requiresApproval: true,
        run: async (args) => {
          const result = this.graph.assertFact({
            subject: typeof args.subject === 'string' ? args.subject : '',
            predicate: typeof args.predicate === 'string' ? args.predicate : '',
            object: typeof args.object === 'string' ? args.object : '',
            source: typeof args.source === 'string' ? args.source : '',
            ...(typeof args.confidence === 'number' ? { confidence: args.confidence } : {}),
          });
          return {
            ok: result.ok,
            summary:
              result.status === 'inserted'
                ? 'Hecho registrado con fuente.'
                : result.status === 'duplicate'
                  ? 'El hecho ya existía; no se duplicó.'
                  : result.status === 'conflict'
                    ? 'Conflicto detectado: se requiere corrección o retiro explícito.'
                    : 'El hecho fue rechazado por validación.',
            output: {
              status: result.status,
              ...(result.factId ? { factId: result.factId } : {}),
              ...(result.conflictWith ? { conflictWith: result.conflictWith } : {}),
              ...(result.reason ? { reason: result.reason } : {}),
            },
          };
        },
      })
    );

    this.registerTool(
      toolDefinition({
        id: 'graph.stats',
        description: 'Cuenta hechos por estado en el grafo local.',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async () => {
          const snapshot = this.graph.snapshot();
          return {
            ok: true,
            summary: `${snapshot.total} hecho(s): ${snapshot.byStatus.active} activos.`,
            output: {
              total: snapshot.total,
              byStatus: snapshot.byStatus,
            },
          };
        },
      })
    );

    this.registerTool(
      toolDefinition({
        id: 'quantum.simulate',
        description: 'Simula un circuito pequeño en el statevector local.',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async (args) => {
          const circuit = args.circuit;
          if (!circuit || typeof circuit !== 'object') {
            return {
              ok: false,
              summary: 'Circuito ausente o inválido.',
              output: { error: 'QUANTUM_CIRCUIT_INVALID' },
            };
          }
          const result = this.simulate(circuit as NexusCircuit);
          return {
            ok: result.ok,
            summary: result.ok
              ? `Circuito de ${result.qubits} qubit(s) simulado localmente.`
              : `Circuito rechazado: ${result.error ?? 'QUANTUM_ERROR'}.`,
            output: result.ok
              ? {
                  qubits: result.qubits,
                  probabilities: result.probabilities,
                  marginals: result.marginals,
                  circuitHash: result.circuitHash,
                }
              : { error: result.error ?? 'QUANTUM_ERROR' },
          };
        },
      })
    );

    this.registerTool(
      toolDefinition({
        id: 'monitor.report',
        description: 'Reporta salud y circuitos de los componentes monitoreados.',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async () => {
          const report = this.monitor.report();
          return {
            ok: true,
            summary: `Salud ${report.score}/100 (${report.level}).`,
            output: {
              score: report.score,
              level: report.level,
              components: report.components,
            },
          };
        },
      })
    );
  }

  private registerTool(tool: NexusTool): void {
    const started = () => Date.now();
    this.tools.register({
      ...tool,
      run: async (args, context) => {
        const startedAt = started();
        try {
          const result = await tool.run(args, context);
          this.monitor.record(tool.id, result.ok, Date.now() - startedAt);
          return result;
        } catch (error) {
          this.monitor.record(tool.id, false, Date.now() - startedAt);
          throw error;
        }
      },
    });
  }

  /**
   * Capacidades del plano NEXUS ∞ sobre las herramientas ya gobernadas. El digest
   * de procedencia se calcula sobre los bytes reales del módulo que implementa la
   * herramienta: un literal copiado sería una afirmación, esto es una huella.
   *
   * Si el árbol no está legible (un bundle sin `src/`), la capacidad NO se registra.
   * Se prefiere una fábrica vacía a una fábrica con procedencia inventada.
   */
  private registerBuiltinCapabilities(): void {
    const digests = new Map<string, string | null>();
    const digestOf = (relative: string): string | null => {
      if (digests.has(relative)) return digests.get(relative) ?? null;
      let digest: string | null = null;
      try {
        const bytes = readFileSync(join(this.repoRoot, relative));
        digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
      } catch {
        digest = null;
      }
      digests.set(relative, digest);
      return digest;
    };

    const contracts: Array<CapabilityContract | null> = [];

    const build = (relative: string, factory: (digest: string) => CapabilityContract): void => {
      const digest = digestOf(relative);
      contracts.push(digest ? factory(digest) : null);
    };

    build('src/nexus/knowledge-graph.ts', (digest) =>
      defineCapabilityContract({
        body: {
          id: 'nexus.cap.knowledge.search',
          version: '1.0.0',
          domain: 'knowledge',
          description: 'Recupera hechos con fuente declarada desde el grafo local del runtime.',
          toolId: 'knowledge.search',
          riskTier: 'LOW',
          source: {
            type: 'code',
            uri: 'file:src/nexus/knowledge-graph.ts',
            digest,
            license: 'UNLICENSED (TAMV ONLINE NETWORK, código propietario)',
          },
          execution: {
            timeoutMs: 2_000,
            memoryMb: 128,
            maxInputBytes: 4_096,
            maxOutputBytes: 32_768,
            network: 'none',
            allowedHosts: [],
          },
          governance: {
            autonomy: 'A0',
            dataClasses: ['internal', 'research'],
            privacyBudget: 0,
            reversible: true,
            approvalRequired: false,
          },
          assurance: {
            testFiles: ['test/nexus/knowledge-graph.test.ts', 'test/nexus/agent-loop.test.ts'],
            coverage: 0,
          },
          rollback: {
            strategy: 'none-declared',
            note: 'Lectura sin efectos: no hay estado que revertir.',
          },
        },
        inputSchema: z
          .object({
            query: z.string().min(1),
            limit: z.number().int().min(1).max(50).optional(),
          })
          .strict()
          .describe('{ query: string, limit?: 1..50 }'),
        outputSchema: z
          .object({
            hits: z.array(z.unknown()),
            count: z.number().int().min(0),
          })
          .describe('{ hits: [], count: int }'),
      })
    );

    build('src/nexus/quantum.ts', (digest) =>
      defineCapabilityContract({
        body: {
          id: 'nexus.cap.quantum.simulate',
          version: '1.0.0',
          domain: 'simulation',
          description:
            'Simula un circuito de hasta 12 qubits en el statevector local determinista.',
          toolId: 'quantum.simulate',
          riskTier: 'LOW',
          source: {
            type: 'code',
            uri: 'file:src/nexus/quantum.ts',
            digest,
            license: 'UNLICENSED (TAMV ONLINE NETWORK, código propietario)',
          },
          execution: {
            timeoutMs: 5_000,
            memoryMb: 512,
            maxInputBytes: 8_192,
            maxOutputBytes: 65_536,
            network: 'none',
            allowedHosts: [],
          },
          governance: {
            autonomy: 'A0',
            dataClasses: ['public', 'synthetic'],
            privacyBudget: 0,
            reversible: true,
            approvalRequired: false,
          },
          assurance: {
            testFiles: ['test/nexus/quantum.test.ts'],
            coverage: 0,
          },
          rollback: {
            strategy: 'none-declared',
            note: 'Cálculo puro sin estado persistente: no existe efecto que revertir.',
          },
        },
        inputSchema: z
          .object({
            circuit: z.object({
              qubits: z.number().int().min(1).max(12),
              gates: z
                .array(
                  z.object({
                    gate: z.enum(['h', 'x', 'y', 'z', 's', 't', 'rx', 'ry', 'rz', 'cnot', 'cz']),
                    qubit: z.number().int().min(0).optional(),
                    control: z.number().int().min(0).optional(),
                    target: z.number().int().min(0).optional(),
                    theta: z.number().finite().optional(),
                  })
                )
                .min(1),
              shots: z.number().int().min(1).optional(),
              seed: z.number().int().optional(),
            }),
          })
          .strict()
          .describe('{ circuit: { qubits 1..12, gates[], shots?, seed? } }'),
        outputSchema: z
          .object({
            qubits: z.number().int().min(0),
            probabilities: z.record(z.string(), z.number()),
            marginals: z.array(z.number()),
            circuitHash: z.string().min(1),
          })
          .describe('{ qubits, probabilities, marginals, circuitHash }'),
      })
    );

    build('src/nexus/antifragile.ts', (digest) =>
      defineCapabilityContract({
        body: {
          id: 'nexus.cap.monitor.report',
          version: '1.0.0',
          domain: 'observability',
          description: 'Reporta salud y estado de cortocircuitos de los componentes monitoreados.',
          toolId: 'monitor.report',
          riskTier: 'LOW',
          source: {
            type: 'code',
            uri: 'file:src/nexus/antifragile.ts',
            digest,
            license: 'UNLICENSED (TAMV ONLINE NETWORK, código propietario)',
          },
          execution: {
            timeoutMs: 2_000,
            memoryMb: 64,
            maxInputBytes: 1_024,
            maxOutputBytes: 32_768,
            network: 'none',
            allowedHosts: [],
          },
          governance: {
            autonomy: 'A0',
            dataClasses: ['operational'],
            privacyBudget: 0,
            reversible: true,
            approvalRequired: false,
          },
          assurance: {
            testFiles: ['test/nexus/antifragile.test.ts'],
            coverage: 0,
          },
          rollback: {
            strategy: 'none-declared',
            note: 'Lectura de señales del proceso: no muta estado.',
          },
        },
        inputSchema: z.object({}).strict().describe('{} — sin entrada'),
        outputSchema: z
          .object({
            score: z.number().min(0).max(100),
            level: z.enum(['healthy', 'degraded', 'critical']),
            components: z.array(z.unknown()),
          })
          .describe('{ score 0..100, level, components[] }'),
      })
    );

    build('src/nexus/knowledge-graph.ts', (digest) =>
      defineCapabilityContract({
        body: {
          id: 'nexus.cap.knowledge.assert',
          version: '1.0.0',
          domain: 'knowledge',
          description:
            'Registra un hecho con fuente en el grafo. Escritura: exige aprobación server-side.',
          toolId: 'knowledge.assert',
          riskTier: 'MEDIUM',
          source: {
            type: 'code',
            uri: 'file:src/nexus/knowledge-graph.ts',
            digest,
            license: 'UNLICENSED (TAMV ONLINE NETWORK, código propietario)',
          },
          execution: {
            timeoutMs: 2_000,
            memoryMb: 128,
            maxInputBytes: 8_192,
            maxOutputBytes: 4_096,
            network: 'none',
            allowedHosts: [],
          },
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal', 'research'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
          assurance: {
            testFiles: ['test/nexus/knowledge-graph.test.ts'],
            coverage: 0,
          },
          rollback: {
            strategy: 'none-declared',
            note: 'El retiro exige withdrawFact con id y razón explícitos; no se compensa a ciegas.',
          },
        },
        inputSchema: z
          .object({
            subject: z.string().min(1),
            predicate: z.string().min(1),
            object: z.string().min(1),
            source: z.string().min(1),
            confidence: z.number().min(0).max(1).optional(),
          })
          .strict()
          .describe('{ subject, predicate, object, source, confidence? 0..1 }'),
        outputSchema: z
          .object({
            status: z.string().min(1),
            factId: z.string().optional(),
            conflictWith: z.unknown().optional(),
            reason: z.string().optional(),
          })
          .describe('{ status, factId?, conflictWith?, reason? }'),
      })
    );

    const registered: string[] = [];
    for (const contract of contracts) {
      if (!contract) {
        this.monitor.record('capabilities.provenance', false, 0);
        continue;
      }
      this.capabilities.register(contract);
      registered.push(contract.id);
    }
    this.capabilityNotice =
      registered.length === contracts.length
        ? `${registered.length} capacidades de fábrica registradas`
        : `${registered.length}/${contracts.length} registradas; el resto quedó fuera por procedencia no legible en ${this.repoRoot}`;
    this.capabilityIds = registered;
  }

  private registerDiagnosticWorkflow(): void {
    const definition: WorkflowDefinition = {
      id: NEXUS_DIAGNOSTIC_WORKFLOW,
      steps: [
        {
          id: 'graph-stats',
          run: async () => {
            const snapshot = this.graph.snapshot();
            return { total: snapshot.total, byStatus: snapshot.byStatus };
          },
        },
        {
          id: 'quantum-selftest',
          dependsOn: ['graph-stats'],
          run: async () => {
            const result = simulateCircuit({
              qubits: 2,
              gates: [
                { gate: 'h', qubit: 0 },
                { gate: 'cnot', control: 0, target: 1 },
              ],
              shots: 256,
              seed: 7,
            });
            if (!result.ok || !verifySimulation(result)) {
              throw new Error('QUANTUM_SELFTEST_FAILED');
            }
            return { circuitHash: result.circuitHash, probabilities: result.probabilities };
          },
        },
        {
          id: 'monitor',
          dependsOn: ['graph-stats'],
          run: async () => {
            const report = this.monitor.report();
            return { score: report.score, level: report.level };
          },
        },
      ],
    };
    this.workflows.register(definition);
  }
}

export function createNexusRuntime(options?: NexusRuntimeOptions): NexusRuntime {
  return new NexusRuntime(options);
}
