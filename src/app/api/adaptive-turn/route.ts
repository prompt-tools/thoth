import {
  handleAdaptiveTurnRequest,
} from "@/lib/prompt/agent/adaptive-turn-runtime";
import { liveAdaptiveExchange } from "@/lib/prompt/agent/adaptive-provider-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleAdaptiveTurnRequest(request, {
    enabled: process.env.ADAPTIVE_ROUTING_ENABLED === "1",
    demoKey: process.env.DEMO_DEEPSEEK_KEY,
    turnSecret: process.env.ADAPTIVE_TURN_SECRET,
    now: () => Date.now(),
    exchange: liveAdaptiveExchange,
  });
}
