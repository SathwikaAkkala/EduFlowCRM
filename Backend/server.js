import server from "./index.js";
import * as Sentry from "@sentry/node";
import { initializeScheduler, stopScheduler, triggerOverdueCheck } from "./src/utils/scheduler.js";

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
    console.log(`Server is Up and Running at PORT ${PORT}`);

    // Initialize notification scheduler
    if (process.env.ENABLE_NOTIFICATIONS !== "false") {
        initializeScheduler();

        // Run one check immediately so newly overdue prospects are handled on startup.
        triggerOverdueCheck().catch((err) => {
            console.error("[Scheduler] Startup overdue check failed:", err && err.message ? err.message : err);
        });
    } else {
        console.log("[Scheduler] Notifications disabled via ENABLE_NOTIFICATIONS=false");
    }
});

// Listen for server errors during startup/runtime
server.on("error", (err) => {
    console.error("Server encountered an error:", err && err.message ? err.message : err);
    // If the error happens during bind/startup, exit with non-zero code
    process.exit(1);
});

// Global process handlers to avoid silent exits
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    try {
        if (process.env.SENTRY_DSN) Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
    } catch (e) {
        console.error("Failed sending unhandledRejection to Sentry:", e && e.message ? e.message : e);
    }
    // Give a chance for logging to flush then exit
    setTimeout(() => process.exit(1), 100).unref?.();
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err && err.message ? err.message : err);
    console.error(err && err.stack ? err.stack : err);
    try {
        if (process.env.SENTRY_DSN) Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    } catch (e) {
        console.error("Failed sending uncaughtException to Sentry:", e && e.message ? e.message : e);
    }
    // Crash the process to avoid undefined state
    setTimeout(() => process.exit(1), 100).unref?.();
});

process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down gracefully...");
    stopScheduler();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    stopScheduler();
    process.exit(0);
});
