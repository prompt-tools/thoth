const DAY_MS = 24 * 60 * 60 * 1000;

export const ATTEMPT_RETENTION_MS = 30 * DAY_MS;
export const ATTEMPT_AGGREGATE_RETENTION_MS = 90 * DAY_MS;

export type AttemptRoute = "fixed" | "adaptive";

export interface AttemptStartedRecord {
  version: 1;
  attemptId: string;
  journeyId: string;
  release: string;
  route: AttemptRoute;
  cohort: AttemptRoute;
  turn: number;
  startedAt: number;
  expiresAt: number;
}

export interface AttemptUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export type AttemptTerminalInput =
  | {
      outcome: "success";
      validation?: "ask" | "completion";
      usage?: AttemptUsage;
    }
  | {
      outcome: "failure";
      failureCode: string;
      providerStatus?: number;
    };

export type AttemptTerminalRecord = AttemptTerminalInput & {
  endedAt: number;
  durationMs: number;
};

export interface AttemptStore {
  start(record: AttemptStartedRecord): Promise<"created" | "exists">;
  finish(
    attemptId: string,
    record: AttemptTerminalRecord,
  ): Promise<"written" | "idempotent" | "conflict" | "missing">;
}

export interface ProviderAttemptLifecycle {
  start(): Promise<{ attemptId: string; startedAt: number }>;
  finish(
    attempt: { attemptId: string; startedAt: number },
    terminal: AttemptTerminalInput,
  ): Promise<void>;
}

export class AttemptLifecycleError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "AttemptLifecycleError";
  }
}

export function createProviderAttemptLifecycle(args: {
  store: AttemptStore;
  newAttemptId: () => string;
  now: () => number;
  journeyId: string;
  release: string;
  route: AttemptRoute;
  turn: number;
}): ProviderAttemptLifecycle {
  return {
    async start() {
      const attemptId = args.newAttemptId();
      const startedAt = args.now();
      let result: Awaited<ReturnType<AttemptStore["start"]>>;
      try {
        result = await args.store.start({
          version: 1,
          attemptId,
          journeyId: args.journeyId,
          release: args.release,
          route: args.route,
          cohort: args.route,
          turn: args.turn,
          startedAt,
          expiresAt: startedAt + ATTEMPT_RETENTION_MS,
        });
      } catch {
        throw new AttemptLifecycleError("attempt_store_unavailable");
      }
      if (result !== "created") throw new AttemptLifecycleError("attempt_id_conflict");
      return { attemptId, startedAt };
    },
    async finish(attempt, terminal) {
      const endedAt = args.now();
      let result: Awaited<ReturnType<AttemptStore["finish"]>>;
      try {
        result = await args.store.finish(attempt.attemptId, {
          ...terminal,
          endedAt,
          durationMs: Math.max(0, endedAt - attempt.startedAt),
        });
      } catch {
        throw new AttemptLifecycleError("attempt_store_unavailable");
      }
      if (result === "conflict") throw new AttemptLifecycleError("attempt_terminal_conflict");
      if (result === "missing") throw new AttemptLifecycleError("attempt_started_missing");
    },
  };
}
