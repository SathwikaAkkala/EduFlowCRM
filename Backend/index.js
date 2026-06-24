import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { loadBackendEnv } from "./src/utils/load-env.js";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import MainRoutes from "./src/routers/main.routs.js";
import AuthRoutes from "./src/routers/auth.routes.js";
import NotificationRoutes from "./src/routers/notification.routes.js";
import DebugRoutes from "./src/routers/debug.routes.js";

loadBackendEnv();

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.0),
    });
}

const server = express();
server.set("trust proxy", 1);
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = [
    "http://localhost:3000",
    "https://edu-flow-68mpx33t9-f30.vercel.app",
    ...envOrigins,
];

// Sentry request handler middleware (if enabled)
if (process.env.SENTRY_DSN) {
    server.use(Sentry.Handlers.requestHandler());
}

// ─── Security Headers ────────────────────────────────────────────
server.disable("x-powered-by");
server.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});

// ─── Core Middleware ─────────────────────────────────────────────
server.use(
    cors({
        origin: Array.from(new Set(allowedOrigins)),
        credentials: true,
    })
);
server.use(express.json({ limit: "1mb" }));
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());

// ─── Rate Limiting ───────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // stricter for auth endpoints, but high for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later" },
});

// ─── Routes ──────────────────────────────────────────────────────
server.get("/", (req, res) => {
    res.json({ success: true, message: "EduFlow CRM API is running", version: "1.0.0" });
});

server.use("/api/auth", authLimiter, AuthRoutes);
server.use("/api/notifications", apiLimiter, NotificationRoutes);
server.use("/api/debug", apiLimiter, DebugRoutes);
server.use("/api", apiLimiter, MainRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
server.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────
server.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

    // Capture to Sentry if configured
    try {
        if (process.env.SENTRY_DSN) Sentry.captureException(err);
    } catch (e) {
        console.error("Failed to send error to Sentry:", e && e.message ? e.message : e);
    }

    // Validation error
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: Object.values(err.errors).map((e) => e.message),
        });
    }

    // Invalid id format
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Invalid ${err.path}: ${err.value}`,
        });
    }

    // Duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `Duplicate value for ${field}`,
        });
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
});

// Sentry error handler (should be after all other error handlers)
if (process.env.SENTRY_DSN) {
    server.use(Sentry.Handlers.errorHandler());
}

export default server;

