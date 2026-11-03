// state: engine-generated — revisión humana pendiente.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  SKILL_LOCK_VERSION,
  canonicalJson,
  canonicalSource,
  changedFiles,
  computeSkillFingerprint,
  decideProvenance,
  fileDigests,
  isExecutableVerdict,
  normalizeRelPath,
  parseSkillLock,
  parseSourceRef,
  serializeSkillLock,
  type ObservedSkill,
  type SkillFileDigest,
  type SkillLock,
  type SkillLockEntry,
} from '../../src/lib/lib/skill-provenance';

function sha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const SOURCE = { host: 'github', owner: 'OsoPanda1', repo: 'skills', revision: null };
const NOW = '2026-10-31T00:00:00.000Z';
const LATER = '2026-10-31T01:00:00.000Z';
const BODY = 'hola\n';

function digestOf(files: Readonly<Record<string, string>>): SkillFileDigest[] {
  return fileDigests(Object.entries(files).map(([path, content]) => ({ path, content })));
}

function observed(overrides: Partial<ObservedSkill> = {}): ObservedSkill {
  const files = digestOf({ 'SKILL.md': BODY });
  return {
    id: 'aas:demo',
    source: SOURCE,
    fingerprint: computeSkillFingerprint({ descriptor: { name: 'demo' }, files }),
    files,
    ...overrides,
  };
}

function entryFor(skill: ObservedSkill, overrides: Partial<SkillLockEntry> = {}): SkillLockEntry {
  return {
    id: skill.id,
    source: skill.source,
    skillPath: '/externals/aas/demo',
    fingerprint: skill.fingerprint,
    files: skill.files,
    installedAt: NOW,
    updatedAt: LATER,
    approvedBy: 'Edwin Oswaldo Castillo Trejo',
    approvedAt: LATER,
    ...overrides,
  };
}

function lockWith(entries: readonly SkillLockEntry[]): SkillLock {
  return { version: SKILL_LOCK_VERSION, entries };
}

describe('huella canónica', () => {
  it('canonicalJson ordena claves anidadas y listas', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe('{"a":[2,{"c":3,"d":4}],"b":1}');
  });

  it('la huella no depende del orden de los archivos', () => {
    const left = digestOf({ 'a.md': 'uno', 'b.md': 'dos' });
    const right = digestOf({ 'b.md': 'dos', 'a.md': 'uno' });
    expect(computeSkillFingerprint({ descriptor: { name: 'x' }, files: left })).toBe(
      computeSkillFingerprint({ descriptor: { name: 'x' }, files: right })
    );
  });

  it('cambiar un byte del cuerpo mueve la huella', () => {
    const before = computeSkillFingerprint({
      descriptor: { name: 'x' },
      files: digestOf({ 'SKILL.md': 'a' }),
    });
    const after = computeSkillFingerprint({
      descriptor: { name: 'x' },
      files: digestOf({ 'SKILL.md': 'b' }),
    });
    expect(before).not.toBe(after);
    expect(before).toMatch(/^[0-9a-f]{64}$/);
    expect(before).toBe(
      computeSkillFingerprint({
        descriptor: { name: 'x' },
        files: [{ path: 'SKILL.md', bytes: 1, digest: sha('a') }],
      })
    );
  });

  it('reetiquetar el riesgo es deriva aunque el cuerpo no cambie', () => {
    const files = digestOf({ 'SKILL.md': 'a' });
    const safe = computeSkillFingerprint({ descriptor: { name: 'x', risk: 'safe' }, files });
    const critical = computeSkillFingerprint({
      descriptor: { name: 'x', risk: 'critical' },
      files,
    });
    expect(safe).not.toBe(critical);
  });

  it('un archivo añadido cambia la huella', () => {
    const one = computeSkillFingerprint({
      descriptor: { name: 'x' },
      files: digestOf({ 'SKILL.md': 'a' }),
    });
    const two = computeSkillFingerprint({
      descriptor: { name: 'x' },
      files: digestOf({ 'SKILL.md': 'a', 'extra.sh': 'rm -rf' }),
    });
    expect(one).not.toBe(two);
  });

  it('fileDigests normaliza separadores y registra bytes y sha256', () => {
    const digests = fileDigests([{ path: '.\\sub\\SKILL.md', content: 'á' }]);
    expect(digests[0]?.path).toBe('sub/SKILL.md');
    expect(digests[0]?.bytes).toBe(2);
    expect(digests[0]?.digest).toBe(sha('á'));
  });

  it('rechaza rutas que escapan del directorio', () => {
    expect(() => normalizeRelPath('../evil.md')).toThrow();
    expect(() => normalizeRelPath('/etc/passwd')).toThrow();
    expect(() => normalizeRelPath('a/../../b.md')).toThrow();
    expect(() => normalizeRelPath('')).toThrow();
    expect(normalizeRelPath('./SKILL.md')).toBe('SKILL.md');
  });
});

describe('identidad de origen', () => {
  it('los alias de un mismo repositorio colapsan a una clave', () => {
    const aliases = [
      'OsoPanda1/skills',
      'https://github.com/OsoPanda1/skills',
      'https://github.com/OsoPanda1/skills.git',
      'github/OsoPanda1/skills'.replace('github/', ''),
      'osopanda1/SKILLS',
    ];
    const keys = new Set(aliases.map((alias) => canonicalSource(parseSourceRef(alias)!)));
    expect([...keys]).toEqual(['github:osopanda1/skills']);
  });

  it('conserva la revisión como parte de la identidad', () => {
    const ref = parseSourceRef('github.com/OsoPanda1/skills@deadbeef')!;
    expect(canonicalSource(ref)).toBe('github:osopanda1/skills@deadbeef');
    expect(canonicalSource({ ...ref, revision: null })).toBe('github:osopanda1/skills');
  });

  it('un origen sin dueño o un host no soportado no se parsea', () => {
    expect(parseSourceRef('solo-repo')).toBeNull();
    expect(parseSourceRef('https://evil.example.com/a/b')).toBeNull();
    expect(canonicalSource({ host: 'local', owner: null, repo: null, revision: null })).toBe(
      'local'
    );
  });
});

describe('parseo del lockfile (fallido cerrado)', () => {
  const goodLock = serializeSkillLock(lockWith([entryFor(observed())]));

  it('acepta un lock bien formado', () => {
    const result = parseSkillLock(goodLock);
    expect(result.ok).toBe(true);
  });

  it('un lock vacío equivale a no tener lock', () => {
    for (const text of ['', '   ', '\n']) {
      const result = parseSkillLock(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('LOCK_EMPTY');
    }
  });

  it('rechaza JSON ilegible, versión ajena e ids duplicados', () => {
    const cases: Array<[string, string]> = [
      ['{no es json', 'LOCK_NOT_JSON'],
      ['[]', 'LOCK_INVALID'],
      [`{"version":99,"entries":[]}`, 'LOCK_VERSION_UNSUPPORTED'],
      [`{"version":1,"entries":{}}`, 'LOCK_INVALID'],
    ];
    for (const [text, code] of cases) {
      const result = parseSkillLock(text);
      expect(result.ok, text).toBe(false);
      if (!result.ok) expect(result.code).toBe(code);
    }
    const duplicated = serializeSkillLock(lockWith([entryFor(observed()), entryFor(observed())]));
    const result = parseSkillLock(duplicated);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('LOCK_DUPLICATE_ID');
  });

  it('exige huella sha256, fechas ISO coherentes y aprobación internamente consistente', () => {
    const base = entryFor(observed());
    const cases: Array<[Partial<SkillLockEntry>, string]> = [
      [{ fingerprint: 'abc' }, 'fingerprint'],
      [{ installedAt: 'ayer' }, 'installedAt'],
      [{ installedAt: LATER, updatedAt: NOW }, 'anterior'],
      [{ approvedBy: 'alguien', approvedAt: null }, 'approvedAt'],
      [{ approvedBy: 42 as unknown as string }, 'approvedBy'],
      [{ files: [{ path: '../escape.md', bytes: 1, digest: base.fingerprint }] }, 'no canónica'],
      [{ files: [{ path: 'SKILL.md', bytes: -1, digest: base.fingerprint }] }, 'bytes'],
      [{ skillPath: '  ' }, 'skillPath'],
    ];
    for (const [patch, needle] of cases) {
      const text = serializeSkillLock(lockWith([{ ...base, ...patch }]));
      const result = parseSkillLock(text);
      expect(result.ok, JSON.stringify(patch)).toBe(false);
      if (!result.ok) expect(result.detail, JSON.stringify(patch)).toContain(needle);
    }
  });

  it('serializar es estable sin importar el orden de entrada', () => {
    const second = observed({ id: 'aas:zzz' });
    const a = serializeSkillLock(lockWith([entryFor(observed()), entryFor(second)]));
    const b = serializeSkillLock(lockWith([entryFor(second), entryFor(observed())]));
    expect(a).toBe(b);
    expect(a.endsWith('\n')).toBe(true);
  });
});

describe('puerta de procedencia', () => {
  it('MATCH sólo cuando huella, origen y aprobación coinciden', () => {
    const skill = observed();
    const verdict = decideProvenance(
      parseSkillLock(serializeSkillLock(lockWith([entryFor(skill)]))),
      skill
    );
    expect(verdict.status).toBe('MATCH');
    expect(isExecutableVerdict(verdict)).toBe(true);
  });

  it('DRIFT nombra el archivo que cambió, añadido y eliminado', () => {
    const pinned = observed();
    const entry = entryFor(pinned);
    const mutated = digestOf({ 'SKILL.md': 'distinto' });
    const added = digestOf({ 'SKILL.md': BODY, 'hook.sh': 'x' });
    const removed = digestOf({});
    expect(changedFiles(entry, mutated)).toEqual(['SKILL.md']);
    expect(changedFiles(entry, digestOf({ 'SKILL.md': BODY }))).toEqual([]);
    expect(changedFiles(entry, added)).toEqual(['hook.sh (añadido)']);

    const driftAdded = decideProvenance(
      { ok: true, lock: lockWith([entry]) },
      {
        ...pinned,
        fingerprint: computeSkillFingerprint({ descriptor: { name: 'demo' }, files: added }),
        files: added,
      }
    );
    expect(driftAdded.status).toBe('DRIFT');
    if (driftAdded.status === 'DRIFT') expect(driftAdded.changed).toEqual(['hook.sh (añadido)']);

    const removedEntry = entryFor({ ...pinned, files: digestOf({ 'SKILL.md': 'a' }) });
    const gone = decideProvenance(
      { ok: true, lock: lockWith([removedEntry]) },
      {
        ...pinned,
        fingerprint: '0'.repeat(64),
        files: removed,
      }
    );
    expect(gone.status).toBe('DRIFT');
    if (gone.status === 'DRIFT') expect(gone.changed).toEqual(['SKILL.md (eliminado)']);
  });

  it('el origen manda sobre la huella: una habilidad re-pinnedeadada desde otro repo es SOURCE_MISMATCH', () => {
    const skill = observed();
    const verdict = decideProvenance(
      { ok: true, lock: lockWith([entryFor(skill)]) },
      {
        ...skill,
        source: { host: 'github', owner: 'ajeno', repo: 'skills', revision: null },
      }
    );
    expect(verdict.status).toBe('SOURCE_MISMATCH');
    expect(isExecutableVerdict(verdict)).toBe(false);
  });

  it('sin pin no hay permiso, y sin aprobación tampoco', () => {
    const skill = observed();
    const unpinned = decideProvenance({ ok: true, lock: lockWith([]) }, skill);
    expect(unpinned.status).toBe('NOT_PINNED');

    const unapproved = decideProvenance(
      { ok: true, lock: lockWith([entryFor(skill, { approvedBy: null, approvedAt: null })]) },
      skill
    );
    expect(unapproved.status).toBe('APPROVAL_MISSING');
    expect(isExecutableVerdict(unapproved)).toBe(false);

    const blank = decideProvenance(
      { ok: true, lock: lockWith([entryFor(skill, { approvedBy: '   ' })]) },
      skill
    );
    expect(blank.status).toBe('APPROVAL_MISSING');
  });

  it('un lock ilegible o ausente bloquea todo en lugar de permitir', () => {
    for (const text of ['', 'no-es-json', '{"version":7,"entries":[]}']) {
      const verdict = decideProvenance(parseSkillLock(text), observed());
      expect(verdict.status).toBe('LOCK_UNAVAILABLE');
      expect(isExecutableVerdict(verdict)).toBe(false);
    }
  });

  it('ningún estado distinto de MATCH se considera ejecutable', () => {
    const skill = observed();
    const statuses = [
      decideProvenance({ ok: true, lock: lockWith([entryFor(skill)]) }, skill).status,
      decideProvenance({ ok: true, lock: lockWith([]) }, skill).status,
      decideProvenance(parseSkillLock(''), skill).status,
      decideProvenance(
        { ok: true, lock: lockWith([entryFor(skill, { approvedBy: null, approvedAt: null })]) },
        skill
      ).status,
      decideProvenance(
        { ok: true, lock: lockWith([entryFor(skill)]) },
        { ...skill, fingerprint: 'f'.repeat(64) }
      ).status,
      decideProvenance(
        { ok: true, lock: lockWith([entryFor(skill)]) },
        {
          ...skill,
          source: { host: 'local', owner: null, repo: null, revision: null },
        }
      ).status,
    ];
    expect(statuses).toEqual([
      'MATCH',
      'NOT_PINNED',
      'LOCK_UNAVAILABLE',
      'APPROVAL_MISSING',
      'DRIFT',
      'SOURCE_MISMATCH',
    ]);
    expect(statuses.filter((status) => status === 'MATCH')).toHaveLength(1);
  });
});
