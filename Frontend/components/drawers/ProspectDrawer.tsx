// components/drawers/ProspectDrawer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Mail, Phone, Building2, User, Tag, Calendar,
  StickyNote, CheckSquare, Send, Clock, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { OnboardingChecklist } from "@/components/drawers/OnboardingChecklist";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { STAGE_CONFIG } from "@/types";
import type { Prospect } from "@/types";

interface ProspectDrawerProps {
  open: boolean;
  prospect: Prospect | null;
  canEdit?: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Prospect>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAddNote: (id: string, content: string) => Promise<void>;
}

export function ProspectDrawer({ open, prospect, canEdit = false, onClose, onUpdate, onDelete, onAddNote }: ProspectDrawerProps) {
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "checklist">("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) { setNoteText(""); setActiveTab("details"); setConfirmDelete(false); setNoteError(null); }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAddNote = async () => {
    if (!prospect || !noteText.trim()) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      await onAddNote(prospect.id, noteText.trim());
      setNoteText("");
    } catch {
      setNoteError("Failed to add note. Please try again.");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!prospect || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(prospect.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!prospect) return null;

  const stageConfig = STAGE_CONFIG[prospect.stage];
  const isPilotClosed = prospect.stage === "PILOT_CLOSED";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[480px] bg-surface-1 border-l border-ink-5 z-50",
            "flex flex-col shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full"
          )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-ink-5">
          <Avatar name={prospect.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-ink-1">{prospect.name}</h2>
              <Badge variant="stage" stage={prospect.stage}>
                {stageConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-ink-4 mt-0.5">{prospect.role} · {prospect.school}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-ink-4 hover:text-danger transition-colors p-1 rounded hover:bg-danger-muted"
                  title="Delete prospect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="text-ink-4 hover:text-ink-1 transition-colors p-1 rounded hover:bg-surface-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {isPilotClosed && (
          <div className="flex border-b border-ink-5 px-5">
            {(["details", "checklist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2.5 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <div className="p-5 flex flex-col gap-5">
              {/* Contact info */}
              <section>
                <h3 className="text-[11px] font-mono font-semibold text-ink-4 uppercase tracking-widest mb-3">
                  Contact
                </h3>
                <div className="space-y-2.5">
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={prospect.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={prospect.phone} />
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="School" value={prospect.school} />
                  <InfoRow icon={<User className="w-4 h-4" />} label="Role" value={prospect.role} />
                  <InfoRow icon={<Tag className="w-4 h-4" />} label="Source" value={prospect.source} />
                </div>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="text-[11px] font-mono font-semibold text-ink-4 uppercase tracking-widest mb-3">
                  Timeline
                </h3>
                <div className="space-y-2.5">
                  <InfoRow
                    icon={<Clock className="w-4 h-4" />}
                    label="Last Contact"
                    value={prospect.lastContactDate ? formatRelative(prospect.lastContactDate) : "Never"}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-ink-4 w-28 shrink-0">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-mono">Follow-up</span>
                    </div>
                    {canEdit ? (
                      <input
                        type="date"
                        defaultValue={prospect.nextFollowUpDate?.split("T")[0] ?? ""}
                        onChange={async (e) => {
                          if (e.target.value) {
                            await onUpdate(prospect.id, { nextFollowUpDate: new Date(e.target.value).toISOString() });
                          }
                        }}
                        className="flex-1 bg-surface-3 border border-ink-5 rounded px-2.5 py-1.5 text-xs font-mono text-ink-1 focus:outline-none focus:border-brand-500"
                      />
                    ) : (
                      <span className="text-sm text-ink-2 truncate">
                        {prospect.nextFollowUpDate ? formatDate(prospect.nextFollowUpDate) : "—"}
                      </span>
                    )}
                  </div>
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Added"
                    value={formatDate(prospect.createdAt)}
                  />
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-[11px] font-mono font-semibold text-ink-4 uppercase tracking-widest mb-3">
                  Notes
                </h3>

                {/* Note input */}
                <div className="bg-surface-2 rounded-lg border border-ink-5 overflow-hidden mb-3">
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note…"
                    rows={3}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 resize-none focus:outline-none"
                  />
                  <div className="flex justify-end px-3 py-2 border-t border-ink-5">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      loading={addingNote}
                      disabled={!noteText.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Add Note
                    </Button>
                  </div>
                </div>
                {noteError && (
                  <p className="px-3 pb-2 text-xs font-mono text-danger">{noteError}</p>
                )}

                {/* Notes list */}
                <div className="space-y-2.5">
                  {(prospect.notes ?? []).length === 0 ? (
                    <p className="text-xs text-ink-5 font-mono text-center py-4">No notes yet</p>
                  ) : (
                    (prospect.notes ?? []).map((note) => (
                      <div key={note.id} className="bg-surface-2 rounded-lg border border-ink-5 p-3">
                        <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[11px] text-ink-5 font-mono mt-2">
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : (
            <OnboardingChecklist
              prospectId={prospect.id}
              items={prospect.checklistItems ?? []}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-ink-4 w-28 shrink-0">
        {icon}
        <span className="text-xs font-mono">{label}</span>
      </div>
      <span className="text-sm text-ink-2 truncate">{value}</span>
    </div>
  );
}

