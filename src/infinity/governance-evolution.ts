/**
 * ISABELLA VILLASEÑOR AI™ — Governance Evolution (UN report alignment).
 * state: draft | engine-generated.
 *
 * Implementa los 10 ítems priorizados del informe "Governing AI for Humanity"
 * (ONU) de forma nativa y determinista. Sin base de datos real ni conexión
 * externa: todos los registros son in-memory (referencia local).
 *
 * Módulos cubiertos:
 *   1. Incident Registry + risk pulse + heat map
 *   2. CROWN fail-closed (decide, no ejecuta)
 *   3. Standards Registry + gaps
 *   4. Data Provenance (consentimiento, idioma, diversidad)
 *   5. CROWN como oficina interna (coordina, no ejecuta)
 *   6. Capacity (español, ALC, ODS) + sandbox
 *   7. Audit report (interno)
 *   8. Interop (exportación interoperable)
 *   9. ALC alignment
 *  10. Forum registration
 *
 * `executionPerformed` es siempre `false`. `production_safe` es siempre `false`.
 */
import { digest, SkillInputError } from './skills';

// ── Taxonomy ───────────────────────────────────────────────────────────────

export const INCIDENT_TAXONOMY = [
  'information_integrity',
  'malicious_use',
  'bias',
  'human_rights',
  'unintended_autonomy',
  'multi_agent',
  'privacy',
  'security',
  'environmental',
  'labor_displacement',
  'concentration',
  'transparency',
  'accountability',
  'safety',
] as const;
export type IncidentTaxonomy = (typeof INCIDENT_TAXONOMY)[number];

export type IncidentSeverity = 1 | 2 | 3 | 4 | 5;

// ── Incident Registry ──────────────────────────────────────────────────────

export interface Incident {
  readonly incidentId: string;
  readonly taxonomy: IncidentTaxonomy;
  readonly severity: IncidentSeverity;
  readonly horizonMonths: number;
  readonly vulnerableGroups: readonly string[];
  readonly status: string;
  readonly crownDecision: string;
  readonly createdAt: string;
  readonly digest: string;
}

export class IncidentRegistry {
  private readonly incidents: Incident[] = [];

  report(
    tenantId: string,
    taxonomy: string,
    severity: number,
    horizonMonths: number,
    vulnerableGroups: readonly string[],
    status: string,
    crownDecision: string
  ): Incident {
    if (!INCIDENT_TAXONOMY.includes(taxonomy as IncidentTaxonomy)) {
      throw new SkillInputError('INVALID_TAXONOMY', 'taxonomy no reconocida');
    }
    if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
      throw new SkillInputError('INVALID_SEVERITY', 'severity debe ser 1-5');
    }
    const incidentId = digest({
      t: tenantId,
      tax: taxonomy,
      sev: severity,
      h: horizonMonths,
      ts: status,
    }).slice(0, 32);
    const incident: Incident = {
      incidentId,
      taxonomy: taxonomy as IncidentTaxonomy,
      severity: severity as IncidentSeverity,
      horizonMonths,
      vulnerableGroups: [...vulnerableGroups],
      status,
      crownDecision,
      createdAt: new Date().toISOString(),
      digest: digest({ incidentId, taxonomy, severity, horizonMonths, status, crownDecision }),
    };
    this.incidents.push(incident);
    return incident;
  }

  riskPulse(horizonMonths = 18): readonly { taxonomy: string; severity: number; count: number }[] {
    const map = new Map<string, number>();
    for (const inc of this.incidents) {
      if (inc.horizonMonths <= horizonMonths) {
        const key = `${inc.taxonomy}:${inc.severity}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return [...map.entries()].map(([key, count]) => {
      const [taxonomy, severity] = key.split(':');
      return { taxonomy, severity: Number(severity), count };
    });
  }

  heatMap(): readonly { taxonomy: string; severity: number; count: number }[] {
    const map = new Map<string, number>();
    for (const inc of this.incidents) {
      const key = `${inc.taxonomy}:${inc.severity}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, count]) => {
      const [taxonomy, severity] = key.split(':');
      return { taxonomy, severity: Number(severity), count };
    });
  }

  list(): readonly Incident[] {
    return [...this.incidents];
  }

  count(): number {
    return this.incidents.length;
  }
}

// ── CROWN Office ───────────────────────────────────────────────────────────

export interface CrownDecision {
  readonly decisionId: string;
  readonly action: string;
  readonly actorDid: string;
  readonly identity: boolean;
  readonly authority: boolean;
  readonly policy: boolean;
  readonly evidence: boolean;
  readonly safety: boolean;
  readonly verdict: 'ALLOW' | 'DENY';
  readonly overrideHuman: string | null;
  readonly createdAt: string;
}

export class CrownOffice {
  private readonly decisions: CrownDecision[] = [];

  decide(
    action: string,
    actorDid: string,
    identity: boolean,
    authority: boolean,
    policy: boolean,
    evidence: boolean,
    safety: boolean,
    overrideHuman: string | null = null
  ): CrownDecision {
    const verdict: 'ALLOW' | 'DENY' =
      identity && authority && policy && evidence && safety ? 'ALLOW' : 'DENY';
    const decisionId = digest({ a: action, actor: actorDid, v: verdict }).slice(0, 32);
    const decision: CrownDecision = {
      decisionId,
      action,
      actorDid,
      identity,
      authority,
      policy,
      evidence,
      safety,
      verdict,
      overrideHuman,
      createdAt: new Date().toISOString(),
    };
    this.decisions.push(decision);
    return decision;
  }

  failClosed(action: string, actorDid: string, reason: string): CrownDecision {
    return this.decide(action, actorDid, false, false, false, false, false, reason);
  }

  count(): number {
    return this.decisions.length;
  }

  list(): readonly CrownDecision[] {
    return [...this.decisions];
  }
}

// ── Standards Registry ─────────────────────────────────────────────────────

export interface Standard {
  readonly standardId: string;
  readonly source: string;
  readonly title: string;
  readonly status: string;
  readonly gap: string | null;
  readonly createdAt: string;
}

export class StandardsRegistry {
  private readonly standards: Standard[] = [];

  register(
    standardId: string,
    source: string,
    title: string,
    status: string,
    gap: string | null
  ): Standard {
    const standard: Standard = {
      standardId,
      source,
      title,
      status,
      gap: gap && gap.trim() ? gap.trim() : null,
      createdAt: new Date().toISOString(),
    };
    this.standards.push(standard);
    return standard;
  }

  gaps(): readonly Standard[] {
    return this.standards.filter((s) => s.gap !== null);
  }

  list(): readonly Standard[] {
    return [...this.standards];
  }
}

// ── Data Provenance ─────────────────────────────────────────────────────────

export interface DataAsset {
  readonly assetId: string;
  readonly source: string;
  readonly consent: string;
  readonly language: string;
  readonly diversityScore: number;
  readonly createdAt: string;
}

export class DataProvenance {
  private readonly assets: DataAsset[] = [];

  register(
    assetId: string,
    source: string,
    consent: string,
    language: string,
    diversityScore: number
  ): DataAsset {
    const asset: DataAsset = {
      assetId,
      source,
      consent,
      language,
      diversityScore: Math.max(0, Math.min(1, diversityScore)),
      createdAt: new Date().toISOString(),
    };
    this.assets.push(asset);
    return asset;
  }

  diversityReport(): readonly { language: string; count: number; avgDiversity: number }[] {
    const map = new Map<string, { count: number; total: number }>();
    for (const a of this.assets) {
      const entry = map.get(a.language) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += a.diversityScore;
      map.set(a.language, entry);
    }
    return [...map.entries()].map(([language, e]) => ({
      language,
      count: e.count,
      avgDiversity: e.count > 0 ? Math.round((e.total / e.count) * 10000) / 10000 : 0,
    }));
  }

  list(): readonly DataAsset[] {
    return [...this.assets];
  }
}

// ── Capacity (español, ALC, ODS) ──────────────────────────────────────────

export interface CapacityModule {
  readonly moduleId: string;
  readonly name: string;
  readonly inSpanish: boolean;
  readonly alcAligned: boolean;
  readonly ods: readonly number[];
  readonly createdAt: string;
}

export class CapacityRegistry {
  private readonly modules: CapacityModule[] = [];

  register(
    moduleId: string,
    name: string,
    inSpanish: boolean,
    alcAligned: boolean,
    ods: readonly number[]
  ): CapacityModule {
    const mod: CapacityModule = {
      moduleId,
      name,
      inSpanish,
      alcAligned,
      ods: [...ods],
      createdAt: new Date().toISOString(),
    };
    this.modules.push(mod);
    return mod;
  }

  spanishModules(): readonly CapacityModule[] {
    return this.modules.filter((m) => m.inSpanish);
  }

  alcAlignedModules(): readonly CapacityModule[] {
    return this.modules.filter((m) => m.alcAligned);
  }

  list(): readonly CapacityModule[] {
    return [...this.modules];
  }
}

// ── Audit Report ───────────────────────────────────────────────────────────

export interface AuditReport {
  readonly chainValid: boolean;
  readonly merkleRoot: string | null;
  readonly riskPulse: readonly { taxonomy: string; severity: number; count: number }[];
  readonly heatMap: readonly { taxonomy: string; severity: number; count: number }[];
  readonly crownDecisions: number;
  readonly standardsGaps: number;
  readonly dataDiversity: readonly { language: string; count: number; avgDiversity: number }[];
  readonly spanishModules: number;
  readonly alcAlignment: number;
  readonly productionSafe: false;
  readonly generatedAt: string;
}

export function generateAuditReport(
  incidents: IncidentRegistry,
  crown: CrownOffice,
  standards: StandardsRegistry,
  data: DataProvenance,
  capacity: CapacityRegistry,
  chainValid: boolean,
  merkleRootValue: string | null
): AuditReport {
  return {
    chainValid,
    merkleRoot: merkleRootValue,
    riskPulse: incidents.riskPulse(),
    heatMap: incidents.heatMap(),
    crownDecisions: crown.count(),
    standardsGaps: standards.gaps().length,
    dataDiversity: data.diversityReport(),
    spanishModules: capacity.spanishModules().length,
    alcAlignment: capacity.alcAlignedModules().length,
    productionSafe: false,
    generatedAt: new Date().toISOString(),
  };
}

// ── Interop ────────────────────────────────────────────────────────────────

export interface InteropExport {
  readonly type: string;
  readonly data: unknown;
  readonly exportedAt: string;
  readonly format: 'json';
}

export function exportInterop(type: string, data: unknown): InteropExport {
  return { type, data, exportedAt: new Date().toISOString(), format: 'json' };
}

// ── Forum ──────────────────────────────────────────────────────────────────

export interface ForumRegistration {
  readonly forumId: string;
  readonly name: string;
  readonly date: string;
  readonly registeredAt: string;
}

export class ForumRegistry {
  private readonly forums: ForumRegistration[] = [];

  register(forumId: string, name: string, date: string): ForumRegistration {
    const reg: ForumRegistration = {
      forumId,
      name,
      date,
      registeredAt: new Date().toISOString(),
    };
    this.forums.push(reg);
    return reg;
  }

  upcoming(): readonly ForumRegistration[] {
    const now = new Date().toISOString();
    return this.forums.filter((f) => f.date >= now);
  }

  list(): readonly ForumRegistration[] {
    return [...this.forums];
  }
}

// ── Governance Evolution Orchestrator ───────────────────────────────────────

export interface GovernanceEvolutionSummary {
  readonly incidents: number;
  readonly crownDecisions: number;
  readonly standards: number;
  readonly standardsGaps: number;
  readonly dataAssets: number;
  readonly capacityModules: number;
  readonly spanishModules: number;
  readonly alcModules: number;
  readonly forums: number;
  readonly productionSafe: false;
  readonly executionPerformed: false;
}

export function summarizeGovernanceEvolution(
  incidents: IncidentRegistry,
  crown: CrownOffice,
  standards: StandardsRegistry,
  data: DataProvenance,
  capacity: CapacityRegistry,
  forums: ForumRegistry
): GovernanceEvolutionSummary {
  return {
    incidents: incidents.count(),
    crownDecisions: crown.count(),
    standards: standards.list().length,
    standardsGaps: standards.gaps().length,
    dataAssets: data.list().length,
    capacityModules: capacity.list().length,
    spanishModules: capacity.spanishModules().length,
    alcModules: capacity.alcAlignedModules().length,
    forums: forums.list().length,
    productionSafe: false,
    executionPerformed: false,
  };
}

export function describeGovernanceEvolution(): Readonly<Record<string, unknown>> {
  return {
    items: 10,
    modules: ['incidents', 'crown', 'standards', 'data', 'capacity', 'audit', 'interop', 'forum'],
    taxonomyAreas: INCIDENT_TAXONOMY.length,
    productionSafe: false,
    executionPerformed: false,
    note: 'Referencia local; auditoría externa pendiente.',
  };
}
