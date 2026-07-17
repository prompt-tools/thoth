import { ADAPTIVE_MAX_BYTES } from "./adaptive-turn";
import type {
  AdaptiveProviderRequest,
  AdaptiveProviderOutcome,
} from "./adaptive-turn-runtime";

async function readCappedBody(response: Response): Promise<{ body: Uint8Array; bodyTooLarge: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { body: new Uint8Array(), bodyTooLarge: false };
  const chunks: Uint8Array[] = [];
  let size = 0;
  let bodyTooLarge = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      const remaining = ADAPTIVE_MAX_BYTES - size;
      if (value.byteLength > remaining) {
        if (remaining > 0) chunks.push(value.subarray(0, remaining));
        size = ADAPTIVE_MAX_BYTES;
        bodyTooLarge = true;
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, bodyTooLarge };
}

export async function liveAdaptiveExchange(request: AdaptiveProviderRequest): Promise<AdaptiveProviderOutcome> {
  const response = await fetch(request.endpoint, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: request.redirect,
    signal: request.signal,
  });
  const { body, bodyTooLarge } = await readCappedBody(response);
  return {
    kind: "http",
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    bodyTooLarge,
  };
}
