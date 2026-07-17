import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { extractUsage } from "@/lib/prompt/agent/client";
import {
  AttemptLifecycleError,
  createProviderAttemptLifecycle,
  type ProviderAttemptLifecycle,
} from "@/lib/prompt/agent/attempt-lifecycle";
import { readJourneyToken } from "@/lib/prompt/agent/journey-state";
import { createUpstashAttemptStore } from "@/lib/prompt/agent/upstash-attempt-store";

// Prototype LLM proxy: the browser can't call DeepSeek / MiMo directly (no CORS
// headers), so we forward server-side where CORS doesn't apply. BYOK — the key
// rides in the forwarded headers built by the client; nothing is stored here.
//
// Needs a server runtime → this route is incompatible with `output: export`
// (GitHub Pages). It works under `next dev` and on any serverless host.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEMO_MODEL = "deepseek-v4-flash";
const DEMO_MAX_TOKENS = 512;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Block forwarding to loopback / private / link-local hosts to avoid SSRF
 *  against anything on the local network. Only public https endpoints allowed. */
function isDisallowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  if (/^\[::ffff:/i.test(h)) return true; // IPv4-mapped IPv6
  if (/^\[fe[89ab][0-9a-f]:/i.test(h)) return true; // link-local fe80::/10
  if (/^\[f[cd][0-9a-f]{2}:/i.test(h)) return true; // ULA fc00::/7
  // IPv4 private / loopback / link-local ranges
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { endpoint, headers, body } = payload;
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return NextResponse.json({ error: "Invalid endpoint URL" }, { status: 400 });
  }
  if (url.protocol !== "https:") {
    return NextResponse.json({ error: "Only https endpoints are allowed" }, { status: 400 });
  }
  if (isDisallowedHost(url.hostname)) {
    return NextResponse.json({ error: "Endpoint host is not allowed" }, { status: 400 });
  }

  // Built-in demo key: when the client sends no real key (demo mode sends the sentinel
  // "Bearer __demo__"), inject the SERVER-SIDE DeepSeek key for the DeepSeek endpoint only.
  // DEMO_DEEPSEEK_KEY is a server env var (NOT NEXT_PUBLIC), so it never reaches the browser —
  // users can spend it through this proxy but cannot read it. Locked to api.deepseek.com so
  // the built-in key can't be used to proxy arbitrary endpoints.
  if (headers !== undefined && (!isRecord(headers) || Object.values(headers).some((value) => typeof value !== "string"))) {
    return NextResponse.json({ error: "Invalid headers" }, { status: 400 });
  }
  const fwdHeaders = { ...(headers ?? {}) } as Record<string, string>;
  const auth = (fwdHeaders.authorization ?? fwdHeaders.Authorization ?? "").trim();
  let upstreamBody = body;
  let attemptLifecycle: ProviderAttemptLifecycle | undefined;
  let demoJourney: unknown;
  if (auth === "Bearer __demo__") {
    const serverKey = process.env.DEMO_DEEPSEEK_KEY;
    delete fwdHeaders.Authorization;
    if (serverKey && url.toString() === DEMO_ENDPOINT && isRecord(body)) {
      fwdHeaders.authorization = `Bearer ${serverKey}`;
      upstreamBody = {
        ...body,
        model: DEMO_MODEL,
        max_tokens: DEMO_MAX_TOKENS,
        stream: false,
        thinking: { type: "disabled" },
      };
      demoJourney = payload.journey;
    } else {
      return NextResponse.json({ error: "No API key (built-in demo key unavailable for this endpoint)" }, { status: 401 });
    }
  } else if (!auth || auth.toLowerCase() === "bearer") {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const serialized = JSON.stringify(upstreamBody);
  if (Buffer.byteLength(serialized, "utf8") > 64 * 1024) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  if (auth === "Bearer __demo__") {
    const secret = process.env.ADAPTIVE_TURN_SECRET?.trim();
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
      return NextResponse.json({ error: "Journey state unavailable" }, { status: 503 });
    }
    if (!isRecord(demoJourney)
      || typeof demoJourney.id !== "string"
      || typeof demoJourney.token !== "string") {
      return NextResponse.json({ error: "invalid_journey_state" }, { status: 401 });
    }
    let claims;
    try {
      claims = readJourneyToken(secret, demoJourney.token, Date.now());
      if (claims.journeyId !== demoJourney.id) throw new Error("invalid_journey_state");
    } catch {
      return NextResponse.json({ error: "invalid_journey_state" }, { status: 401 });
    }
    attemptLifecycle = createProviderAttemptLifecycle({
      store: createUpstashAttemptStore({
        url: process.env.UPSTASH_REDIS_REST_URL ?? "",
        token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      }),
      newAttemptId: () => randomUUID(),
      now: () => Date.now(),
      journeyId: claims.journeyId,
      release: claims.release,
      route: claims.route,
      turn: claims.turn,
    });
  }

  let attempt: Awaited<ReturnType<ProviderAttemptLifecycle["start"]>> | undefined;
  try {
    attempt = await attemptLifecycle?.start();
  } catch (error) {
    if (error instanceof AttemptLifecycleError) {
      return NextResponse.json({ error: error.code }, { status: 503 });
    }
    throw error;
  }
  const ac = new AbortController();
  let callerCancelled = request.signal.aborted;
  const abortFromCaller = () => {
    callerCancelled = true;
    ac.abort();
  };
  if (callerCancelled) ac.abort();
  else request.signal.addEventListener("abort", abortFromCaller, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, 30_000);
  try {
    let upstream: Response;
    try {
      upstream = await fetch(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json", ...fwdHeaders },
        body: serialized,
        redirect: "error",
        signal: ac.signal,
      });
    } catch {
      const failureCode = timedOut
        ? "provider_timeout"
        : callerCancelled ? "provider_cancelled" : "network_error";
      if (attempt) await attemptLifecycle!.finish(attempt, { outcome: "failure", failureCode });
      return NextResponse.json({ error: `Upstream fetch failed: ${failureCode}` }, { status: 502 });
    }
    const text = await upstream.text();
    if (attempt) {
      if (!upstream.ok) {
        await attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: `http_${upstream.status}`,
          providerStatus: upstream.status,
        });
      } else {
        let usage: ReturnType<typeof extractUsage>;
        try {
          usage = extractUsage(JSON.parse(text));
        } catch {
          usage = undefined;
        }
        await attemptLifecycle!.finish(attempt, {
          outcome: "success",
          ...(usage === undefined ? {} : { usage }),
        });
      }
    }
    // Pass the provider's status + body straight through so the client can
    // surface auth/quota errors verbatim.
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    if (error instanceof AttemptLifecycleError) {
      return NextResponse.json({ error: error.code }, { status: 503 });
    }
    if (attempt) {
      try {
        await attemptLifecycle!.finish(attempt, { outcome: "failure", failureCode: "network_error" });
      } catch (lifecycleError) {
        if (lifecycleError instanceof AttemptLifecycleError) {
          return NextResponse.json({ error: lifecycleError.code }, { status: 503 });
        }
      }
    }
    return NextResponse.json({ error: "Upstream fetch failed: network_error" }, { status: 502 });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abortFromCaller);
  }
}
