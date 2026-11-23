/**
 * ISABELLA VILLASEÑOR AI™ — TAMV Cognitive Modulation (LCM).
 * state: draft | engine-generated.
 *
 * Modula el prompt según 3 capas (Lógica-Empatía-Resonancia) antes de HC-1.
 * Determinista, sin modelo, sin red.
 *
 * Inspiración conceptual: Triundra LER (Logic-Emotion-Resonance) → renombrado
 * TAMV Cognitive Modulation (LCM). El código es original de este repositorio.
 */
import { SkillInputError } from './skills';

export interface CognitiveLayers {
  readonly logic: number;
  readonly empathy: number;
  readonly resonance: number;
}

export interface ModulatedPrompt {
  readonly original: string;
  readonly modulated: string;
  readonly layers: CognitiveLayers;
  readonly prefix: string;
  readonly executionPerformed: false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class TAMVCognitiveModulator {
  modulate(prompt: string, layers: CognitiveLayers): string {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new SkillInputError('INVALID_PROMPT', 'prompt es requerido');
    }
    const l = clamp(Number(layers.logic), 0, 1);
    const e = clamp(Number(layers.empathy), 0, 1);
    const r = clamp(Number(layers.resonance), 0, 1);
    if (!Number.isFinite(l) || !Number.isFinite(e) || !Number.isFinite(r)) {
      throw new SkillInputError('INVALID_LAYERS', 'layers deben ser números finitos en [0,1]');
    }
    return `[TAMV LCM L=${round2(l).toFixed(2)} E=${round2(e).toFixed(2)} R=${round2(r).toFixed(2)}] ${prompt.trim()}`;
  }
}

export function modulatePrompt(prompt: string, layers: CognitiveLayers): ModulatedPrompt {
  const modulator = new TAMVCognitiveModulator();
  const modulated = modulator.modulate(prompt, layers);
  const l = clamp(Number(layers.logic), 0, 1);
  const e = clamp(Number(layers.empathy), 0, 1);
  const r = clamp(Number(layers.resonance), 0, 1);
  return {
    original: prompt.trim(),
    modulated,
    layers: { logic: round2(l), empathy: round2(e), resonance: round2(r) },
    prefix: `[TAMV LCM L=${round2(l).toFixed(2)} E=${round2(e).toFixed(2)} R=${round2(r).toFixed(2)}]`,
    executionPerformed: false,
  };
}

export function isCognitiveLayers(value: unknown): value is CognitiveLayers {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.logic === 'number' &&
    typeof v.empathy === 'number' &&
    typeof v.resonance === 'number' &&
    Number.isFinite(v.logic) &&
    Number.isFinite(v.empathy) &&
    Number.isFinite(v.resonance)
  );
}

export function describeCognitiveModulation(): Readonly<Record<string, unknown>> {
  return {
    layers: ['logic', 'empathy', 'resonance'],
    range: [0, 1],
    prefix: '[TAMV LCM L=.. E=.. R=..]',
    executionPerformed: false,
    note: 'Modulación determinista del prompt; no invoca ningún modelo.',
  };
}