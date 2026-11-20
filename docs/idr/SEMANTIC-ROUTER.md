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

## Embeddings

The router accepts an injected provider, so the runtime does not acquire an undeclared vendor dependency or transmit user intent to an external service implicitly. Production integration must select a provider, configure consent/data handling, enforce timeout and dimension bounds, and test model/version drift. Embeddings improve ranking only; they cannot override policy gates.

## Security and production boundary

- Do not accept the policy as authoritative user input in a production endpoint. Resolve it from authenticated identity, domain constitution slice, server-side CROWN evaluation, and explicit grants.
- Validate capability contracts and signatures before adding them to the trusted registry.
- Do not invoke a planned capability based solely on `status: RESOLVED`.
- Before execution integration, add signed mandates, BookPI append-only evidence, replay protection/idempotency, per-domain quotas, authenticated route registration, rate limiting, telemetry, and durable registry persistence.
- `estimatedCost` is declarative metadata, not billing evidence.
- The prototype does not implement DID/VC issuance, ZK proofs, signature verification, Stripe settlement, domain mount/unmount, or a durable Sovereign Vault.

## Verification

```bash
pnpm exec vitest run test/domain-runtime-semantic-router.test.ts
pnpm typecheck
pnpm lint
```

CI results must be recorded from an actual run; no test pass is implied by the presence of test files.
