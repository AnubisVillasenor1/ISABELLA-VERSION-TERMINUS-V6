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
