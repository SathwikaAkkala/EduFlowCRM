import crypto from "node:crypto";

type Level = "info" | "warn" | "error";

export function createRequestId() {
  return crypto.randomUUID();
}

export function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // Structured logs for downstream processing.
  console[level](JSON.stringify(payload));
}

export function captureException(error: unknown, meta?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "Unknown error";
  log("error", message, meta);
}

