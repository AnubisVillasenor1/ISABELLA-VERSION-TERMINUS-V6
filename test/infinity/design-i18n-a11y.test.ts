import { describe, expect, it } from 'vitest';
import {
  generateDesignTokens,
  isDesignPalette,
  describeDesignTokens,
  translate,
  selectLocale,
  describeI18n,
  evaluateA11y,
  describeA11y,
} from '../../src/infinity';

describe('Design Token Fabric', () => {
  it('genera tokens y CSS sin aplicarlos a la UI', () => {
    const set = generateDesignTokens('gothic', 'dark');
    expect(set.palette).toBe('gothic');
    expect(set.uiApplied).toBe(false);
    expect(set.executionPerformed).toBe(false);
    expect(set.css).toContain('--is-bg');
    expect(set.json['--is-bg']).toBe('#0b0b10');
    expect(set.digest).toMatch(/^[0-9a-f]{128}$/);
  });

  it('rechaza una paleta desconocida', () => {
    expect(() => generateDesignTokens('rainbow')).toThrow();
  });

  it('describe las paletas', () => {
    const d = describeDesignTokens() as { palettes: string[]; uiApplied: boolean };
    expect(d.palettes).toContain('neutral');
    expect(d.uiApplied).toBe(false);
  });

  it('isDesignPalette valida', () => {
    expect(isDesignPalette('matcha')).toBe(true);
    expect(isDesignPalette('nope')).toBe(false);
  });
});

describe('I18N Fabric', () => {
  it('traduce con variables y fallback a es-MX', () => {
    expect(translate('en', 'status.ready')).toBe('Ready');
    expect(translate('xx', 'status.ready')).toBe('Listo');
    expect(translate('en', 'media.pixelsModified', { count: 3 })).toBe('Pixels modified: 3');
  });

  it('selecciona locale', () => {
    expect(selectLocale('pt-BR')).toBe('pt-BR');
    expect(selectLocale('nope')).toBe('es-MX');
  });

  it('describe i18n', () => {
    const d = describeI18n() as { native: string; autoTranslation: boolean };
    expect(d.native).toBe('es-MX');
    expect(d.autoTranslation).toBe(false);
  });
});

describe('Accessibility Fabric', () => {
  it('evalúa una declaración y no audita el DOM', () => {
    const r = evaluateA11y({ langDeclared: true, headingOrder: true, altText: false });
    expect(r.auditPerformed).toBe(false);
    expect(r.executionPerformed).toBe(false);
    expect(r.score).toBeLessThan(100);
    expect(r.findings.find((f) => f.id === 'alt-text')?.ok).toBe(false);
  });

  it('describe a11y', () => {
    const d = describeA11y() as { auditPerformed: boolean };
    expect(d.auditPerformed).toBe(false);
  });
});