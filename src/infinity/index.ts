/**
 * ISABELLA VILLASEÑOR AI™ — Master Consolidated fusion surface.
 * state: draft | engine-generated.
 *
 * Punto único de importación del subsistema `infinity`. Nada aquí es producción:
 * `production` es `false` en todos los resúmenes y ningún módulo ejecuta acciones
 * externas, despliega, publica o emite créditos.
 */
export {
  MATURITY_STATES,
  EVIDENCE_KINDS,
  EXECUTION_MODES,
  auditReport,
  isMaturityState,
  isExecutionMode,
  type MaturityState,
  type EvidenceKind,
  type EvidenceRef,
  type ExecutionMode,
  type AuditIssue,
  type AuditReport,
} from './types';

export {
  OMEGA_LAYERS,
  FABRICS,
  summarizeArchitecture,
  auditArchitecture,
  type OmegaLayer,
  type FabricDescriptor,
  type ArchitectureSummary,
} from './architecture';

export {
  CATALOG,
  catalogByKind,
  summarizeCatalog,
  auditCatalog,
  type CatalogEntry,
  type CatalogSummary,
  type ComponentKind,
} from './catalog';

export {
  SECURITY_VECTORS,
  vectorProduct,
  missingVectors,
  validateLicense,
  evaluateIngestion,
  evaluateLearning,
  evaluateConstitutional,
  calculateTrust,
  type SecurityVectorName,
  type SecurityVectors,
  type DomainAction,
  type ConstitutionalVerdict,
  type ConstitutionalRequest,
  type ConstitutionalDecision,
  type IngestionDeclaration,
  type IngestionDecision,
  type IngestionStage,
  type IngestionStageStatus,
  type LearningOperation,
  type LearningDecision,
  type LicenseVerdict,
  type TrustSignals,
  type TrustScore,
  type TrustBand,
} from './constitution';

export {
  NATIVE_SKILLS,
  SkillInputError,
  describeNativeSkills,
  isNativeSkillId,
  runNativeSkill,
  digest,
  jaccard,
  tokens,
  isValidDoi,
  type SkillId,
  type SkillContext,
  type SkillDefinition,
  type SkillOutcome,
  type SkillRunResult,
  type SkillStatus,
} from './skills';

export {
  MEDIA_OPERATIONS,
  describeMediaOperations,
  isMediaOperation,
  runMediaOperation,
  type MediaOperation,
  type MediaResult,
} from './media';

export {
  DESIGN_PALETTES,
  generateDesignTokens,
  isDesignPalette,
  describeDesignTokens,
  type DesignPalette,
  type DesignToken,
  type DesignTokenSet,
} from './design-tokens';

export {
  SUPPORTED_LOCALES,
  selectLocale,
  translate,
  listMessages,
  i18nDigest,
  isSupportedLocale,
  describeI18n,
  type Locale,
  type MessageCatalog,
} from './i18n';

export {
  A11Y_CHECKS,
  evaluateA11y,
  isA11yCheck,
  describeA11y,
  type A11yCheck,
  type A11yDeclaration,
  type A11yFinding,
  type A11yReport,
} from './accessibility';

export {
  BUILD_RUNTIMES,
  BUILD_TARGETS,
  BUILD_MAX_FILES,
  BUILD_MAX_FILE_BYTES,
  BUILD_MAX_TOTAL_BYTES,
  parseBuildFiles,
  planBuild,
  describeBuildFabric,
  type BuildRuntime,
  type BuildTarget,
  type BuildFile,
  type BuildPlanInput,
  type BuildPlan,
  type BuildStep,
  type BuildStepStatus,
} from './build';

export {
  A2A_VERBS,
  MAX_GENES,
  MAX_POPULATION,
  MAX_GENERATIONS,
  MAX_LEDGER_EVENTS,
  calculateFitness,
  createCapsule,
  geneticDiversityIndex,
  evolvePopulation,
  evaluateA2A,
  EvolutionLedger,
  EvolutionFabric,
  describeEvolutionFabric,
  type Gene,
  type GeneInput,
  type GeneOrigin,
  type CapsuleSignals,
  type CapsuleInput,
  type CapsuleFitness,
  type Capsule,
  type EvolutionRequest,
  type EvolutionReport,
  type GenerationReport,
  type EvolutionEvent,
  type EvolutionFabricResult,
  type A2AVerb,
  type A2AVerdict,
  type A2AEvaluation,
} from './evolution-fabric';

import { summarizeArchitecture, auditArchitecture } from './architecture';
import { summarizeCatalog, auditCatalog } from './catalog';
import { describeNativeSkills } from './skills';
import { describeMediaOperations } from './media';
import { describeDesignTokens } from './design-tokens';
import { describeI18n } from './i18n';
import { describeA11y } from './accessibility';
import { describeBuildFabric } from './build';
import { describeEvolutionFabric } from './evolution-fabric';

export interface InfinitySummary {
  readonly version: string;
  readonly production: false;
  readonly executionPerformed: false;
  readonly architecture: ReturnType<typeof summarizeArchitecture>;
  readonly catalog: ReturnType<typeof summarizeCatalog>;
  readonly skills: ReturnType<typeof describeNativeSkills>;
  readonly media: ReturnType<typeof describeMediaOperations>;
  readonly build: ReturnType<typeof describeBuildFabric>;
  readonly evolution: ReturnType<typeof describeEvolutionFabric>;
  readonly designTokens: ReturnType<typeof describeDesignTokens>;
  readonly i18n: ReturnType<typeof describeI18n>;
  readonly accessibility: ReturnType<typeof describeA11y>;
  readonly audit: {
    readonly ok: boolean;
    readonly issues: number;
  };
  readonly disclaimers: readonly string[];
}

/**
 * Resumen honesto de la fusión. No declara madurez mayor que la evidencia:
 * `tested` significa pruebas unitarias verdes, no producción.
 */
export function describeInfinity(): InfinitySummary {
  const architectureAudit = auditArchitecture();
  const catalogAudit = auditCatalog();
  return {
    version: 'ISABELLA-MASTER-V1.0-CONSOLIDATED',
    production: false,
    executionPerformed: false,
    architecture: summarizeArchitecture(),
    catalog: summarizeCatalog(),
    skills: describeNativeSkills(),
    media: describeMediaOperations(),
    build: describeBuildFabric(),
    evolution: describeEvolutionFabric(),
    designTokens: describeDesignTokens(),
    i18n: describeI18n(),
    accessibility: describeA11y(),
    audit: {
      ok: architectureAudit.ok && catalogAudit.ok,
      issues: architectureAudit.issues.length + catalogAudit.issues.length,
    },
    disclaimers: [
      '20× es una meta por capacidad específica, no un resultado medido.',
      'SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION.',
      'Un ALLOW constitucional no concede autoridad ni ejecuta.',
      'Build Fabric planifica; no despliega.',
      'Evolution Fabric simula en memoria; no publica ni emite créditos.',
      'Media Fabric no modifica píxeles ni usa la red.',
    ],
  };
}
