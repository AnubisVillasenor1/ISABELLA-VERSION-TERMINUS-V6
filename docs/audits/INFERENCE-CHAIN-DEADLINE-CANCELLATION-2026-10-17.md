# Focused inference-chain audit — 2026-10-17

## Scope

This change addresses the public chat route's sequential model-provider chain and its request lifecycle. It is a targeted correction, not a claim that the entire inference stack or production deployment has passed validation.

## Findings corrected

### INF-01 — The configured chain deadline did not cover the entire routing path

The `DeadlineBudget` was created after the local Genesis Turbo classification. Time spent in that classification was therefore outside the advertised whole-chain budget.

**Correction:** start the budget before local classification and reuse it through provider routing. Classifier time consumes the same budget, so an expensive classification leaves less time for provider attempts. The classifier API itself does not currently accept an abort signal, so the budget cannot interrupt a classifier that hangs; that remains a separate limitation.

### INF-02 — Two fallback paths could escape the shared budget

The Perplexity Router call used its own default 30-second timeout without the chain's remaining budget. A later keyless-provider retry also omitted the `DeadlineBudget` argument.

**Correction:** pass a remaining-budget-derived timeout and abort signal to Perplexity; pass the shared budget to the second keyless attempt. All ordinary provider attempts remain guarded by `budget.expired()`.

### INF-03 — Client-side Stop/disconnect did not cancel upstream model work

The browser can abort its fetch, but the server did not connect premature response closure to provider cancellation. This could waste provider capacity and continue downstream attempts after the user had stopped waiting.

**Correction:** attach an abort controller to the response lifecycle; abort it only when the response closes before `writableEnded`. `DeadlineBudget` combines that caller signal with the per-attempt timeout. A cancelled request stops before additional generation or response work. The Perplexity adapter now accepts the same signal.

### INF-04 — Local fallback responses could be cached as if they were successful model responses

The cognition response cache accepted any successful admitted response, including `responseEngine: "sovereign-fallback"`. A transient provider outage could therefore keep serving a deterministic fallback after a model provider recovered, until the cache entry expired.

**Correction:** exclude `sovereign-fallback` responses from the success cache. The fallback remains available to answer promptly but no longer masks recovery through cached output.

## Regression coverage added

- Added a unit test asserting that caller cancellation aborts a provider signal and marks the deadline as expired, preventing subsequent attempts.
- Existing deadline tests still cover remaining-budget caps, minimum attempt windows, worst-case sequential timeout bounds, invalid values, and environment parsing.

## Limitations and verification status

- This change was committed to a feature branch; it has not been merged into `main`.
- Tests and TypeScript checks have **not** been executed in a local checkout in this workflow. Passing status must come from GitHub Actions or a reproducible local run; no green result is claimed here.
- External provider reachability, credentials, quotas, actual generative output, Vercel deployment, and browser-level Stop behavior remain unverified.
- The shared deadline bounds provider attempts, not every possible operation in the full HTTP request. Local Genesis Turbo classification consumes the budget but cannot itself be interrupted through its current API. The Gemini SDK path is limited by its request timeout but does not yet receive the caller's abort signal. Other provider adapters must accept and honor the supplied timeout/cancellation contract.
- Cancellation is best-effort at the network/SDK layer; an upstream service may already have accepted a request before the abort reaches it.

## Invariants preserved

- External keyless inference remains opt-in; this change does not enable it.
- Paid-provider fallback remains controlled by the existing explicit configuration.
- The deterministic fallback is still labeled `sovereign-fallback`; it is not represented as LLM output.
- No authority or execution permissions are granted by the deadline or cancellation mechanism.
