import prisma from "@/lib/prisma";
import { toFrontendStage } from "@/lib/api";
import type { Stage } from "@/types";
import { requireAuth } from "@/lib/serverAuth";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`analytics:get:${auth.user.id}`, 120, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [totalProspects, closedCount, overdueCount, closedThisMonth, stageRows, monthlyTrendRows] =
      await Promise.all([
        prisma.prospect.count({ where: { deletedAt: null } }),
        prisma.prospect.count({ where: { stage: "Pilot Closed", deletedAt: null } }),
        prisma.prospect.count({
          where: {
            deletedAt: null,
            stage: { not: "Pilot Closed" },
            nextFollowUpDate: { lt: startOfToday },
          },
        }),
        prisma.prospect.count({
          where: {
            deletedAt: null,
            stage: "Pilot Closed",
            updatedAt: { gte: startOfMonth },
          },
        }),
        prisma.$queryRaw<Array<{ stage: string; count: bigint | number; avgDays: number }>>`
          SELECT
            stage AS stage,
            COUNT(*) AS count,
            ROUND(AVG(TIMESTAMPDIFF(DAY, createdAt, NOW())), 1) AS avgDays
          FROM Prospect
          WHERE deletedAt IS NULL
          GROUP BY stage
          ORDER BY FIELD(stage, 'Cold', 'Contacted', 'Demo Booked', 'Demo Done', 'Proposal Sent', 'Pilot Closed')
        `,
        prisma.$queryRaw<Array<{ year: number; month: number; count: bigint | number }>>`
          SELECT
            YEAR(createdAt) AS year,
            MONTH(createdAt) AS month,
            COUNT(*) AS count
          FROM Prospect
          WHERE createdAt >= ${sixMonthsAgo} AND deletedAt IS NULL
          GROUP BY YEAR(createdAt), MONTH(createdAt)
          ORDER BY YEAR(createdAt), MONTH(createdAt)
        `,
      ]);

    const stageBreakdown = stageRows.map((row) => ({
      stage: toFrontendStage(row.stage) as Stage,
      count: Number(row.count),
      avgDays: Number(row.avgDays ?? 0),
    }));

    const monthlyTrend = monthlyTrendRows.map((row) => ({
      year: Number(row.year),
      month: Number(row.month),
      count: Number(row.count),
    }));

    return jsonWithHeaders({
      stageBreakdown,
      totalProspects,
      conversionRate: totalProspects > 0 ? Number(((closedCount / totalProspects) * 100).toFixed(1)) : 0,
      overdueCount,
      closedCount,
      closedThisMonth,
      monthlyTrend,
    });
  } catch (err) {
    captureException(err, { route: "GET /api/analytics", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
