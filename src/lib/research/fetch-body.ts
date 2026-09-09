/** Hard cap for unattended HTML fetches. Oversize rejects; never truncate. */
export const MAX_RESEARCH_FETCH_BODY_BYTES = 1_048_576;

/**
 * Stream-read a Response body and reject once the byte total exceeds the cap.
 * Content-Length alone is not trusted: lying headers still hit the chunk bound.
 */
export async function readBoundedResponseText(
  response: Response,
  maxBytes: number = MAX_RESEARCH_FETCH_BODY_BYTES,
): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response body exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}
