/**
 * ISABELLA VILLASEÑOR AI™ — Design Token Fabric.
 * state: draft | engine-generated.
 *
 * Fuente de inspiración: astryx (paletas neutral, stone, gothic, matcha, butter,
 * y2k y generadores de referencias). Todo es determinista y local:
 *   - las paletas son datos declarados, no se generan con un modelo;
 *   - el generador emite variables CSS y un objeto JSON;
 *   - `uiApplied` es siempre `false`: aplicar los tokens a la interfaz exige
 *     aprobación humana y un despliegue real.
 *
 * No se copia código de astryx: las paletas se redefinen aquí como datos.
 */
import { digest, SkillInputError } from './skills';

export const DESIGN_PALETTES = [
  'neutral',
  'stone',
  'gothic',
  'matcha',
  'butter',
  'y2k',
] as const;
export type DesignPalette = (typeof DESIGN_PALETTES)[number];

export interface DesignToken {
  readonly name: string;
  readonly value: string;
  readonly kind: 'color' | 'space' | 'radius' | 'font' | 'shadow';
}

export interface DesignTokenSet {
  readonly palette: DesignPalette;
  readonly mode: 'light' | 'dark';
  readonly tokens: readonly DesignToken[];
  readonly css: string;
  readonly json: Readonly<Record<string, string>>;
  readonly digest: string;
  readonly uiApplied: false;
  readonly executionPerformed: false;
}

const PALETTES: Readonly<Record<DesignPalette, Readonly<Record<string, string>>>> = {
  neutral: {
    '--is-bg': '#fafafa',
    '--is-fg': '#0a0a0a',
    '--is-accent': '#171717',
    '--is-muted': '#737373',
    '--is-border': '#e5e5e5',
  },
  stone: {
    '--is-bg': '#fafaf9',
    '--is-fg': '#1c1917',
    '--is-accent': '#44403c',
    '--is-muted': '#78716c',
    '--is-border': '#e7e5e4',
  },
  gothic: {
    '--is-bg': '#0b0b10',
    '--is-fg': '#e8e6f0',
    '--is-accent': '#7c3aed',
    '--is-muted': '#9ca3af',
    '--is-border': '#2a2a3a',
  },
  matcha: {
    '--is-bg': '#f6fbf4',
    '--is-fg': '#1a2e1a',
    '--is-accent': '#2f6f3e',
    '--is-muted': '#6b8e6b',
    '--is-border': '#d6e6d2',
  },
  butter: {
    '--is-bg': '#fffbea',
    '--is-fg': '#3a2f0b',
    '--is-accent': '#b45309',
    '--is-muted': '#a16207',
    '--is-border': '#fde68a',
  },
  y2k: {
    '--is-bg': '#f0f4ff',
    '--is-fg': '#0b1030',
    '--is-accent': '#2563eb',
    '--is-muted': '#64748b',
    '--is-border': '#bfdbfe',
  },
};

const SPACES: Readonly<Record<string, string>> = {
  '--is-space-xs': '0.25rem',
  '--is-space-sm': '0.5rem',
  '--is-space-md': '1rem',
  '--is-space-lg': '1.5rem',
  '--is-space-xl': '2rem',
};

const RADII: Readonly<Record<string, string>> = {
  '--is-radius-sm': '0.375rem',
  '--is-radius-md': '0.5rem',
  '--is-radius-lg': '0.75rem',
};

function isPalette(value: unknown): value is DesignPalette {
  return typeof value === 'string' && (DESIGN_PALETTES as readonly string[]).includes(value);
}

function isMode(value: unknown): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

export function generateDesignTokens(
  palette: unknown,
  mode: unknown = 'light'
): DesignTokenSet {
  if (!isPalette(palette)) {
    throw new SkillInputError('INVALID_PALETTE', `palette debe ser ${DESIGN_PALETTES.join(', ')}`);
  }
  if (!isMode(mode)) {
    throw new SkillInputError('INVALID_MODE', "mode debe ser 'light' o 'dark'");
  }

  const base = PALETTES[palette];
  const colors: DesignToken[] = Object.entries(base).map(([name, value]) => ({
    name,
    value,
    kind: 'color',
  }));
  const spaces: DesignToken[] = Object.entries(SPACES).map(([name, value]) => ({
    name,
    value,
    kind: 'space',
  }));
  const radii: DesignToken[] = Object.entries(RADII).map(([name, value]) => ({
    name,
    value,
    kind: 'radius',
  }));

  const tokens = [...colors, ...spaces, ...radii];
  const json: Record<string, string> = {};
  for (const token of tokens) json[token.name] = token.value;

  const lines = tokens.map((token) => `  ${token.name}: ${token.value};`).join('\n');
  const css = `:root {\n${lines}\n}`;

  const digestValue = digest({ palette, mode, tokens: tokens.map((token) => `${token.name}=${token.value}`) });

  return {
    palette,
    mode,
    tokens,
    css,
    json,
    digest: digestValue,
    uiApplied: false,
    executionPerformed: false,
  };
}

export function isDesignPalette(value: unknown): value is DesignPalette {
  return isPalette(value);
}

export function describeDesignTokens(): Readonly<Record<string, unknown>> {
  return {
    palettes: DESIGN_PALETTES,
    tokenKinds: ['color', 'space', 'radius', 'font', 'shadow'],
    generated: 'css+json',
    uiApplied: false,
    executionPerformed: false,
    note: 'Los tokens se generan; aplicarlos a la UI exige aprobación humana y un despliegue.',
  };
}