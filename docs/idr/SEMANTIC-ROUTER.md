# Isabella Domain Runtime — Semantic Router v1

**State:** prototype implementation; review and CI execution required. This module is a planning engine, not an execution authority.

## Purpose

Resolve a natural-language intent into a minimum dependency chain of registered capabilities. Policy filtering happens before ranking, and dependencies are rejected when absent, disabled, disallowed, or cyclic. The module never executes a capability and always returns `executionPerformed: false` and `production: false`.

## Resolution pipeline

1. Validate intent, capability identifiers, policy bounds, and graph edges.
2. Apply fail-closed policy gates: enabled state, domain allowlist, denied capability list, risk ceiling, external execution, PII, retention, and cost validity.
3. Rank remaining candidates using deterministic lexical coverage/Jaccard scoring. An optional `EmbeddingProvider` blends lexical score (55%) and cosine similarity (45%); embedding-provider failure falls back to lexical scoring.
4. Resolve `requires` dependencies through a directed knowledge graph using depth-first topological ordering. Missing dependencies and cycles are rejected.
5. Enforce the maximum chain length and total estimated cost. Mark plans requiring human approval; planning never grants that approval.
6. Return the selected chain, score rationale, estimated cost, and rejection ledger.

## API contract

See [`schemas/idr-semantic-route.schema.json`](../../schemas/idr-semantic-route.schema.json). The TypeScript entry point is `src/domain-runtime/semantic-router.ts`.

Example:

```ts
const result = await resolveSemanticIntent({
  intent: 'publicar en redes sociales',
  capabilities: registry,
  policy: { allowExternal: true, maxCost: 0.10 },
});
```

The default policy disallows external execution and PII, allows low/medium/high risk only, limits plans to five capabilities and estimated cost 1.0, and permits only none/session/user-controlled retention. High-risk and critical-risk capabilities are marked for human approval; this is a signal, not an authorization.

## Embeddings and provider wiring

The runtime now includes `src/domain-runtime/embedding-providers.ts` and wires the selected adapter into `POST /api/v1/idr/resolve`. Provider selection is explicit and defaults to `none`; no intent is sent to a remote provider unless an operator opts in.

| Mode | Configuration | Data boundary | Cost/availability |
| --- | --- | --- | --- |
| `none` | `IDR_EMBEDDINGS_PROVIDER=none` (default) | No embedding network call; deterministic lexical ranking | No provider fee; always available |
| `ollama` | Install Ollama, pull `nomic-embed-text-v2-moe`, set `IDR_EMBEDDINGS_PROVIDER=ollama` | Local endpoint, loopback only by default | Open-source runtime/model; no per-call API fee, but local compute has a cost |
| `tei` | Self-host Hugging Face Text Embeddings Inference; set `IDR_EMBEDDINGS_PROVIDER=tei` | Self-hosted `/embed` endpoint, loopback only by default | Open-source serving stack; no per-call API fee, but local compute/hosting has a cost |
| `huggingface` | Set `IDR_EMBEDDINGS_PROVIDER=huggingface` and server-side `HF_TOKEN` | Sends bounded intent/capability text to Hugging Face Inference | Not guaranteed free; quotas, model availability, terms and potential charges apply |

### Local Ollama setup

```bash
ollama pull nomic-embed-text-v2-moe
# In the server environment:
IDR_EMBEDDINGS_PROVIDER=ollama
IDR_OLLAMA_BASE_URL=http://127.0.0.1:11434
IDR_OLLAMA_EMBEDDING_MODEL=nomic-embed-text-v2-moe
IDR_EMBEDDING_TIMEOUT_MS=8000
```

For self-hosted TEI, run the official Text Embeddings Inference container and expose its `/embed` endpoint only on a trusted local interface; configure `IDR_TEI_BASE_URL`. For hosted Hugging Face, create a token with only the required inference permission and store it in the server-side secret manager. Never prefix these values with `NEXT_PUBLIC_`, put them in client code, or commit credentials. Hugging Face feature-extraction is a hosted dependency and should be treated as an external data processor; check the current model/provider terms and account quota before enabling it.

The adapters enforce bounded input length, timeout, vector dimension, finite-number validation, a bounded in-process cache, fixed remote host, and lexical fallback on provider failure. Remote calls are never selected automatically. Provider failure or malformed vectors cannot bypass the router's policy gates. The API status reports mode/model/configuration state only; it never exposes tokens.

## Security and production boundary

- Do not accept the policy as authoritative user input in a production endpoint. Resolve it from authenticated identity, domain constitution slice, server-side CROWN evaluation, and explicit grants.
- Validate capability contracts and signatures before adding them to the trusted registry.
- Do not invoke a planned capability based solely on `status: RESOLVED`.
- Before execution integration, add signed mandates, BookPI append-only evidence, replay protection/idempotency, per-domain quotas, authenticated route registration, rate limiting, telemetry, and durable registry persistence.
- `estimatedCost` is declarative metadata, not billing evidence.
- The prototype does not implement DID/VC issuance, ZK proofs, signature verification, Stripe settlement, domain mount/unmount, or a durable Sovereign Vault.

## Verification

```bash
pnpm exec vitest run test/domain-runtime-semantic-router.test.ts test/domain-runtime-embedding-providers.test.ts
pnpm typecheck
pnpm lint
```

CI results must be recorded from an actual run; no test pass is implied by the presence of test files.
