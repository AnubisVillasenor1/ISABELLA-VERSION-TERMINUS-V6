import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredEmbeddingProvider } from '../src/domain-runtime/embedding-providers';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IDR embedding provider configuration', () => {
  it('defaults to lexical-only and makes no provider call', () => {
    const configured = createConfiguredEmbeddingProvider({});
    expect(configured.mode).toBe('none');
    expect(configured.provider).toBeUndefined();
    expect(configured.reason).toBe('disabled');
  });

  it('does not activate hosted inference without a token', () => {
    const configured = createConfiguredEmbeddingProvider({ IDR_EMBEDDINGS_PROVIDER: 'huggingface' });
    expect(configured.mode).toBe('huggingface');
    expect(configured.provider).toBeUndefined();
    expect(configured.reason).toBe('missing-credential');
  });

  it('rejects non-loopback Ollama URLs unless secure remote access is explicitly enabled', () => {
    const configured = createConfiguredEmbeddingProvider({
      IDR_EMBEDDINGS_PROVIDER: 'ollama',
      IDR_OLLAMA_BASE_URL: 'http://example.com:11434',
    });
    expect(configured.provider).toBeUndefined();
    expect(configured.reason).toBe('invalid-configuration');
  });

  it('uses the local Ollama adapter, bounds input, and caches repeated embeddings', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ embeddings: [[0.25, 0.75]] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const configured = createConfiguredEmbeddingProvider({
      IDR_EMBEDDINGS_PROVIDER: 'ollama',
      IDR_OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
      IDR_OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text',
    });
    expect(configured.provider).toBeDefined();
    await expect(configured.provider!.embed('crear contenido')).resolves.toEqual([0.25, 0.75]);
    await expect(configured.provider!.embed('crear contenido')).resolves.toEqual([0.25, 0.75]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:11434/api/embed');
  });

  it('validates and mean-pools hosted feature-extraction output', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify([[1, 3], [3, 5]]), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const configured = createConfiguredEmbeddingProvider({
      IDR_EMBEDDINGS_PROVIDER: 'huggingface',
      HF_TOKEN: 'test-token-not-a-real-secret',
    });
    expect(configured.provider).toBeDefined();
    await expect(configured.provider!.embed('intent de prueba')).resolves.toEqual([2, 4]);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer test-token-not-a-real-secret');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('https://router.huggingface.co/hf-inference/models/');
  });

  it('rejects malformed vectors and oversized input before sending a request', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ embeddings: [[1, 'bad']] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const configured = createConfiguredEmbeddingProvider({ IDR_EMBEDDINGS_PROVIDER: 'ollama' });
    await expect(configured.provider!.embed('ok')).rejects.toThrow();
    await expect(configured.provider!.embed('x'.repeat(4_001))).rejects.toThrow('IDR_EMBEDDING_INPUT_INVALID');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
