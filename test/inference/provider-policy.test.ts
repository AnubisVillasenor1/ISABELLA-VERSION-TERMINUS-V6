import { describe, expect, it } from "vitest";
import { buildOpenAICompatibleCandidates } from "../../src/inference/provider-policy";

describe("OpenAI-compatible candidate builder", () => {
  it("includes Ollama Cloud only when a credential is present", () => {
    expect(buildOpenAICompatibleCandidates({})).toHaveLength(0);
    const withKey = buildOpenAICompatibleCandidates({ OLLAMA_API_KEY: "k" });
    expect(withKey).toHaveLength(1);
    expect(withKey[0]).toMatchObject({
      name: "ollama",
      url: "https://ollama.com/v1/chat/completions",
      model: "gpt-oss:20b",
    });
  });

  it("honors OLLAMA_BASE_URL and OLLAMA_MODEL overrides", () => {
    const [candidate] = buildOpenAICompatibleCandidates({
      OLLAMA_API_KEY: "k",
      OLLAMA_BASE_URL: "http://localhost:11434/v1/",
      OLLAMA_MODEL: "llama3.2",
    });
    expect(candidate?.url).toBe("http://localhost:11434/v1/chat/completions");
    expect(candidate?.model).toBe("llama3.2");
  });

  it("keeps attempt order with Ollama first and drops unkeyed providers", () => {
    const names = buildOpenAICompatibleCandidates({ OLLAMA_API_KEY: "k", GROQ_API_KEY: "g" }).map(
      (candidate) => candidate.name,
    );
    expect(names).toEqual(["ollama", "groq"]);
  });

  it("treats a blank credential as absent", () => {
    expect(buildOpenAICompatibleCandidates({ OLLAMA_API_KEY: "   " })).toHaveLength(0);
  });

  it("gates Groq behind a credential with an available free default model", () => {
    const defaults = buildOpenAICompatibleCandidates({ GROQ_API_KEY: "k" });
    expect(defaults[0]).toMatchObject({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "openai/gpt-oss-20b",
    });
    const override = buildOpenAICompatibleCandidates({
      GROQ_API_KEY: "k",
      GROQ_MODEL: "qwen/qwen3.8-27b",
    });
    expect(override[0]?.model).toBe("qwen/qwen3.8-27b");
  });
});
