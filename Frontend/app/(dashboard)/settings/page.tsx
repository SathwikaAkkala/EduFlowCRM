// app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogOut, User } from "lucide-react";

type SettingsState = {
  compactCards: boolean;
  showOverdueFirst: boolean;
  emailReminders: boolean;
  weeklyDigest: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  compactCards: false,
  showOverdueFirst: true,
  emailReminders: true,
  weeklyDigest: false,
};

const STORAGE_KEY = "enrollops_crm_settings_v1";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const updateSetting = (key: keyof SettingsState, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedAt(new Date().toLocaleString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <section className="bg-surface-2 border border-ink-5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink-1">Account</h2>
            <p className="text-xs text-ink-4 mt-1">Signed-in user information</p>
            {loading ? (
              <p className="text-xs font-mono text-ink-5 mt-4">Loading account...</p>
            ) : !user ? (
              <p className="text-xs font-mono text-danger mt-4">Not signed in</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-ink-5 bg-surface-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800">
                    <User className="h-4 w-4 text-brand-200" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-5">Signed in</p>
                    <p className="truncate text-sm font-semibold text-ink-1">{user.name}</p>
                    <p className="truncate font-mono text-[10px] text-ink-4">{user.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ReadField label="Name" value={user.name} />
                  <ReadField label="Email" value={user.email} />
                  <ReadField label="Role" value={user.role} />
                  <ReadField label="User ID" value={user.id} />
                </div>
              </div>
            )}
            {!loading && user && (
              <div className="mt-4 pt-4 border-t border-ink-5 flex justify-end">
                <Button variant="danger" onClick={logout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </section>

          <section className="bg-surface-2 border border-ink-5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink-1">Pipeline Preferences</h2>
            <p className="text-xs text-ink-4 mt-1">Personal display and reminder settings</p>
            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Compact prospect cards"
                description="Reduce card spacing to fit more prospects per column."
                checked={settings.compactCards}
                onChange={(v) => updateSetting("compactCards", v)}
              />
              <ToggleRow
                label="Prioritize overdue follow-ups"
                description="Highlight overdue items first in summary widgets."
                checked={settings.showOverdueFirst}
                onChange={(v) => updateSetting("showOverdueFirst", v)}
              />
              <ToggleRow
                label="Email reminders"
                description="Receive follow-up reminder emails."
                checked={settings.emailReminders}
                onChange={(v) => updateSetting("emailReminders", v)}
              />
              <ToggleRow
                label="Weekly digest"
                description="Receive a weekly CRM activity summary."
                checked={settings.weeklyDigest}
                onChange={(v) => updateSetting("weeklyDigest", v)}
              />
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-5">
              <p className="text-[11px] font-mono text-ink-5">
                {savedAt ? `Last saved: ${savedAt}` : "No local changes saved yet"}
              </p>
              <Button onClick={saveSettings} loading={saving}>
                Save Settings
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-3 border border-ink-5 rounded-lg p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-5">{label}</p>
      <p className="text-sm text-ink-2 mt-1 break-all">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-5 bg-surface-3 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-ink-1 font-medium">{label}</p>
        <p className="text-xs text-ink-4 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-surface-5"}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}


