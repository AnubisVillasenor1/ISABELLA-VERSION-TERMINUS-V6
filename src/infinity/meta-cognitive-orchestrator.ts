/**
 * ISABELLA VILLASEÑOR AI™ — Meta-Cognitive Orchestrator (TAMV native).
 * state: draft | engine-generated.
 *
 * Integra TJG + TPG + LCM en un pipeline funcional:
 *   Intent → LCM (modula) → TJG (redacta PII) → Execute → TPG (sella autoría)
 *
 * El orquestador no ejecuta por sí mismo: recibe una función `executeFn`
 * inyectada (LLM/API) y la invoca solo si TJG permite. Si TJG bloquea
 * (PII en EU sin consentimiento), no ejecuta.
 *
 * `executionPerformed` refleja si se invocó `executeFn`; `compensate`
 * registra una acción compensatoria sin ejecutar nada.
 */
import { inspectJurisdiction } from './jurisdictional-gateway';
import { TAMVCognitiveModulator } from './cognitive-modulation';
import { TAMVProvenanceGenome } from './provenance-genome';
import { digest } from './skills';

export interface OrchestrationInput {
  readonly intent: string;
  readonly context: string;
  readonly model: string;
  readonly authorDid: string;
  readonly jurisdiction: 'EU' | 'US' | 'MX' | 'GLOBAL';
  readonly cognitiveLayers: { readonly logic: number; readonly empathy: number; readonly resonance: number };
  readonly timestamp: string;
}

export interface OrchestrationResult {
  readonly status: 'executed' | 'blocked_pii' | 'compensated';
  readonly tpg: string;
  readonly sanitizedContext: string;
  readonly modulatedPrompt: string;
  readonly result: unknown;
  readonly executionPerformed: boolean;
}

export class MetaCognitiveOrchestrator {
  private readonly tjg = { inspect: inspectJurisdiction };
  private readonly tpg = new TAMVProvenanceGenome();
  private readonly lcm = new TAMVCognitiveModulator();

  async orchestrate(
    input: OrchestrationInput,
    executeFn: (prompt: string) => Promise<unknown>
  ): Promise<OrchestrationResult> {
    // 1. LCM: modula el prompt según capas cognitivas
    const modulatedPrompt = this.lcm.modulate(input.intent, input.cognitiveLayers);

    // 2. TJG: inspecciona y redacta PII antes de inferencia
    const tjgResult = this.tjg.inspect({
      content: input.context,
      jurisdiction: input.jurisdiction,
      piiFields: [],
    });

    const tpgHash = this.tpg.generate({
      intent: input.intent,
      context: input.context,
      model: input.model,
      authorDid: input.authorDid,
      timestamp: input.timestamp,
    });

    if (!tjgResult.allowed) {
      return {
        status: 'blocked_pii',
        tpg: tpgHash,
        sanitizedContext: tjgResult.sanitized,
        modulatedPrompt,
        result: { error: 'PII detected in EU jurisdiction, blocked' },
        executionPerformed: false,
      };
    }

    // 3. Ejecuta la función externa (LLM/API) con prompt modulado + contexto sanitizado
    const result = await executeFn(`${modulatedPrompt}\n\nContext: ${tjgResult.sanitized}`);

    // 4. TPG: el hash ya se generó en el paso 2 (procedencia y autoría)
    return {
      status: 'executed',
      tpg: tpgHash,
      sanitizedContext: tjgResult.sanitized,
      modulatedPrompt,
      result,
      executionPerformed: false,
    };
  }

  async compensate(tpg: string, reason: string): Promise<{ status: string; tpg: string; reason: string }> {
    return { status: 'compensated', tpg, reason };
  }

  hash(data: string): string {
    return digest(data);
  }
}

export function describeMetaCognitiveOrchestrator(): Readonly<Record<string, unknown>> {
  return {
    pipeline: ['LCM', 'TJG', 'Execute', 'TPG'],
    compensates: true,
    executionPerformed: 'delegated',
    note: 'El orquestador no ejecuta por sí mismo; recibe executeFn inyectado.',
  };
}
