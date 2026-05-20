import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toFrontendStage } from "@/lib/api";
import type { Stage } from "@/types";
import { requireAuth } from "@/lib/serverAuth";
import { isOverdueDate } from "@/lib/dateLogic";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;

  try {
    const prospects: Array<{ stage: string; createdAt: Date; nextFollowUpDate: Date | null; updatedAt: Date }> =
      await prisma.prospect.findMany({
      select: { stage: true, createdAt: true, nextFollowUpDate: true, updatedAt: true },
    });

    const totalProspects = prospects.length;
    const closedCount = prospects.filter((p) => p.stage === "Pilot Closed").length;
    const overdueCount = prospects.filter(
      (p) => p.stage !== "Pilot Closed" && isOverdueDate(p.nextFollowUpDate)
    ).length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = prospects.filter(
      (p) => p.stage === "Pilot Closed" && new Date(p.updatedAt) >= startOfMonth
    ).length;

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyBuckets = new Map<string, { year: number; month: number; count: number }>();
    for (const p of prospects) {
      if (new Date(p.createdAt) < sixMonthsAgo) continue;
      const d = new Date(p.createdAt);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      const existing = monthlyBuckets.get(key) ?? { year, month, count: 0 };
      existing.count += 1;
      monthlyBuckets.set(key, existing);
    }
    const monthlyTrend = Array.from(monthlyBuckets.values()).sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year
    );

    const grouped = new Map<Stage, { count: number; totalDays: number }>();
    for (const p of prospects) {
      const stage = toFrontendStage(p.stage) as Stage;
      const curr = grouped.get(stage) ?? { count: 0, totalDays: 0 };
      const days = Math.max(
        0,
        Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      );
      curr.count += 1;
      curr.totalDays += days;
      grouped.set(stage, curr);
    }

    const stageBreakdown = Array.from(grouped.entries()).map(([stage, stats]) => ({
      stage,
      count: stats.count,
      avgDays: stats.count > 0 ? Number((stats.totalDays / stats.count).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      stageBreakdown,
      totalProspects,
      conversionRate: totalProspects > 0 ? Number(((closedCount / totalProspects) * 100).toFixed(1)) : 0,
      overdueCount,
      closedCount,
      closedThisMonth,
      monthlyTrend,
    });
  } catch (err) {
    console.error("GET /api/analytics error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
