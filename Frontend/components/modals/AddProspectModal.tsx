"use client";

import { useState } from "react";
import { X, Building2, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Prospect, Stage } from "@/types";
import { STAGE_ORDER, STAGE_CONFIG } from "@/types";

interface AddProspectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "notes" | "checklistItems">) => Promise<Prospect>;
}

export function AddProspectModal({ open, onClose, onCreate }: AddProspectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    school: "",
    role: "",
    email: "",
    phone: "",
    source: "Direct",
    stage: "COLD" as Stage,
    completed: false,
    completedAt: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.school.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onCreate({
        ...form,
        lastContactDate: null,
        nextFollowUpDate: null,
      });
      setForm({
        name: "",
        school: "",
        role: "",
        email: "",
        phone: "",
        source: "Direct",
        stage: "COLD",
        completed: false,
        completedAt: null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create prospect");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in bg-black/60" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div
          className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-5 bg-surface-1 shadow-card animate-fade-in sm:max-h-[calc(100dvh-2rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-ink-5 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-ink-1">Add Prospect</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-ink-4 transition-colors hover:bg-surface-4 hover:text-ink-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Name *
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Contact name"
                  required
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                School *
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                <input
                  type="text"
                  value={form.school}
                  onChange={(e) => updateField("school", e.target.value)}
                  placeholder="School name"
                  required
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                  Role
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => updateField("role", e.target.value)}
                  placeholder="e.g. Principal"
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@school.com"
                    className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => updateField("source", e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-ink-5 bg-surface-3 px-3 py-2.5 text-sm text-ink-1 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                >
                  <option value="Direct">Direct</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Website</option>
                  <option value="Event">Event</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Social Media">Social Media</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Initial Stage
              </label>
              <div className="flex flex-wrap gap-2">
                {STAGE_ORDER.map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const active = form.stage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => updateField("stage", stage)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-all",
                        active ? "border-transparent" : "border-ink-5 text-ink-4 hover:border-ink-4 hover:text-ink-3"
                      )}
                      style={
                        active
                          ? { backgroundColor: config.accentColor + "30", color: config.accentColor, borderColor: config.accentColor + "50" }
                          : {}
                      }
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-ink-5 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={!form.name.trim() || !form.school.trim()}>
                Create Prospect
              </Button>
            </div>
            {error && <p className="text-xs font-mono text-danger">{error}</p>}
          </form>
        </div>
      </div>
    </>
  );
}
