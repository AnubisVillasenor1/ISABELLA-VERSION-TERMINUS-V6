/**
 * ISABELLA VILLASEÑOR AI™ — Build Fabric.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, sección 4
 * (Build Fabric: workspace + sandbox + preview + deploy) y sección 8.
 *
 * Este módulo **planifica**. No monta un workspace, no escribe en el sandbox, no
 * levanta un servidor de preview, no ejecuta comandos y no despliega. Cada paso
 * del plan declara `executed: false` y el resultado declara `executionPerformed:
 * false`, `sandboxWritten: false`, `deploymentPerformed: false`.
 *
 * Para desplegar a staging/producción el plan exige una aprobación decidida en el
 * servidor; el cuerpo HTTP nunca puede concederla.
 */
import { createHash } from 'node:crypto';
import { normalizeSandboxRelativePath, SandboxViolation } from '../agents/sandbox';
import { SkillInputError } from './skills';

export const BUILD_RUNTIMES = ['node', 'static', 'python', 'docker'] as const;
export type BuildRuntime = (typeof BUILD_RUNTIMES)[number];

export const BUILD_TARGETS = ['preview', 'staging', 'production'] as const;
export type BuildTarget = (typeof BUILD_TARGETS)[number];

export const BUILD_MAX_FILES = 200;
export const BUILD_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const BUILD_MAX_TOTAL_BYTES = 64 * 1024 * 1024;

export interface BuildFile {
  /** Relative POSIX path inside the workspace. Absolute paths are rejected. */
  readonly path: string;
  readonly bytes: number;
  /** SHA3-512 of the content when the caller already computed it. */
  readonly digest: string | null;
}

export interface BuildPlanInput {
  readonly workspaceId: string;
  readonly projectName: string;
  readonly runtime: BuildRuntime;
  readonly target: BuildTarget;
  readonly files: readonly BuildFile[];
  /** Steps requested from the allowlist of the runtime. */
  readonly commands?: readonly string[];
  /** Decided server-side before this call. The request body cannot set it. */
  readonly approvalGranted?: boolean;
  /** Clock injected for deterministic tests. */
  readonly now?: string;
}

export type BuildStepStatus = 'PLANNED' | 'BLOCKED' | 'NOT_APPLICABLE';

export interface BuildStep {
  readonly id: string;
  readonly title: string;
  readonly status: BuildStepStatus;
  readonly executed: false;
  /** Who could run it. `human` means an approval is required first. */
  readonly executor: 'runtime' | 'human' | 'none';
  readonly command: string | null;
  readonly detail: string;
  readonly digest: string;
}

export interface BuildPlan {
  readonly workspaceId: string;
  readonly projectName: string;
  readonly runtime: BuildRuntime;
  readonly target: BuildTarget;
  readonly status: 'PLANNED' | 'BLOCKED';
  readonly steps: readonly BuildStep[];
  readonly blockedReasons: readonly string[];
  readonly warnings: readonly string[];
  readonly files: { readonly count: number; readonly bytes: number; readonly digest: string };
  readonly approvalRequired: boolean;
  readonly approvalPresent: boolean;
  readonly approvalSource: 'verified-admin-token' | 'none';
  readonly planDigest: string;
  readonly executionPerformed: false;
  readonly sandboxWritten: false;
  readonly deploymentPerformed: false;
  readonly networkUsed: false;
  readonly production: false;
  readonly note: string;
}

const RUNTIME_COMMANDS: Readonly<Record<BuildRuntime, readonly string[]>> = {
  node: ['install', 'build', 'test', 'lint', 'package'],
  static: ['install', 'build', 'test', 'package'],
  python: ['install', 'test', 'lint', 'package'],
  docker: ['build', 'test', 'package'],
};

const RUNTIME_COMMAND_LINES: Readonly<Record<string, string>> = {
  install: 'install dependencies from the declared lockfile',
  build: 'compile the project with the declared toolchain',
  test: 'run the declared test suite',
  lint: 'run the declared linter',
  package: 'produce the deployable artifact',
};

function isRuntime(value: unknown): value is BuildRuntime {
  return typeof value === 'string' && (BUILD_RUNTIMES as readonly string[]).includes(value);
}

function isTarget(value: unknown): value is BuildTarget {
  return typeof value === 'string' && (BUILD_TARGETS as readonly string[]).includes(value);
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SkillInputError('INVALID_FIELD', `${field} es requerido`);
  }
  return value.trim().slice(0, max);
}

function nonNegativeInt(value: unknown, field: string, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    throw new SkillInputError('LIMIT_EXCEEDED', `${field} debe ser entero entre 0 y ${max}`);
  }
  return value;
}

function sha3(value: unknown): string {
  return createHash('sha3-512')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

function hasTests(files: readonly BuildFile[]): boolean {
  return files.some(
    (file) =>
      /(^|\/)(test|tests|__tests__)\//.test(file.path) || /\.(test|spec)\.[a-z]+$/.test(file.path)
  );
}

function hasLockfile(files: readonly BuildFile[]): boolean {
  return files.some((file) =>
    /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|requirements\.txt|Cargo\.lock|go\.sum)$/.test(
      file.path
    )
  );
}

export function parseBuildFiles(value: unknown): readonly BuildFile[] {
  if (!Array.isArray(value)) {
    throw new SkillInputError('INVALID_FIELD', 'files debe ser arreglo');
  }
  if (value.length === 0) {
    throw new SkillInputError('EMPTY_FILES', 'files no puede estar vacío');
  }
  if (value.length > BUILD_MAX_FILES) {
    throw new SkillInputError('LIMIT_EXCEEDED', `files excede ${BUILD_MAX_FILES}`);
  }

  const files = value.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new SkillInputError('INVALID_FIELD', `files[${index}] debe ser objeto`);
    }
    const item = raw as Record<string, unknown>;
    let normalized: string;
    try {
      normalized = normalizeSandboxRelativePath(String(item.path ?? ''));
    } catch (error) {
      if (error instanceof SandboxViolation) {
        throw new SkillInputError('INVALID_PATH', `files[${index}].path: ${error.code}`);
      }
      throw error;
    }
    const bytes = nonNegativeInt(item.bytes, `files[${index}].bytes`, BUILD_MAX_FILE_BYTES);
    const digest =
      typeof item.digest === 'string' && /^[0-9a-f]{128}$/i.test(item.digest.trim())
        ? item.digest.trim().toLowerCase()
        : null;
    return { path: normalized, bytes, digest };
  });
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new SkillInputError('DUPLICATE_PATH', 'files contiene rutas repetidas');
  }
  return files;
}

export function planBuild(input: BuildPlanInput): BuildPlan {
  const workspaceId = text(input.workspaceId, 'workspaceId', 120);
  const projectName = text(input.projectName, 'projectName', 120);
  if (!isRuntime(input.runtime)) {
    throw new SkillInputError('INVALID_FIELD', `runtime debe ser ${BUILD_RUNTIMES.join(', ')}`);
  }
  if (!isTarget(input.target)) {
    throw new SkillInputError('INVALID_FIELD', `target debe ser ${BUILD_TARGETS.join(', ')}`);
  }

  const files = input.files;
  if (files.length === 0) throw new SkillInputError('EMPTY_FILES', 'files no puede estar vacío');
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  if (totalBytes > BUILD_MAX_TOTAL_BYTES) {
    throw new SkillInputError(
      'LIMIT_EXCEEDED',
      `el workspace excede ${BUILD_MAX_TOTAL_BYTES} bytes`
    );
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new SkillInputError('DUPLICATE_PATH', 'files contiene rutas repetidas');
  }

  const allowed = RUNTIME_COMMANDS[input.runtime];
  const requested = input.commands ?? allowed;
  if (!Array.isArray(requested)) {
    throw new SkillInputError('INVALID_FIELD', 'commands debe ser arreglo');
  }
  const unknownCommands = requested.filter((command) => !allowed.includes(command));
  if (unknownCommands.length > 0) {
    throw new SkillInputError(
      'COMMAND_NOT_ALLOWED',
      `comandos fuera del allowlist de ${input.runtime}: ${unknownCommands.join(', ')}`
    );
  }

  const approvalRequired = input.target !== 'preview';
  const approvalPresent = input.approvalGranted === true;
  const blockedReasons: string[] = [];
  const warnings: string[] = [];

  if (approvalRequired && !approvalPresent) {
    blockedReasons.push('HUMAN_APPROVAL_REQUIRED');
  }
  if (input.target === 'production' && !hasTests(files)) {
    blockedReasons.push('TESTS_REQUIRED_FOR_PRODUCTION');
  }
  if (input.target !== 'preview' && !hasLockfile(files)) {
    blockedReasons.push('LOCKFILE_REQUIRED_FOR_DEPLOY');
  }
  if (files.some((file) => file.digest === null)) {
    warnings.push('Algunos archivos no declaran digest SHA3-512; la integridad no es verificable.');
  }
  if (!requested.includes('test')) {
    warnings.push('El plan no incluye pruebas: la calidad declarada no está respaldada.');
  }
  if (requested.includes('test') && !hasTests(files)) {
    warnings.push('No se detectaron archivos de prueba: la suite declarada no está respaldada.');
  }
  if (input.runtime === 'docker') {
    warnings.push('La imagen Docker no se construye en esta capa.');
  }

  const status = blockedReasons.length === 0 ? 'PLANNED' : 'BLOCKED';
  const createdAt = input.now ?? null;
  const base = {
    workspaceId,
    projectName,
    runtime: input.runtime,
    target: input.target,
    createdAt,
  };

  const step = (
    id: string,
    title: string,
    executor: BuildStep['executor'],
    command: string | null,
    detail: string,
    stepStatus: BuildStepStatus = status
  ): BuildStep => ({
    id,
    title,
    status: stepStatus,
    executed: false,
    executor,
    command,
    detail,
    digest: sha3({ ...base, id, command, detail }),
  });

  const steps: BuildStep[] = [
    step(
      'workspace.create',
      'Crear workspace efímero',
      'runtime',
      null,
      `Workspace ${workspaceId} aislado por digest; no se creó en disco.`
    ),
    step(
      'sandbox.mount',
      'Montar archivos en sandbox',
      'runtime',
      null,
      `${files.length} archivo(s), ${totalBytes} bytes; no se escribió ningún archivo.`
    ),
  ];

  if (requested.includes('install')) {
    steps.push(
      step(
        'dependencies.install',
        'Instalar dependencias',
        'runtime',
        RUNTIME_COMMAND_LINES.install ?? 'install',
        hasLockfile(files)
          ? 'Lockfile declarado; instalación reproducible en teoría.'
          : 'Sin lockfile declarado; la instalación no sería reproducible.'
      )
    );
  }
  if (requested.includes('build')) {
    steps.push(
      step(
        'build.compile',
        'Compilar',
        'runtime',
        RUNTIME_COMMAND_LINES.build ?? 'build',
        `Runtime ${input.runtime}.`
      )
    );
  }
  if (requested.includes('lint')) {
    steps.push(
      step(
        'quality.lint',
        'Lint',
        'runtime',
        RUNTIME_COMMAND_LINES.lint ?? 'lint',
        'Solo si el proyecto declara linter.'
      )
    );
  }
  if (requested.includes('test')) {
    steps.push(
      step(
        'quality.test',
        'Ejecutar pruebas',
        'runtime',
        RUNTIME_COMMAND_LINES.test ?? 'test',
        hasTests(files)
          ? 'Se detectaron archivos de prueba.'
          : 'No se detectaron archivos de prueba.'
      )
    );
  }
  if (requested.includes('package')) {
    steps.push(
      step(
        'artifact.package',
        'Empaquetar artefacto',
        'runtime',
        RUNTIME_COMMAND_LINES.package ?? 'package',
        'El artefacto no se generó.'
      )
    );
  }

  if (input.target === 'preview') {
    steps.push(
      step('preview.publish', 'Publicar preview', 'runtime', null, 'El preview no se levantó.')
    );
  } else {
    steps.push(
      step(
        'deploy.request',
        `Solicitar despliegue a ${input.target}`,
        'human',
        null,
        approvalPresent
          ? 'Aprobación verificada en el servidor; el despliegue sigue sin ejecutarse.'
          : 'Requiere aprobación humana verificada en el servidor.',
        approvalPresent ? 'PLANNED' : 'BLOCKED'
      )
    );
  }

  const planDigest = sha3({
    base,
    files: files.map((file) => `${file.path}:${file.bytes}:${file.digest ?? 'none'}`).sort(),
    steps: steps.map((item) => `${item.id}:${item.status}`),
  });

  return {
    workspaceId,
    projectName,
    runtime: input.runtime,
    target: input.target,
    status,
    steps,
    blockedReasons,
    warnings,
    files: {
      count: files.length,
      bytes: totalBytes,
      digest: sha3(
        files.map((file) => `${file.path}:${file.bytes}:${file.digest ?? 'none'}`).sort()
      ),
    },
    approvalRequired,
    approvalPresent,
    approvalSource: approvalPresent ? 'verified-admin-token' : 'none',
    planDigest,
    executionPerformed: false,
    sandboxWritten: false,
    deploymentPerformed: false,
    networkUsed: false,
    production: false,
    note: 'Un plan no es una ejecución: ningún paso ocurrió. El despliegue exige aprobación humana y un runner real.',
  };
}

export function describeBuildFabric(): Readonly<Record<string, unknown>> {
  return {
    runtimes: BUILD_RUNTIMES,
    targets: BUILD_TARGETS,
    limits: {
      maxFiles: BUILD_MAX_FILES,
      maxFileBytes: BUILD_MAX_FILE_BYTES,
      maxTotalBytes: BUILD_MAX_TOTAL_BYTES,
    },
    commands: RUNTIME_COMMANDS,
    executionPerformed: false,
    deploymentPerformed: false,
    note: 'Build Fabric planifica; no ejecuta ni despliega.',
  };
}
