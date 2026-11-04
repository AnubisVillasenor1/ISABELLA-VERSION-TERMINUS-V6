/**
 * Nexus Runtime — fachada única sobre grafo, agente, workflows, monitoreo y
 * simulador cuántico. state: draft | engine-generated.
 *
 * Esta capa NO crea autoridad nueva: expone capacidades locales, deterministas
 * y acotadas, con una declaración honesta de lo que está implementado, probado
 * y pendiente de aprobación humana.
 */
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
import { NexusToolRegistry, toolDefinition, type NexusTool } from './tool-registry';
import { NexusWorkflowEngine, type WorkflowDefinition } from './workflow';

export const NEXUS_VERSION = '0.1.0' as const;
export const NEXUS_DIAGNOSTIC_WORKFLOW = 'nexus.diagnostic' as const;

export interface NexusRuntimeOptions {
  readonly graph?: NexusKnowledgeGraph;
  readonly monitor?: AntifragileMonitor;
  readonly now?: () => number;
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
  readonly monitor: AntifragileMonitor;
  readonly skills: SkillMemory;
  readonly ledger: EvidenceLedger;
  readonly agent: NexusAgentLoop;
  readonly workflows: NexusWorkflowEngine;

  constructor(options: NexusRuntimeOptions = {}) {
    this.graph = options.graph ?? createKnowledgeGraph();
    this.monitor = options.monitor ?? new AntifragileMonitor();
    this.skills = new SkillMemory();
    this.ledger = new EvidenceLedger();
    this.tools = new NexusToolRegistry();
    this.agent = new NexusAgentLoop(this.tools, this.ledger, this.skills);
    this.workflows = new NexusWorkflowEngine();
    this.registerBuiltinTools();
    this.registerDiagnosticWorkflow();
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
      capabilities: this.capabilities(),
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
      ],
      limitations: [
        'El grafo y el ledger viven en memoria del proceso: no son durables.',
        'El planner heurístico no usa LLM: solo recupera hechos registrados.',
        'El workflow de diagnóstico no demuestra producción.',
      ],
    };
  }

  private capabilities(): NexusCapability[] {
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
