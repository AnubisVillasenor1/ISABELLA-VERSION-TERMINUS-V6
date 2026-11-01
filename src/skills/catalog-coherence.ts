/**
 * Compuerta de coherencia entre el catálogo declarado y el registro ejecutable.
 *
 * `ISABELLA_SKILLS` es una declaración de capacidad: dice qué debería existir. El
 * `SkillRegistry` canónico es lo que de verdad se puede ejecutar. Mientras esas dos
 * listas no se reconcilian, el catálogo puede afirmar `verified` sobre una skill sin
 * handler enlazado, y la API lo presenta como si fuera ejecutable (AUD-233).
 *
 * Dos tipos de entrada conviven en el catálogo y no pueden juzgarse igual:
 * - la que lleva `skillNumber` afirma una habilidad invocable, y por tanto necesita
 *   un handler enlazado;
 * - la que no lo lleva declara la madurez de un subsistema (CROWN, ARGUS, memoria
 *   territorial) que no pretende ser invocable, así que su estado no es una promesa
 *   de ejecución.
 *
 * Este módulo no añade capacidades: solo establece, por entrada, si hay un handler
 * enlazado, si duplica a otra bajo otro id y si su afirmación está soportada.
 * state: engine-generated — revisión humana pendiente.
 */
import { ISABELLA_SKILLS, type IsabellaSkill } from '../lib/lib/skill-registry';
import { CANONICAL_SKILLS } from './catalog';
import { FOUNDATIONAL_SKILLS } from './foundational';
import { EVOLVED_SKILL_DESCRIPTORS } from './evolved-bridge';

export const CATALOG_COHERENCE_VERSION = '1.0.0' as const;

/** Estados que implican que algo ejecutable existe detrás. */
const EXECUTION_CLAIMING: ReadonlySet<IsabellaSkill['status']> = new Set([
  'implemented',
  'verified',
]);

/**
 * Los ids del catálogo usan `:` como separador de espacio de nombres y el registry
 * canónico usa `-`. Sin normalizar, `ckm:brand` y `ckm-brand` parecen dos habilidades.
 */
export function normalizeSkillKey(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[:/\s]+/g, '-');
}

/** Ids realmente registrables, en orden estable para que el digest no dependa del mapa. */
export function executableSkillIds(): readonly string[] {
  return [
    ...CANONICAL_SKILLS.map((skill) => skill.id),
    ...FOUNDATIONAL_SKILLS.map((skill) => skill.id),
    ...EVOLVED_SKILL_DESCRIPTORS.map((skill) => skill.id),
  ].sort((left, right) => left.localeCompare(right));
}

export interface CatalogBinding {
  readonly id: string;
  readonly declaredStatus: IsabellaSkill['status'];
  readonly skillNumber: number | null;
  /** Entrada del catálogo de habilidades invocables; si no, es declaración de subsistema. */
  readonly invocable: boolean;
  /** El estado declarado afirma que ya existe algo ejecutable detrás. */
  readonly declaresExecution: boolean;
  /** Id del registry al que enlaza esta entrada, o null si no hay handler. */
  readonly executableId: string | null;
  readonly handlerBound: boolean;
  /** Si esta entrada es un seudónimo de otra del propio catálogo. */
  readonly aliasOf: string | null;
  /** Una habilidad invocable afirmada sin handler enlazado no está soportada. */
  readonly claimSupported: boolean;
}

/** Lo que la API puede afirmar de una entrada del catálogo sin mentir. */
export type CatalogBindingView = Pick<
  CatalogBinding,
  'handlerBound' | 'aliasOf' | 'claimSupported' | 'executableId' | 'invocable' | 'declaresExecution'
>;

export interface CatalogCoherence {
  readonly version: string;
  readonly declared: number;
  readonly executable: number;
  readonly bound: number;
  readonly unbound: number;
  readonly aliases: number;
  /** Entradas declaradas menos alias: capacidades realmente distintas. */
  readonly distinctCapabilities: number;
  readonly invocable: number;
  /** Habilidades invocables con handler enlazado, descontando seudónimos. */
  readonly invocableBound: number;
  readonly unsupportedClaims: readonly string[];
  readonly items: readonly CatalogBinding[];
}

function buildCoherence(): CatalogCoherence {
  const executable = new Map<string, string>();
  for (const id of executableSkillIds()) executable.set(normalizeSkillKey(id), id);

  const declaredKeys = new Map<string, string>();
  const items: CatalogBinding[] = [];

  for (const skill of ISABELLA_SKILLS) {
    const key = normalizeSkillKey(skill.id);
    const executableId = executable.get(key) ?? null;
    const firstDeclaration = declaredKeys.get(key) ?? null;
    if (firstDeclaration === null) declaredKeys.set(key, skill.id);
    const invocable = typeof skill.skillNumber === 'number';
    items.push({
      id: skill.id,
      declaredStatus: skill.status,
      skillNumber: invocable ? (skill.skillNumber as number) : null,
      invocable,
      declaresExecution: EXECUTION_CLAIMING.has(skill.status),
      executableId,
      handlerBound: executableId !== null,
      aliasOf: firstDeclaration === null || firstDeclaration === skill.id ? null : firstDeclaration,
      // Una declaración de subsistema no promete ejecución; una habilidad invocable sí.
      claimSupported: invocable ? executableId !== null : true,
    });
  }

  const bound = items.filter((item) => item.handlerBound).length;
  const aliases = items.filter((item) => item.aliasOf !== null).length;
  const invocableItems = items.filter((item) => item.invocable);
  return {
    version: CATALOG_COHERENCE_VERSION,
    declared: items.length,
    executable: executable.size,
    bound,
    unbound: items.length - bound,
    aliases,
    distinctCapabilities: items.length - aliases,
    invocable: invocableItems.length,
    invocableBound: invocableItems.filter((item) => item.handlerBound && item.aliasOf === null)
      .length,
    unsupportedClaims: items
      .filter((item) => !item.claimSupported)
      .map((item) => item.id)
      .sort((left, right) => left.localeCompare(right)),
    items,
  };
}

let cached: CatalogCoherence | null = null;

/** Determinista y con caché: el catálogo y el registry son estáticos en runtime. */
export function catalogCoherence(): CatalogCoherence {
  if (cached === null) cached = Object.freeze(buildCoherence());
  return cached;
}

/** Vista de una entrada para la API: nunca presenta como ejecutable lo que no lo es. */
export function bindingView(id: string): CatalogBindingView | null {
  const item = catalogCoherence().items.find((candidate) => candidate.id === id) ?? null;
  if (item === null) return null;
  return {
    handlerBound: item.handlerBound,
    aliasOf: item.aliasOf,
    claimSupported: item.claimSupported,
    executableId: item.executableId,
    invocable: item.invocable,
    declaresExecution: item.declaresExecution,
  };
}
