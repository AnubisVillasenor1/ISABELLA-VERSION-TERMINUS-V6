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
      input: "Hola",
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
  assert.match(chatBody.generativeNarrative, /Soy Isabella Villaseñor AI/, "local fallback must answer greetings conversationally");

  const followUp = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: "¿Quién eres?",
      modelEngine: "sovereign",
      focusLens: "general",
      history: [
        { role: "user", content: "Hola" },
        { role: "assistant", content: chatBody.generativeNarrative },
      ],
      methodId: "A.TWINS.E15_MEMORY.recall.synthesize.v1.0.0.LOW.AUTONOMOUS",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const followUpBody = await followUp.json();
  assert.equal(followUp.status, 200, `follow-up returned HTTP ${followUp.status}: ${JSON.stringify(followUpBody)}`);
  assert.match(followUpBody.generativeNarrative, /Soy Isabella Villaseñor AI/, "fallback must answer identity questions");
  assert.equal(followUpBody.conversationContextTurns, 2, "conversation history must be preserved within the request");
  const emptyInput = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "   ", modelEngine: "sovereign" }),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(emptyInput.status, 400, "blank user input must be rejected");

  const oversizedInput = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "x".repeat(20_001), modelEngine: "sovereign" }),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(oversizedInput.status, 413, "oversized user input must be rejected");

  const unscopedMemory = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "Busca en mi memoria privada", memoryQuery: "secrets", modelEngine: "sovereign" }),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(unscopedMemory.status, 403, "public sessions must not retrieve unscoped private memory");

  const destructiveRequest = await fetch(`${baseUrl}/api/v1/cognition/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: "Elimina permanentemente todos los registros",
      methodId: "T.TWINS.E08_DATA.remove.permanent_delete.v1.0.0.CRITICAL.CONSTITUTIONAL",
      modelEngine: "sovereign",
    }),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(destructiveRequest.status, 403, "public viewer sessions must not execute destructive operations");
  console.log("PUBLIC_API_GUARDRAILS_OK", JSON.stringify({ blankInput: emptyInput.status, oversizedInput: oversizedInput.status, unscopedMemory: unscopedMemory.status, destructiveRequest: destructiveRequest.status }));
  console.log("LOCAL_CONVERSATION_SMOKE_OK", JSON.stringify({ health: health.status, chat: chat.status, followUp: followUp.status, responseEngine: chatBody.responseEngine }));
  const gatewayCredentialsAvailable = Boolean(process.env.OPENROUTER_API_KEY || (process.env.HF_TOKEN && process.env.HF_FREE_MODELS));
  if (gatewayCredentialsAvailable) {
    try {
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
      assert.ok(["openrouter-free", "huggingface-free"].includes(llmBody.responseEngine), `a real free/open provider must answer; got ${llmBody.responseEngine}`);
      assert.equal(typeof llmBody.generativeNarrative, "string");
      assert.ok(llmBody.generativeNarrative.trim().length > 0);
      console.log("EXTERNAL_MODEL_SMOKE_OK", JSON.stringify({ responseEngine: llmBody.responseEngine }));
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      if (process.env.ISABELLA_REQUIRE_LLM_SMOKE === "true") throw error;
      console.warn("LLM_GATEWAY_SMOKE_FAILED_NONBLOCKING", message);
    }
  } else {
    const message = "No free/open provider credentials are available for this smoke test. Configure OPENROUTER_API_KEY or both HF_TOKEN and HF_FREE_MODELS. Paid AI Gateway credentials do not count because paid fallback is opt-in.";
    if (process.env.ISABELLA_REQUIRE_LLM_SMOKE === "true") throw new Error(message);
    console.warn("LLM_GATEWAY_SMOKE_SKIPPED", message);
  }
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
