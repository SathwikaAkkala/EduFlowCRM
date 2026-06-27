"use client";

import { useEffect, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanHeader } from "./KanbanHeader";
import { ProspectDrawer } from "@/components/drawers/ProspectDrawer";
import { useDrawer } from "@/hooks/useDrawer";
import { useAuth } from "@/components/providers/AuthProvider";
import { STAGE_ORDER, type Stage, type Prospect } from "@/types";
import type { ProspectNote } from "@/types";
import { isOverdue, isDueToday } from "@/lib/utils";
import { PROSPECT_EDIT_ROLES, hasRoleAccess } from "@/lib/roles";

interface KanbanBoardProps {
  prospects: Prospect[];
  loading: boolean;
  error: string | null;
  moveProspect: (prospectId: string, newStage: Stage) => Promise<void>;
  updateProspect: (prospectId: string, data: Partial<Prospect>) => Promise<void>;
  deleteProspect: (prospectId: string) => Promise<void>;
  addNote: (prospectId: string, content: string) => Promise<ProspectNote>;
}

export function KanbanBoard({
  prospects,
  loading,
  error,
  moveProspect,
  updateProspect,
  deleteProspect,
  addNote,
}: KanbanBoardProps) {
  const { open, selectedProspect, openDrawer, closeDrawer, updateSelected } = useDrawer();
  const { user } = useAuth();

  useEffect(() => {
    if (open && selectedProspect) {
      const latest = prospects.find((p) => p.id === selectedProspect.id);
      if (latest) {
        if (latest.updatedAt !== selectedProspect.updatedAt || latest.stage !== selectedProspect.stage) {
          updateSelected(latest);
        }
      }
    }
  }, [prospects, open, selectedProspect, updateSelected]);

  const canEdit = hasRoleAccess(user?.role, PROSPECT_EDIT_ROLES);

  const handleDragEnd = async (result: DropResult) => {
    if (!canEdit) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as Stage;
    await moveProspect(draggableId, newStage);
  };

  const prospectsByStage = useMemo(
    () =>
      STAGE_ORDER.reduce<Record<Stage, Prospect[]>>((acc, stage) => {
        acc[stage] = prospects.filter((p) => p.stage === stage);
        return acc;
      }, {} as Record<Stage, Prospect[]>),
    [prospects]
  );

  const overdueProspects = useMemo(
    () => prospects.filter((p) => p.stage !== "PILOT_CLOSED" && isOverdue(p.nextFollowUpDate)),
    [prospects]
  );
  const dueTodayProspects = useMemo(
    () => prospects.filter((p) => p.stage !== "PILOT_CLOSED" && isDueToday(p.nextFollowUpDate)),
    [prospects]
  );

  const handleCardClick = (prospect: Prospect) => {
    const latest = prospects.find((p) => p.id === prospect.id) ?? prospect;
    openDrawer(latest);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-3 text-ink-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <span className="font-mono text-sm">Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="font-mono text-sm text-danger">Error: {error}</div>
      </div>
    );
  }

  const columnsContent = (
    <div className="flex h-full items-start gap-3 pt-2 md:gap-4">
      {STAGE_ORDER.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          prospects={prospectsByStage[stage]}
          onCardClick={handleCardClick}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <KanbanHeader
          overdueCount={overdueProspects.length}
          dueTodayCount={dueTodayProspects.length}
          totalCount={prospects.length}
        />

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 touch-pan-x overscroll-x-contain sm:px-6 sm:pb-6">
          {canEdit ? (
            <DragDropContext onDragEnd={handleDragEnd}>{columnsContent}</DragDropContext>
          ) : (
            <DragDropContext onDragEnd={() => {}}>{columnsContent}</DragDropContext>
          )}
        </div>
      </div>

      <ProspectDrawer
        open={open}
        prospect={selectedProspect}
        canEdit={canEdit}
        onClose={closeDrawer}
        onUpdate={async (id, data) => {
          if (!canEdit) return;
          await updateProspect(id, data);
          if (selectedProspect) {
            updateSelected({ ...selectedProspect, ...data } as Prospect);
          }
        }}
        onDelete={async (id) => {
          if (!canEdit) return;
          closeDrawer();
          await deleteProspect(id);
        }}
        onAddNote={(id, content) => addNote(id, content)}
      />
    </>
  );
}
