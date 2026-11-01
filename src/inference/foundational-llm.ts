import { createHash } from 'node:crypto';
import { createLocalEngine } from './local-engine';
import { sovereignRag } from './rag';
import { TtlCache } from './cache';
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import type { IsabellaGenesisRuntime } from '../genesis/runtime';
import type { GenerationResult } from './types';

export interface FoundationalRequest {
  input: string;
  systemPrompt: string;
  maxTokens?: number;
  history?: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>;
  knowledgeContext?: string;
  /** Aísla la caché por sesión; sin él, la caché solo aplica a peticiones sin contexto personal. */
  sessionId?: string;
}

export interface FoundationalAttempt {
  stage: 'gateway' | 'providers' | 'local';
  ok: boolean;
  reason?: string;
}

export interface FoundationalResult {
  text: string;
  engine: 'foundational' | 'sovereign-fallback';
  latencyMs: number;
  modelId?: string;
  /** Diagnóstico de la cadena de degradación (sin datos del usuario). */
  attempts?: readonly FoundationalAttempt[];
  cached?: boolean;
}

export interface FoundationalOptions {
  /** Timeout por proveedor. */
  providerTimeoutMs?: number;
  /** Fallos consecutivos antes de abrir el circuito de un proveedor. */
  breakerThreshold?: number;
  breakerCooldownMs?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  /** Modelo del AI Gateway; `off` lo desactiva. Por defecto ISABELLA_GATEWAY_MODEL. */
  gatewayModel?: string;
  /** Inyección para pruebas. */
  gatewayGenerate?: (args: {
    system: string;
    prompt: string;
    maxTokens: number;
    signal: AbortSignal;
  }) => Promise<string>;
  now?: () => number;
}

const MAX_INPUT_CHARS = 8_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_HISTORY_TURNS = 8;
const MIN_TOKENS = 16;
const MAX_TOKENS = 2_048;
const DEFAULT_TOKENS = 512;
const DEFAULT_GATEWAY_MODEL = 'nvidia/nemotron-3.5-lightning-free';

class Breaker {
  private failures = 0;
  private openUntil = 0;
  constructor(
    private readonly threshold: number,
    private readonly cooldownMs: number,
    private readonly now: () => number
  ) {}
  allow(): boolean {
    return this.now() >= this.openUntil;
  }
  success(): void {
    this.failures = 0;
    this.openUntil = 0;
  }
  failure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = this.now() + this.cooldownMs;
      this.failures = 0;
    }
  }
}

function clampTokens(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_TOKENS;
  return Math.min(MAX_TOKENS, Math.max(MIN_TOKENS, Math.floor(value)));
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * Carrera real entre el trabajo y el aborto: si el proveedor ignora la señal,
 * la promesa se rechaza igualmente en vez de quedar colgada.
 */
function withTimeout<T>(ms: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('PROVIDER_TIMEOUT'));
    }, ms);
    work(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Isabella Foundational LLM — ORQUESTADOR de proveedores externos (no un modelo propio).
 *
 * Cadena de degradación: AI Gateway → proveedores registrados en el runtime → motor local
 * determinista. Cada etapa recibe el MISMO prompt enriquecido (historial, conocimiento
 * verificado, RAG), tiene timeout, interruptor de circuito y se registra en `attempts`.
 * La respuesta del motor local siempre se etiqueta `sovereign-fallback`.
 */
export class IsabellaFoundationalLLM {
  private readonly cache: TtlCache<FoundationalResult>;
  private readonly inflight = new Map<string, Promise<FoundationalResult>>();
  private readonly gatewayBreaker: Breaker;
  private readonly providersBreaker: Breaker;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly gatewayModel: string;
  private readonly gatewayGenerate: NonNullable<FoundationalOptions['gatewayGenerate']>;

  constructor(
    private readonly runtime: IsabellaGenesisRuntime,
    options: FoundationalOptions = {}
  ) {
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.providerTimeoutMs ?? 20_000;
    const threshold = options.breakerThreshold ?? 3;
    const cooldown = options.breakerCooldownMs ?? 30_000;
    this.gatewayBreaker = new Breaker(threshold, cooldown, this.now);
    this.providersBreaker = new Breaker(threshold, cooldown, this.now);
    this.cache = new TtlCache<FoundationalResult>(
      options.cacheTtlMs ?? 60_000,
      options.cacheMaxEntries ?? 500
    );
    this.gatewayModel =
      options.gatewayModel ?? process.env.ISABELLA_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;
    this.gatewayGenerate =
      options.gatewayGenerate ??
      (async ({ system, prompt, maxTokens, signal }) => {
        const result = await generateText({
          model: gateway(this.gatewayModel),
          system,
          prompt,
          maxOutputTokens: maxTokens,
          temperature: 0.35,
          abortSignal: signal,
          providerOptions: { gateway: { disallowPromptTraining: true, sort: 'tps' } },
        });
        return result.text;
      });
  }

  /** La clave incluye TODO lo que condiciona la respuesta, con hash completo (no prefijos). */
  private cacheKey(request: FoundationalRequest, maxTokens: number): string {
    return createHash('sha256')
      .update(
        JSON.stringify([
          maxTokens,
          request.sessionId ?? '',
          request.systemPrompt,
          request.input,
          request.knowledgeContext ?? '',
          request.history ?? [],
        ])
      )
      .digest('hex');
  }

  private buildPrompt(request: FoundationalRequest, input: string): string {
    const historyBlock = (request.history ?? [])
      .slice(-MAX_HISTORY_TURNS)
      .map(
        (turn) =>
          `${turn.role === 'user' ? 'Usuario' : 'Isabella'}: ${truncate(turn.content, 1_000)}`
      )
      .join('\n');
    const knowledge = request.knowledgeContext?.trim();
    const knowledgeBlock = knowledge
      ? `Contexto verificado:\n${truncate(knowledge, MAX_CONTEXT_CHARS)}`
      : '';
    const ragHits = sovereignRag.search(input, 3).filter((h) => h.score > 0.05);
    const ragBlock = ragHits.length
      ? `Contexto recuperado (RAG léxico local):\n${ragHits.map((h) => `- ${h.text}`).join('\n')}`
      : '';
    return [
      knowledgeBlock,
      ragBlock,
      historyBlock ? `Historial reciente:\n${historyBlock}` : '',
      `Solicitud del usuario:\n${input}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  async generate(request: FoundationalRequest): Promise<FoundationalResult> {
    const started = this.now();
    const maxTokens = clampTokens(request.maxTokens);
    const key = this.cacheKey(request, maxTokens);

    const cached = this.cache.get(key);
    if (cached) {
      return { ...cached, cached: true, latencyMs: Math.max(1, this.now() - started) };
    }

    // Single-flight: peticiones idénticas simultáneas comparten una sola llamada upstream.
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const work = this.run(request, maxTokens, started).then((result) => {
      if (result.engine === 'foundational') this.cache.set(key, result);
      return result;
    });
    this.inflight.set(key, work);
    try {
      return await work;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async run(
    request: FoundationalRequest,
    maxTokens: number,
    started: number
  ): Promise<FoundationalResult> {
    const input = truncate(request.input, MAX_INPUT_CHARS);
    const enriched = this.buildPrompt(request, input);
    const attempts: FoundationalAttempt[] = [];

    // 0. AI Gateway (si no está desactivado) con el prompt enriquecido completo.
    if (this.gatewayModel !== 'off') {
      if (!this.gatewayBreaker.allow()) {
        attempts.push({ stage: 'gateway', ok: false, reason: 'CIRCUIT_OPEN' });
      } else {
        try {
          const text = (
            await withTimeout(this.timeoutMs, (signal) =>
              this.gatewayGenerate({
                system: request.systemPrompt,
                prompt: enriched,
                maxTokens,
                signal,
              })
            )
          ).trim();
          if (!text) throw new Error('EMPTY_OUTPUT');
          this.gatewayBreaker.success();
          attempts.push({ stage: 'gateway', ok: true });
          return {
            text,
            engine: 'foundational',
            latencyMs: Math.max(1, this.now() - started),
            modelId: `ai-sdk-gateway:${this.gatewayModel}`,
            attempts,
          };
        } catch (error) {
          this.gatewayBreaker.failure();
          attempts.push({ stage: 'gateway', ok: false, reason: errorCode(error) });
        }
      }
    }

    // 1. Proveedores registrados en el runtime (Ollama, HF, etc.).
    if (!this.providersBreaker.allow()) {
      attempts.push({ stage: 'providers', ok: false, reason: 'CIRCUIT_OPEN' });
    } else {
      try {
        const result: GenerationResult = await withTimeout(this.timeoutMs, () =>
          this.runtime.generate({
            prompt: `${request.systemPrompt}\n\n${enriched}`,
            maxTokens,
          })
        );
        const text = result.text?.trim() ?? '';
        if (!text) throw new Error('EMPTY_OUTPUT');
        this.providersBreaker.success();
        attempts.push({ stage: 'providers', ok: true });
        return {
          text,
          engine: 'foundational',
          latencyMs: Math.max(1, this.now() - started),
          modelId: result.modelId,
          attempts,
        };
      } catch (error) {
        this.providersBreaker.failure();
        attempts.push({ stage: 'providers', ok: false, reason: errorCode(error) });
      }
    }

    // 2. Fallback local determinista: nunca se presenta como modelo externo ni se cachea.
    const local = await createLocalEngine().generate({ prompt: input, maxTokens });
    attempts.push({ stage: 'local', ok: true });
    return {
      text: local.text,
      engine: 'sovereign-fallback',
      latencyMs: Math.max(1, this.now() - started),
      modelId: 'isabella-local-fallback',
      attempts,
    };
  }
}

/** Código corto y seguro: no se filtran mensajes de error del proveedor. */
function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'PROVIDER_TIMEOUT' || message === 'EMPTY_OUTPUT') return message;
  return 'PROVIDER_ERROR';
}

export function createFoundationalLLM(
  runtime: IsabellaGenesisRuntime,
  options?: FoundationalOptions
): IsabellaFoundationalLLM {
  return new IsabellaFoundationalLLM(runtime, options);
}
