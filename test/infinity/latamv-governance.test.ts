import { describe, expect, it } from 'vitest';
import {
  LATAMV_CONTROL_IDS,
  assessLatamv,
  listLatamvPacks,
  type LatamvAssessmentInput,
} from '../../src/infinity/latamv-governance';

const completeInput: LatamvAssessmentInput = {
  assessmentId: 'assessment-001',
  systemName: 'Example assistant',
  systemVersion: '1.2.0',
  jurisdictions: ['EU', 'MX'],
  assessedAt: '2026-11-24T12:00:00.000Z',
  controls: LATAMV_CONTROL_IDS.map((controlId) => ({
    controlId,
    status: 'implemented',
    evidenceRefs: [`https://evidence.example/${controlId}`],
  })),
};

describe('LATAMV governance assessment', () => {
  it('lists all supported packs as draft and requiring review', () => {
    const packs = listLatamvPacks();
    expect(packs.map((pack) => pack.id)).toEqual(['EU', 'US', 'CN', 'LATAM', 'MX', 'SV']);
    expect(packs.every((pack) => pack.reviewRequired)).toBe(true);
    expect(packs.every((pack) => pack.maturity === 'draft-needs-primary-source-review')).toBe(true);
  });

  it('builds an unsigned, non-production PEV from the eight declared controls', () => {
    const result = assessLatamv(completeInput);
    expect(result.summary).toMatchObject({
      totalControls: 8,
      completeForReview: 8,
      completenessPercent: 100,
      state: 'READY_FOR_HUMAN_REVIEW',
    });
    expect(result.claims).toEqual({
      legalConformity: 'NOT_ASSESSED',
      evidenceAuthenticity: 'NOT_VERIFIED',
      signature: 'UNSIGNED',
      persistence: 'NOT_PERSISTED',
    });
    expect(result.executionPerformed).toBe(false);
    expect(result.production).toBe(false);
    expect(result.hash.value).toHaveLength(128);
  });

  it('keeps missing evidence and gaps incomplete instead of implying conformity', () => {
    const result = assessLatamv({
      ...completeInput,
      controls: [
        { controlId: 'C1_RISK_ASSESSMENT', status: 'implemented' },
        { controlId: 'C2_HUMAN_OVERSIGHT', status: 'gap', evidenceRefs: ['https://evidence.example/gap'] },
      ],
    });
    expect(result.summary.state).toBe('INCOMPLETE');
    expect(result.summary.completeForReview).toBe(0);
    expect(result.summary.evidenceMissing).toBe(1);
    expect(result.summary.open).toBe(7);
    expect(result.claims.legalConformity).toBe('NOT_ASSESSED');
  });

  it('hashes normalized data deterministically regardless of order', () => {
    const first = assessLatamv(completeInput);
    const second = assessLatamv({
      ...completeInput,
      jurisdictions: [...completeInput.jurisdictions].reverse(),
      controls: [...completeInput.controls].reverse(),
    });
    expect(first.hash.value).toBe(second.hash.value);
  });

  it('rejects duplicate controls, unsupported packs, and malformed dates', () => {
    expect(() => assessLatamv({
      ...completeInput,
      controls: [completeInput.controls[0], completeInput.controls[0]],
    })).toThrow(/duplicado/);
    expect(() => assessLatamv({ ...completeInput, jurisdictions: ['UNKNOWN'] })).toThrow(/no soportado/);
    expect(() => assessLatamv({ ...completeInput, assessedAt: 'not-a-date' })).toThrow(/fecha ISO/);
  });
});
