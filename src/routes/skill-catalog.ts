/**
 * Introspección de sólo lectura del registro canónico de skills.
 *
 * Expone estado de capacidad, no autoridad: una skill que pasa el portón del
 * registro sigue necesitando autorización y ejecución gobernadas.
 * state: draft | engine-generated — pendiente de revisión humana.
 */
import type { Application, Request, RequestHandler, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import {
  ISABELLA_SKILLS,
  SkillId,
  skillGroups,
  type IsabellaSkill,
} from '../lib/lib/skill-registry';
import { capabilityRegistry, type CapabilityState } from '../lib/lib/capability-registry';
import { bindingView, catalogCoherence } from '../skills/catalog-coherence';

export const SKILL_CATALOG_ROUTES_VERSION = '1.0.0' as const;
export const SKILL_CATALOG_DISCLOSURE =
  'CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION' as const;

/**
 * Superficie publica declarada: solo introspeccion de capacidad ya registrada.
 * Any other route group must wire an authorization gate instead of reusing this token.
 */
export const SKILL_CATALOG_PUBLIC_SURFACE = 'read-only-capability-introspection' as const;

export interface SkillCatalogRouteDeps {
  readonly app: Application;
  readonly enforceRateLimit: (
    req: Request,
    res: Response,
    limiter: FixedWindowRateLimiter,
    bucket: string
  ) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  readonly publicSurface: typeof SKILL_CATALOG_PUBLIC_SURFACE;
}

interface SkillView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly folder: string;
  readonly subfolder: string;
  readonly capability: string;
  readonly capabilityState: CapabilityState;
  readonly skillStatus: IsabellaSkill['status'];
  readonly passesRegistryGate: boolean;
  readonly requiredScopes: readonly string[];
  /** True solo si existe un handler canónico enlazado bajo este id. */
  readonly handlerBound: boolean;
  /** Id del registry ejecutable, o null si la declaración no tiene ejecución. */
  readonly executableId: string | null;
  /** Pseudónimo de otra entrada del catálogo: no es una capacidad adicional. */
  readonly aliasOf: string | null;
  /** El estado declarado está soportado por evidencia de enlace. */
  readonly claimSupported: boolean;
  /** Entrada del catálogo invocable; si es falsa, es declaración de subsistema. */
  readonly invocable: boolean;
  /** El estado declarado afirma que ya hay algo ejecutable detrás. */
  readonly declaresExecution: boolean;
}

function toSkillView(skill: IsabellaSkill): SkillView {
  const capabilityState = capabilityRegistry.stateOf(skill.capability);
  const binding = bindingView(skill.id);
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    folder: skill.folder,
    subfolder: skill.subfolder,
    capability: skill.capability,
    capabilityState,
    skillStatus: skill.status,
    passesRegistryGate:
      capabilityRegistry.isOperational(skill.capability) || skill.status === 'experimental',
    requiredScopes: skill.requiredScopes,
    handlerBound: binding?.handlerBound ?? false,
    executableId: binding?.executableId ?? null,
    aliasOf: binding?.aliasOf ?? null,
    claimSupported: binding?.claimSupported ?? false,
    invocable: binding?.invocable ?? false,
    declaresExecution: binding?.declaresExecution ?? false,
  };
}

function catalogBody(): {
  version: string;
  disclosure: string;
  summary: {
    skills: number;
    passingRegistryGate: number;
    blockedByRegistryGate: number;
    capabilityStates: Record<string, CapabilityState>;
    declared: number;
    executable: number;
    bound: number;
    unbound: number;
    aliases: number;
    distinctCapabilities: number;
    invocable: number;
    invocableBound: number;
    unsupportedClaims: readonly string[];
  };
  groups: Array<{ folder: string; items: SkillView[] }>;
} {
  const groups = skillGroups().map((group) => ({
    folder: group.folder,
    items: group.items.map(toSkillView),
  }));
  const views = groups.flatMap((group) => group.items);
  const passing = views.filter((view) => view.passesRegistryGate).length;
  const capabilityStates: Record<string, CapabilityState> = {};
  for (const skill of ISABELLA_SKILLS) {
    capabilityStates[skill.capability] = capabilityRegistry.stateOf(skill.capability);
  }
  const coherence = catalogCoherence();
  return {
    version: SKILL_CATALOG_ROUTES_VERSION,
    disclosure: SKILL_CATALOG_DISCLOSURE,
    summary: {
      skills: views.length,
      passingRegistryGate: passing,
      blockedByRegistryGate: views.length - passing,
      capabilityStates,
      declared: coherence.declared,
      executable: coherence.executable,
      bound: coherence.bound,
      unbound: coherence.unbound,
      aliases: coherence.aliases,
      distinctCapabilities: coherence.distinctCapabilities,
      invocable: coherence.invocable,
      invocableBound: coherence.invocableBound,
      unsupportedClaims: coherence.unsupportedClaims,
    },
    groups,
  };
}

export function registerSkillCatalogRoutes(deps: SkillCatalogRouteDeps): void {
  const list: RequestHandler = (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'skill-catalog')) return;
    res.json(catalogBody());
  };

  const byId: RequestHandler = (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'skill-catalog')) return;
    const requested = req.params.id ?? '';
    if (!SkillId.safeParse(requested).success) {
      res.status(400).json({ error: 'SKILL_ID_INVALID' });
      return;
    }
    const skill = ISABELLA_SKILLS.find((item) => item.id === requested);
    if (!skill) {
      res.status(404).json({ error: 'SKILL_NOT_FOUND' });
      return;
    }
    res.json({ ...toSkillView(skill), disclosure: SKILL_CATALOG_DISCLOSURE });
  };

  deps.app.get('/api/skills/catalog', list);
  deps.app.get('/api/skills/catalog/:id', byId);
}
