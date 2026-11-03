// state: engine-generated — revisión humana pendiente.
/**
 * Procedencia verificable de skills importadas.
 *
 * Un catálogo de `SKILL.md` (AAS, HF, cualquier origen externo) declara una capacidad;
 * nada en esa declaración prueba que el contenido que el runtime va a leer sea el
 * contenido que una persona revisó. Los lockfiles del ecosistema resuelven eso con un
 * hash por skill, pero el hash habitual es un tree-hash de git: sin git y sin el árbol
 * original es unverificable dentro del proceso.
 *
 * Aquí la huella se calcula sobre los bytes que el runtime observa, con sha256 canónico,
 * de modo que la verificación es ejecutable en producción sin herramienta externa.
 *
 * Invariantes:
 *   CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
 *   La presencia de un manifiesto no es integridad: un archivo vacío se rechaza igual
 *   que uno ausente. Sin aprobación humana explícita no hay permiso.
 */
import { createHash } from 'node:crypto';
import { SkillId } from './skill-registry';

export const SKILL_LOCK_VERSION = 1 as const;
export const DISCLOSURE_PROVENANCE = 'DECLARED ≠ PINNED ≠ APPROVED ≠ EXECUTABLE' as const;

const HEX64 = /^[0-9a-f]{64}$/;
const MAX_FILES_PER_SKILL = 256;
const MAX_PATH_CHARS = 512;

export type ProvenanceCode =
  | 'LOCK_EMPTY'
  | 'LOCK_NOT_JSON'
  | 'LOCK_VERSION_UNSUPPORTED'
  | 'LOCK_INVALID'
  | 'LOCK_DUPLICATE_ID';

export interface SkillSourceRef {
  readonly host: string;
  readonly owner: string | null;
  readonly repo: string | null;
  readonly revision: string | null;
}

export interface SkillFileDigest {
  readonly path: string;
  readonly bytes: number;
  readonly digest: string;
}

export interface SkillLockEntry {
  readonly id: string;
  readonly source: SkillSourceRef;
  readonly skillPath: string;
  readonly fingerprint: string;
  readonly files: readonly SkillFileDigest[];
  readonly installedAt: string;
  readonly updatedAt: string;
  /** Persona (o cargo) que revisó el contenido. `null` = nadie lo aprobó. */
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
}

export interface SkillLock {
  readonly version: typeof SKILL_LOCK_VERSION;
  readonly entries: readonly SkillLockEntry[];
}

export type ParseLockResult =
  | { readonly ok: true; readonly lock: SkillLock }
  | { readonly ok: false; readonly code: ProvenanceCode; readonly detail: string };

export interface ObservedSkill {
  readonly id: string;
  readonly source: SkillSourceRef;
  readonly fingerprint: string;
  readonly files: readonly SkillFileDigest[];
}

export type ProvenanceVerdict =
  | { readonly status: 'MATCH'; readonly entry: SkillLockEntry }
  | {
      readonly status: 'APPROVAL_MISSING';
      readonly entry: SkillLockEntry;
      readonly reason: string;
    }
  | {
      readonly status: 'DRIFT';
      readonly entry: SkillLockEntry;
      readonly changed: readonly string[];
      readonly reason: string;
    }
  | {
      readonly status: 'SOURCE_MISMATCH';
      readonly entry: SkillLockEntry;
      readonly reason: string;
    }
  | { readonly status: 'NOT_PINNED'; readonly reason: string }
  | { readonly status: 'LOCK_UNAVAILABLE'; readonly code: ProvenanceCode; readonly reason: string };

/** JSON con claves ordenadas: dos lockfiles equivalentes serializan idénticos. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) sorted[key] = sortValue(record[key]);
    return sorted;
  }
  return value;
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Identidad canónica de un origen. Un mismo repositorio puede llegar escrito de tres
 * formas (`owner/repo`, URL, slug con host); todas colapsan a una clave y una sola.
 */
export function canonicalSource(ref: SkillSourceRef): string {
  const host = ref.host.trim().toLowerCase();
  const owner = ref.owner?.trim().toLowerCase() ?? '';
  const repo = ref.repo?.trim().toLowerCase() ?? '';
  const revision = ref.revision?.trim().toLowerCase() ?? '';
  if (host === 'local') return 'local';
  if (!owner || !repo) throw new Error('SkillSourceRef incompleto: owner y repo son obligatorios');
  const base = `${host}:${owner}/${repo}`;
  return revision === '' ? base : `${base}@${revision}`;
}

/**
 * Un mismo repositorio llega escrito de al menos cuatro formas (slug, `owner/repo`,
 * URL con y sin `.git`). Todas colapsan al mismo origen canónico; un host no
 * soportado o un camino incompleto se rechaza en lugar de inventar una identidad.
 */
export function parseSourceRef(raw: string, fallbackHost = 'github'): SkillSourceRef | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === '') return null;
  if (trimmed === 'local') return { host: 'local', owner: null, repo: null, revision: null };
  const stripped = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^(github|gitlab)\.com\//, '$1/')
    .replace(/\.git$/, '');
  let segments = stripped.split('/').filter((part) => part !== '');
  let host = fallbackHost;
  if (segments.length >= 3 && (segments[0] === 'github' || segments[0] === 'gitlab')) {
    host = segments[0];
    segments = segments.slice(1);
  }
  if (segments.length !== 2) return null;
  const owner = segments[0];
  const parts = segments[1].split('@');
  const repo = parts[0];
  if (!owner || !repo || parts.length > 2) return null;
  return { host, owner, repo, revision: parts.length === 2 ? parts[1] : null };
}

/**
 * Huella de una skill: enlaza el descriptor declarado con los bytes de cada archivo.
 * Cambiar una línea del cuerpo, o añadir un archivo al directorio, mueve la huella.
 */
export function computeSkillFingerprint(input: {
  readonly descriptor: Readonly<Record<string, string | null>>;
  readonly files: readonly SkillFileDigest[];
}): string {
  const files = sortFiles(input.files).map((file) => `${file.path}\n${file.bytes}\n${file.digest}`);
  const descriptor = canonicalJson(input.descriptor);
  return sha256Hex(`${descriptor}\n${files.join('\n')}`);
}

export function fileDigests(
  files: readonly { path: string; content: string }[]
): SkillFileDigest[] {
  return sortFiles(
    files.map((file) => ({
      path: normalizeRelPath(file.path),
      bytes: Buffer.byteLength(file.content, 'utf8'),
      digest: sha256Hex(file.content),
    }))
  );
}

function sortFiles(files: readonly SkillFileDigest[]): SkillFileDigest[] {
  return [...files].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );
}

export function normalizeRelPath(raw: string): string {
  const flattened = raw.replace(/\\/g, '/');
  if (flattened === '' || flattened.includes('\0')) throw new Error('Ruta de archivo no válida');
  if (flattened.startsWith('/') || /^[a-z]:\//i.test(flattened)) {
    throw new Error(`ruta absoluta: ${raw}`);
  }
  const path = flattened.replace(/^\.\/+/, '');
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error(`Ruta no canónica: ${raw}`);
    }
  }
  if (path.length > MAX_PATH_CHARS) throw new Error('Ruta demasiado larga');
  return path;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && HEX64.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function normalizeRefPart(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() === '' ? null : value.trim().toLowerCase();
}

function readSource(value: unknown): SkillSourceRef | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.host !== 'string') return null;
  return {
    host: record.host,
    owner: normalizeRefPart(record.owner),
    repo: normalizeRefPart(record.repo),
    revision: normalizeRefPart(record.revision),
  };
}

function readFiles(value: unknown): SkillFileDigest[] | string {
  if (!Array.isArray(value)) return 'files debe ser una lista';
  if (value.length > MAX_FILES_PER_SKILL) return `files excede ${MAX_FILES_PER_SKILL} entradas`;
  const files: SkillFileDigest[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') return 'cada archivo debe ser un objeto';
    const record = item as Record<string, unknown>;
    if (typeof record.path !== 'string') return 'file.path debe ser texto';
    let path: string;
    try {
      path = normalizeRelPath(record.path);
    } catch {
      return `file.path no canónica: ${record.path}`;
    }
    if (typeof record.bytes !== 'number' || !Number.isInteger(record.bytes) || record.bytes < 0) {
      return `file.bytes no válido en ${path}`;
    }
    if (!isHex64(record.digest)) return `file.digest debe ser sha256 hex en ${path}`;
    files.push({ path, bytes: record.bytes, digest: record.digest });
  }
  return files;
}

function readEntry(
  value: unknown
): { ok: true; entry: SkillLockEntry } | { ok: false; error: string } {
  if (value === null || typeof value !== 'object')
    return { ok: false, error: 'cada entrada debe ser un objeto' };
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !SkillId.safeParse(record.id).success) {
    return { ok: false, error: `id de skill no válido: ${String(record.id)}` };
  }
  const source = readSource(record.source);
  if (!source) return { ok: false, error: `${record.id}: source no válido` };
  if (source.host !== 'local' && (source.owner === null || source.repo === null)) {
    return { ok: false, error: `${record.id}: source necesita owner y repo salvo en host local` };
  }
  if (typeof record.skillPath !== 'string' || record.skillPath.trim() === '') {
    return { ok: false, error: `${record.id}: skillPath es obligatorio` };
  }
  if (!isHex64(record.fingerprint))
    return { ok: false, error: `${record.id}: fingerprint debe ser sha256 hex` };
  const files = readFiles(record.files);
  if (typeof files === 'string') return { ok: false, error: `${record.id}: ${files}` };
  if (!isIsoDate(record.installedAt) || !isIsoDate(record.updatedAt)) {
    return { ok: false, error: `${record.id}: installedAt/updatedAt deben ser fechas ISO-8601` };
  }
  if (Date.parse(record.updatedAt) < Date.parse(record.installedAt)) {
    return { ok: false, error: `${record.id}: updatedAt es anterior a installedAt` };
  }
  const approvedBy =
    record.approvedBy === null || typeof record.approvedBy === 'string'
      ? record.approvedBy
      : undefined;
  if (approvedBy === undefined)
    return { ok: false, error: `${record.id}: approvedBy debe ser texto o null` };
  const approvedAt =
    record.approvedAt === null || isIsoDate(record.approvedAt) ? record.approvedAt : undefined;
  if (approvedAt === undefined)
    return { ok: false, error: `${record.id}: approvedAt debe ser fecha ISO o null` };
  if (approvedBy !== null && approvedAt === null) {
    return { ok: false, error: `${record.id}: approvedBy sin approvedAt` };
  }
  return {
    ok: true,
    entry: {
      id: record.id,
      source,
      skillPath: record.skillPath,
      fingerprint: record.fingerprint,
      files,
      installedAt: record.installedAt,
      updatedAt: record.updatedAt,
      approvedBy,
      approvedAt: approvedAt ?? null,
    },
  };
}

/** Parseo fallido-cerrado: cualquier desviación del esquema deja el lock sin efecto. */
export function parseSkillLock(text: string): ParseLockResult {
  if (text.trim() === '') {
    return { ok: false, code: 'LOCK_EMPTY', detail: 'lockfile vacío o sólo espacios' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, code: 'LOCK_NOT_JSON', detail: (error as Error).message };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'LOCK_INVALID', detail: 'la raíz del lock debe ser un objeto' };
  }
  const root = parsed as Record<string, unknown>;
  if (root.version !== SKILL_LOCK_VERSION) {
    return {
      ok: false,
      code: 'LOCK_VERSION_UNSUPPORTED',
      detail: `versión ${String(root.version)} soportada: ${SKILL_LOCK_VERSION}`,
    };
  }
  if (!Array.isArray(root.entries)) {
    return { ok: false, code: 'LOCK_INVALID', detail: 'entries debe ser una lista' };
  }
  const entries: SkillLockEntry[] = [];
  const seen = new Set<string>();
  for (const raw of root.entries) {
    const parsed = readEntry(raw);
    if (!parsed.ok) return { ok: false, code: 'LOCK_INVALID', detail: parsed.error };
    const entry = parsed.entry;
    if (seen.has(entry.id)) {
      return { ok: false, code: 'LOCK_DUPLICATE_ID', detail: entry.id };
    }
    seen.add(entry.id);
    entries.push(entry);
  }
  entries.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return { ok: true, lock: { version: SKILL_LOCK_VERSION, entries } };
}

export function serializeSkillLock(lock: SkillLock): string {
  const entries = [...lock.entries]
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .map((entry) => ({
      ...entry,
      source: { ...entry.source },
      files: sortFiles(entry.files),
    }));
  return `${JSON.stringify({ version: lock.version, entries }, null, 2)}\n`;
}

export function findEntry(lock: SkillLock, id: string): SkillLockEntry | undefined {
  return lock.entries.find((entry) => entry.id === id);
}

/** Diferencia archivo por archivo entre lo aprobado y lo observado. */
export function changedFiles(
  entry: SkillLockEntry,
  observed: readonly SkillFileDigest[]
): string[] {
  const pinned = new Map(entry.files.map((file) => [file.path, file.digest]));
  const current = new Map(observed.map((file) => [file.path, file.digest]));
  const changed: string[] = [];
  for (const [path, digest] of current) {
    const expected = pinned.get(path);
    if (expected === undefined) changed.push(`${path} (añadido)`);
    else if (expected !== digest) changed.push(path);
  }
  for (const path of pinned.keys()) {
    if (!current.has(path)) changed.push(`${path} (eliminado)`);
  }
  return changed.sort();
}

/**
 * Puerta de procedencia. Sólo `MATCH` autoriza a considerar ejecutable una skill
 * importada; todo lo demás se niega y dice por qué.
 */
export function decideProvenance(
  lockResult: ParseLockResult,
  observed: ObservedSkill
): ProvenanceVerdict {
  if (!lockResult.ok) {
    return {
      status: 'LOCK_UNAVAILABLE',
      code: lockResult.code,
      reason: `procedencia unverificable: ${lockResult.detail}`,
    };
  }
  const entry = findEntry(lockResult.lock, observed.id);
  if (!entry) {
    return {
      status: 'NOT_PINNED',
      reason: `@${observed.id} no está en el lock: sin pin no hay permiso`,
    };
  }
  if (canonicalSource(entry.source) !== canonicalSource(observed.source)) {
    return {
      status: 'SOURCE_MISMATCH',
      entry,
      reason: `@${entry.id} apunta a ${canonicalSource(observed.source)}, aprobado desde ${canonicalSource(entry.source)}`,
    };
  }
  if (entry.fingerprint !== observed.fingerprint) {
    const changed = changedFiles(entry, observed.files);
    return {
      status: 'DRIFT',
      entry,
      changed,
      reason: `@${entry.id} cambió desde la aprobación${changed.length > 0 ? `: ${changed.join(', ')}` : ''}`,
    };
  }
  if (entry.approvedBy === null || entry.approvedBy.trim() === '') {
    return {
      status: 'APPROVAL_MISSING',
      entry,
      reason: `@${entry.id} está pinneado pero nadie lo aprobó`,
    };
  }
  return { status: 'MATCH', entry };
}

export function isExecutableVerdict(verdict: ProvenanceVerdict): boolean {
  return verdict.status === 'MATCH';
}
