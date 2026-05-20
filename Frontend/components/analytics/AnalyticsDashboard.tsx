// components/analytics/AnalyticsDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, AlertCircle, CheckCircle } from "lucide-react";
import { STAGE_CONFIG, STAGE_ORDER, type Stage } from "@/types";
import { cn } from "@/lib/utils";

interface StageStats {
  stage: Stage;
  count: number;
  avgDays: number;
}

interface Stats {
  stageBreakdown: StageStats[];
  totalProspects: number;
  conversionRate: number;
  overdueCount: number;
  closedCount: number;
  closedThisMonth: number;
  monthlyTrend: { year: number; month: number; count: number }[];
}

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        // Validate the response has the required shape
        if (d && Array.isArray(d.stageBreakdown)) {
          setStats(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <div className="text-danger font-mono p-6">Failed to load analytics.</div>;

  const maxCount = Math.max(...stats.stageBreakdown.map((s) => s.count), 1);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Total Prospects"
          value={stats.totalProspects}
          color="brand"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          color="success"
        />
        <KpiCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Overdue Follow-ups"
          value={stats.overdueCount}
          color="danger"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Pilot Closed"
          value={stats.closedCount}
          color="success"
        />
      </div>

      {/* Pipeline breakdown */}
      <div className="bg-surface-2 rounded-xl border border-ink-5 p-5">
        <h2 className="text-sm font-semibold text-ink-1 mb-4">Pipeline Breakdown</h2>
        <div className="space-y-4">
          {STAGE_ORDER.map((stage) => {
            const s = stats.stageBreakdown.find((x) => x.stage === stage) ?? { count: 0, avgDays: 0 };
            const config = STAGE_CONFIG[stage];
            const pct = (s.count / maxCount) * 100;
            return (
              <div key={stage}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-medium text-ink-3">{config.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-ink-5 font-mono">
                      {s.avgDays > 0 ? `avg ${s.avgDays.toFixed(0)}d` : "—"}
                    </span>
                    <span
                      className="text-xs font-mono font-bold w-6 text-right"
                      style={{ color: config.accentColor }}
                    >
                      {s.count}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-surface-4 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: config.accentColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel hint */}
      <div className="bg-surface-2 rounded-xl border border-ink-5 p-5">
        <h2 className="text-sm font-semibold text-ink-1 mb-3">Funnel Drop-off</h2>
        <div className="flex items-end gap-3 h-32">
          {STAGE_ORDER.map((stage, i) => {
            const s = stats.stageBreakdown.find((x) => x.stage === stage) ?? { count: 0 };
            const config = STAGE_CONFIG[stage];
            const height = Math.max((s.count / maxCount) * 100, 4);
            return (
              <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-ink-5">{s.count}</span>
                <div
                  className="w-full rounded-t transition-all duration-700"
                  style={{ height: `${height}%`, backgroundColor: config.accentColor + "80" }}
                />
                <span className="text-[9px] font-mono text-ink-5 text-center leading-tight">
                  {config.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "brand" | "success" | "danger" | "warning";
}) {
  const colors = {
    brand:   "text-brand-400   bg-brand-500/10   border-brand-500/20",
    success: "text-success     bg-success-muted  border-success/20",
    danger:  "text-danger      bg-danger-muted   border-danger-border",
    warning: "text-warning     bg-warning-muted  border-warning/20",
  };

  return (
    <div className="bg-surface-2 rounded-xl border border-ink-5 p-4">
      <div className={cn("inline-flex p-2 rounded-lg mb-3", colors[color].split(" ").slice(1).join(" "))}>
        <span className={colors[color].split(" ")[0]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-ink-1 font-mono">{value}</p>
      <p className="text-xs text-ink-4 mt-1">{label}</p>
    </div>
  );
}
