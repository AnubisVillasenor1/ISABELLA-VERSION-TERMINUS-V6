import { describe, expect, it } from 'vitest';
import {
  auditArchitecture,
  auditCatalog,
  catalogByKind,
  CATALOG,
  FABRICS,
  OMEGA_LAYERS,
  summarizeArchitecture,
  summarizeCatalog,
} from '../../src/infinity';
import { auditArchitecture as auditArchitectureDirect } from '../../src/infinity/architecture';
import { auditCatalog as auditCatalogDirect } from '../../src/infinity/catalog';

describe('Master Consolidated — 14 capas Ω + 9 Fabrics', () => {
  it('declares exactly fourteen layers and nine fabrics', () => {
    expect(OMEGA_LAYERS).toHaveLength(14);
    expect(FABRICS).toHaveLength(9);
    expect(OMEGA_LAYERS.map((layer) => layer.id)).toContain('Ω-14');
    expect(FABRICS.map((fabric) => fabric.id)).toEqual([
      'cognition',
      'memory',
      'agent',
      'governance',
      'model',
      'mcp',
      'evolution',
      'build',
      'bookpi',
    ]);
  });

  it('summarizes without claiming production', () => {
    const summary = summarizeArchitecture();
    expect(summary.layers).toBe(14);
    expect(summary.fabrics).toBe(9);
    expect(summary.production).toBe(false);
    expect(summary.byState.tested).toBeGreaterThan(0);
  });

  it('passes its own audit and never claims production', () => {
    const report = auditArchitecture();
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(OMEGA_LAYERS.some((layer) => layer.state === 'production')).toBe(false);
    expect(FABRICS.some((fabric) => fabric.state === 'production')).toBe(false);
  });

  it('keeps the audit functions exported from the subsystem index', () => {
    expect(auditArchitectureDirect).toBe(auditArchitecture);
    expect(auditCatalogDirect).toBe(auditCatalog);
  });
});

describe('Master Consolidated — catálogo integral', () => {
  it('registers ten skills, eighteen tools, fourteen primitives and twelve services', () => {
    expect(catalogByKind('skill')).toHaveLength(10);
    expect(catalogByKind('tool')).toHaveLength(18);
    expect(catalogByKind('primitive')).toHaveLength(14);
    expect(catalogByKind('service')).toHaveLength(12);
    expect(CATALOG).toHaveLength(54);

    const summary = summarizeCatalog();
    expect(summary.total).toBe(54);
    expect(summary.production).toBe(false);
    expect(summary.byKind).toEqual({ skill: 10, tool: 18, primitive: 14, service: 12 });
  });

  it('declares the ten native skills as tested with evidence', () => {
    const skills = catalogByKind('skill');
    expect(skills.map((skill) => skill.id)).toEqual([
      'IV_Research',
      'IV_MusicStudio',
      'IV_VoiceStudio',
      'IV_LegalResearch',
      'IV_Bibliometrics',
      'IV_OpenScience',
      'IV_Governance',
      'IV_PromptEngineering',
      'IV_Multimodal',
      'IV_KnowledgeIngestion',
    ]);
    for (const skill of skills) {
      expect(skill.state).toBe('tested');
      expect(skill.module).toBe('src/infinity/skills.ts');
      expect(skill.evidence.length).toBeGreaterThan(0);
      expect(skill.execution).toBe('deterministic');
    }
  });

  it('marks unimplemented tools as mapped without a module', () => {
    const mapped = CATALOG.filter((entry) => entry.state === 'mapped');
    expect(mapped.length).toBeGreaterThanOrEqual(6);
    for (const entry of mapped) {
      expect(entry.module).toBeNull();
      expect(entry.execution).toBe('none');
    }
  });

  it('passes its own audit', () => {
    const report = auditCatalog();
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('marks payment.execute as human-only and never executed by this surface', () => {
    const payment = CATALOG.find((entry) => entry.id === 'payment.execute');
    expect(payment?.execution).toBe('human');
    expect(payment?.state).toBe('implemented');
  });
});
