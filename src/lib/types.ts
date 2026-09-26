export interface Campaign {
  id: string;
  user_id: string;
  business_name: string;
  business_brief: string;
  target_audience: string;
  goal: string;
  channels: string[];
  start_date: string;
  duration_days: number;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MicroStep {
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  campaign_id: string;
  title: string;
  channel: string;
  due_date: string;
  draft_copy: string | null;
  status: "todo" | "in_progress" | "done";
  est_minutes: number | null;
  intent_tag: string | null;
  campaign_phase: CampaignPhase | null;
  micro_steps: MicroStep[] | null;
  sort_order: number;
  created_at: string;
}

export const CHANNELS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Email",
  "Website",
] as const;

export type Channel = (typeof CHANNELS)[number];

export type IntentTag = "AWARENESS" | "ENGAGEMENT" | "CONVERSION" | "TRUST" | "RETENTION";

export const INTENT_TAGS: IntentTag[] = [
  "AWARENESS",
  "ENGAGEMENT",
  "CONVERSION",
  "TRUST",
  "RETENTION",
];

export type CampaignPhase = "Tease" | "Build-Up" | "Launch" | "Momentum";

export const PHASES: { name: CampaignPhase; startPct: number; endPct: number }[] = [
  { name: "Tease", startPct: 0, endPct: 0.2 },
  { name: "Build-Up", startPct: 0.2, endPct: 0.5 },
  { name: "Launch", startPct: 0.5, endPct: 0.75 },
  { name: "Momentum", startPct: 0.75, endPct: 1 },
];

export type UrgencyLevel = "red" | "orange" | "yellow" | "green";

export function getUrgencyLevel(task: Task): UrgencyLevel {
  if (task.status === "done") return "green";
  const estMinutes = task.est_minutes || 30;
  const due = new Date(task.due_date + "T00:00:00");
  const startBy = new Date(due.getTime() - estMinutes * 60000);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = startBy.getTime() - now.getTime();
  const diffDays = diffMs / 86400000;
  if (diffDays <= 0) return "red";
  if (diffDays <= 1) return "orange";
  if (diffDays <= 3) return "yellow";
  return "green";
}

export const urgencyColors: Record<UrgencyLevel, { bg: string; border: string; dot: string; label: string }> = {
  red: { bg: "#fef2f2", border: "#dc2626", dot: "#dc2626", label: "Do this first" },
  orange: { bg: "#fff7ed", border: "#ea580c", dot: "#ea580c", label: "Start now" },
  yellow: { bg: "#fefce8", border: "#ca8a04", dot: "#ca8a04", label: "Coming up" },
  green: { bg: "#f0fdf4", border: "#16a34a", dot: "#16a34a", label: "Later" },
};

export function getFirstUnfinishedStep(task: Task): MicroStep | null {
  if (!task.micro_steps || task.micro_steps.length === 0) return null;
  return task.micro_steps.find((s) => !s.done) || null;
}
