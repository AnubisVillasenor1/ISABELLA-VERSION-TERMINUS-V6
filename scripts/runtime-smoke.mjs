import assert from "node:assert/strict";
import { createServer } from "node:http";

// Prevent the application from opening a production listener while this smoke test imports it.
process.env.VERCEL = "1";
const { default: app } = await import("../dist/server.js");
assert.equal(typeof app, "function", "Express app must be exported as a request handler");

const server = createServer(app);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object", "smoke server must bind an ephemeral port");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(health.status, 200, "GET /health must return HTTP 200");
  const healthBody = await health.json();
  assert.equal(healthBody.status, "healthy");

  const chat = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: "Hola Isabella. Responde brevemente y confirma que puedes conversar.",
      modelEngine: "sovereign",
      focusLens: "general",
      history: [],
      methodId: "A.TWINS.E15_MEMORY.recall.synthesize.v1.0.0.LOW.AUTONOMOUS",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const chatBody = await chat.json();
  assert.equal(chat.status, 200, `chat endpoint returned HTTP ${chat.status}: ${JSON.stringify(chatBody)}`);
  assert.equal(typeof chatBody.generativeNarrative, "string", "chat must return a user-facing narrative");
  assert.ok(chatBody.generativeNarrative.trim().length > 0, "chat narrative must not be empty");
  assert.equal(chatBody.responseEngine, "sovereign", "explicit sovereign mode must disclose the local engine");
  console.log("RUNTIME_SMOKE_OK", JSON.stringify({ health: health.status, chat: chat.status, responseEngine: chatBody.responseEngine }));
  const gatewayCredentialsAvailable = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  if (gatewayCredentialsAvailable) {
    const llm = await fetch(`${baseUrl}/api/v1/cognition/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: "Responde en una sola oración en español: ¿puedes conversar con el usuario?",
        modelEngine: "open-science",
        focusLens: "general",
        history: [],
        methodId: "A.TWINS.E15_MEMORY.recall.synthesize.v1.0.0.LOW.AUTONOMOUS",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const llmBody = await llm.json();
    assert.equal(llm.status, 200, `gateway chat returned HTTP ${llm.status}: ${JSON.stringify(llmBody)}`);
    assert.equal(llmBody.responseEngine, "open-science", `gateway must generate a real model response, got ${llmBody.responseEngine}`);
    assert.equal(typeof llmBody.generativeNarrative, "string");
    assert.ok(llmBody.generativeNarrative.trim().length > 0);
    console.log("LLM_GATEWAY_SMOKE_OK", JSON.stringify({ responseEngine: llmBody.responseEngine }));
  } else {
    console.warn("LLM_GATEWAY_SMOKE_SKIPPED: AI_GATEWAY_API_KEY and VERCEL_OIDC_TOKEN are unavailable in this build environment.");
  }
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
