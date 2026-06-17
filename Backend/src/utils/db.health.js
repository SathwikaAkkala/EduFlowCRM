import prisma from "../db/prismaClient.js";

export async function checkDatabaseHealth(timeoutMs = Number(process.env.DB_HEALTHCHECK_TIMEOUT_MS || 5000)) {
    const startedAt = Date.now();
    let timeoutId;

    try {
        await Promise.race([
            prisma.$queryRaw`SELECT 1 AS ok`,
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Database health check timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }),
        ]);

        return {
            ok: true,
            durationMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            ok: false,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

export default {
    checkDatabaseHealth,
};
