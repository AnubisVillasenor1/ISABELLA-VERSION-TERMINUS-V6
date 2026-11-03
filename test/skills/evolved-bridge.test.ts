// state: engine-generated — revisión humana pendiente.
import { describe, expect, it } from 'vitest';
import { parseMethodId } from '../../src/authority/method-id';
import { HyperCoreEngine, SkillMcpServer, SkillRegistry } from '../../src/skills';
import type { SkillContext } from '../../src/skills/registry';
import {
  EVOLVED_BRIDGE_VERSION,
  EVOLVED_SCOPE,
  EVOLVED_SKILL_DESCRIPTORS,
  evolvedMethodId,
  toEvolvedSkillDescriptor,
} from '../../src/skills/evolved-bridge';
import { evolvedSkillsPack } from '../../src/lib/lib/skills/evolved-skills-pack';
import { DISCLOSURE_EVIDENCE } from '../../src/lib/lib/skills/skill-evidence-guard';
import type {
  IsabellaSkill,
  SkillContext as IslandContext,
} from '../../src/lib/lib/skills/contracts';

type Pack = Record<string, unknown>;
type Evolved = IsabellaSkill<Pack, Pack>;

function ctx(input: Pack): SkillContext {
  return { requestId: 'req-1', traceId: 'trace-1', input, signals: [] };
}

function fakeSkill(run: Evolved['run']): Evolved {
  return {
    id: 'demo-evolved',
    name: 'Demo Evolved',
    version: '1.2.3-evolved',
    federation: 'CIVILIZATIONAL_ARCHIVE',
    risk: 'MEDIUM',
    description: 'Skill de prueba para el puente.',
    canRun: () => true,
    run,
  };
}

describe('evolvedMethodId', () => {
  it('produce identificadores canónicos de 7 segmentos parseables', () => {
    const id = evolvedMethodId('tavily-search', 'LOW', '4.2.0-evolved');
    expect(id).toBe(
      'A.COLLECTIVE_INTELLIGENCE.E07_EVOLVED.execute_tavily_search.v4.2.0.LOW.OPERATIONAL'
    );
    const parsed = parseMethodId(id);
    expect(parsed.module).toBe('E07_EVOLVED');
    expect(parsed.riskTier).toBe('LOW');
    expect(parsed.governanceTier).toBe('OPERATIONAL');
  });

  it('sube el gobierno para los riesgos altos', () => {
    expect(evolvedMethodId('x', 'CRITICAL', '1.0.0').endsWith('.CRITICAL.CONSTITUTIONAL')).toBe(
      true
    );
    expect(evolvedMethodId('x', 'HIGH', '1.0.0').endsWith('.HIGH.INSTITUTIONAL')).toBe(true);
  });
});

describe('EVOLVED_SKILL_DESCRIPTORS', () => {
  it('expone las 22 skills del pack, ordenadas y sin duplicados', () => {
    expect(EVOLVED_SKILL_DESCRIPTORS).toHaveLength(Object.keys(evolvedSkillsPack).length);
    expect(EVOLVED_SKILL_DESCRIPTORS.length).toBe(22);
    const ids = EVOLVED_SKILL_DESCRIPTORS.map((skill) => skill.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((left, right) => left.localeCompare(right)));
  });

  it('declara contract y scopes para cada descriptor', () => {
    for (const skill of EVOLVED_SKILL_DESCRIPTORS) {
      expect(skill.contract, skill.id).toBeDefined();
      expect(skill.contract?.authority.requiredScopes).toEqual([EVOLVED_SCOPE]);
      expect(typeof skill.handler).toBe('function');
      expect(() => parseMethodId(skill.methodId)).not.toThrow();
    }
  });

  it('se registra completo en el registry canónico sin colisiones', () => {
    const registry = new SkillRegistry();
    for (const skill of EVOLVED_SKILL_DESCRIPTORS) registry.register(skill);
    expect(registry.list()).toHaveLength(22);
    expect(registry.has('tavily-search')).toBe(true);
  });

  it('es determinista entre construcciones', () => {
    const rebuilt = Object.values(evolvedSkillsPack)
      .map((skill) => toEvolvedSkillDescriptor(skill as Evolved))
      .sort((left, right) => left.id.localeCompare(right.id));
    expect(rebuilt.map((skill) => skill.methodId)).toEqual(
      EVOLVED_SKILL_DESCRIPTORS.map((skill) => skill.methodId)
    );
  });
});

describe('handler del puente', () => {
  it('bloquea una entrada que no satisface el contrato minimo', async () => {
    const tavily = toEvolvedSkillDescriptor(evolvedSkillsPack.TAVILY_SEARCH as Evolved);
    const output = (await tavily.handler(ctx({}))) as {
      status: string;
      data: { rejected?: string };
    };
    expect(output.status).toBe('BLOCKED');
    expect(output.data.rejected).toBe('input');
  });

  it('aplica la compuerta de evidencia: nada de exitos simulados', async () => {
    const skill = toEvolvedSkillDescriptor(
      fakeSkill(async () => ({
        skillId: 'demo-evolved',
        status: 'SUCCESS',
        summary: 'crawl hecho',
        data: { items: 4 },
        evidence: [
          {
            id: 'ev-1',
            source: 'Firecrawl crawl de https://ejemplo.org',
            excerpt: 'Pagina rastreada en vivo.',
          },
        ],
        warnings: [],
        auditEvents: [],
      }))
    );
    const output = (await skill.handler(ctx({}))) as {
      status: string;
      requiresHumanReview?: boolean;
      data: { bridgeVersion?: string; originalStatus?: string; items?: number };
      evidence: unknown[];
      warnings: string[];
    };
    expect(output.status).toBe('BLOCKED');
    expect(output.evidence).toHaveLength(0);
    expect(output.requiresHumanReview).toBe(true);
    expect(output.data.items).toBe(4);
    expect(output.data.bridgeVersion).toBe(EVOLVED_BRIDGE_VERSION);
    expect(output.data.originalStatus).toBe('SUCCESS');
    expect(output.warnings).toContain(DISCLOSURE_EVIDENCE);
  });

  it('deja pasar un resultado honesto', async () => {
    const skill = toEvolvedSkillDescriptor(
      fakeSkill(async () => ({
        skillId: 'demo-evolved',
        status: 'SUCCESS',
        summary: 'derivacion local',
        data: { tokens: 12 },
        evidence: [
          { id: 'ev-2', source: 'Analisis local', excerpt: 'Recuento determinista del input.' },
        ],
        warnings: [],
        auditEvents: [],
      }))
    );
    const output = (await skill.handler(ctx({}))) as {
      status: string;
      data: { tokens?: number; bridgeVersion?: string };
    };
    expect(output.status).toBe('SUCCESS');
    expect(output.data.tokens).toBe(12);
    expect(output.data.bridgeVersion).toBeUndefined();
  });
});

describe('puente MCP sobre las skills evolucionadas', () => {
  function mcp(): SkillMcpServer {
    const registry = new SkillRegistry();
    for (const skill of EVOLVED_SKILL_DESCRIPTORS) registry.register(skill);
    return new SkillMcpServer({
      registry,
      engine: new HyperCoreEngine(registry, { signingKey: 'bridge-key' }),
      identity: {
        actorId: 'service:mcp',
        tenantId: 'tamv',
        federationId: 'federation-1',
        policyVersion: 'CROWN-v20',
      },
      resolveScopes: (skillId) =>
        registry.has(skillId)
          ? (registry.get(skillId).contract?.authority.requiredScopes ?? [])
          : [],
    });
  }

  it('expone las 22 skills en tools/list', async () => {
    const response = await mcp().handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const tools = (response.result as { tools: { name: string }[] }).tools;
    expect(tools).toHaveLength(22);
    expect(tools.some((tool) => tool.name === 'tavily-search')).toBe(true);
  });

  it('ejecuta de verdad una skill a traves de HyperCore Ω', async () => {
    const response = await mcp().handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'tavily-search',
        arguments: {
          query: 'maquinaria de vapor Real del Monte',
          results: [
            {
              title: 'Bombas de vapor Cornish en la invernada de Real del Monte',
              url: 'https://archivo-historico-minero.org.mx/real-del-monte',
              snippet: 'La maquinaria de vapor Cornwall llego con los mineros corniques en 1824.',
            },
          ],
        },
      },
    });
    const result = response.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content[0]!.text) as {
      status: string;
      output?: { status: string; data?: { ranked?: unknown[] } };
    };
    expect(payload.status).toBe('COMPLETED');
    expect(payload.output?.status).toBe('SUCCESS');
  });

  it('bloquea por contrato minimo en lugar de inventar resultados', async () => {
    const response = await mcp().handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'tavily-search', arguments: { query: '' } },
    });
    const result = response.result as { isError: boolean; content: { text: string }[] };
    const payload = JSON.parse(result.content[0]!.text) as {
      status: string;
      output?: { status: string };
    };
    expect(payload.status).toBe('COMPLETED');
    expect(payload.output?.status).toBe('BLOCKED');
  });
});
