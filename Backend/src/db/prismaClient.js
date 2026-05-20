import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

if (!process.env.DATABASE_URL) {
    await import("dotenv").then(({ config }) => config({ path: envPath }));
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is required for Prisma");
}

const url = new URL(connectionString);
const allowPublicKeyRetrieval =
    (process.env.MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL ?? "true").toLowerCase() === "true";
const cachingRsaPublicKey = process.env.MARIADB_CACHING_RSA_PUBLIC_KEY?.trim() || undefined;

const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    allowPublicKeyRetrieval,
    ...(cachingRsaPublicKey ? { cachingRsaPublicKey } : {})
});

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
