// components/kanban/ProspectCard.tsx
"use client";

import { Draggable } from "@hello-pangea/dnd";
import { AlertCircle, Calendar, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn, daysSince, formatDate, isOverdue, isDueToday } from "@/lib/utils";
import type { Prospect } from "@/types";
import { STAGE_CONFIG } from "@/types";

interface ProspectCardProps {
  prospect: Prospect;
  index: number;
  onClick: (prospect: Prospect) => void;
}

export function ProspectCard({ prospect, index, onClick }: ProspectCardProps) {
  const isClosed = prospect.stage === "PILOT_CLOSED";
  const overdue = !isClosed && !prospect.completed && isOverdue(prospect.nextFollowUpDate);
  const dueToday = !isClosed && !prospect.completed && isDueToday(prospect.nextFollowUpDate);
  const sinceDays = daysSince(prospect.lastContactDate);

  return (
    <Draggable draggableId={prospect.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(prospect)}
          className={cn(
            "group relative bg-surface-3 rounded-lg p-3.5 cursor-pointer select-none",
            "border transition-all duration-150",
            "hover:bg-surface-4",
            overdue
              ? "border-danger-border shadow-glow-danger"
              : "border-ink-5 hover:border-ink-4",
            snapshot.isDragging && "shadow-card-hover rotate-1 scale-105 border-brand-600 bg-surface-4"
          )}
        >
          {/* Completed badge */}
          {prospect.completed && (
            <span className="absolute -top-2 -right-2 flex items-center gap-1 bg-success text-white text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded z-10">
              <CheckCircle className="w-2.5 h-2.5" />
              Complete
            </span>
          )}

          {/* Overdue badge */}
          {overdue && (
            <span className="absolute -top-2 -right-2 flex items-center gap-1 bg-danger text-white text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded z-10">
              <AlertCircle className="w-2.5 h-2.5" />
              Overdue
            </span>
          )}

          {/* Header: name + avatar */}
          <div className="flex items-start gap-2 mb-2.5">
            <Avatar name={prospect.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1 truncate leading-tight">
                {prospect.name}
              </p>
              <div className="mt-1">
                <Badge variant="stage" stage={prospect.stage}>
                  {STAGE_CONFIG[prospect.stage].label}
                </Badge>
              </div>
            </div>
          </div>

          {/* School name */}
          <p className="text-xs text-ink-3 font-medium mb-2.5 leading-snug">{prospect.school}</p>

          {/* Footer: dates */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1 text-[11px] text-ink-4 font-mono">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {sinceDays === null ? "Never" : sinceDays === 0 ? "Today" : `${sinceDays}d ago`}
              </span>
            </div>

            {prospect.nextFollowUpDate && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[11px] font-mono",
                  overdue   ? "text-danger"         :
                  dueToday  ? "text-warning"         :
                              "text-ink-4"
                )}
              >
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{formatDate(prospect.nextFollowUpDate)}</span>
              </div>
            )}
          </div>

          {dueToday && !overdue && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-warning-muted text-warning border border-warning/30">
                Due Today
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
