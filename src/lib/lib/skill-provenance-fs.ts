// state: engine-generated — revisión humana pendiente.
/**
 * Capa de filesystem para la procedencia de skills: observa el árbol instalado,
 * calcula la huella real y lee/escribe el lockfile canónico.
 *
 * El escaneo es acotado (archivo por skill, tamaño por archivo, bytes totales):
 * un catálogo externo no puede convertir la verificación en un consumo de memoria.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  computeSkillFingerprint,
  fileDigests,
  parseSkillLock,
  parseSourceRef,
  serializeSkillLock,
  type ObservedSkill,
  type ParseLockResult,
  type ProvenanceCode,
  type SkillLock,
  type SkillLockEntry,
} from './skill-provenance';
import { parseAasFrontmatter, aasSkillId, type AasSkillDescriptor } from './aas-skill-catalog';

const MAX_ENTRIES_PER_SKILL = 256;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const SKILL_FILE = 'SKILL.md';

export interface ScannedSkill {
  readonly ok: true;
  readonly descriptor: AasSkillDescriptor;
  readonly files: ReadonlyMap<string, string>;
}

export type ScanFailure = { readonly ok: false; readonly error: string };

function fail(error: string): ScanFailure {
  return { ok: false, error };
}

/** Lista determinista de los archivos del directorio de una skill, con rutas relativas. */
function listFiles(root: string): string[] | string {
  const paths: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries.sort()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const absolute = join(dir, entry);
      let stats;
      try {
        stats = statSync(absolute);
      } catch {
        continue;
      }
      if (stats.isDirectory()) walk(absolute);
      else if (stats.isFile()) paths.push(relative(root, absolute).replace(/\\/g, '/'));
      if (paths.length > MAX_ENTRIES_PER_SKILL) return;
    }
  };
  walk(root);
  if (paths.length > MAX_ENTRIES_PER_SKILL) {
    return `un directorio de skill excede ${MAX_ENTRIES_PER_SKILL} archivos`;
  }
  return paths;
}

/** Lee una skill instalada. El cuerpo se conserva para el hash; nada se vendoriza aquí. */
export function scanSkillDirectory(skillDir: string): ScannedSkill | ScanFailure {
  const absolute = resolve(skillDir);
  let manifestPath: string;
  try {
    manifestPath = join(absolute, SKILL_FILE);
    if (!statSync(manifestPath).isFile()) return fail(`${SKILL_FILE} no es un archivo regular`);
  } catch {
    return fail(`falta ${SKILL_FILE} en ${relative(process.cwd(), absolute) || '.'}`);
  }

  const files = new Map<string, string>();
  const listing = listFiles(absolute);
  if (typeof listing === 'string') return fail(listing);

  let totalBytes = 0;
  for (const path of listing) {
    const source = join(absolute, path);
    let size = 0;
    try {
      size = statSync(source).size;
    } catch {
      return fail(`no se pudo medir ${path}`);
    }
    if (size > MAX_FILE_BYTES) return fail(`${path} excede ${MAX_FILE_BYTES} bytes`);
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) return fail(`directorio excede ${MAX_TOTAL_BYTES} bytes`);
    files.set(path, readFileSync(source, 'utf8'));
  }
  if (!files.has(SKILL_FILE)) return fail(`${SKILL_FILE} no apareció en el listado`);

  const parsed = parseAasFrontmatter(files.get(SKILL_FILE) ?? '');
  if (!parsed.ok) return fail(`frontmatter inválido: ${parsed.error}`);
  return { ok: true, descriptor: parsed.descriptor, files };
}

export function sourceFromDescriptor(
  descriptor: AasSkillDescriptor
): ObservedSkill['source'] | null {
  const raw = descriptor.sourceRepo ?? descriptor.source;
  if (!raw) return null;
  return parseSourceRef(raw);
}

/**
 * Convierte una skill instalada en la observación que se compara contra el lock.
 * La huella incluye el descriptor parseado: reetiquetar una skill (`risk: safe`)
 * también es deriva, aunque los bytes del cuerpo no cambien.
 */
export function observeSkill(skillDir: string): ObservedSkill | ScanFailure {
  const scanned = scanSkillDirectory(skillDir);
  if (!scanned.ok) return scanned;
  const source = sourceFromDescriptor(scanned.descriptor);
  if (!source) return fail('el frontmatter no declara source_repo ni source verificable');
  const id = aasSkillId(scanned.descriptor.name);
  if (!id) return fail(`nombre sin id válido: ${scanned.descriptor.name}`);
  const digestList = fileDigests(
    [...scanned.files.entries()].map(([path, content]) => ({ path, content }))
  );
  return {
    id,
    source,
    fingerprint: computeSkillFingerprint({
      descriptor: {
        name: scanned.descriptor.name,
        description: scanned.descriptor.description,
        category: scanned.descriptor.category,
        risk: scanned.descriptor.risk,
        source: scanned.descriptor.source,
        sourceRepo: scanned.descriptor.sourceRepo,
        license: scanned.descriptor.license,
      },
      files: digestList,
    }),
    files: digestList,
  };
}

export type ReadLockResult =
  ParseLockResult | { readonly ok: false; readonly code: ProvenanceCode; readonly detail: string };

/** Archivo ausente = mismo resultado que archivo vacío: no hay nada que verificar. */
export function readSkillLock(lockPath: string): ReadLockResult {
  let text: string;
  try {
    text = readFileSync(lockPath, 'utf8');
  } catch {
    return { ok: false, code: 'LOCK_EMPTY', detail: `no existe ${lockPath}` };
  }
  return parseSkillLock(text);
}

export function entryFromObservation(
  observed: ObservedSkill,
  options: {
    readonly skillPath: string;
    readonly installedAt: string;
    readonly approvedBy?: string | null;
  }
): SkillLockEntry {
  const approvedBy = options.approvedBy ?? null;
  return {
    id: observed.id,
    source: observed.source,
    skillPath: options.skillPath,
    fingerprint: observed.fingerprint,
    files: observed.files,
    installedAt: options.installedAt,
    updatedAt: options.installedAt,
    approvedBy,
    approvedAt: approvedBy === null ? null : options.installedAt,
  };
}

export function writeSkillLock(lockPath: string, lock: SkillLock): void {
  const absolute = resolve(lockPath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, serializeSkillLock(lock), 'utf8');
}
