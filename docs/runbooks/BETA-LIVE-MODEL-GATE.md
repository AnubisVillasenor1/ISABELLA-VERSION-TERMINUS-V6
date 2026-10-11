# Isabella Beta — live open-model gate

This gate checks the real provider path; the ordinary build smoke test alone is not proof of external inference.

## Configure once in GitHub

In **Settings → Secrets and variables → Actions** for this repository:

- Add secret `OPENROUTER_API_KEY`, using a key created in the OpenRouter account; **or**
- Add secret `HF_TOKEN` and repository variable `HF_FREE_MODELS` with one or more comma-separated model IDs that the account can actually access.

Optional variables:

- `OPENROUTER_FREE_MODEL`: defaults to `openrouter/free`. Use a specific eligible free model only if the account and provider support it.

Do not paste provider keys into issues, commits, workflow inputs, or chat. The workflow passes secrets only as environment variables and never prints them.

## Run the gate

1. Open **Actions → Isabella Beta Live Model Gate**.
2. Select **Run workflow** on the branch being evaluated.
3. Require the step **Build and require a real external model response** to pass.
4. Inspect the build output for `EXTERNAL_MODEL_SMOKE_OK` and a response engine of `openrouter-free` or `huggingface-free`.

The gate sets `ISABELLA_REQUIRE_LLM_SMOKE=true` and `ALLOW_PAID_PROVIDER_FALLBACK=false`. Missing credentials, a timeout, a provider error, an empty response, or a local fallback makes the job fail. It does not deploy to production or enable paid inference.

## Evidence boundary

A passing run proves that the configured provider returned a non-empty response to a smoke prompt during that run. It does not prove uptime, model quality, privacy compliance, long-term memory, or production readiness. Run it again after provider/model/configuration changes.
