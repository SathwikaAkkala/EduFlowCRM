import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { loadBackendEnv } from "../utils/load-env.js";

loadBackendEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is required for Prisma");
}

const url = new URL(connectionString);
const parsedConnectionLimit = Number(process.env.MARIADB_CONNECTION_LIMIT ?? 5);
const connectionLimit = Number.isFinite(parsedConnectionLimit) && parsedConnectionLimit > 0
    ? parsedConnectionLimit
    : 5;
const parsedAcquireTimeout = Number(process.env.MARIADB_ACQUIRE_TIMEOUT_MS ?? 30000);
const acquireTimeout = Number.isFinite(parsedAcquireTimeout) && parsedAcquireTimeout > 0
    ? parsedAcquireTimeout
    : 30000;
const parsedConnectTimeout = Number(process.env.MARIADB_CONNECT_TIMEOUT_MS ?? 30000);
const connectTimeout = Number.isFinite(parsedConnectTimeout) && parsedConnectTimeout > 0
    ? parsedConnectTimeout
    : 30000;
const parsedInitializationTimeout = Number(process.env.MARIADB_INITIALIZATION_TIMEOUT_MS ?? acquireTimeout);
const initializationTimeout = Number.isFinite(parsedInitializationTimeout) && parsedInitializationTimeout > 0
    ? parsedInitializationTimeout
    : acquireTimeout;
const allowPublicKeyRetrieval =
    (process.env.MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL ?? "true").toLowerCase() === "true";
const cachingRsaPublicKey = process.env.MARIADB_CACHING_RSA_PUBLIC_KEY?.trim() || undefined;
const sslMode = url.searchParams.get("ssl-mode")?.toUpperCase();
const sslAccept = url.searchParams.get("sslaccept")?.toLowerCase();
const useSsl =
    process.env.MARIADB_SSL?.toLowerCase() === "true" ||
    sslMode === "REQUIRED" ||
    sslMode === "VERIFY_CA" ||
    sslMode === "VERIFY_IDENTITY" ||
    sslAccept === "strict";

const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit,
    acquireTimeout,
    connectTimeout,
    initializationTimeout,
    allowPublicKeyRetrieval,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    ...(cachingRsaPublicKey ? { cachingRsaPublicKey } : {})
});

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
