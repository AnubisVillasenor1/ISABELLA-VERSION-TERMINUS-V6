/**
 * Puente del pack de skills evolucionadas hacia el registro canónico CSF-Ω.
 *
 * Las 22 skills (733-754) vivían en la isla `src/lib/lib/skills` y nunca se
 * registraban en `SkillRegistry`, así que ni `tools/list` de MCP ni
 * `/api/v1/hypercore/skills/execute` podían verlas. Este puente las adapta a
 * `SkillDescriptor` y aplica la compuerta de evidencia: una skill bloqueada por
 * afirmaciones no attestables lo está también aquí, no solo en su módulo fuente.
 *
 * state: engine-generated — revisión humana pendiente.
 */
import { evolvedSkillsPack } from '../lib/lib/skills/evolved-skills-pack';
import { guardEvidence } from '../lib/lib/skills/skill-evidence-guard';
import type {
  IsabellaSkill,
  SkillContext as IslandContext,
  SkillRisk,
} from '../lib/lib/skills/contracts';
import type { RiskTier } from '../authority/method-id';
import { DISCLOSURE_EVIDENCE } from '../lib/lib/skills/skill-evidence-guard';
import type { SkillContext, SkillDescriptor } from './registry';
import { sha256 } from './canonical-json';

type EvolvedSkill = IsabellaSkill<Record<string, unknown>, Record<string, unknown>>;

export const EVOLVED_BRIDGE_VERSION = '1.0.0' as const;
export const EVOLVED_SCOPE = 'isabella:chat' as const;
export const EVOLVED_TINA = 'A' as const;
export const EVOLVED_YUN = 'COLLECTIVE_INTELLIGENCE' as const;
export const EVOLVED_MODULE = 'E07_EVOLVED' as const;

const RISK_TO_TIER: Readonly<Record<SkillRisk, RiskTier>> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const GOVERNANCE_BY_RISK: Readonly<Record<SkillRisk, string>> = {
  LOW: 'OPERATIONAL',
  MEDIUM: 'OPERATIONAL',
  HIGH: 'INSTITUTIONAL',
  CRITICAL: 'CONSTITUTIONAL',
};

const OUTPUT_SCHEMA = {
  type: 'object',
  required: ['skillId', 'status', 'summary', 'evidence', 'warnings'],
  additionalProperties: true,
  properties: {
    skillId: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['SUCCESS', 'PARTIAL', 'BLOCKED', 'ESCALATED', 'FAILED'] },
    summary: { type: 'string' },
    evidence: { type: 'array' },
    warnings: { type: 'array' },
    requiresHumanReview: { type: 'boolean' },
  },
} as const;

export function evolvedMethodId(skillId: string, risk: SkillRisk, version: string): string {
  const fn = `execute_${skillId.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase()}`;
  const core = version.match(/\d+\.\d+\.\d+/)?.[0] ?? '0.0.0';
  return [
    EVOLVED_TINA,
    EVOLVED_YUN,
    EVOLVED_MODULE,
    fn,
    `v${core}`,
    RISK_TO_TIER[risk],
    GOVERNANCE_BY_RISK[risk],
  ].join('.');
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/**
 * Adapta una skill del pack a descriptor canónico. El `handler` recibe el
 * contexto CSF-Ω, construye el contexto de la isla y pasa el resultado por la
 * compuerta de evidencia antes de entregarlo.
 */
export function toEvolvedSkillDescriptor(skill: EvolvedSkill): SkillDescriptor {
  const tier = RISK_TO_TIER[skill.risk];
  const stepUp = skill.risk === 'HIGH' || skill.risk === 'CRITICAL';
  return {
    id: skill.id,
    version: skill.version,
    methodId: evolvedMethodId(skill.id, skill.risk, skill.version),
    riskTier: tier,
    requiresEvidence: false,
    contract: {
      inputSchema: {
        type: 'object',
        additionalProperties: true,
        required: [],
      },
      outputSchema: OUTPUT_SCHEMA,
      authority: {
        requiredScopes: [EVOLVED_SCOPE],
        requiresStepUp: stepUp,
        requiresQuorum: false,
      },
      evidencePolicy: { required: false, piiRedaction: true, retentionDays: 365 },
      limits: {
        maxLatencyMs: 5_000,
        maxMemoryMb: 128,
        maxCallsPerMinute: 60,
        maxEnergyUnits: 500,
      },
      rollback: { supported: false, strategy: 'none' },
    },
    handler: async (ctx: SkillContext): Promise<unknown> => {
      const input = (ctx.input ?? {}) as Record<string, unknown>;
      const islandContext: IslandContext = {
        requestId: ctx.requestId,
        actorId: ctx.principal?.id ?? 'service:mcp',
        locale: 'es-MX',
        federation: skill.federation,
        intent: asString(input.intent, skill.id),
        text: asString(input.task ?? input.prompt, ''),
        metadata: {
          traceId: ctx.traceId,
          tenantId: ctx.tenantId ?? null,
          grantedScopes: ctx.grantedScopes ?? [],
          bridgeVersion: EVOLVED_BRIDGE_VERSION,
        },
      };

      if (!skill.canRun(input, islandContext)) {
        return {
          skillId: skill.id,
          status: 'BLOCKED',
          summary: `${skill.id}: la entrada no satisface el contrato minimo de la skill.`,
          data: { rejected: 'input', inputDigest: sha256(input) },
          evidence: [],
          warnings: ['entrada insuficiente', DISCLOSURE_EVIDENCE],
          requiresHumanReview: false,
        };
      }

      const raw = await skill.run(input, islandContext);
      const { result, suppressed } = guardEvidence(raw, { actorId: islandContext.actorId });
      if (suppressed.length === 0) return result;
      return { ...result, data: { ...result.data, bridgeVersion: EVOLVED_BRIDGE_VERSION } };
    },
  };
}

/**
 * Los 22 descriptores canónicos, ordenados por id para que el manifest del
 * registro sea estable entre arranques.
 */
export const EVOLVED_SKILL_DESCRIPTORS: readonly SkillDescriptor[] = Object.values(
  evolvedSkillsPack
)
  .map((skill) => toEvolvedSkillDescriptor(skill as EvolvedSkill))
  .sort((left, right) => left.id.localeCompare(right.id));
