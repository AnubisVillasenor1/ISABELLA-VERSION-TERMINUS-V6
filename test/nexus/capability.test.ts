// state: draft — revisión humana pendiente.
/**
 * Pruebas del Capability Contract y su motor (plano NEXUS ∞ ejecutado sobre las
 * piezas gobernadas de Isabella). Lo que se asegura aquí no es la forma del
 * contrato: es que la compuerta falle cerrada y de que ninguna confianza nazca de
 * un valor por defecto.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EvidenceLedger } from '../../src/nexus/agent-loop';
import { AntifragileMonitor } from '../../src/nexus/antifragile';
import {
  CapabilityContractBodySchema,
  CONTRACT_CEILINGS,
  autonomyRank,
  decideContractStatus,
  effectiveRiskTier,
  toCapabilityState,
  type CapabilityContract,
  type CapabilityEvidenceFacts,
} from '../../src/nexus/capability-contract';
import { createCapabilityEngine, type CapabilityEngine } from '../../src/nexus/capability-engine';
import { createNexusRuntime } from '../../src/nexus/runtime';
import {
  NexusToolRegistry,
  hashToolCall,
  toolDefinition,
  type ToolContext,
} from '../../src/nexus/tool-registry';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function facts(patch: Partial<CapabilityEvidenceFacts> = {}): CapabilityEvidenceFacts {
  return {
    repoRoot: REPO_ROOT,
    registeredRisk: 'LOW',
    registeredRequiresApproval: false,
    observedSamples: 5,
    observedSuccessRate: 1,
    observedCircuit: 'closed',
    ...patch,
  };
}

const GOOD_DIGEST = `sha256:${'a'.repeat(64)}`;
const KNOWN_TEST_FILE = 'test/nexus/knowledge-graph.test.ts';

interface ContractOverrides {
  readonly body?: Record<string, unknown>;
  readonly input?: z.ZodType<unknown>;
  readonly output?: z.ZodType<unknown>;
}

/** Contrato base válido; cada prueba rompe un solo control para aislar el veredicto. */
function contract(overrides: ContractOverrides = {}): CapabilityContract {
  const body = {
    id: 'test.cap.search',
    version: '1.0.0',
    domain: 'knowledge',
    description: 'Busca hechos con fuente en el grafo de prueba.',
    toolId: 'knowledge.search',
    riskTier: 'LOW',
    source: {
      type: 'code',
      uri: 'file:src/nexus/knowledge-graph.ts',
      digest: GOOD_DIGEST,
      license: 'UNLICENSED (TAMV ONLINE NETWORK, codigo propietario)',
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
      dataClasses: ['internal'],
      privacyBudget: 0,
      reversible: true,
      approvalRequired: false,
    },
    assurance: { testFiles: [KNOWN_TEST_FILE], coverage: 0.5 },
    rollback: {
      strategy: 'none-declared',
      note: 'Lectura sin efectos: no hay estado que revertir.',
    },
    ...(overrides.body ?? {}),
  };
  return {
    id: String(body.id),
    fingerprint: 'f'.repeat(32),
    body: CapabilityContractBodySchema.parse(body),
    inputSchema: overrides.input ?? z.object({ query: z.string().min(1) }).strict(),
    outputSchema:
      overrides.output ?? z.object({ hits: z.array(z.unknown()), count: z.number().int().min(0) }),
    inputSummary: '{ query: string }',
    outputSummary: '{ hits, count }',
  };
}

function context(patch: Partial<ToolContext> = {}): ToolContext {
  return {
    requestId: 'req-1',
    actorId: 'human:tester',
    tenantId: 'tenant:default',
    approvalGranted: false,
    signal: new AbortController().signal,
    ...patch,
  };
}

interface Harness {
  readonly engine: CapabilityEngine;
  readonly tools: NexusToolRegistry;
  readonly monitor: AntifragileMonitor;
  readonly ledger: EvidenceLedger;
}

/**
 * Registro de herramientas real (no simulado): las dobles de prueba devuelven la
 * forma que el contrato declara, incluido un caso deliberadamente fuera de esquema
 * y otro deliberadamente lento, para que las compuertas de salida y de tiempo se
 * ejerciten y no se den por hechas.
 */
function harness(): Harness {
  const tools = new NexusToolRegistry();
  tools.register(
    toolDefinition({
      id: 'knowledge.search',
      description: 'Lectura de prueba conforme al contrato base.',
      risk: 'LOW',
      sideEffect: 'read',
      requiresApproval: false,
      run: async () => ({ ok: true, summary: '0 hechos.', output: { hits: [], count: 0 } }),
    })
  );
  tools.register(
    toolDefinition({
      id: 'knowledge.assert',
      description: 'Escritura de prueba que exige aprobación.',
      risk: 'MEDIUM',
      sideEffect: 'write',
      requiresApproval: true,
      run: async () => ({
        ok: true,
        summary: 'Hecho registrado.',
        output: { status: 'inserted', factId: 'fact-1' },
      }),
    })
  );
  tools.register(
    toolDefinition({
      id: 'shape.mismatch',
      description: 'Output deliberadamente fuera del esquema del contrato.',
      risk: 'LOW',
      sideEffect: 'read',
      requiresApproval: false,
      run: async () => ({
        ok: true,
        summary: 'ok',
        output: { note: 'texto no conforme', hits: [] },
      }),
    })
  );
  tools.register(
    toolDefinition({
      id: 'shape.undo',
      description: 'Herramienta compensatoria de prueba.',
      risk: 'LOW',
      sideEffect: 'write',
      requiresApproval: true,
      run: async () => ({ ok: true, summary: 'Compensación aplicada.', output: { undone: true } }),
    })
  );
  tools.register(
    toolDefinition({
      id: 'slow.reader',
      description: 'Tarda más que el techo declarado por el contrato.',
      risk: 'LOW',
      sideEffect: 'read',
      requiresApproval: false,
      timeoutMs: 5_000,
      run: () =>
        new Promise((resolvePromise) => {
          setTimeout(
            () => resolvePromise({ ok: true, summary: 'lento', output: { hits: [], count: 0 } }),
            200
          );
        }),
    })
  );
  const monitor = new AntifragileMonitor();
  const ledger = new EvidenceLedger();
  const engine = createCapabilityEngine({ tools, ledger, monitor, repoRoot: REPO_ROOT });
  return { engine, tools, monitor, ledger };
}

describe('Capability Contract: esquema', () => {
  it('rechaza un digest que no es sha256', () => {
    expect(() =>
      contract({
        body: {
          source: { type: 'code', uri: 'file:x.ts', digest: 'md5:zz', license: 'MIT' },
        },
      })
    ).toThrow();
  });

  it('rechaza una licencia de relleno', () => {
    expect(() =>
      contract({
        body: {
          source: { type: 'code', uri: 'file:x.ts', digest: GOOD_DIGEST, license: 'TODO' },
        },
      })
    ).toThrow();
  });

  it('exige coherencia entre red y hosts permitidos', () => {
    const base = contract().body.execution;
    expect(() =>
      contract({
        body: { execution: { ...base, network: 'allowlist', allowedHosts: [] } },
      })
    ).toThrow();
    expect(() =>
      contract({
        body: { execution: { ...base, network: 'none', allowedHosts: ['api.example.com'] } },
      })
    ).toThrow();
  });

  it('rechaza un host con esquema o con comodín', () => {
    const base = contract().body.execution;
    expect(() =>
      contract({
        body: {
          execution: { ...base, network: 'allowlist', allowedHosts: ['https://api.example.com'] },
        },
      })
    ).toThrow();
    expect(() =>
      contract({
        body: { execution: { ...base, network: 'allowlist', allowedHosts: ['*.example.com'] } },
      })
    ).toThrow();
  });

  it('no permite exceder los techos del plano', () => {
    const base = contract().body.execution;
    expect(() =>
      contract({
        body: { execution: { ...base, timeoutMs: CONTRACT_CEILINGS.timeoutMs + 1 } },
      })
    ).toThrow();
    expect(() =>
      contract({
        body: { execution: { ...base, memoryMb: CONTRACT_CEILINGS.memoryMb + 1 } },
      })
    ).toThrow();
  });

  it('exige aprobación server-side a partir de A3', () => {
    expect(() =>
      contract({
        body: {
          governance: {
            autonomy: 'A3',
            dataClasses: ['internal'],
            privacyBudget: 0.1,
            reversible: true,
            approvalRequired: false,
          },
        },
      })
    ).toThrow();
  });

  it('exige que reviewedBy y reviewedAt vayan juntos', () => {
    expect(() =>
      contract({
        body: {
          assurance: { testFiles: [KNOWN_TEST_FILE], coverage: 0.5, reviewedBy: 'OsoPanda1' },
        },
      })
    ).toThrow();
  });
});

describe('Capability Contract: riesgo y confianza', () => {
  it('el riesgo efectivo nunca es menor que el del registro', () => {
    expect(effectiveRiskTier('LOW', 'CRITICAL')).toBe('CRITICAL');
    expect(effectiveRiskTier('HIGH', 'MEDIUM')).toBe('HIGH');
    expect(effectiveRiskTier('LOW', 'LOW')).toBe('LOW');
  });

  it('cuarentena si la herramienta no está enlazada', () => {
    const decision = decideContractStatus(contract(), facts({ registeredRisk: null }));
    expect(decision.status).toBe('quarantined');
    expect(decision.reasons).toContain('TOOL_NOT_REGISTERED');
    expect(decision.state).toBe('unavailable');
  });

  it('cuarentena si un archivo de prueba declarado no existe', () => {
    const c = contract({
      body: { assurance: { testFiles: ['test/nexus/does-not-exist.test.ts'], coverage: 0.5 } },
    });
    const decision = decideContractStatus(c, facts());
    expect(decision.status).toBe('quarantined');
    expect(decision.reasons).toContain('TEST_FILES_UNRESOLVED');
    expect(decision.trust.tests.score).toBe(0);
  });

  it('no presume reputación sin ejecuciones medidas', () => {
    const decision = decideContractStatus(
      contract({
        body: {
          toolId: 'knowledge.assert',
          riskTier: 'MEDIUM',
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
        },
      }),
      facts({
        registeredRequiresApproval: true,
        observedSamples: null,
        observedSuccessRate: null,
        observedCircuit: null,
      })
    );
    expect(decision.status).toBe('shadow');
    expect(decision.state).toBe('shadow');
    expect(decision.trust.reputation.observed).toBe(false);
    expect(decision.trust.reputation.score).toBe(0);
  });

  it('mantiene shadow con menos de tres muestras', () => {
    const decision = decideContractStatus(
      contract({
        body: {
          toolId: 'knowledge.assert',
          riskTier: 'MEDIUM',
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
        },
      }),
      facts({ registeredRequiresApproval: true, observedSamples: 2 })
    );
    expect(decision.status).toBe('shadow');
  });

  it('penaliza la cobertura no medida en lugar de inflar la confianza', () => {
    const measured = decideContractStatus(contract(), facts());
    const unmeasured = decideContractStatus(
      contract({ body: { assurance: { testFiles: [KNOWN_TEST_FILE], coverage: 0 } } }),
      facts()
    );
    expect(measured.trust.compliance.score).toBe(1);
    expect(unmeasured.trust.compliance.score).toBeLessThan(1);
    expect(unmeasured.trust.score).toBeLessThan(measured.trust.score);
  });

  it('la proyección a CapabilityState respeta la escalera canónica', () => {
    const unsigned = contract();
    expect(toCapabilityState('approved', unsigned)).toBe('implemented');
    const signed = contract({
      body: {
        assurance: {
          testFiles: [KNOWN_TEST_FILE],
          coverage: 0.5,
          reviewedBy: 'OsoPanda1',
          reviewedAt: '2026-11-03T00:00:00.000Z',
        },
      },
    });
    expect(toCapabilityState('approved', signed)).toBe('verified');
    expect(toCapabilityState('quarantined', signed)).toBe('unavailable');
    expect(toCapabilityState('draft', signed)).toBe('planned');
    expect(toCapabilityState('shadow', signed)).toBe('shadow');
    expect(toCapabilityState('retired', signed)).toBe('unavailable');
  });

  it('autonomyRank ordena el plano de A0 a A5', () => {
    expect(autonomyRank('A0')).toBeLessThan(autonomyRank('A5'));
    expect(autonomyRank(CONTRACT_CEILINGS.executableAutonomy)).toBe(3);
  });
});

describe('Capability Engine: compuerta de ejecución', () => {
  it('aprueba una capacidad A0 y sella su evidencia', async () => {
    const { engine, ledger } = harness();
    engine.register(contract());
    const result = await engine.execute('test.cap.search', { query: 'cualquier cosa' }, context());
    expect(result.status).toBe('executed');
    expect(result.code).toBe('CAPABILITY_EXECUTED');
    expect(result.evidenceId).toMatch(/^ev_/);
    expect(ledger.list().some((entry) => entry.toolId === 'test.cap.search')).toBe(true);
  });

  it('rechaza sin ejecutar una capacidad en cuarentena', async () => {
    const { engine, tools } = harness();
    engine.register(
      contract({
        body: { assurance: { testFiles: ['test/nexus/nope.test.ts'], coverage: 0.5 } },
      })
    );
    const before = tools.get('knowledge.search');
    expect(before).not.toBeNull();
    const result = await engine.execute('test.cap.search', { query: 'hola' }, context());
    expect(result.status).toBe('denied');
    expect(result.code).toBe('CAPABILITY_NOT_APPROVED');
    expect(result.output.status).toBe('quarantined');
  });

  it('no deja ejecutar una capacidad aprobada cuyo registro exige aprobación', async () => {
    const { engine, monitor } = harness();
    engine.register(
      contract({
        body: {
          toolId: 'knowledge.assert',
          riskTier: 'MEDIUM',
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
        },
        input: z
          .object({
            subject: z.string().min(1),
            predicate: z.string().min(1),
            object: z.string().min(1),
            source: z.string().min(1),
          })
          .strict(),
        output: z.object({ status: z.string().min(1), factId: z.string() }),
      })
    );
    for (let index = 0; index < 3; index += 1) monitor.record('knowledge.assert', true, 1);
    expect(engine.evaluate('test.cap.search').status).toBe('approved');

    const denied = await engine.execute(
      'test.cap.search',
      { subject: 's', predicate: 'p', object: 'o', source: 'https://example.org/x' },
      context({ approvalGranted: false })
    );
    expect(denied.code).toBe('CAPABILITY_APPROVAL_REQUIRED');
    expect(denied.status).toBe('denied');

    const allowed = await engine.execute(
      'test.cap.search',
      { subject: 's', predicate: 'p', object: 'o', source: 'https://example.org/x' },
      context({ approvalGranted: true })
    );
    expect(allowed.status).toBe('executed');
  });

  it('escala de shadow a approved solo con evidencia observable', () => {
    const { engine, monitor } = harness();
    engine.register(
      contract({
        body: {
          toolId: 'knowledge.assert',
          riskTier: 'MEDIUM',
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
        },
      })
    );
    expect(engine.evaluate('test.cap.search').status).toBe('shadow');
    for (let index = 0; index < 3; index += 1) monitor.record('knowledge.assert', true, 1);
    const decision = engine.evaluate('test.cap.search');
    expect(decision.status).toBe('approved');
    expect(decision.state).toBe('implemented');
  });

  it('no devuelve el valor rechazado por el esquema de entrada', async () => {
    const { engine } = harness();
    engine.register(contract());
    const secret = 'AKIAIOSFODNN7EXAMPLE-secreto-que-no-debe-salir';
    const result = await engine.execute(
      'test.cap.search',
      // `query` ausente y una clave suelta: la compuerta nombra el fallo sin citar el valor.
      { nope: secret } as Record<string, unknown>,
      context()
    );
    expect(result.code).toBe('CAPABILITY_INPUT_INVALID');
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(String(result.output.issues)).toContain('unrecognized_keys');
  });

  it('retiene una salida que no conforme el esquema', async () => {
    const { engine } = harness();
    engine.register(contract({ body: { toolId: 'shape.mismatch' } }));
    const result = await engine.execute('test.cap.search', { query: 'x' }, context());
    expect(result.code).toBe('CAPABILITY_OUTPUT_INVALID');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('texto no conforme');
  });

  it('corta por tiempo sin reintentar', async () => {
    const { engine } = harness();
    const base = contract().body.execution;
    engine.register(
      contract({ body: { toolId: 'slow.reader', execution: { ...base, timeoutMs: 25 } } })
    );
    const result = await engine.execute('test.cap.search', { query: 'x' }, context());
    expect(result.code).toBe('CAPABILITY_TIMEOUT');
    expect(result.status).toBe('denied');
  });

  it('niega A4 y A5: fuera del techo de este motor', async () => {
    const { engine, monitor } = harness();
    engine.register(
      contract({
        body: {
          riskTier: 'MEDIUM',
          governance: {
            autonomy: 'A4',
            dataClasses: ['commercial'],
            privacyBudget: 0.2,
            reversible: true,
            approvalRequired: true,
          },
        },
      })
    );
    for (let index = 0; index < 3; index += 1) monitor.record('knowledge.search', true, 1);
    expect(engine.evaluate('test.cap.search').status).toBe('approved');
    const result = await engine.execute(
      'test.cap.search',
      { query: 'x' },
      context({ approvalGranted: true })
    );
    expect(result.code).toBe('CAPABILITY_AUTONOMY_EXCEEDS_RUNTIME_CEILING');
  });

  it('declara la reversión cuando no hay herramienta compensatoria', async () => {
    const { engine } = harness();
    engine.register(contract());
    const result = await engine.rollback('test.cap.search', context());
    expect(result.code).toBe('CAPABILITY_ROLLBACK_UNDECLARED');
  });

  it('ejecuta la herramienta compensatoria si existe', async () => {
    const { engine, monitor } = harness();
    engine.register(
      contract({
        body: {
          governance: {
            autonomy: 'A2',
            dataClasses: ['internal'],
            privacyBudget: 0.01,
            reversible: true,
            approvalRequired: true,
          },
          rollback: {
            strategy: 'compensating-tool',
            toolId: 'shape.undo',
            note: 'Compensa la escritura deshaciendo la clave escrita.',
          },
        },
      })
    );
    for (let index = 0; index < 3; index += 1) monitor.record('knowledge.search', true, 1);
    const result = await engine.rollback('test.cap.search', context({ approvalGranted: true }));
    expect(result.code).toBe('CAPABILITY_ROLLED_BACK');
    expect(result.output).toEqual({ undone: true });
  });

  it('retirar una capacidad la deja inejecutable sin borrar la evidencia', async () => {
    const { engine, ledger } = harness();
    engine.register(contract());
    await engine.execute('test.cap.search', { query: 'x' }, context());
    expect(ledger.list().length).toBeGreaterThan(0);
    const sealedBefore = ledger.list().length;
    expect(engine.retire('test.cap.search')).toBe(true);
    expect(engine.has('test.cap.search')).toBe(false);
    const after = await engine.execute('test.cap.search', { query: 'x' }, context());
    expect(after.code).toBe('CAPABILITY_NOT_FOUND');
    expect(ledger.list().length).toBe(sealedBefore);
  });

  it('simula sin fabricar métricas que no se pueden medir', () => {
    const { engine } = harness();
    engine.register(contract());
    const report = engine.simulate('test.cap.search');
    expect(report).not.toBeNull();
    expect(report?.verdict).toBe('approved');
    expect(report?.notMeasured.join(' ')).toContain('costo en USD');
    expect(JSON.stringify(report)).not.toContain('cost_estimate_usd');
    expect(report?.disclaimer).toContain('Simulación estática');
  });

  it('el hash de evidencia es estable para la misma llamada', () => {
    expect(hashToolCall('test.cap.search', { query: 'x' })).toBe(
      hashToolCall('test.cap.search', { query: 'x' })
    );
    expect(hashToolCall('test.cap.search', { query: 'x' })).not.toBe(
      hashToolCall('test.cap.search', { query: 'y' })
    );
  });
});

describe('Capability Engine: arranque del runtime', () => {
  it('registra las capacidades de fábrica con procedencia legible', () => {
    const runtime = createNexusRuntime({ repoRoot: REPO_ROOT, fabricSource: null });
    const list = runtime.capabilityList();
    expect(list.length).toBe(4);
    expect(runtime.capabilityNotice).toContain('4 capacidades de fábrica registradas');
    for (const entry of list) {
      expect([
        'implemented',
        'verified',
        'experimental',
        'simulated',
        'shadow',
        'planned',
        'unavailable',
      ]).toContain(entry.state);
      expect(entry.trust).toBeGreaterThanOrEqual(0);
      expect(entry.trust).toBeLessThanOrEqual(1);
    }
    expect(list.find((entry) => entry.id === 'nexus.cap.knowledge.assert')?.status).toBe('shadow');
    expect(list.find((entry) => entry.id === 'nexus.cap.monitor.report')?.status).toBe('approved');
  });

  it('no puebla la fábrica cuando la raíz no contiene el árbol', () => {
    const runtime = createNexusRuntime({
      repoRoot: join(REPO_ROOT, 'node_modules'),
      fabricSource: null,
    });
    expect(runtime.capabilityList().length).toBe(0);
    expect(runtime.capabilityNotice).toContain('quedó fuera por procedencia no legible');
  });

  it('describe() expone la fábrica y sus límites declarados', () => {
    const runtime = createNexusRuntime({ repoRoot: REPO_ROOT, fabricSource: null });
    const described = runtime.describe() as unknown as {
      capabilityContracts: Array<{ id: string; state: string }>;
      capabilityNotice: string;
      invariants: string[];
      limitations: string[];
    };
    expect(described.capabilityContracts.length).toBe(4);
    expect(described.invariants.join(' ')).toContain('herramienta enlazada');
    expect(described.limitations.join(' ')).toContain('A4 y A5');
  });

  it('la capacidad de fábrica produce salida real, no un eco del pedido', async () => {
    const runtime = createNexusRuntime({ repoRoot: REPO_ROOT });
    const payload = { query: 'nada coincide en este grafo vacío', limit: 5 };
    const result = await runtime.capabilityExecute(
      'nexus.cap.knowledge.search',
      payload,
      context()
    );
    expect(result.status).toBe('executed');
    expect(result.output).toEqual({ hits: [], count: 0 });
    expect(JSON.stringify(result.output)).not.toContain('nada coincide');
  });

  it('rechaza una entrada fuera de esquema en la fábrica real', async () => {
    const runtime = createNexusRuntime({ repoRoot: REPO_ROOT });
    const result = await runtime.capabilityExecute(
      'nexus.cap.knowledge.search',
      { query: '' },
      context()
    );
    expect(result.code).toBe('CAPABILITY_INPUT_INVALID');
  });
});
