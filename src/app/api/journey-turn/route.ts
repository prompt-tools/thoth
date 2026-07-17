import { randomUUID } from "node:crypto";
import { liveAdaptiveExchange } from "@/lib/prompt/agent/adaptive-provider-http";
import { handleJourneyTurnRequest } from "@/lib/prompt/agent/journey-turn-runtime";
import { ProviderTransportError, type ProxyRequest } from "@/lib/prompt/agent/client";
import { createUpstashAttemptStore } from "@/lib/prompt/agent/upstash-attempt-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fixedTransport(request: ProxyRequest, callerSignal?: AbortSignal): Promise<unknown> {
  const serialized = JSON.stringify(request.body);
  if (Buffer.byteLength(serialized, "utf8") > 64 * 1024) {
    throw new ProviderTransportError("request_too_large");
  }
  const controller = new AbortController();
  let callerCancelled = callerSignal?.aborted ?? false;
  const abortFromCaller = () => {
    callerCancelled = true;
    controller.abort();
  };
  if (callerCancelled) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30_000);
  try {
    let response: Response;
    try {
      response = await fetch(request.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...request.headers },
        body: serialized,
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw new ProviderTransportError("provider_timeout");
      if (callerCancelled || (error instanceof DOMException && error.name === "AbortError")) {
        throw new ProviderTransportError("provider_cancelled");
      }
      throw new ProviderTransportError("network_error");
    }
    const text = await response.text();
    if (!response.ok) throw new ProviderTransportError(`http_${response.status}`, response.status);
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderTransportError("invalid_json", response.status);
    }
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function POST(request: Request): Promise<Response> {
  const adaptiveEnabled = process.env.ADAPTIVE_ROUTING_ENABLED === "1";
  const attemptStore = createUpstashAttemptStore({
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  });
  return handleJourneyTurnRequest(request, {
    secret: process.env.ADAPTIVE_TURN_SECRET,
    release: process.env.JOURNEY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    exposure: adaptiveEnabled ? process.env.ADAPTIVE_CANARY_EXPOSURE ?? "0" : "0",
    demoKey: process.env.DEMO_DEEPSEEK_KEY,
    now: () => Date.now(),
    newJourneyId: () => randomUUID(),
    newAttemptId: () => randomUUID(),
    attemptStore,
    fixedTransport: (providerRequest) => fixedTransport(providerRequest, request.signal),
    adaptiveExchange: liveAdaptiveExchange,
  });
}
