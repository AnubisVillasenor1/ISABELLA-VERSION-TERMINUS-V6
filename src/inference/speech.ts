/**
 * Speech layer: key-driven, fail-closed text-to-speech and speech-to-text.
 *
 * Isabella only attempts a provider when an operator supplies the credential and
 * (optionally) the model explicitly. No audio is produced or transcribed without
 * a configured provider; the browser's own Web Speech API is the honest offline
 * fallback and is owned by the client, not by this module.
 */

export const SPEECH_CONTRACT_VERSION = "1.0.0";

export type SpeechProvider = "groq";

export interface SpeechReadiness {
  textToSpeech: boolean;
  speechToText: boolean;
  providers: SpeechProvider[];
}

export interface SynthesizedSpeech {
  provider: SpeechProvider;
  mimeType: string;
  dataUrl: string;
  bytes: number;
}

export interface Transcription {
  provider: SpeechProvider;
  text: string;
}

interface GroqSpeechConfig {
  key: string;
  baseUrl: string;
  ttsModel: string;
  ttsVoice: string;
  sttModel: string;
}

const DEFAULT_GROQ_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_TTS_MODEL = "canopylabs/orpheus-v1-english";
const DEFAULT_TTS_VOICE = "troy";
const DEFAULT_STT_MODEL = "whisper-large-v3";
const ALLOWED_AUDIO_MIME = /^audio\/(mpeg|mp3|mp4|m4a|x-m4a|wav|x-wav|wave|webm|ogg|oga|flac|aac)$/i;

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function groqSpeechConfig(env: Record<string, string | undefined>): GroqSpeechConfig | null {
  const key = nonEmpty(env.GROQ_API_KEY);
  if (!key) return null;
  return {
    key,
    baseUrl: (nonEmpty(env.GROQ_BASE_URL) ?? DEFAULT_GROQ_BASE).replace(/\/+$/, ""),
    ttsModel: nonEmpty(env.GROQ_TTS_MODEL) ?? DEFAULT_TTS_MODEL,
    ttsVoice: nonEmpty(env.GROQ_TTS_VOICE) ?? DEFAULT_TTS_VOICE,
    sttModel: nonEmpty(env.GROQ_STT_MODEL) ?? DEFAULT_STT_MODEL,
  };
}

export function describeSpeechReadiness(env: Record<string, string | undefined>): SpeechReadiness {
  const config = groqSpeechConfig(env);
  return {
    textToSpeech: config !== null,
    speechToText: config !== null,
    providers: config ? ["groq"] : [],
  };
}

/**
 * Text-to-speech via Groq's OpenAI-compatible audio endpoint (Orpheus). Returns
 * null when no provider is configured or the provider rejects the request.
 */
export async function synthesizeSpeech(
  env: Record<string, string | undefined>,
  input: { text: string; voice?: string; format?: "wav" | "mp3"; timeoutMs?: number },
): Promise<SynthesizedSpeech | null> {
  const config = groqSpeechConfig(env);
  if (!config) return null;
  const text = nonEmpty(input.text)?.slice(0, 2_000);
  if (!text) return null;
  const format = input.format === "mp3" ? "mp3" : "wav";
  try {
    const response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ttsModel,
        input: text,
        voice: nonEmpty(input.voice) ?? config.ttsVoice,
        response_format: format,
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 30_000),
    });
    if (!response.ok) throw new Error(`groq speech HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) throw new Error("groq speech returned empty audio");
    return {
      provider: "groq",
      mimeType: format === "mp3" ? "audio/mpeg" : "audio/wav",
      dataUrl: `data:${format === "mp3" ? "audio/mpeg" : "audio/wav"};base64,${buffer.toString("base64")}`,
      bytes: buffer.byteLength,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Isabella] speech synthesis unavailable", { message: message.slice(0, 180) });
    return null;
  }
}

/**
 * Speech-to-text via Groq Whisper. Audio arrives as a base64 payload plus an
 * explicit audio mime type; other content types fail closed.
 */
export async function transcribeAudio(
  env: Record<string, string | undefined>,
  input: { base64: string; mimeType: string; language?: string; timeoutMs?: number },
): Promise<Transcription | null> {
  const config = groqSpeechConfig(env);
  if (!config) return null;
  const mimeType = nonEmpty(input.mimeType);
  if (!mimeType || !ALLOWED_AUDIO_MIME.test(mimeType)) return null;
  const base64 = nonEmpty(input.base64);
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  try {
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength === 0) return null;
    const form = new FormData();
    form.append("model", config.sttModel);
    const language = nonEmpty(input.language);
    if (language) form.append("language", language);
    form.append("response_format", "json");
    form.append("file", new Blob([bytes], { type: mimeType }), "audio");
    const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}` },
      body: form,
      signal: AbortSignal.timeout(input.timeoutMs ?? 30_000),
    });
    if (!response.ok) throw new Error(`groq transcription HTTP ${response.status}`);
    const payload = await response.json() as { text?: unknown };
    const text = nonEmpty(payload.text);
    if (!text) return null;
    return { provider: "groq", text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Isabella] speech transcription unavailable", { message: message.slice(0, 180) });
    return null;
  }
}
