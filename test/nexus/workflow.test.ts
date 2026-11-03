// state: draft | engine-generated — pruebas del motor de workflows Nexus.
import { describe, expect, it } from 'vitest';
import { NexusWorkflowEngine, type WorkflowDefinition } from '../../src/nexus/workflow';

describe('NexusWorkflowEngine', () => {
  it('rechaza ciclos antes de ejecutar', () => {
    const engine = new NexusWorkflowEngine();
    expect(() =>
      engine.register({
        id: 'wf.cycle',
        steps: [
          { id: 'a', dependsOn: ['b'], run: async () => 1 },
          { id: 'b', dependsOn: ['a'], run: async () => 2 },
        ],
      })
    ).toThrow('WORKFLOW_CYCLE_DETECTED');
  });

  it('ejecuta en orden topológico y expone resultados', async () => {
    const engine = new NexusWorkflowEngine();
    const order: string[] = [];
    const definition: WorkflowDefinition = {
      id: 'wf.order',
      steps: [
        {
          id: 'second',
          dependsOn: ['first'],
          run: async ({ results }) => {
            order.push('second');
            return (results.first as number) * 2;
          },
        },
        {
          id: 'first',
          run: async () => {
            order.push('first');
            return 21;
          },
        },
      ],
    };
    engine.register(definition);
    const result = await engine.run('wf.order');
    expect(result.status).toBe('completed');
    expect(result.ok).toBe(true);
    expect(order).toEqual(['first', 'second']);
    expect(result.results.second).toBe(42);
    expect(result.evidenceHash).toHaveLength(64);
  });

  it('compensa en orden inverso cuando un paso falla', async () => {
    const engine = new NexusWorkflowEngine();
    const compensated: string[] = [];
    engine.register({
      id: 'wf.saga',
      steps: [
        {
          id: 'a',
          run: async () => 'a',
          compensate: async () => {
            compensated.push('a');
          },
        },
        {
          id: 'b',
          dependsOn: ['a'],
          run: async () => 'b',
          compensate: async () => {
            compensated.push('b');
          },
        },
        {
          id: 'c',
          dependsOn: ['b'],
          run: async () => {
            throw new Error('boom');
          },
        },
      ],
    });
    const result = await engine.run('wf.saga');
    expect(result.ok).toBe(false);
    expect(result.status).toBe('compensated');
    expect(compensated).toEqual(['b', 'a']);
    expect(result.steps.find((step) => step.id === 'c')?.status).toBe('failed');
  });

  it('reintenta pasos con fallo transitorio', async () => {
    const engine = new NexusWorkflowEngine();
    let attempts = 0;
    engine.register({
      id: 'wf.retry',
      steps: [
        {
          id: 'flaky',
          maxAttempts: 2,
          run: async ({ attempt }) => {
            attempts = attempt;
            if (attempt === 1) throw new Error('transitorio');
            return 'ok';
          },
        },
      ],
    });
    const result = await engine.run('wf.retry');
    expect(result.status).toBe('completed');
    expect(attempts).toBe(2);
  });

  it('rechaza un workflow desconocido sin lanzar', async () => {
    const engine = new NexusWorkflowEngine();
    const result = await engine.run('wf.missing');
    expect(result.status).toBe('rejected');
    expect(result.error).toBe('WORKFLOW_NOT_FOUND');
  });
});
