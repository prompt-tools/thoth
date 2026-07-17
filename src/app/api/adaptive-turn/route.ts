import {
  handleAdaptiveTurnRequest,
  type AdaptiveProviderRequest,
  type AdaptiveProviderOutcome,
} from "@/lib/prompt/agent/adaptive-turn-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function liveExchange(request: AdaptiveProviderRequest): Promise<AdaptiveProviderOutcome> {
  const response = await fetch(request.endpoint, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: request.redirect,
    signal: request.signal,
  });
  const body = new Uint8Array(await response.arrayBuffer());
  return {
    kind: "http",
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

export async function POST(request: Request): Promise<Response> {
  return handleAdaptiveTurnRequest(request, {
    enabled: process.env.ADAPTIVE_ROUTING_ENABLED === "1",
    demoKey: process.env.DEMO_DEEPSEEK_KEY,
    turnSecret: process.env.ADAPTIVE_TURN_SECRET,
    now: () => Date.now(),
    exchange: liveExchange,
  });
}
