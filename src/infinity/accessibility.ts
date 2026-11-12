/**
 * ISABELLA VILLASEÑOR AI™ — Accessibility Contract Fabric.
 * state: draft | engine-generated.
 *
 * Checklist determinista de accesibilidad (contrato a11y). No ejecuta auditorías
 * reales sobre el DOM; evalúa una declaración de atributos y devuelve un
 * reporte con hallazgos. `auditPerformed` es siempre `false`.
 */
import { digest, SkillInputError } from './skills';

export const A11Y_CHECKS = [
  'lang-declared',
  'heading-order',
  'alt-text',
  'focus-visible',
  'color-contrast',
  'keyboard-nav',
  'aria-labels',
  'reduced-motion',
] as const;
export type A11yCheck = (typeof A11Y_CHECKS)[number];

export interface A11yDeclaration {
  readonly langDeclared?: boolean;
  readonly headingOrder?: boolean;
  readonly altText?: boolean;
  readonly focusVisible?: boolean;
  readonly colorContrast?: boolean;
  readonly keyboardNav?: boolean;
  readonly ariaLabels?: boolean;
  readonly reducedMotion?: boolean;
}

export interface A11yFinding {
  readonly id: A11yCheck;
  readonly ok: boolean;
  readonly severity: 'pass' | 'warn' | 'fail';
  readonly message: string;
}

export interface A11yReport {
  readonly status: 'PASS' | 'WARN' | 'FAIL';
  readonly findings: readonly A11yFinding[];
  readonly score: number;
  readonly auditPerformed: false;
  readonly executionPerformed: false;
  readonly digest: string;
  readonly note: string;
}

const MESSAGES: Readonly<Record<A11yCheck, string>> = {
  'lang-declared': 'El atributo lang debe declararse en el documento.',
  'heading-order': 'Los encabezados deben seguir un orden jerárquico.',
  'alt-text': 'Las imágenes deben tener texto alternativo.',
  'focus-visible': 'El foco debe ser visible.',
  'color-contrast': 'El contraste debe cumplir WCAG AA.',
  'keyboard-nav': 'La navegación por teclado debe estar soportada.',
  'aria-labels': 'Los controles deben tener etiquetas accesibles.',
  'reduced-motion': 'Debe respetarse prefers-reduced-motion.',
};

export function evaluateA11y(declaration: unknown): A11yReport {
  if (typeof declaration !== 'object' || declaration === null || Array.isArray(declaration)) {
    throw new SkillInputError('INVALID_DECLARATION', 'declaration debe ser objeto');
  }
  const input = declaration as A11yDeclaration;

  const findings: A11yFinding[] = A11Y_CHECKS.map((check) => {
    const key = check.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof A11yDeclaration;
    // map check id to property name
    const propertyMap: Readonly<Record<A11yCheck, keyof A11yDeclaration>> = {
      'lang-declared': 'langDeclared',
      'heading-order': 'headingOrder',
      'alt-text': 'altText',
      'focus-visible': 'focusVisible',
      'color-contrast': 'colorContrast',
      'keyboard-nav': 'keyboardNav',
      'aria-labels': 'ariaLabels',
      'reduced-motion': 'reducedMotion',
    };
    const property = propertyMap[check];
    const ok = input[property] === true;
    return {
      id: check,
      ok,
      severity: ok ? 'pass' : 'warn',
      message: MESSAGES[check],
    };
  });

  const passed = findings.filter((finding) => finding.ok).length;
  const score = Math.round((passed / findings.length) * 100);
  const status: A11yReport['status'] =
    passed === findings.length ? 'PASS' : passed >= findings.length / 2 ? 'WARN' : 'FAIL';

  return {
    status,
    findings,
    score,
    auditPerformed: false,
    executionPerformed: false,
    digest: digest({ declaration: input, findings }),
    note: 'Checklist declarativo: no se auditó el DOM real.',
  };
}

export function isA11yCheck(value: unknown): value is A11yCheck {
  return typeof value === 'string' && (A11Y_CHECKS as readonly string[]).includes(value);
}

export function describeA11y(): Readonly<Record<string, unknown>> {
  return {
    checks: A11Y_CHECKS,
    auditPerformed: false,
    executionPerformed: false,
    note: 'El reporte evalúa una declaración; no audita el DOM.',
  };
}
