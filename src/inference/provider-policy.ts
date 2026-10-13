/**
 * Shared policy helpers for external inference adapters.
 * These helpers make provider routing constraints deterministic and unit-testable.
 */

export function boundedMilliseconds(
  rawValue: string | number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (![fallback, minimum, maximum].every(Number.isFinite) || minimum <= 0 || maximum < minimum) {
    throw new RangeError("invalid millisecond bounds");
  }
  const parsed = rawValue === undefined || rawValue === "" ? Number.NaN : Number(rawValue);
  const candidate = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(maximum, Math.max(minimum, candidate));
}

/**
 * The OpenRouter free router and model IDs ending in :free are permitted when
 * paid routes are disabled. This is a conservative configuration guard, not a
 * guarantee that a provider's model remains free or available.
 */
export function isOpenRouterModelAllowed(modelId: string, paidRoutesEnabled: boolean): boolean {
  const model = modelId.trim();
  if (!model) return false;
  if (paidRoutesEnabled) return true;
  return model === "openrouter/free" || model.endsWith(":free");
}

export interface OpenAICompatibleCandidate {
  readonly name: string;
  readonly key: string;
  readonly url: string;
  readonly model: string;
}

interface CandidateSpec {
  name: string;
  key: string | undefined;
  url: string;
  model: string | undefined;
}

/**
 * Deterministic, credential-gated candidate list for OpenAI-compatible
 * providers, in attempt order. A candidate is included only when both its key
 * and model are present; Isabella never invents credentials or silently
 * upgrades to a paid route. Ollama Cloud is OpenAI-compatible and defaults to
 * its documented base URL and a model observed available to the account.
 */
export function buildOpenAICompatibleCandidates(
  env: Readonly<Record<string, string | undefined>>,
): readonly OpenAICompatibleCandidate[] {
  const ollamaBase = (env.OLLAMA_BASE_URL?.trim() || "https://ollama.com/v1").replace(/\/+$/, "");
  const specs: readonly CandidateSpec[] = [
    { name: "ollama", key: env.OLLAMA_API_KEY, url: `${ollamaBase}/chat/completions`, model: env.OLLAMA_MODEL?.trim() || "gpt-oss:20b" },
    { name: "groq", key: env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b" },
    { name: "cerebras", key: env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: env.CEREBRAS_MODEL?.trim() || "llama-3.1-8b" },
    { name: "together", key: env.TOGETHER_API_KEY, url: "https://api.together.xyz/v1/chat/completions", model: env.TOGETHER_MODEL?.trim() || "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { name: "deepinfra", key: env.DEEPINFRA_API_KEY, url: "https://api.deepinfra.com/v1/openai/chat/completions", model: env.DEEPINFRA_MODEL?.trim() || "meta-llama/Meta-Llama-3.1-8B-Instruct" },
    { name: "fireworks", key: env.FIREWORKS_API_KEY, url: "https://api.fireworks.ai/inference/v1/chat/completions", model: env.FIREWORKS_MODEL?.trim() || "accounts/fireworks/models/llama-v3p1-8b-instruct" },
  ];
  const candidates: OpenAICompatibleCandidate[] = [];
  for (const spec of specs) {
    const key = spec.key?.trim();
    const model = spec.model?.trim();
    if (key && model) candidates.push(Object.freeze({ name: spec.name, key, url: spec.url, model }));
  }
  return Object.freeze(candidates);
}

type AssistantContentPart = { type?: unknown; text?: unknown };
type OpenAICompatibleResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

/** Extract only textual assistant content from common OpenAI-compatible response shapes. */
export function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as OpenAICompatibleResponse;
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const text = content.trim();
    return text.length > 0 ? text : null;
  }
  if (!Array.isArray(content)) return null;
  const pieces = (content as AssistantContentPart[])
    .filter((part) => part && (part.type === "text" || part.type === "output_text") && typeof part.text === "string")
    .map((part) => (part.text as string).trim())
    .filter(Boolean);
  return pieces.length > 0 ? pieces.join("\n") : null;
}
