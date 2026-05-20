// types/index.ts

export type Stage =
  | "COLD"
  | "CONTACTED"
  | "DEMO_BOOKED"
  | "DEMO_DONE"
  | "PROPOSAL_SENT"
  | "PILOT_CLOSED";

export type ChecklistStatus = "TODO" | "DONE";

export interface ProspectNote {
  id: string;
  prospectId: string;
  content: string;
  createdAt: string;
}

export interface OnboardingChecklist {
  id: string;
  prospectId: string;
  stepNumber: number;
  title: string;
  description: string;
  assignee: string;
  status: ChecklistStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prospect {
  id: string;
  name: string;
  school: string;
  role: string;
  email: string;
  phone: string;
  source: string;
  stage: Stage;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: ProspectNote[];
  checklistItems?: OnboardingChecklist[];
}

export interface KanbanColumn {
  id: Stage;
  label: string;
  color: string;
  accentColor: string;
  prospects: Prospect[];
}

export const STAGE_CONFIG: Record<Stage, { label: string; color: string; accentColor: string; order: number }> = {
  COLD:          { label: "Cold",          color: "#334155", accentColor: "#64748b", order: 0 },
  CONTACTED:     { label: "Contacted",     color: "#1e3a5f", accentColor: "#3b82f6", order: 1 },
  DEMO_BOOKED:   { label: "Demo Booked",   color: "#1e3a5f", accentColor: "#06b6d4", order: 2 },
  DEMO_DONE:     { label: "Demo Done",     color: "#1c3048", accentColor: "#8b5cf6", order: 3 },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "#2d2a4a", accentColor: "#f59e0b", order: 4 },
  PILOT_CLOSED:  { label: "Pilot Closed",  color: "#1a3329", accentColor: "#22c55e", order: 5 },
};

export const STAGE_ORDER: Stage[] = [
  "COLD",
  "CONTACTED",
  "DEMO_BOOKED",
  "DEMO_DONE",
  "PROPOSAL_SENT",
  "PILOT_CLOSED",
];

export interface AnalyticsData {
  stageBreakdown: { stage: Stage; count: number; avgDays: number }[];
  totalProspects: number;
  conversionRate: number;
  overdueCount: number;
  closedThisMonth: number;
  closedCount: number;
  monthlyTrend: { year: number; month: number; count: number }[];
}
