// state: draft | engine-generated — pendiente de revisión humana.
import { describe, expect, it, vi } from 'vitest';
import { createFoundationalLLM } from '../../src/inference/foundational-llm';

const failingRuntime = {
  generate: vi.fn(async () => {
    throw new Error('down');
  }),
} as never;

const base = { systemPrompt: 'sys', maxTokens: 64 };

describe('IsabellaFoundationalLLM', () => {
  it('sends history, knowledge and RAG context to the gateway stage', async () => {
    const gatewayGenerate = vi.fn(async () => 'respuesta');
    const llm = createFoundationalLLM(failingRuntime, { gatewayGenerate, gatewayModel: 'm' });
    await llm.generate({
      ...base,
      input: 'hola',
      history: [{ role: 'user', content: 'previo' }],
      knowledgeContext: 'hecho-verificado',
    });
    const prompt = (gatewayGenerate.mock.calls[0] as unknown as [{ prompt: string }])[0].prompt;
    expect(prompt).toContain('previo');
    expect(prompt).toContain('hecho-verificado');
  });

  it('does not share cache between different histories', async () => {
    const gatewayGenerate = vi.fn(async () => 'ok');
    const llm = createFoundationalLLM(failingRuntime, { gatewayGenerate, gatewayModel: 'm' });
    await llm.generate({ ...base, input: 'q', history: [{ role: 'user', content: 'a' }] });
    await llm.generate({ ...base, input: 'q', history: [{ role: 'user', content: 'b' }] });
    expect(gatewayGenerate).toHaveBeenCalledTimes(2);
  });

  it('does not share cache between different sessions', async () => {
    const gatewayGenerate = vi.fn(async () => 'ok');
    const llm = createFoundationalLLM(failingRuntime, { gatewayGenerate, gatewayModel: 'm' });
    await llm.generate({ ...base, input: 'q', sessionId: 's1' });
    await llm.generate({ ...base, input: 'q', sessionId: 's2' });
    expect(gatewayGenerate).toHaveBeenCalledTimes(2);
  });

  it('serves identical requests from cache and dedupes concurrent calls', async () => {
    const gatewayGenerate = vi.fn(async () => 'ok');
    const llm = createFoundationalLLM(failingRuntime, { gatewayGenerate, gatewayModel: 'm' });
    await Promise.all([llm.generate({ ...base, input: 'q' }), llm.generate({ ...base, input: 'q' })]);
    const again = await llm.generate({ ...base, input: 'q' });
    expect(gatewayGenerate).toHaveBeenCalledTimes(1);
    expect(again.cached).toBe(true);
  });

  it('labels the local fallback honestly and never caches it', async () => {
    const gatewayGenerate = vi.fn(async () => {
      throw new Error('boom secret detail');
    });
    const llm = createFoundationalLLM(failingRuntime, { gatewayGenerate, gatewayModel: 'm' });
    const r = await llm.generate({ ...base, input: 'hola' });
    expect(r.engine).toBe('sovereign-fallback');
    expect(JSON.stringify(r.attempts)).not.toContain('secret detail');
    expect((await llm.generate({ ...base, input: 'hola' })).cached).toBeUndefined();
  });

  it('opens the circuit after repeated failures', async () => {
    const gatewayGenerate = vi.fn(async () => {
      throw new Error('x');
    });
    const llm = createFoundationalLLM(failingRuntime, {
      gatewayGenerate,
      gatewayModel: 'm',
      breakerThreshold: 2,
    });
    for (let i = 0; i < 4; i++) await llm.generate({ ...base, input: `q${i}` });
    expect(gatewayGenerate).toHaveBeenCalledTimes(2);
  });

  it('times out slow providers', async () => {
    const gatewayGenerate = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<string>((_, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        )
    );
    const llm = createFoundationalLLM(failingRuntime, {
      gatewayGenerate,
      gatewayModel: 'm',
      providerTimeoutMs: 20,
    });
    const r = await llm.generate({ ...base, input: 'lento' });
    expect(r.engine).toBe('sovereign-fallback');
    expect(r.attempts?.[0]?.reason).toBe('PROVIDER_TIMEOUT');
  });

  it('times out a provider that ignores the abort signal', async () => {
    const gatewayGenerate = vi.fn(() => new Promise<string>(() => undefined));
    const llm = createFoundationalLLM(failingRuntime, {
      gatewayGenerate,
      gatewayModel: 'm',
      providerTimeoutMs: 20,
    });
    const r = await llm.generate({ ...base, input: 'colgado' });
    expect(r.engine).toBe('sovereign-fallback');
    expect(r.attempts?.[0]?.reason).toBe('PROVIDER_TIMEOUT');
  });
});
