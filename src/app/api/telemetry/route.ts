import { NextResponse } from "next/server";

// Agent-demo telemetry: persist each public session (the user's seed, every question we
// presented + the option ids shown, what the user selected, auto-fills, and the final
// prompt) to Langfuse so real-user behaviour can be analysed. Server-side only — the
// Langfuse SECRET key (LANGFUSE_SECRET_KEY) is a server env var, never shipped to the
// browser. Env-gated: with no Langfuse keys this is a clean no-op (local dev).
//
// Forwards to Langfuse's REST ingestion API (no SDK / OTel) so it stays lightweight in a
// serverless route. One trace per session, keyed by sessionId so repeated flushes upsert.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelemetryPayload {
  sessionId?: string;
  seed?: string;
  primaryType?: string;
  precision?: string;
  finalPrompt?: { zh?: string; en?: string };
  endedReason?: string;
  entries?: unknown[]; // the debug-log entries (decision = presented option ids, submit = selections, …)
}

export async function POST(request: Request) {
  let payload: TelemetryPayload;
  try {
    payload = (await request.json()) as TelemetryPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const base = process.env.LANGFUSE_BASE_URL;
  const pk = process.env.LANGFUSE_PUBLIC_KEY;
  const sk = process.env.LANGFUSE_SECRET_KEY;
  // Env-gated no-op so the app never breaks when telemetry isn't configured.
  if (!base || !pk || !sk) return NextResponse.json({ ok: false, reason: "telemetry-disabled" });

  const sessionId = typeof payload.sessionId === "string" && payload.sessionId ? payload.sessionId : crypto.randomUUID();
  const serialized = JSON.stringify(payload.entries ?? []);
  if (serialized.length > 256 * 1024) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  const now = new Date().toISOString();
  const batch = [
    {
      id: crypto.randomUUID(),
      type: "trace-create",
      timestamp: now,
      body: {
        id: sessionId, // stable → upserts on each flush
        name: "agent-demo-session",
        sessionId,
        timestamp: now,
        input: payload.seed ?? "",
        output: payload.finalPrompt?.zh ?? "",
        tags: ["agent-demo", "public"],
        metadata: {
          primaryType: payload.primaryType ?? null,
          precision: payload.precision ?? null,
          endedReason: payload.endedReason ?? null,
          finalPromptEn: payload.finalPrompt?.en ?? "",
          entries: payload.entries ?? [], // every step: presented option ids + user selections
        },
      },
    },
  ];

  try {
    const auth = "Basic " + Buffer.from(`${pk}:${sk}`).toString("base64");
    const res = await fetch(`${base.replace(/\/$/, "")}/api/public/ingestion`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({ batch }),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    // Telemetry must never break the user's session.
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
