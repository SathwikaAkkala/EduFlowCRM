"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Building2,
  User,
  Tag,
  Calendar,
  Send,
  Clock,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { OnboardingChecklist } from "@/components/drawers/OnboardingChecklist";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { STAGE_CONFIG } from "@/types";
import type { Prospect, ProspectNote } from "@/types";
import { readBackendResponse } from "@/lib/api";

interface ProspectDrawerProps {
  open: boolean;
  prospect: Prospect | null;
  canEdit?: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Prospect>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAddNote: (id: string, content: string) => Promise<ProspectNote>;
}

export function ProspectDrawer({
  open,
  prospect,
  canEdit = false,
  onClose,
  onUpdate,
  onDelete,
  onAddNote,
}: ProspectDrawerProps) {
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "checklist">("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localProspect, setLocalProspect] = useState(prospect);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalProspect(prospect);
  }, [prospect]);

  useEffect(() => {
    const loadProspect = async () => {
      if (!open || !prospect?.id) return;

      try {
        const res = await fetch(`/api/prospects/${prospect.id}`);
        if (!res.ok) return;

        const data = await readBackendResponse<Prospect>(res);
        if (data && data.id) {
          setLocalProspect(data);
        }
      } catch {
        // Keep the optimistic/list version if the detail fetch fails.
      }
    };

    loadProspect();
  }, [open, prospect?.id]);

  useEffect(() => {
    if (!open) {
      setNoteText("");
      setActiveTab("details");
      setConfirmDelete(false);
      setNoteError(null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCompletionChange = (completed: boolean) => {
    if (localProspect) {
      setLocalProspect({
        ...localProspect,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      });
    }
  };

  const handleAddNote = async () => {
    if (!localProspect || !noteText.trim()) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      const note = await onAddNote(localProspect.id, noteText.trim());
      setLocalProspect((current) =>
        current
          ? { ...current, notes: [note, ...(current.notes ?? [])], updatedAt: new Date().toISOString() }
          : current
      );
      setNoteText("");
    } catch {
      setNoteError("Failed to add note. Please try again.");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!localProspect || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(localProspect.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!localProspect) return null;

  const stageConfig = STAGE_CONFIG[localProspect.stage];
  const isPilotClosed = localProspect.stage === "PILOT_CLOSED";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[100vw] flex-col border-l border-ink-5 bg-surface-1 shadow-2xl transition-transform duration-300 ease-out sm:w-[92vw] sm:max-w-[480px] md:w-[480px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start gap-3 border-b border-ink-5 px-4 py-4 sm:px-5">
          <Avatar name={localProspect.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink-1">{localProspect.name}</h2>
              <Badge variant="stage" stage={localProspect.stage}>
                {stageConfig.label}
              </Badge>
              {localProspect.completed && (
                <div className="flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-semibold text-success">Complete</span>
                </div>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-4">
              {localProspect.role} - {localProspect.school}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="danger" loading={deleting} onClick={handleDelete}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded p-1 text-ink-4 transition-colors hover:bg-danger-muted hover:text-danger"
                  title="Delete prospect"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            ) : null}
            <button
              onClick={onClose}
              className="rounded p-1 text-ink-4 transition-colors hover:bg-surface-4 hover:text-ink-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isPilotClosed && (
          <div className="flex border-b border-ink-5 px-4 sm:px-5">
            {(["details", "checklist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "mr-6 -mb-px border-b-2 px-1 py-2.5 text-sm font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-ink-4 hover:text-ink-2"
                )}
              >
                {tab === "checklist" ? "Onboarding" : tab}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <div className="flex flex-col gap-5 p-4 sm:p-5">
              <section>
                <h3 className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-widest text-ink-4">
                  Contact
                </h3>
                <div className="space-y-2.5">
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={localProspect.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={localProspect.phone} />
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="School" value={localProspect.school} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Role" value={localProspect.role} />
                  <InfoRow icon={<Tag className="h-4 w-4" />} label="Source" value={localProspect.source} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-widest text-ink-4">
                  Timeline
                </h3>
                <div className="space-y-2.5">
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Last Contact"
                    value={localProspect.lastContactDate ? formatRelative(localProspect.lastContactDate) : "Never"}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-ink-4 sm:w-28 sm:shrink-0">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-mono">Follow-up</span>
                    </div>
                    {canEdit ? (
                      <input
                        type="date"
                        defaultValue={localProspect.nextFollowUpDate?.split("T")[0] ?? ""}
                        onChange={async (e) => {
                          if (e.target.value) {
                            await onUpdate(localProspect.id, { nextFollowUpDate: new Date(e.target.value).toISOString() });
                          }
                        }}
                        className="flex-1 rounded border border-ink-5 bg-surface-3 px-2.5 py-1.5 text-xs font-mono text-ink-1 focus:border-brand-500 focus:outline-none"
                      />
                    ) : (
                      <span className="truncate text-sm text-ink-2">
                        {localProspect.nextFollowUpDate ? formatDate(localProspect.nextFollowUpDate) : "-"}
                      </span>
                    )}
                  </div>
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Added" value={formatDate(localProspect.createdAt)} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-widest text-ink-4">
                  Notes
                </h3>

                <div className="mb-3 overflow-hidden rounded-lg border border-ink-5 bg-surface-2">
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 focus:outline-none"
                  />
                  <div className="flex justify-end border-t border-ink-5 px-3 py-2">
                    <Button size="sm" onClick={handleAddNote} loading={addingNote} disabled={!noteText.trim()}>
                      <Send className="h-3.5 w-3.5" />
                      Add Note
                    </Button>
                  </div>
                </div>
                {noteError && <p className="px-3 pb-2 text-xs font-mono text-danger">{noteError}</p>}

                <div className="space-y-2.5">
                  {(localProspect.notes ?? []).length === 0 ? (
                    <p className="py-4 text-center font-mono text-xs text-ink-5">No notes yet</p>
                  ) : (
                    (localProspect.notes ?? []).map((note) => (
                      <div key={note.id} className="rounded-lg border border-ink-5 bg-surface-2 p-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{note.content}</p>
                        <p className="mt-2 text-[11px] font-mono text-ink-5">{formatDate(note.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : (
            <OnboardingChecklist
              prospectId={localProspect.id}
              items={localProspect.checklistItems ?? []}
              canEdit={canEdit}
              onCompletionChange={handleCompletionChange}
            />
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-2 text-ink-4 sm:w-28 sm:shrink-0">
        {icon}
        <span className="text-xs font-mono">{label}</span>
      </div>
      <span className="truncate text-sm text-ink-2">{value}</span>
    </div>
  );
}
