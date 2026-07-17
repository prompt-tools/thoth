import { randomUUID } from "node:crypto";
import { liveAdaptiveExchange } from "@/lib/prompt/agent/adaptive-provider-http";
import { handleJourneyTurnRequest } from "@/lib/prompt/agent/journey-turn-runtime";
import type { ProxyRequest } from "@/lib/prompt/agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fixedTransport(request: ProxyRequest): Promise<unknown> {
  const serialized = JSON.stringify(request.body);
  if (Buffer.byteLength(serialized, "utf8") > 64 * 1024) throw new Error("request_too_large");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(request.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...request.headers },
      body: serialized,
      redirect: "error",
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`http_${response.status}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

export function POST(request: Request): Promise<Response> {
  const adaptiveEnabled = process.env.ADAPTIVE_ROUTING_ENABLED === "1";
  return handleJourneyTurnRequest(request, {
    secret: process.env.ADAPTIVE_TURN_SECRET,
    release: process.env.JOURNEY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    exposure: adaptiveEnabled ? process.env.ADAPTIVE_CANARY_EXPOSURE ?? "0" : "0",
    demoKey: process.env.DEMO_DEEPSEEK_KEY,
    now: () => Date.now(),
    newJourneyId: () => randomUUID(),
    fixedTransport,
    adaptiveExchange: liveAdaptiveExchange,
  });
}
