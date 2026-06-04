export type StreamEnvelope =
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Incremental SSE parser. Call the returned `push` with each decoded text
 * chunk; it returns whatever complete `data:` envelopes are now available,
 * buffering any partial trailing record across calls.
 */
export function createSSEParser() {
  let buffer = "";

  return function push(chunk: string): StreamEnvelope[] {
    buffer += chunk;
    const envelopes: StreamEnvelope[] = [];

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const record = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (!record.startsWith("data:")) continue;
      const json = record.slice("data:".length).trim();
      if (!json) continue;

      try {
        envelopes.push(JSON.parse(json) as StreamEnvelope);
      } catch {
        // Skip a malformed record rather than aborting the whole stream.
      }
    }

    return envelopes;
  };
}
