/**
 * ISABELLA CERO — sandbox de archivos (fusión 2026-11-01).
 * state: draft | engine-generated.
 *
 * Endurece el `safeSandboxPath` del canon CERO (sección 32). El original usaba
 * `resolved.startsWith(root)`, que acepta un directorio hermano como
 * `/tmp/sandbox-evil` cuando la raíz es `/tmp/sandbox`. Aquí:
 *
 *   - la ruta se rechaza si es absoluta, contiene NUL o algún segmento `..`;
 *   - se compara con `path.relative` y se exige que no empiece por `..`;
 *   - se recorren los componentes existentes y se rechaza cualquier symlink;
 *   - se aplican límites de tamaño antes de leer o escribir;
 *   - el contenido se identifica con SHA3-512.
 *
 * Este módulo no decide autoridad: quien escribe debe haber pasado CROWN y, si
 * aplica, aprobación humana. Escribir en el sandbox no equivale a producción.
 *
 * Límite declarado: la comprobación de symlinks es previa a la operación, así que
 * un adversario con control concurrente del sistema de archivos podría explotar una
 * ventana TOCTOU. El sandbox es una barrera de contención de agentes, no un límite
 * de seguridad contra un proceso hostil con acceso al mismo directorio.
 */
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export const SANDBOX_MAX_FILE_BYTES = 256 * 1024;
export const SANDBOX_MAX_PATH_CHARS = 1_024;
export const SANDBOX_MAX_LIST_ENTRIES = 500;

export type SandboxViolationCode =
  | 'INVALID_ROOT'
  | 'EMPTY_PATH'
  | 'PATH_TOO_LONG'
  | 'NUL_BYTE'
  | 'ABSOLUTE_PATH'
  | 'PATH_TRAVERSAL'
  | 'SYMLINK_ESCAPE'
  | 'FILE_TOO_LARGE'
  | 'NOT_A_FILE';

export class SandboxViolation extends Error {
  readonly code: SandboxViolationCode;

  constructor(code: SandboxViolationCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'SandboxViolation';
    this.code = code;
  }
}

function sha3_512(content: string | Uint8Array): string {
  return createHash('sha3-512').update(content).digest('hex');
}

function normalizeRoot(root: string): string {
  if (typeof root !== 'string' || !root.trim()) {
    throw new SandboxViolation('INVALID_ROOT', 'la raíz del sandbox es obligatoria');
  }
  const resolved = resolve(root);
  if (!isAbsolute(resolved)) {
    throw new SandboxViolation('INVALID_ROOT', 'la raíz del sandbox debe ser absoluta');
  }
  return resolved;
}

/**
 * Convierte una ruta relativa declarada por un agente en una ruta relativa
 * normalizada con separador POSIX. Lanza `SandboxViolation` en cualquier intento
 * de salir del sandbox.
 */
export function normalizeSandboxRelativePath(input: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new SandboxViolation('EMPTY_PATH', 'la ruta relativa es obligatoria');
  }
  const value = input.trim();
  if (value.length > SANDBOX_MAX_PATH_CHARS) {
    throw new SandboxViolation('PATH_TOO_LONG', `máximo ${SANDBOX_MAX_PATH_CHARS} caracteres`);
  }
  if (value.includes('\0')) {
    throw new SandboxViolation('NUL_BYTE', 'la ruta contiene un byte NUL');
  }
  if (isAbsolute(value) || /^[a-zA-Z]:/.test(value) || /^[\\/]/.test(value)) {
    throw new SandboxViolation('ABSOLUTE_PATH', 'solo se aceptan rutas relativas');
  }

  const segments = value.replace(/\\/g, '/').split('/');
  const clean: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      throw new SandboxViolation('PATH_TRAVERSAL', 'la ruta intenta salir del sandbox');
    }
    clean.push(segment);
  }
  if (clean.length === 0) {
    throw new SandboxViolation('EMPTY_PATH', 'la ruta no contiene un archivo');
  }
  return clean.join('/');
}

export interface SandboxPath {
  readonly root: string;
  readonly absolute: string;
  readonly relative: string;
}

/** Resuelve una ruta relativa y verifica contención estricta dentro de la raíz. */
export function resolveSandboxPath(root: string, input: string): SandboxPath {
  const normalizedRoot = normalizeRoot(root);
  const normalizedRelative = normalizeSandboxRelativePath(input);
  const absolute = resolve(normalizedRoot, normalizedRelative.split('/').join(sep));
  const rel = relative(normalizedRoot, absolute);

  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new SandboxViolation('PATH_TRAVERSAL', 'la ruta resuelta queda fuera del sandbox');
  }

  return { root: normalizedRoot, absolute, relative: normalizedRelative };
}

async function assertNoSymlink(path: SandboxPath): Promise<void> {
  const segments = path.relative.split('/');
  let current = path.root;
  for (const segment of segments) {
    current = resolve(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        throw new SandboxViolation(
          'SYMLINK_ESCAPE',
          'uno de los componentes es un enlace simbólico'
        );
      }
    } catch (error) {
      if (error instanceof SandboxViolation) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // El componente aún no existe: no hay symlink que seguir.
        return;
      }
      throw error;
    }
  }
}

export interface SandboxWriteResult {
  readonly relative: string;
  readonly bytes: number;
  readonly sha3_512: string;
  readonly created: boolean;
}

export async function writeSandboxFile(
  root: string,
  input: string,
  content: string,
  options: { readonly maxBytes?: number } = {}
): Promise<SandboxWriteResult> {
  if (typeof content !== 'string') {
    throw new SandboxViolation('NOT_A_FILE', 'el contenido debe ser texto');
  }
  const maxBytes = options.maxBytes ?? SANDBOX_MAX_FILE_BYTES;
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > maxBytes) {
    throw new SandboxViolation('FILE_TOO_LARGE', `máximo ${maxBytes} bytes, recibidos ${bytes}`);
  }

  const path = resolveSandboxPath(root, input);
  await assertNoSymlink(path);

  const created = await lstat(path.absolute).then(
    () => false,
    () => true
  );
  await mkdir(dirname(path.absolute), { recursive: true });
  await writeFile(path.absolute, content, { encoding: 'utf8', mode: 0o600 });

  return { relative: path.relative, bytes, sha3_512: sha3_512(content), created };
}

export interface SandboxReadResult {
  readonly relative: string;
  readonly content: string;
  readonly bytes: number;
  readonly sha3_512: string;
}

export async function readSandboxFile(
  root: string,
  input: string,
  options: { readonly maxBytes?: number } = {}
): Promise<SandboxReadResult> {
  const maxBytes = options.maxBytes ?? SANDBOX_MAX_FILE_BYTES;
  const path = resolveSandboxPath(root, input);
  await assertNoSymlink(path);

  const info = await lstat(path.absolute);
  if (!info.isFile()) {
    throw new SandboxViolation('NOT_A_FILE', 'la ruta no es un archivo regular');
  }
  if (info.size > maxBytes) {
    throw new SandboxViolation(
      'FILE_TOO_LARGE',
      `máximo ${maxBytes} bytes, encontrados ${info.size}`
    );
  }

  const content = await readFile(path.absolute, 'utf8');
  return {
    relative: path.relative,
    content,
    bytes: Buffer.byteLength(content, 'utf8'),
    sha3_512: sha3_512(content),
  };
}

/** Lista acotada y determinista de archivos del sandbox, sin seguir symlinks. */
export async function listSandboxFiles(
  root: string,
  options: { readonly maxEntries?: number } = {}
): Promise<readonly string[]> {
  const normalizedRoot = normalizeRoot(root);
  const maxEntries = Math.min(
    SANDBOX_MAX_LIST_ENTRIES,
    Math.max(1, options.maxEntries ?? SANDBOX_MAX_LIST_ENTRIES)
  );
  const found: string[] = [];

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 8 || found.length >= maxEntries) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (found.length >= maxEntries) return;
      if (entry.isSymbolicLink()) continue;
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, depth + 1);
      } else if (entry.isFile()) {
        found.push(relative(normalizedRoot, absolute).split(sep).join('/'));
      }
    }
  }

  await walk(normalizedRoot, 0);
  return found;
}
