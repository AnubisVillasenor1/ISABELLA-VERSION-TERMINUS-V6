/**
 * Perplexity Router API provider — OpenAI-compatible chat completions via Perplexity Router.
 *
 * Uses the OpenAI SDK with base URL https://api.perplexity.ai/router/v1 and PERPLEXITY_API_KEY.
 * Model ids are creator/model-name slugs; never invent — query GET /router/v1/models.
 * No web grounding (direct model access). Fail-closed: no key → null.
 *
 * CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.
 */
import OpenAI from "openai";

export const PERPLEXITY_ROUTER_BASE_URL = "https://api.perplexity.ai/router/v1";

export interface PerplexityModel {
  readonly id: string;
  readonly owned_by?: string;
  readonly pricing?: { readonly input?: number; readonly output?: number; readonly cache_read?: number; readonly unit?: string };
}

export function perplexityApiKey(env: Record<string, string | undefined>): string | null {
  const v = env.PERPLEXITY_API_KEY?.trim();
  return v ? v : null;
}

export function createPerplexityRouterClient(env: Record<string, string | undefined>): OpenAI | null {
  const key = perplexityApiKey(env);
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: PERPLEXITY_ROUTER_BASE_URL });
}

export async function listPerplexityModels(env: Record<string, string | undefined>): Promise<PerplexityModel[]> {
  const client = createPerplexityRouterClient(env);
  if (!client) return [];
  try {
    const res = await client.models.list();
    return (res.data ?? []).map((m) => ({ id: m.id, owned_by: m.owned_by }));
  } catch {
    return [];
  }
}

export async function generatePerplexityNarrative(
  env: Record<string, string | undefined>,
  systemPrompt: string,
  input: string,
  history: { role: string; content: string }[] = [],
  model = "perplexity/kimi-k3",
  timeoutMs = 30_000,
  signal?: AbortSignal,
): Promise<string | null> {
  const client = createPerplexityRouterClient(env);
  if (!client) return null;
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
      { role: "user", content: input },
    ];
    const resp = await client.chat.completions.create(
      { model, messages, max_tokens: 1024, stream: false },
      { timeout: timeoutMs, ...(signal ? { signal } : {}) },
    );
    const content = resp.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0 ? content.trim() : null;
  } catch (e) {
    console.warn("[Isabella] perplexity router unavailable", { message: e instanceof Error ? e.message.slice(0, 180) : String(e) });
    return null;
  }
}

export function describePerplexityReadiness(env: Record<string, string | undefined>): { configured: boolean; model: string } {
  return { configured: perplexityApiKey(env) !== null, model: "perplexity/kimi-k3" };
}
