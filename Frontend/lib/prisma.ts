import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function cleanEnvUrl(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function createPrismaClient() {
  const databaseUrl = cleanEnvUrl(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Prisma");
  }

  const url = new URL(databaseUrl);
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
    connectionLimit: 5,
    allowPublicKeyRetrieval,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    ...(cachingRsaPublicKey ? { cachingRsaPublicKey } : {}),
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

export default prisma;
