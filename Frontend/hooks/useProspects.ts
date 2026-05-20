// hooks/useProspects.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Prospect, Stage } from "@/types";

interface UseProspectsReturn {
  prospects: Prospect[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  moveProspect: (prospectId: string, newStage: Stage) => Promise<void>;
  updateProspect: (prospectId: string, data: Partial<Prospect>) => Promise<void>;
  deleteProspect: (prospectId: string) => Promise<void>;
  addNote: (prospectId: string, content: string) => Promise<void>;
  createProspect: (data: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "notes" | "checklistItems">) => Promise<void>;
}

export function useProspects(): UseProspectsReturn {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prospects");
      if (!res.ok) throw new Error("Failed to fetch prospects");
      const data = await res.json();
      setProspects(Array.isArray(data) ? data : data.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const moveProspect = useCallback(async (prospectId: string, newStage: Stage) => {
    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, stage: newStage } : p))
    );
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      const updated = await res.json();
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, ...updated } : p))
      );
    } catch {
      // Revert on failure
      await fetchProspects();
    }
  }, [fetchProspects]);

  const updateProspect = useCallback(async (prospectId: string, data: Partial<Prospect>) => {
    const res = await fetch(`/api/prospects/${prospectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update prospect");
    const updated = await res.json();
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, ...updated } : p))
    );
  }, []);

  const deleteProspect = useCallback(async (prospectId: string) => {
    // Optimistic removal
    setProspects((prev) => prev.filter((p) => p.id !== prospectId));
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete prospect");
      }
    } catch {
      // Revert on failure
      await fetchProspects();
    }
  }, [fetchProspects]);

  const addNote = useCallback(async (prospectId: string, content: string) => {
    const res = await fetch(`/api/prospects/${prospectId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to add note");
    const note = await res.json();
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId
          ? { ...p, notes: [note, ...(p.notes ?? [])], updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const createProspect = useCallback(async (
    data: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "notes" | "checklistItems">
  ) => {
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create prospect");
    await fetchProspects();
  }, [fetchProspects]);

  return {
    prospects,
    loading,
    error,
    refetch: fetchProspects,
    moveProspect,
    updateProspect,
    deleteProspect,
    addNote,
    createProspect,
  };
}

