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
  scheduled_date: string | null;
  scheduled_time: string | null;
  reminder_offset: string | null;
}

export interface CalendarItem {
  id: string;
  user_id: string;
  item_type: "general_task" | "appointment";
  title: string;
  description: string | null;
  due_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  meeting_link: string | null;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  item_type: "campaign_task" | "general_task" | "note" | "appointment";
  item_id: string;
  item_title: string;
  scheduled_for: string;
  reminder_offset: string | null;
  dismissed: boolean;
  created_at: string;
}

export type ReminderOffset = "none" | "at_time" | "10min" | "1hour" | "1day";

export const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: "none", label: "No reminder" },
  { value: "at_time", label: "At the scheduled time" },
  { value: "10min", label: "10 minutes before" },
  { value: "1hour", label: "1 hour before" },
  { value: "1day", label: "1 day before" },
];

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

export type CampaignPhase = "Prep" | "Build" | "Launch" | "Grow";

export const PHASES: { name: CampaignPhase; startPct: number; endPct: number }[] = [
  { name: "Prep", startPct: 0, endPct: 0.25 },
  { name: "Build", startPct: 0.25, endPct: 0.5 },
  { name: "Launch", startPct: 0.5, endPct: 0.75 },
  { name: "Grow", startPct: 0.75, endPct: 1 },
];

const PHASE_MIGRATION: Record<string, CampaignPhase> = {
  Tease: "Prep",
  "Build-Up": "Build",
  Momentum: "Grow",
  Sustain: "Grow",
};

export function migratePhase(phase: string | null, dueDate: string, campaign: { start_date: string; duration_days: number }): CampaignPhase {
  if (phase && (PHASES.some((p) => p.name === phase))) return phase as CampaignPhase;
  if (phase && PHASE_MIGRATION[phase]) return PHASE_MIGRATION[phase];
  const start = new Date(campaign.start_date + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  const totalMs = campaign.duration_days * 86400000;
  const pct = (due.getTime() - start.getTime()) / totalMs;
  for (const p of PHASES) {
    if (pct >= p.startPct && pct < p.endPct) return p.name;
  }
  return "Grow";
}

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
