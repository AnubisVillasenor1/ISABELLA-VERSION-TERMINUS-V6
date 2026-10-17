/**
 * Canonical cache-key encoding. The governance method is part of the tuple so
 * identical text cannot share an entry across materially different policy paths.
 */
export function buildCognitionCacheKey(
  input: string,
  history: unknown,
  modelEngine: string,
  focusLens: string,
  methodId: string,
): string {
  return JSON.stringify([modelEngine, focusLens, methodId, input, history ?? []]) ?? "null";
}
