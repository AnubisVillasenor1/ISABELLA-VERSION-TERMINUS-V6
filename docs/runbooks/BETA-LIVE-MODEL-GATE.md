# Isabella Beta — live open-model gate

This gate checks the real provider path; the ordinary build smoke test alone is not proof of external inference.

## Configure once in GitHub

In **Settings → Environments**, create an environment named `beta-live-model-gate`. Add required reviewers/protection rules if available, then store provider credentials as **environment secrets** (not repository-wide secrets):

- Add environment secret `OPENROUTER_API_KEY`, using a key created in the OpenRouter account; **or**
- Add environment secret `HF_TOKEN` and repository variable `HF_FREE_MODELS` with one or more comma-separated model IDs that the account can actually access.

Keep the workflow restricted to reviewed branch commits. The environment boundary ensures the job does not receive provider secrets until its environment protection is satisfied. Optional variables:

- `OPENROUTER_FREE_MODEL`: defaults to `openrouter/free`. Use a specific eligible free model only if the account and provider support it.

Do not paste provider keys into issues, commits, workflow inputs, or chat. The workflow passes secrets only as environment variables and never prints them.

## Run the gate

The `workflow_dispatch` workflow must first be present on the repository's default branch. Merge/release this workflow file through the normal reviewed PR process before using the manual trigger.

1. Open **Actions → Isabella Beta Live Model Gate**.
2. Select **Run workflow** on the branch being evaluated.
3. Require the step **Build and require a real external model response** to pass.
4. Inspect the build output for `EXTERNAL_MODEL_SMOKE_OK` and a response engine of `openrouter-free` or `huggingface-free`.

The gate sets `ISABELLA_REQUIRE_LLM_SMOKE=true` and `ALLOW_PAID_PROVIDER_FALLBACK=false`. Missing credentials, a timeout, a provider error, an empty response, or a local fallback makes the job fail. It does not deploy to production or enable paid inference.

## Evidence boundary

A passing run proves that the configured provider returned a non-empty response to a smoke prompt during that run. It does not prove uptime, model quality, privacy compliance, long-term memory, or production readiness. Run it again after provider/model/configuration changes.
