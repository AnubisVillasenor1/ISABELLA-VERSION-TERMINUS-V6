# GAME OVER Governance (UAGP-1) — Jenkins plugin

A Jenkins gate that evaluates an AI Passport, trust score, risk level, ethics
rules, human approval and audit before a build or deploy is allowed to proceed.

**Fidelity contract:** SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠
VERIFIED ≠ DEPLOYED ≠ CERTIFIED. This source tree is **specified + implemented
as source**; it has **not been compiled or run** in this repository.
`state: draft | engine-generated`.

## What it does

The `gameOverGovernance` pipeline step builds a UAGP-1 request and runs the
pipeline `validate -> passport -> ethics -> trust -> risk -> adjudicate ->
human approval -> explain -> audit`. It returns a `UagpResult` and, when
`failOnReject` is true (default), fails the build on any outcome other than
`ACCEPT`. It **decides, scores and records**; it never executes the governed
action or certifies it.

## Build (requires JDK 17 + Maven)

Not available in the environment where this was authored, so the `.hpi` was
**not** produced here. To build where Maven/JDK 17 exist:

```
cd gameover-jenkins-plugin
mvn -B -DskipTests package      # produces target/gameover-governance.hpi
mvn -B test                     # runs the JUnit 5 suite
```

The plugin targets `jenkins.version 2.440.3` and `java.level 17`, and depends on
`credentials`, `ssh-agent`, `workflow-step-api` and `jackson-databind`.

## Layout

- `src/main/java/ai/gameover/` — step (`GovernanceStep`), descriptor, global
  configuration, plugin metadata and `UagpGateway`/`UagpValidator`.
- `src/main/java/ai/gameover/{model,engine,passport,audit,approval}/` — the
  UAGP-1 engines, mirroring `src/gameover/*.ts` in Isabella.
- `src/main/resources/gameover/constitution.yml` — canonical constitution.
- `src/main/resources/ai/gameover/**` — Jelly form + help.
- `src/test/java/ai/gameover/` — JUnit 5 tests.

## Fidelity notes

- The in-plugin trust/risk values are declared heuristic weights, not measured
  accuracy.
- The `PassportAuthority` and `BookPILedger` here are application-level,
  in-memory mirrors. The authoritative audit ledger lives in Isabella's BookPI;
  wire `GameOverGlobalConfiguration.gatewayUrl` if you route decisions to the
  runtime service.
