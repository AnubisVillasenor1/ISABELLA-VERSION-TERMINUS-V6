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
  type AuditReport as GovernanceAuditReport,
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
  inspectJurisdiction,
  isJurisdictionValue,
  describeJurisdictionalGateway,
  type Jurisdiction,
  type JurisdictionalPayload,
  type JurisdictionalResult,
} from './jurisdictional-gateway';

export {
  TAMVProvenanceGenome,
  generateProvenanceGenome,
  verifyProvenanceGenome,
  describeProvenanceGenome,
  type ProvenanceGenomeInput,
  type ProvenanceGenomeResult,
} from './provenance-genome';

export {
  TAMVCognitiveModulator,
  modulatePrompt,
  isCognitiveLayers,
  describeCognitiveModulation,
  type CognitiveLayers,
  type ModulatedPrompt,
} from './cognitive-modulation';

export {
  DEFAULT_THRESHOLDS,
  M6FailClosedEngine,
  describeM6FailClosed,
  type M6State,
  type M6Verdict,
  type M6Thresholds,
  type M6SafetyInputs,
  type M6Factors,
  type M6Command,
  type M6Evaluation,
  type EpochState,
} from './m6-fail-closed';

export {
  TELEMETRY_TOPICS,
  TELEMETRY_SCHEMAS,
  validateTelemetryPayload,
  detectAnomaly,
  parseRecallAlert,
  createVisionGuardMetadata,
  AEGIS_MODULES,
  describeAegisKineta,
  type TelemetryTopic,
  type TelemetryPayload,
  type TelemetrySchema,
  type TimeSeriesPoint,
  type AnomalyResult,
  type RecallAlert,
  type VisionGuardMetadata,
} from './aegis-kineta';

export {
  analyzeCode,
  describeCodeAnalysis,
  type CodeAnalysisResult,
} from './code-analysis';

export {
  ResponseCache,
  LatencyTracker,
  cacheKey,
  describePerformanceFabric,
  type CacheEntry,
  type PerformanceMetrics,
} from './performance-fabric';

export {
  NATIVE_SKILLS_REGISTRY,
  listNativeSkills,
  getNativeSkill,
  nativeSkillDigest,
  describeNativeSkillRegistry,
  type NativeSkill,
} from './native-skill-registry';

export {
  PQC_ALGORITHMS,
  CLASSICAL_ALGORITHMS,
  resolvePqcPolicy,
  isPqcConstruction,
  describePqcPolicy,
  type PqcConstruction,
  type PqcPolicy,
} from './pqc-policy';

export {
  ANCHOR_NETWORKS,
  anchorMerkleRoot,
  verifyMerkleProof,
  describeBlockchainAnchor,
  isAnchorNetwork,
  type AnchorNetwork,
  type AnchorRecord,
  type AnchorProof,
} from './blockchain-anchor';

export {
  INCIDENT_TAXONOMY,
  IncidentRegistry,
  CrownOffice,
  StandardsRegistry,
  DataProvenance,
  CapacityRegistry,
  ForumRegistry,
  generateAuditReport,
  exportInterop,
  summarizeGovernanceEvolution,
  describeGovernanceEvolution,
  type Incident,
  type IncidentTaxonomy,
  type IncidentSeverity,
  type CrownDecision,
  type Standard,
  type DataAsset,
  type CapacityModule,
  type ForumRegistration,
  type AuditReport,
  type InteropExport,
  type GovernanceEvolutionSummary,
} from './governance-evolution';

export {
  RecoveryStore,
  RecoveryEngine,
  MetaCognitiveRecoveryAdapter,
  describeDurableRecovery,
  type Job,
  type JobState,
  type OutboxEntry,
  type RecoveryProvider,
  type RecoveryConfig,
  type ProviderResult,
  Ed25519Signer,
  EventLog,
  type TAMVEvent,
  stableOperationId,
  merkleRoot,
} from './durable-recovery';

export {
  MetaCognitiveOrchestrator,
  describeMetaCognitiveOrchestrator,
  type OrchestrationInput,
  type OrchestrationResult,
} from './meta-cognitive-orchestrator';

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
import { describeJurisdictionalGateway } from './jurisdictional-gateway';
import { describeProvenanceGenome } from './provenance-genome';
import { describeCognitiveModulation } from './cognitive-modulation';
import { describeM6FailClosed } from './m6-fail-closed';
import { describeAegisKineta } from './aegis-kineta';
import { describeCodeAnalysis } from './code-analysis';
import { describePerformanceFabric } from './performance-fabric';
import { describeNativeSkillRegistry } from './native-skill-registry';
import { describePqcPolicy } from './pqc-policy';
import { describeBlockchainAnchor } from './blockchain-anchor';
import { describeGovernanceEvolution } from './governance-evolution';
import { describeDurableRecovery } from './durable-recovery';
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
  readonly m6FailClosed: ReturnType<typeof describeM6FailClosed>;
  readonly aegisKineta: ReturnType<typeof describeAegisKineta>;
  readonly codeAnalysis: ReturnType<typeof describeCodeAnalysis>;
  readonly performanceFabric: ReturnType<typeof describePerformanceFabric>;
  readonly nativeSkillRegistry: ReturnType<typeof describeNativeSkillRegistry>;
  readonly pqcPolicy: ReturnType<typeof describePqcPolicy>;
  readonly blockchainAnchor: ReturnType<typeof describeBlockchainAnchor>;
  readonly governanceEvolution: ReturnType<typeof describeGovernanceEvolution>;
  readonly durableRecovery: ReturnType<typeof describeDurableRecovery>;
  readonly jurisdictionalGateway: ReturnType<typeof describeJurisdictionalGateway>;
  readonly provenanceGenome: ReturnType<typeof describeProvenanceGenome>;
  readonly cognitiveModulation: ReturnType<typeof describeCognitiveModulation>;
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
    m6FailClosed: describeM6FailClosed(),
    aegisKineta: describeAegisKineta(),
    codeAnalysis: describeCodeAnalysis(),
    performanceFabric: describePerformanceFabric(),
    nativeSkillRegistry: describeNativeSkillRegistry(),
    pqcPolicy: describePqcPolicy(),
    blockchainAnchor: describeBlockchainAnchor(),
    governanceEvolution: describeGovernanceEvolution(),
    durableRecovery: describeDurableRecovery(),
    jurisdictionalGateway: describeJurisdictionalGateway(),
    provenanceGenome: describeProvenanceGenome(),
    cognitiveModulation: describeCognitiveModulation(),
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
