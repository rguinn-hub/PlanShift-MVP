import { useMemo } from "react";
import type { Task, CampaignPhase } from "../lib/types";
import { PHASES, migratePhase } from "../lib/types";
import { channelIcons, channelColors, intentTagColors, intentTagBg } from "../lib/channels";
import {
  statusLabel,
  statusBg,
  statusBorder,
  statusText,
  statusPillBg,
  statusPillText,
  statusStrike,
} from "../lib/statusStyles";
import type { LucideIcon } from "lucide-react";

interface Props {
  tasks: Task[];
  startDate: string;
  durationDays: number;
  onTaskClick: (task: Task) => void;
}

interface PhaseGroup {
  name: CampaignPhase;
  tasks: Task[];
}

const phaseColors: Record<CampaignPhase, string> = {
  "Prep": "#85bdbd",
  "Build": "#549e9e",
  "Launch": "#2c6e6e",
  "Grow": "#245858",
};

export default function PhaseCalendar({ tasks, startDate, durationDays, onTaskClick }: Props) {
  const phases = useMemo<PhaseGroup[]>(() => {
    const start = new Date(startDate + "T00:00:00");
    const totalMs = durationDays * 86400000;
    const campaign = { start_date: startDate, duration_days: durationDays };

    const grouped: Record<CampaignPhase, Task[]> = {
      Prep: [],
      Build: [],
      Launch: [],
      Grow: [],
    };

    for (const t of tasks) {
      const phase = migratePhase(t.campaign_phase, t.due_date, campaign);
      grouped[phase].push(t);
    }

    return PHASES.map((phase) => ({ name: phase.name, tasks: grouped[phase.name] }));
  }, [tasks, startDate, durationDays]);

  return (
    <div style={{ padding: "0 var(--space-6) var(--space-8)" }}>
      {phases.map((phase) => (
        <div key={phase.name} style={{ marginBottom: "var(--space-8)" }}>
          <div style={phaseHeaderStyle}>
            <div style={{ ...phaseDotStyle, background: phaseColors[phase.name] }} />
            <h2 style={phaseTitleStyle}>{phase.name}</h2>
            <span style={phaseCountStyle}>{phase.tasks.length} {phase.tasks.length === 1 ? "task" : "tasks"}</span>
          </div>

          {phase.tasks.length === 0 ? (
            <p style={emptyStyle}>No tasks in this phase.</p>
          ) : (
            <div style={taskGridStyle}>
              {phase.tasks.map((task) => {
                const Icon: LucideIcon = channelIcons[task.channel] || channelIcons["Website"];
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={taskCardStyle(task.status)}
                  >
                    <div style={topBarStyle(task.status)} />
                    <div style={leftBarStyle(task.status)} />
                    <div style={cardTopRowStyle}>
                      <div style={{ ...dotStyle, background: task.status === "done" ? "var(--neutral-900)" : (channelColors[task.channel] || "var(--neutral-400)") }}>
                        <Icon size={12} color="var(--neutral-0)" />
                      </div>
                      <span style={channelNameStyle}>{task.channel}</span>
                      <span style={statusPillStyle(task.status)}>
                        {statusLabel[task.status]}
                      </span>
                    </div>
                    {task.intent_tag && (
                      <span style={intentTagStyle(task.intent_tag)}>
                        {task.intent_tag}
                      </span>
                    )}
                    <div style={taskTitleStyle(task.status)}>
                      {task.title}
                    </div>
                    <div style={dueStyle}>
                      {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const phaseHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  marginBottom: "var(--space-4)",
};

const phaseDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};

const phaseTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "var(--neutral-900)",
};

const phaseCountStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
  fontWeight: 500,
};

const emptyStyle: React.CSSProperties = {
  color: "var(--neutral-400)",
  fontSize: 14,
  padding: "var(--space-4) 0",
};

const taskGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "var(--space-3)",
};

const taskCardStyle = (status: Task["status"]): React.CSSProperties => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-4)",
  paddingTop: "calc(var(--space-4) + 3px)",
  borderRadius: "var(--radius-md)",
  border: `1px solid ${statusBorder(status)}`,
  background: statusBg(status),
  textAlign: "left",
  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
  cursor: "pointer",
  overflow: "hidden",
  boxShadow: "var(--shadow-sm)",
});

const topBarStyle = (status: Task["status"]): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: statusBorder(status),
});

const leftBarStyle = (status: Task["status"]): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: 3,
  background: statusBorder(status),
});

const cardTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

const dotStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const channelNameStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--neutral-500)",
  flex: 1,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const statusPillStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.03em",
  padding: "2px var(--space-2)",
  borderRadius: "20px",
  background: statusPillBg(status),
  color: statusPillText(status),
  flexShrink: 0,
  whiteSpace: "nowrap",
});

const intentTagStyle = (tag: string): React.CSSProperties => ({
  display: "inline-block",
  alignSelf: "flex-start",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  padding: "2px var(--space-2)",
  borderRadius: "4px",
  background: intentTagBg[tag] || "var(--neutral-100)",
  color: intentTagColors[tag] || "var(--neutral-600)",
});

const taskTitleStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 500,
  color: statusText(status),
  lineHeight: 1.4,
  textDecoration: statusStrike(status),
});

const dueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
};
