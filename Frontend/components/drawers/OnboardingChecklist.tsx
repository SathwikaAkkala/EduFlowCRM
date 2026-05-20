// components/drawers/OnboardingChecklist.tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Calendar, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { OnboardingChecklist as OnboardingChecklistItem } from "@/types";

interface OnboardingChecklistProps {
  prospectId: string;
  items: OnboardingChecklistItem[];
  canEdit?: boolean;
}

export function OnboardingChecklist({ prospectId, items, canEdit = false }: OnboardingChecklistProps) {
  const [localItems, setLocalItems] = useState(items);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const toggleStatus = async (itemId: string, currentStatus: "TODO" | "DONE") => {
    if (!canEdit) return;
    const newStatus = currentStatus === "TODO" ? "DONE" : "TODO";
    setError(null);

    // Optimistic
    setLocalItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, status: newStatus } : item)
    );

    try {
      const res = await fetch(`/api/prospects/${prospectId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update checklist item");
    } catch {
      // Revert
      setLocalItems(items);
      setError("Failed to save checklist update. Please try again.");
    }
  };

  const doneCount = localItems.filter((i) => i.status === "DONE").length;
  const progress = localItems.length > 0 ? (doneCount / localItems.length) * 100 : 0;

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono font-semibold text-ink-4 uppercase tracking-widest">
            Onboarding Progress
          </span>
          <span className="text-xs font-mono text-ink-3">
            {doneCount}/{localItems.length}
          </span>
        </div>
        <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      {error && <p className="text-xs font-mono text-danger">{error}</p>}
      {localItems.length !== 10 && (
        <p className="text-xs font-mono text-warning">
          Expected 10 onboarding steps, found {localItems.length}.
        </p>
      )}
      <div className="space-y-2">
        {localItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex gap-3 p-3 rounded-lg border transition-colors",
              item.status === "DONE"
                ? "bg-success-muted border-success/20 opacity-75"
                : "bg-surface-2 border-ink-5 hover:border-ink-4"
            )}
          >
            <button
              onClick={() => toggleStatus(item.id, item.status)}
              disabled={!canEdit}
              className="shrink-0 mt-0.5 transition-colors"
            >
              {item.status === "DONE" ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-ink-5 hover:text-ink-3" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ink-5">
                  {String(item.stepNumber).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    item.status === "DONE" ? "line-through text-ink-4" : "text-ink-1"
                  )}
                >
                  {item.title}
                </span>
              </div>

              <p className="text-xs text-ink-4 mt-1 leading-relaxed">{item.description}</p>

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-[11px] text-ink-5 font-mono">
                  <User className="w-3 h-3" />
                  {item.assignee}
                </div>
                {item.dueDate && (
                  <div className="flex items-center gap-1 text-[11px] text-ink-5 font-mono">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.dueDate)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
