/**
 * ISABELLA VILLASEÑOR AI™ — Native Code Analysis Skill.
 * state: draft | engine-generated.
 *
 * Analiza código fuente de forma determinista (sin modelo, sin red):
 * - Conteo de líneas, funciones, clases, imports.
 * - Detección de patrones (TODO, FIXME, any, console.log).
 * - Complejidad ciclomática básica (if/for/while/switch/catch).
 * - Reporte de deuda técnica.
 */
import { digest, SkillInputError } from './skills';

export interface CodeAnalysisResult {
  readonly lines: { total: number; code: number; comments: number; blank: number };
  readonly functions: number;
  readonly classes: number;
  readonly imports: number;
  readonly exports: number;
  readonly patterns: {
    readonly todo: number;
    readonly fixme: number;
    readonly anyType: number;
    readonly consoleLog: number;
    readonly evalUsage: number;
  };
  readonly complexity: { readonly cyclomatic: number; readonly maxNesting: number };
  readonly debtScore: number; // 0-100, lower is better
  readonly digest: string;
  readonly executionPerformed: false;
  readonly networkUsed: false;
}

export function analyzeCode(source: string): CodeAnalysisResult {
  if (typeof source !== 'string') throw new SkillInputError('INVALID_INPUT', 'source debe ser string');
  const lines = source.split('\n');
  let code = 0, comments = 0, blank = 0;
  let functions = 0, classes = 0, imports = 0, exports = 0;
  let todo = 0, fixme = 0, anyType = 0, consoleLog = 0, evalUsage = 0;
  let cyclomatic = 1, maxNesting = 0, currentNesting = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Patterns (checked before comment classification)
    if (/TODO/i.test(trimmed)) todo++;
    if (/FIXME/i.test(trimmed)) fixme++;
    if (/: any\b/.test(trimmed) || /<any>/.test(trimmed)) anyType++;
    if (/console\.log/.test(trimmed)) consoleLog++;
    if (/\beval\s*\(/.test(trimmed)) evalUsage++;

    if (!trimmed) { blank++; continue; }
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) { comments++; continue; }
    code++;

    // Structure
    if (/\bfunction\b|\b=>\s*\{/.test(trimmed)) functions++;
    if (/\bclass\b/.test(trimmed)) classes++;
    if (/^import\b/.test(trimmed)) imports++;
    if (/^export\b/.test(trimmed)) exports++;

    // Complexity
    if (/\bif\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\bcase\b/.test(trimmed)) cyclomatic++;
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    currentNesting += openBraces - closeBraces;
    if (currentNesting > maxNesting) maxNesting = currentNesting;
  }

  // Debt score: 0 = no debt, 100 = max debt
  const debtFactors = todo * 5 + fixme * 10 + anyType * 3 + consoleLog * 2 + evalUsage * 20 + Math.max(0, cyclomatic - 20) * 2;
  const debtScore = Math.min(100, debtFactors);

  return {
    lines: { total: lines.length, code, comments, blank },
    functions,
    classes,
    imports,
    exports,
    patterns: { todo, fixme, anyType, consoleLog, evalUsage },
    complexity: { cyclomatic, maxNesting: Math.max(0, maxNesting) },
    debtScore,
    digest: digest(source),
    executionPerformed: false,
    networkUsed: false,
  };
}

export function describeCodeAnalysis(): Readonly<Record<string, unknown>> {
  return {
    metrics: ['lines', 'functions', 'classes', 'imports', 'exports', 'patterns', 'complexity', 'debtScore'],
    patterns: ['TODO', 'FIXME', 'any', 'console.log', 'eval'],
    executionPerformed: false,
    networkUsed: false,
    note: 'Análisis estático determinista; no ejecuta el código.',
  };
}