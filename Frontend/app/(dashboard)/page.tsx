// app/(dashboard)/page.tsx
"use client";

import { Topbar } from "@/components/layout/Topbar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { AddProspectModal } from "@/components/modals/AddProspectModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProspects } from "@/hooks/useProspects";
import { useState } from "react";

export default function PipelinePage() {
  const { user } = useAuth();
  const {
    prospects,
    loading,
    error,
    createProspect,
    moveProspect,
    updateProspect,
    deleteProspect,
    addNote,
  } = useProspects();
  const [showAddModal, setShowAddModal] = useState(false);
  const canCreate = user?.role === "admin" || user?.role === "manager";

  return (
    <>
      <Topbar
        title="Sales Pipeline"
        onAddProspect={canCreate ? () => setShowAddModal(true) : undefined}
      />
      <KanbanBoard
        prospects={prospects}
        loading={loading}
        error={error}
        moveProspect={moveProspect}
        updateProspect={updateProspect}
        deleteProspect={deleteProspect}
        addNote={addNote}
      />
      {canCreate && (
        <AddProspectModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreate={async (data) => {
            await createProspect(data);
            setShowAddModal(false);
          }}
        />
      )}
    </>
  );
}
