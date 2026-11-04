// state: draft | engine-generated
import { describe, expect, it } from 'vitest';
import { ISABELLA_SKILLS } from '../../src/lib/lib/skill-registry';
import { CANONICAL_SKILLS } from '../../src/skills/catalog';
import { FOUNDATIONAL_SKILLS } from '../../src/skills/foundational';
import { EVOLVED_SKILL_DESCRIPTORS } from '../../src/skills/evolved-bridge';
import {
  bindingView,
  catalogCoherence,
  executableSkillIds,
  normalizeSkillKey,
} from '../../src/skills/catalog-coherence';

describe('coherencia catálogo ↔ registro ejecutable', () => {
  it('normaliza los espacios de nombre para que un seudónimo no parezca otra skill', () => {
    expect(normalizeSkillKey('ckm:brand')).toBe('ckm-brand');
    expect(normalizeSkillKey(' CKM/Brand ')).toBe('ckm-brand');
    expect(normalizeSkillKey('Tavily Search')).toBe('tavily-search');
  });

  it('enumera el registry canónico completo y sin duplicados', () => {
    const ids = executableSkillIds();
    expect(ids).toHaveLength(
      CANONICAL_SKILLS.length + FOUNDATIONAL_SKILLS.length + EVOLVED_SKILL_DESCRIPTORS.length
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it('enlaza cada skill evolucionada registrada con su entrada de catálogo', () => {
    const coherence = catalogCoherence();
    const boundExecutable = new Set(
      coherence.items.filter((item) => item.handlerBound).map((item) => item.executableId)
    );
    for (const descriptor of EVOLVED_SKILL_DESCRIPTORS) {
      expect(boundExecutable.has(descriptor.id), descriptor.id).toBe(true);
    }
  });

  it('soporta cada habilidad invocable afirmada con un handler enlazado', () => {
    const coherence = catalogCoherence();
    expect(coherence.unsupportedClaims).toEqual([]);
    expect(coherence.invocable).toBe(
      ISABELLA_SKILLS.filter((skill) => typeof skill.skillNumber === 'number').length
    );
    for (const item of coherence.items) {
      if (!item.invocable) continue;
      expect(item.handlerBound, item.id).toBe(true);
      expect(item.claimSupported, item.id).toBe(true);
    }
    // Las 22 habilidades evolucionadas estan declaradas; tres entradas mas son
    // seudonimos con el mismo numero, asi que no suman capacidades distintas.
    expect(coherence.invocableBound).toBe(EVOLVED_SKILL_DESCRIPTORS.length);
    expect(coherence.invocable).toBe(coherence.invocableBound + coherence.aliases);
  });

  it('no presenta una declaracion de subsistema como habilidad invocable', () => {
    const coherence = catalogCoherence();
    const subsystems = coherence.items.filter((item) => !item.invocable);
    expect(subsystems.length).toBeGreaterThan(0);
    for (const item of subsystems) {
      expect(item.skillNumber).toBeNull();
      expect(item.invocable).toBe(false);
    }
  });

  it('cuenta las capacidades distintas descontando seudónimos, no sumándolos', () => {
    const coherence = catalogCoherence();
    expect(coherence.declared).toBe(ISABELLA_SKILLS.length);
    expect(coherence.distinctCapabilities).toBe(coherence.declared - coherence.aliases);
    expect(coherence.bound + coherence.unbound).toBe(coherence.declared);
  });

  it('es estable entre llamadas y no muta al ser observada', () => {
    const first = catalogCoherence();
    expect(catalogCoherence()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('bindingView devuelve null para un id inexistente y la vista real para uno declarado', () => {
    expect(bindingView('no-existe-ninguna-skill')).toBeNull();
    const evolved = EVOLVED_SKILL_DESCRIPTORS[0];
    const declared = ISABELLA_SKILLS.find(
      (skill) => normalizeSkillKey(skill.id) === normalizeSkillKey(evolved.id)
    );
    expect(declared).toBeDefined();
    const view = bindingView(declared!.id);
    expect(view?.handlerBound).toBe(true);
    expect(view?.executableId).toBe(evolved.id);
  });
});
