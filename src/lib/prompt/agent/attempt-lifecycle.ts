export const ATTEMPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

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
      validation: "ask" | "completion";
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
