import { describe, expect, it } from 'vitest';
import {
  inspectJurisdiction,
  modulatePrompt,
  generateProvenanceGenome,
  verifyProvenanceGenome,
  describeJurisdictionalGateway,
  describeProvenanceGenome,
  describeCognitiveModulation,
} from '../../src/infinity';

describe('TAMV Native — Jurisdictional Gateway', () => {
  it('redacta PII y bloquea en EU sin consentimiento', () => {
    const r = inspectJurisdiction({ content: 'Mi email es test@test.com', jurisdiction: 'EU' });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('EU_PII_WITHOUT_CONSENT');
    expect(r.redacted).toContain('test@test.com');
    expect(r.sanitized).toContain('[REDACTED]');
    expect(r.sanitizedDigest).toMatch(/^[0-9a-f]{128}$/);
    expect(r.executionPerformed).toBe(false);
  });

  it('permite con redacción en MX', () => {
    const r = inspectJurisdiction({ content: 'Email: a@b.com', jurisdiction: 'MX' });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('PII_REDACTED');
  });

  it('describe el gateway', () => {
    const d = describeJurisdictionalGateway() as { jurisdictions: string[] };
    expect(d.jurisdictions).toContain('MX');
  });
});

describe('TAMV Native — Provenance Genome', () => {
  it('genera hash de 128 chars y verifica', () => {
    const input = { intent: 't', context: 'c', model: 'm', authorDid: 'did:x', timestamp: '2026' };
    const r = generateProvenanceGenome(input);
    expect(r.hash).toHaveLength(128);
    expect(r.executionPerformed).toBe(false);
    expect(verifyProvenanceGenome(r.hash, input)).toBe(true);
    expect(verifyProvenanceGenome('0'.repeat(128), input)).toBe(false);
  });

  it('describe el TPG', () => {
    const d = describeProvenanceGenome() as { hashLength: number };
    expect(d.hashLength).toBe(128);
  });
});

describe('TAMV Native — Cognitive Modulation', () => {
  it('modula el prompt con las 3 capas', () => {
    const r = modulatePrompt('hola', { logic: 0.8, empathy: 0.5, resonance: 0.9 });
    expect(r.modulated).toContain('[TAMV LCM');
    expect(r.modulated).toContain('hola');
    expect(r.executionPerformed).toBe(false);
    expect(r.layers.logic).toBe(0.8);
  });

  it('describe la modulación', () => {
    const d = describeCognitiveModulation() as { layers: string[] };
    expect(d.layers).toEqual(['logic', 'empathy', 'resonance']);
  });
});