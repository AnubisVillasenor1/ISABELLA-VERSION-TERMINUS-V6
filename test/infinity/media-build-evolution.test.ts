import { describe, expect, it } from 'vitest';
import {
  createCapsule,
  evaluateA2A,
  EvolutionFabric,
  EvolutionLedger,
  evolvePopulation,
  geneticDiversityIndex,
  MAX_POPULATION,
  parseBuildFiles,
  planBuild,
  runMediaOperation,
  SkillInputError,
} from '../../src/infinity';

const GENES = [
  { id: 'memory.depth', value: 1 },
  { id: 'governance.strictness', value: 0 },
];

describe('Sovereign Media Fabric', () => {
  it('culls declared candidates without inspecting pixels', () => {
    const result = runMediaOperation('cull', {
      keepRatio: 0.5,
      candidates: [
        { id: 'a', sharpness: 0.9, exposure: 0.9 },
        { id: 'b', sharpness: 0.5, exposure: 0.5, duplicateGroup: 'g1' },
        { id: 'c', sharpness: 0.4, exposure: 0.4, duplicateGroup: 'g1' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.output.kept).toEqual(['a', 'b']);
    expect(result.output.modelUsed).toBe(false);
    expect(result.pixelsModified).toBe(false);
    expect(result.networkUsed).toBe(false);
  });

  it('learns a style centroid from declared features only', () => {
    const learned = runMediaOperation('style-learn', {
      samples: [
        { id: 's1', features: [1, 0, 0] },
        { id: 's2', features: [0, 1, 0] },
      ],
    });
    expect(learned.ok).toBe(true);
    const profile = learned.output.profile as { centroid: number[]; dispersion: number };
    expect(profile.centroid).toEqual([0.5, 0.5, 0]);
    expect(profile.dispersion).toBe(0.292893);
    expect(learned.output.styleLearnedFromPixels).toBe(false);

    const scored = runMediaOperation('style-score', {
      profile,
      threshold: 0.7,
      items: [{ id: 'i1', features: [1, 0, 0] }],
    });
    expect(scored.ok).toBe(true);
    const items = scored.output.items as Array<{ match: boolean }>;
    expect(items[0]?.match).toBe(true);
  });

  it('returns a bounded retouch plan and never mutates pixels', () => {
    const result = runMediaOperation('retouch-plan', {
      metadata: { exposureEv: -2, contrast: 50, temperatureK: 3_500 },
    });
    expect(result.ok).toBe(true);
    expect(result.output.pixelsModified).toBe(false);
    const plan = result.output.plan as {
      exposureEv: number;
      contrast: number;
      temperatureShift: number;
    };
    expect(plan.exposureEv).toBe(1);
    expect(plan.contrast).toBe(-15);
    expect(plan.temperatureShift).toBe(20);
  });

  it('builds a proofing manifest without publishing it', () => {
    const result = runMediaOperation('gallery', {
      galleryId: 'g-1',
      title: 'Boda',
      expiresAt: '2026-12-31T00:00:00.000Z',
      items: [{ id: 'p1', hash: 'abc' }],
    });
    expect(result.ok).toBe(true);
    expect(result.output.published).toBe(false);
    expect(result.output.publicUrl).toBeNull();
    const items = result.output.items as Array<{ proofingToken: string }>;
    expect(items[0]?.proofingToken).toMatch(/^[0-9a-f]{128}$/);
  });

  it('quotes print work with the Profit Guard and never charges', () => {
    const result = runMediaOperation('print-quote', {
      items: [
        { id: 'p1', cost: 100, marginBps: 2_500, qty: 2 },
        { id: 'p2', cost: 50, marginBps: 0, qty: 1 },
      ],
    });
    expect(result.ok).toBe(true);
    const items = result.output.items as Array<{
      id: string;
      unitPrice: number;
      lineProfit: number;
    }>;
    expect(items[0]?.unitPrice).toBe(125);
    expect(items[1]?.unitPrice).toBe(50);
    expect(result.output.totalProfit).toBeGreaterThan(0);
    expect(result.output.charged).toBe(false);
    expect(result.output.paymentExecuted).toBe(false);
    expect(result.pixelsModified).toBe(false);
  });

  it('clusters provided face embeddings without detecting faces', () => {
    const result = runMediaOperation('face-index', {
      threshold: 0.9,
      faces: [
        { id: 'f1', vector: [1, 0, 0] },
        { id: 'f2', vector: [0.99, 0.01, 0] },
        { id: 'f3', vector: [0, 1, 0] },
      ],
    });
    expect(result.ok).toBe(true);
    const clusters = result.output.clusters as Array<{ members: string[] }>;
    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.members).toEqual(['f1', 'f2']);
    expect(result.output.detectionPerformed).toBe(false);
  });

  it('rejects an unknown media operation', () => {
    const result = runMediaOperation('upscale');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('UNKNOWN_OPERATION');
    expect(result.pixelsModified).toBe(false);
    expect(result.networkUsed).toBe(false);
  });
});

describe('Build Fabric', () => {
  const previewFiles = parseBuildFiles([
    { path: 'package.json', bytes: 200 },
    { path: 'src/index.ts', bytes: 500 },
  ]);

  it('plans a preview without executing any step', () => {
    const plan = planBuild({
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'preview',
      files: previewFiles,
    });
    expect(plan.status).toBe('PLANNED');
    expect(plan.executionPerformed).toBe(false);
    expect(plan.sandboxWritten).toBe(false);
    expect(plan.deploymentPerformed).toBe(false);
    expect(plan.networkUsed).toBe(false);
    expect(plan.production).toBe(false);
    expect(plan.steps.every((step) => step.executed === false)).toBe(true);
    expect(plan.steps.map((step) => step.id)).toContain('preview.publish');
    expect(plan.warnings.some((warning) => warning.includes('prueba'))).toBe(true);
  });

  it('blocks staging without verified approval and allows it with a lockfile', () => {
    const files = parseBuildFiles([
      { path: 'pnpm-lock.yaml', bytes: 100 },
      { path: 'src/index.ts', bytes: 500 },
    ]);
    const blocked = planBuild({
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'staging',
      files,
    });
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.blockedReasons).toContain('HUMAN_APPROVAL_REQUIRED');
    expect(blocked.approvalSource).toBe('none');
    expect(blocked.steps.find((step) => step.id === 'deploy.request')?.status).toBe('BLOCKED');

    const approved = planBuild({
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'staging',
      files,
      approvalGranted: true,
    });
    expect(approved.status).toBe('PLANNED');
    expect(approved.approvalSource).toBe('verified-admin-token');
    expect(approved.deploymentPerformed).toBe(false);
  });

  it('requires tests and a lockfile for production', () => {
    const files = parseBuildFiles([
      { path: 'pnpm-lock.yaml', bytes: 100 },
      { path: 'src/index.ts', bytes: 500 },
    ]);
    const plan = planBuild({
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'production',
      files,
      approvalGranted: true,
    });
    expect(plan.status).toBe('BLOCKED');
    expect(plan.blockedReasons).toContain('TESTS_REQUIRED_FOR_PRODUCTION');
  });

  it('rejects traversal, duplicates and commands outside the allowlist', () => {
    expect(() => parseBuildFiles([{ path: '../escape.ts', bytes: 10 }])).toThrow(SkillInputError);
    expect(() =>
      parseBuildFiles([
        { path: 'a.ts', bytes: 10 },
        { path: 'a.ts', bytes: 10 },
      ])
    ).toThrow(SkillInputError);

    expect(() =>
      planBuild({
        workspaceId: 'ws-1',
        projectName: 'demo',
        runtime: 'node',
        target: 'preview',
        files: previewFiles,
        commands: ['rm -rf /'],
      })
    ).toThrow(SkillInputError);
  });

  it('rejects a build with no files', () => {
    expect(() => parseBuildFiles([])).toThrow(SkillInputError);
  });
});

describe('Evolution Fabric', () => {
  it('creates deterministic capsules with weighted fitness', () => {
    const capsule = createCapsule({
      label: 'alpha',
      genes: GENES,
      signals: { quality: 1, evidence: 1, safety: 1, costEfficiency: 1 },
    });
    expect(capsule.id).toMatch(/^capsule-[0-9a-f]{16}$/);
    expect(capsule.fitness.score).toBe(1);
    const weak = createCapsule({
      label: 'beta',
      genes: GENES,
      signals: { quality: 0.5, evidence: 0.5, safety: 0.5, costEfficiency: 0.5 },
    });
    expect(weak.fitness.score).toBe(0.5);
    const twin = createCapsule({
      label: 'alpha',
      genes: GENES,
      signals: { quality: 1, evidence: 1, safety: 1, costEfficiency: 1 },
    });
    expect(twin.id).toBe(capsule.id);
  });

  it('measures genetic diversity over declared genes', () => {
    const same = [
      createCapsule({ label: 'a', genes: GENES }),
      createCapsule({ label: 'b', genes: GENES }),
    ];
    expect(geneticDiversityIndex(same)).toBe(0);
    const opposite = [
      createCapsule({
        label: 'a',
        genes: [
          { id: 'x', value: 1 },
          { id: 'y', value: 0 },
        ],
      }),
      createCapsule({
        label: 'b',
        genes: [
          { id: 'x', value: 0 },
          { id: 'y', value: 1 },
        ],
      }),
    ];
    expect(geneticDiversityIndex(opposite)).toBe(1);
  });

  it('simulates evolution deterministically without publishing or executing', () => {
    const request = {
      population: [
        {
          label: 'a',
          genes: GENES,
          signals: { quality: 0.9, evidence: 0.8, safety: 0.9, costEfficiency: 0.5 },
        },
        {
          label: 'b',
          genes: [
            { id: 'memory.depth', value: 0.4 },
            { id: 'governance.strictness', value: 0.8 },
          ],
          signals: { quality: 0.5, evidence: 0.5, safety: 0.9, costEfficiency: 0.8 },
        },
      ],
      generations: 2,
      populationSize: 4,
      mutationRate: 0.1,
      selectionPressure: 0.5,
      seed: 'isabella',
    };
    const first = evolvePopulation(request);
    const second = evolvePopulation(request);
    expect(first.digest).toBe(second.digest);
    expect(first.status).toBe('SIMULATED');
    expect(first.generations).toHaveLength(2);
    expect(first.survivors).toHaveLength(4);
    expect(first.executionPerformed).toBe(false);
    expect(first.published).toBe(false);
    expect(first.creditsIssued).toBe(false);
    expect(first.adoptionPerformed).toBe(false);
    expect(first.production).toBe(false);
  });

  it('rejects an excessive mutation rate and an oversized population', () => {
    const population = Array.from({ length: MAX_POPULATION + 1 }, (_, index) => ({
      label: `c${index}`,
      genes: GENES,
    }));
    expect(() => evolvePopulation({ population })).toThrow(SkillInputError);
    expect(() =>
      evolvePopulation({ population: population.slice(0, 2), mutationRate: 0.9 })
    ).toThrow(SkillInputError);
  });

  it('evaluates A2A verbs without adopting or executing', () => {
    expect(evaluateA2A('describe').verdict).toBe('ALLOW');
    expect(evaluateA2A('adopt').verdict).toBe('ESCALATE');
    const adopted = evaluateA2A('adopt', true);
    expect(adopted.verdict).toBe('ALLOW');
    expect(adopted.adoptionPerformed).toBe(false);
    expect(evaluateA2A('destroy').verdict).toBe('DENY');
  });

  it('keeps an in-memory append-only event chain', () => {
    const ledger = new EvolutionLedger();
    ledger.append('one', { a: 1 });
    ledger.append('two', { b: 2 });
    expect(ledger.size()).toBe(2);
    expect(ledger.verify()).toBe(true);
    const events = ledger.list();
    expect(events[1]?.prevHash).toBe(events[0]?.hash);
    expect(events[0]?.prevHash).toBe('0'.repeat(128));
  });

  it('records an evolution event in the fabric ledger', () => {
    const fabric = new EvolutionFabric();
    const result = fabric.evolve({
      population: [
        { label: 'a', genes: GENES },
        { label: 'b', genes: GENES },
      ],
      seed: 'ledger',
      now: '2026-11-01T00:00:00.000Z',
    });
    expect(result.ledgerSize).toBe(1);
    expect(result.ledgerValid).toBe(true);
    expect(result.event.type).toBe('evolution.simulated');
    expect(fabric.verify()).toBe(true);
  });
});
