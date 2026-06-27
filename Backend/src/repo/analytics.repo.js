import prisma from "../db/prismaClient.js";

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default class AnalyticsRepository {
    
    async getStageBreakdown() {
        const rows = await prisma.$queryRaw`
            SELECT
                stage AS stage,
                COUNT(*) AS count,
                ROUND(AVG(TIMESTAMPDIFF(DAY, createdAt, NOW())), 1) AS avgDays
            FROM Prospect
            GROUP BY stage
            ORDER BY FIELD(stage, 'Cold', 'Contacted', 'Demo Booked', 'Demo Done', 'Proposal Sent', 'Pilot Closed')
        `;

        return rows.map((row) => ({
            stage: row.stage,
            count: Number(row.count ?? 0),
            avgDays: Number(row.avgDays ?? 0)
        }));
    }

    /**
     * Count of prospects with overdue follow-ups
     */
    async getOverdueCount() {
        const todayStart = startOfDay(new Date());

        return prisma.prospect.count({
            where: {
                deletedAt: null,
                completed: false,
                stage: { not: "Pilot Closed" },
                nextFollowUpDate: { lt: todayStart }
            }
        });
    }

    /**
     * Count of prospects closed this calendar month
     */
    async getClosedThisMonth() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return prisma.prospect.count({
            where: {
                stage: "Pilot Closed",
                updatedAt: { gte: startOfMonth }
            }
        });
    }

    /**
     * Monthly trend: cards created per month (last 6 months)
     */
    async getMonthlyTrend() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const rows = await prisma.$queryRaw`
            SELECT
                YEAR(createdAt) AS year,
                MONTH(createdAt) AS month,
                COUNT(*) AS count
            FROM Prospect
            WHERE createdAt >= ${sixMonthsAgo}
            GROUP BY YEAR(createdAt), MONTH(createdAt)
            ORDER BY YEAR(createdAt), MONTH(createdAt)
        `;

        return rows.map((row) => ({
            year: Number(row.year),
            month: Number(row.month),
            count: Number(row.count ?? 0)
        }));
    }

    /**
     * Full analytics summary in a single call
     */
    async getFullAnalytics() {
        const [stageBreakdown, overdueCount, closedThisMonth, monthlyTrend, totalProspects, closedTotal] =
            await Promise.all([
                this.getStageBreakdown(),
                this.getOverdueCount(),
                this.getClosedThisMonth(),
                this.getMonthlyTrend(),
                prisma.prospect.count(),
                prisma.prospect.count({ where: { stage: "Pilot Closed" } })
            ]);

        const conversionRate = totalProspects > 0
            ? Number(((closedTotal / totalProspects) * 100).toFixed(1))
            : 0;

        return {
            stageBreakdown,
            totalProspects,
            conversionRate,
            overdueCount,
            closedCount: closedTotal,
            closedThisMonth,
            monthlyTrend
        };
    }
}
