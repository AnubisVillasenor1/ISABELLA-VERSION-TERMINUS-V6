/**
 * IDR embedding adapters.
 *
 * Provider selection is explicit opt-in. "none" is the default to avoid sending
 * user intent to a third party without operator configuration. Remote model
 * calls are ranking hints only; the router's server-owned policy remains decisive.
 */
import type { EmbeddingProvider } from './semantic-router';

export type IdrEmbeddingMode = 'none' | 'ollama' | 'tei' | 'huggingface';

export interface ConfiguredEmbeddingProvider {
  readonly provider?: EmbeddingProvider;
  readonly mode: IdrEmbeddingMode;
  readonly model: string | null;
  readonly reason: 'disabled' | 'configured' | 'missing-credential' | 'invalid-configuration';
}

const MAX_TEXT_CHARS = 4_000;
const MAX_VECTOR_DIMENSIONS = 4_096;
const CACHE_LIMIT = 256;

function boundedTimeout(value: string | undefined): number {
  const parsed = Number(value ?? 8_000);
  return Number.isFinite(parsed) ? Math.max(500, Math.min(15_000, Math.floor(parsed))) : 8_000;
}

function parseVector(value: unknown): number[] {
  let candidate: unknown = value;
  // Hugging Face feature-extraction commonly returns [tokens, dimensions] or
  // [dimensions]. Mean-pool token vectors to a single sentence vector.
  if (Array.isArray(candidate) && Array.isArray(candidate[0])) {
    const rows = candidate as unknown[];
    if (
      rows.every(
        (row) =>
          Array.isArray(row) &&
          row.length > 0 &&
          row.every((n) => typeof n === 'number' && Number.isFinite(n))
      )
    ) {
      const width = (rows[0] as number[]).length;
      if (rows.some((row) => (row as number[]).length !== width))
        throw new Error('IDR_EMBEDDING_DIMENSION_MISMATCH');
      candidate = Array.from(
        { length: width },
        (_, i) => (rows as number[][]).reduce((sum, row) => sum + row[i], 0) / rows.length
      );
    } else {
      candidate = rows[0];
    }
  }
  if (
    !Array.isArray(candidate) ||
    candidate.length < 2 ||
    candidate.length > MAX_VECTOR_DIMENSIONS ||
    !candidate.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    throw new Error('IDR_INVALID_EMBEDDING_RESPONSE');
  }
  return candidate as number[];
}

function cachedProvider(embedOne: (text: string) => Promise<number[]>): EmbeddingProvider {
  const cache = new Map<string, number[]>();
  return {
    async embed(text: string): Promise<number[]> {
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_CHARS) {
        throw new Error('IDR_EMBEDDING_INPUT_INVALID');
      }
      const key = text.trim();
      const cached = cache.get(key);
      if (cached) return [...cached];
      const vector = await embedOne(key);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      cache.set(key, vector);
      return [...vector];
    },
  };
}

function ollamaProvider(env: NodeJS.ProcessEnv): ConfiguredEmbeddingProvider {
  const baseUrl = (
    env.IDR_OLLAMA_BASE_URL ??
    env.OLLAMA_BASE_URL ??
    'http://127.0.0.1:11434'
  ).replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { mode: 'ollama', model: null, reason: 'invalid-configuration' };
  }
  const loopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';
  const remoteOptIn = env.IDR_OLLAMA_ALLOW_REMOTE === 'true';
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (!loopback && !(remoteOptIn && parsed.protocol === 'https:'))
  ) {
    return { mode: 'ollama', model: null, reason: 'invalid-configuration' };
  }
  const model = env.IDR_OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text-v2-moe';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model)) {
    return { mode: 'ollama', model: null, reason: 'invalid-configuration' };
  }
  const timeout = boundedTimeout(env.IDR_EMBEDDING_TIMEOUT_MS);
  const provider = cachedProvider(async (text) => {
    const response = await fetch(`${parsed.origin}/api/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, input: text, truncate: true }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`IDR_OLLAMA_HTTP_${response.status}`);
    const body = (await response.json()) as { embeddings?: unknown };
    if (!Array.isArray(body.embeddings) || !body.embeddings.length)
      throw new Error('IDR_OLLAMA_INVALID_RESPONSE');
    return parseVector(body.embeddings[0]);
  });
  return { provider, mode: 'ollama', model, reason: 'configured' };
}

function teiProvider(env: NodeJS.ProcessEnv): ConfiguredEmbeddingProvider {
  const baseUrl = (env.IDR_TEI_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { mode: 'tei', model: null, reason: 'invalid-configuration' };
  }
  const loopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';
  const remoteOptIn = env.IDR_TEI_ALLOW_REMOTE === 'true';
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (!loopback && !(remoteOptIn && parsed.protocol === 'https:'))
  ) {
    return { mode: 'tei', model: null, reason: 'invalid-configuration' };
  }
  const model = env.IDR_TEI_MODEL ?? 'self-hosted-text-embeddings-inference';
  const timeout = boundedTimeout(env.IDR_EMBEDDING_TIMEOUT_MS);
  const provider = cachedProvider(async (text) => {
    const response = await fetch(`${parsed.origin}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inputs: text }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`IDR_TEI_HTTP_${response.status}`);
    return parseVector(await response.json());
  });
  return { provider, mode: 'tei', model, reason: 'configured' };
}

function huggingFaceProvider(env: NodeJS.ProcessEnv): ConfiguredEmbeddingProvider {
  const token = env.HF_TOKEN?.trim();
  if (!token) return { mode: 'huggingface', model: null, reason: 'missing-credential' };
  const model = env.IDR_HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(model)) {
    return { mode: 'huggingface', model: null, reason: 'invalid-configuration' };
  }
  const timeout = boundedTimeout(env.IDR_EMBEDDING_TIMEOUT_MS);
  // Fixed provider host prevents arbitrary URL injection/SSRF from environment typos.
  const endpoint = `https://router.huggingface.co/hf-inference/models/${model}`;
  const provider = cachedProvider(async (text) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`IDR_HF_HTTP_${response.status}`);
    return parseVector(await response.json());
  });
  return { provider, mode: 'huggingface', model, reason: 'configured' };
}

/** Never chooses a remote provider implicitly. Set IDR_EMBEDDINGS_PROVIDER explicitly. */
export function createConfiguredEmbeddingProvider(
  env: NodeJS.ProcessEnv = process.env
): ConfiguredEmbeddingProvider {
  const requested = (env.IDR_EMBEDDINGS_PROVIDER ?? 'none').toLowerCase();
  if (requested === 'none' || requested === 'off') {
    return { mode: 'none', model: null, reason: 'disabled' };
  }
  if (requested === 'ollama') return ollamaProvider(env);
  if (requested === 'tei') return teiProvider(env);
  if (requested === 'huggingface') return huggingFaceProvider(env);
  return { mode: 'none', model: null, reason: 'invalid-configuration' };
}
