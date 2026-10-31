// state: engine-generated — revisión humana pendiente.
import { describe, expect, it } from 'vitest';
import type { Evidence, SkillResult } from '../../src/lib/lib/skills/contracts';
import {
  DISCLOSURE_EVIDENCE,
  MISSING_ADAPTER,
  SKILL_EVIDENCE_GUARD_VERSION,
  claimsExternalObservation,
  guardEvidence,
} from '../../src/lib/lib/skills/skill-evidence-guard';

const CLEAN: Evidence = {
  id: 'ev-clean',
  source: 'Analisis local del artefacto',
  excerpt: 'Se derivaron metricas deterministas desde el input recibido.',
};

const CLAIMING: Evidence = {
  id: 'ev-claim',
  source: 'Firecrawl crawl de https://ejemplo.org',
  excerpt: 'Pagina rastreada y extraida en vivo.',
};

function makeResult(
  overrides: Partial<SkillResult<Record<string, unknown>>> = {}
): SkillResult<Record<string, unknown>> {
  return {
    skillId: 'demo-skill',
    status: 'SUCCESS',
    summary: 'ok',
    data: { rows: 3 },
    evidence: [CLEAN, CLAIMING],
    warnings: [],
    auditEvents: [],
    ...overrides,
  };
}

describe('claimsExternalObservation', () => {
  it('detecta afirmaciones de observacion externa en espanol e ingles', () => {
    expect(claimsExternalObservation('crawl completado del sitio')).toBe(true);
    expect(claimsExternalObservation('monitoreo continuo de produccion')).toBe(true);
    expect(claimsExternalObservation('llamada HTTP saliente a la API')).toBe(true);
    expect(claimsExternalObservation('usamos tavily para verificar')).toBe(true);
  });

  it('no marca el analisis local reproducible', () => {
    expect(claimsExternalObservation('derivar peso de los tokens de entrada')).toBe(false);
    expect(claimsExternalObservation('')).toBe(false);
  });
});

describe('guardEvidence', () => {
  it('deja pasar intacto un resultado sin afirmaciones externas', () => {
    const source = makeResult({ evidence: [CLEAN] });
    const { result, suppressed } = guardEvidence(source);
    expect(suppressed).toEqual([]);
    expect(result).toBe(source);
    expect(result.status).toBe('SUCCESS');
  });

  it('no borra evidencia cuando un adaptador autorizado la attestó', () => {
    const source = makeResult();
    const { result, suppressed } = guardEvidence(source, { adapterAttested: true });
    expect(suppressed).toEqual([]);
    expect(result.evidence).toHaveLength(2);
    expect(result.status).toBe('SUCCESS');
  });

  it('retira la evidencia no attestable y degrada el estado a BLOCKED', () => {
    const source = makeResult();
    const { result, suppressed } = guardEvidence(source, { actorId: 'service:mcp' });

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].evidenceId).toBe('ev-claim');
    expect(result.evidence.map((item) => item.id)).toEqual(['ev-clean']);
    expect(result.status).toBe('BLOCKED');
    expect(result.requiresHumanReview).toBe(true);
    expect(result.summary).toContain(MISSING_ADAPTER);
    expect(result.warnings).toContain(DISCLOSURE_EVIDENCE);
  });

  it('conserva la trazabilidad de la resta en data y en auditoria', () => {
    const source = makeResult({ status: 'PARTIAL' });
    const { result } = guardEvidence(source);

    expect(result.data).toMatchObject({
      rows: 3,
      guardVersion: SKILL_EVIDENCE_GUARD_VERSION,
      originalStatus: 'PARTIAL',
      missingAdapters: [MISSING_ADAPTER],
    });
    expect(result.data.suppressedClaims).toHaveLength(1);

    const blocked = result.auditEvents.filter((event) => event.type === 'SKILL_BLOCKED');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].skillId).toBe('demo-skill');
  });

  it('respeta un estado terminal: FAILED no se reetiqueta como BLOCKED', () => {
    const { result } = guardEvidence(makeResult({ status: 'FAILED' }));
    expect(result.status).toBe('FAILED');
    expect(result.data.originalStatus).toBe('FAILED');
  });

  it('es determinista en el veredicto: la misma entrada produce la misma resta', () => {
    // Los auditEvents llevan UUID y timestamp propios; lo que debe ser estable es
    // el veredicto de la compuerta, no la identidad del evento.
    const shape = (result: SkillResult<Record<string, unknown>>) =>
      JSON.stringify({
        status: result.status,
        summary: result.summary,
        data: result.data,
        evidence: result.evidence,
        warnings: result.warnings,
        blocked: result.auditEvents
          .filter((event) => event.type === 'SKILL_BLOCKED')
          .map((event) => event.payload),
      });
    expect(shape(guardEvidence(makeResult()).result)).toBe(
      shape(guardEvidence(makeResult()).result)
    );
  });

  it('no muta el resultado de la skill', () => {
    const source = makeResult();
    guardEvidence(source);
    expect(source.status).toBe('SUCCESS');
    expect(source.evidence).toHaveLength(2);
    expect(source.warnings).toEqual([]);
  });
});
