// state: engine-generated — revisión humana pendiente.
/**
 * CLI de procedencia: fija (generate) y verifica (verify) las skills externas instaladas.
 *
 *   pnpm skills:lock generate --root <dir> [--out skills.lock.json] [--approved-by <quién>]
 *   pnpm skills:lock verify   --root <dir> --lock skills.lock.json
 *
 * `verify` sale con código 1 ante cualquier skill que no sea MATCH: el puerto no es
 * un informe decorativo, es una compuerta.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  decideProvenance,
  isExecutableVerdict,
  type ObservedSkill,
  type ProvenanceVerdict,
  type SkillLock,
} from '../src/lib/lib/skill-provenance';
import {
  entryFromObservation,
  observeSkill,
  readSkillLock,
  writeSkillLock,
} from '../src/lib/lib/skill-provenance-fs';

interface CliOptions {
  readonly command: string;
  readonly root: string;
  readonly lock: string;
  readonly approvedBy: string | null;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const [command = '', ...rest] = argv;
  const flags = new Map<string, string>();
  const present = new Set<string>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith('--')) {
      present.add(key);
      continue;
    }
    flags.set(key, next);
    index += 1;
  }
  if (command !== 'generate' && command !== 'verify') {
    throw new Error('comando esperado: generate | verify');
  }
  const root = flags.get('root');
  if (!root) throw new Error('--root es obligatorio');
  const lock = flags.get('out') ?? flags.get('lock');
  if (!lock)
    throw new Error(command === 'generate' ? '--out es obligatorio' : '--lock es obligatorio');
  if (command === 'verify' && !present.has('lock') && !flags.has('lock')) {
    throw new Error('verify requiere --lock');
  }
  return {
    command,
    root: resolve(root),
    lock: resolve(lock),
    approvedBy: flags.get('approved-by') ?? null,
  };
}

/** Directorios que contienen SKILL.md, en orden determinista. */
function skillDirectories(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const absolute = join(dir, entry);
      let stats;
      try {
        stats = statSync(absolute);
      } catch {
        continue;
      }
      if (!stats.isDirectory()) continue;
      try {
        if (statSync(join(absolute, 'SKILL.md')).isFile()) found.push(absolute);
      } catch {
        // sin manifiesto: seguido se desciende por si la skill está más adentro
      }
      if (depth < 4) walk(absolute, depth + 1);
    }
  };
  walk(root, 0);
  return found.sort();
}

function report(id: string, verdict: ProvenanceVerdict): string {
  const suffix =
    verdict.status === 'DRIFT' && verdict.changed.length > 0
      ? ` → ${verdict.changed.join(', ')}`
      : '';
  return `${verdict.status === 'MATCH' ? 'OK  ' : 'NO  '} ${id} [${verdict.status}] ${verdict.reason ?? ''}${suffix}`.trimEnd();
}

function main(): number {
  const options = parseArgs(process.argv.slice(2));
  const directories = skillDirectories(options.root);
  if (directories.length === 0) {
    console.error(`[skill-lock] ningún directorio con SKILL.md bajo ${options.root}`);
    return 1;
  }

  const observed: Array<{ directory: string; skill: ObservedSkill }> = [];
  for (const directory of directories) {
    const result = observeSkill(directory);
    if (!('fingerprint' in result)) {
      console.error(`[skill-lock] ${directory}: ${result.error}`);
      return 1;
    }
    observed.push({ directory, skill: result });
  }

  if (options.command === 'generate') {
    const installedAt = new Date().toISOString();
    const entries = observed.map(({ directory, skill }) =>
      entryFromObservation(skill, {
        skillPath: directory.replace(/\\/g, '/'),
        installedAt,
        approvedBy: options.approvedBy,
      })
    );
    const lock: SkillLock = { version: 1, entries };
    writeSkillLock(options.lock, lock);
    console.log(`[skill-lock] ${entries.length} skills fijadas en ${options.lock}`);
    if (options.approvedBy === null) {
      console.log('[skill-lock] sin --approved-by: ninguna skill quedará aprobada para ejecutar');
    }
    return 0;
  }

  const lockResult = readSkillLock(options.lock);
  let failures = 0;
  for (const { skill } of observed) {
    const verdict = decideProvenance(lockResult, skill);
    if (!isExecutableVerdict(verdict)) failures += 1;
    console.log(report(skill.id, verdict));
  }
  console.log(
    `[skill-lock] ${observed.length - failures}/${observed.length} verificadas${
      failures > 0 ? `, ${failures} rechazadas` : ''
    }`
  );
  return failures > 0 ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[skill-lock] ${(error as Error).message}`);
  process.exitCode = 2;
}
