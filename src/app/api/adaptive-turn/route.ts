import { NextResponse } from "next/server";
import {
  ADAPTIVE_ENDPOINT,
  ADAPTIVE_MAX_BYTES,
  buildAdaptiveProviderBody,
  buildAdaptiveTurnSnapshot,
  fallbackAdaptiveTurn,
  normalizeAdaptiveResponse,
} from "@/lib/prompt/agent/adaptive-turn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.ADAPTIVE_ROUTING_ENABLED !== "1") {
    return NextResponse.json({ error: "Adaptive routing disabled" }, { status: 404 });
  }

  const rawAuth = request.headers.get("authorization")?.trim() ?? "";
  const serverKey = rawAuth === "Bearer __demo__"
    ? process.env.DEMO_DEEPSEEK_KEY
    : rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : "";
  if (!serverKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  let snapshot;
  try {
    snapshot = buildAdaptiveTurnSnapshot(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }

  const providerBody = buildAdaptiveProviderBody(snapshot);
  const serialized = JSON.stringify(providerBody);
  if (Buffer.byteLength(serialized, "utf8") > ADAPTIVE_MAX_BYTES) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch(ADAPTIVE_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${serverKey}`, "content-type": "application/json" },
      body: serialized,
      redirect: "error",
      signal: controller.signal,
    });
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > ADAPTIVE_MAX_BYTES) {
      return NextResponse.json(fallbackAdaptiveTurn(snapshot, "response_too_large"));
    }
    if (!upstream.ok) return NextResponse.json(fallbackAdaptiveTurn(snapshot, `http_${upstream.status}`));
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return NextResponse.json(fallbackAdaptiveTurn(snapshot, "invalid_json"));
    }
    return NextResponse.json(normalizeAdaptiveResponse(raw, snapshot));
  } catch (error) {
    return NextResponse.json(fallbackAdaptiveTurn(snapshot, error instanceof Error ? error.name : "network_error"));
  } finally {
    clearTimeout(timer);
  }
}
