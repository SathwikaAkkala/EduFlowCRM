// components/kanban/KanbanBoard.tsx
"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanHeader } from "./KanbanHeader";
import { ProspectDrawer } from "@/components/drawers/ProspectDrawer";
import { useDrawer } from "@/hooks/useDrawer";
import { useAuth } from "@/components/providers/AuthProvider";
import { STAGE_ORDER, type Stage, type Prospect } from "@/types";
import { isOverdue, isDueToday } from "@/lib/utils";

interface KanbanBoardProps {
  prospects: Prospect[];
  loading: boolean;
  error: string | null;
  moveProspect: (prospectId: string, newStage: Stage) => Promise<void>;
  updateProspect: (prospectId: string, data: Partial<Prospect>) => Promise<void>;
  deleteProspect: (prospectId: string) => Promise<void>;
  addNote: (prospectId: string, content: string) => Promise<void>;
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

  // Agents can only view — cannot move cards, edit or delete
  const canEdit = user?.role === "admin" || user?.role === "manager";

  const handleDragEnd = async (result: DropResult) => {
    if (!canEdit) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as Stage;
    await moveProspect(draggableId, newStage);
  };

  const prospectsByStage = STAGE_ORDER.reduce<Record<Stage, Prospect[]>>((acc, stage) => {
    acc[stage] = prospects.filter((p) => p.stage === stage);
    return acc;
  }, {} as Record<Stage, Prospect[]>);

  const overdueProspects = prospects.filter((p) => isOverdue(p.nextFollowUpDate));
  const dueTodayProspects = prospects.filter((p) => isDueToday(p.nextFollowUpDate));

  const handleCardClick = (prospect: Prospect) => {
    const latest = prospects.find((p) => p.id === prospect.id) ?? prospect;
    openDrawer(latest);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-4">
          <span className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm">Loading pipeline…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-danger font-mono text-sm">Error: {error}</div>
      </div>
    );
  }

  const columnsContent = (
    <div className="flex gap-4 h-full items-start pt-2">
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
      <div className="flex flex-col flex-1 min-h-0">
        <KanbanHeader
          overdueCount={overdueProspects.length}
          dueTodayCount={dueTodayProspects.length}
          totalCount={prospects.length}
          overdueProspects={overdueProspects}
          dueTodayProspects={dueTodayProspects}
          onProspectClick={handleCardClick}
        />

        {/* Scrollable board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
          {canEdit ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              {columnsContent}
            </DragDropContext>
          ) : (
            <DragDropContext onDragEnd={() => {}}>
              {columnsContent}
            </DragDropContext>
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
        onAddNote={async (id, content) => {
          await addNote(id, content);
        }}
      />
    </>
  );
}


