import { useMemo } from "react";
import type { Task, CampaignPhase } from "../lib/types";
import { PHASES } from "../lib/types";
import { channelIcons, channelColors, intentTagColors, intentTagBg } from "../lib/channels";
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
  "Tease": "#85bdbd",
  "Build-Up": "#549e9e",
  "Launch": "#2c6e6e",
  "Momentum": "#245858",
};

const statusAccent: Record<string, string> = {
  done: "var(--neutral-900)",
  in_progress: "var(--accent-600)",
  todo: "var(--todo-accent)",
};

const statusPillBg: Record<string, string> = {
  done: "var(--neutral-100)",
  in_progress: "var(--accent-50)",
  todo: "var(--todo-bg)",
};

const statusPillText: Record<string, string> = {
  done: "var(--neutral-900)",
  in_progress: "var(--accent-700)",
  todo: "var(--todo-text)",
};

const statusPillLabel: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  todo: "To-Do",
};

function normalizeStatus(status: string): string {
  if (status === "doing") return "in_progress";
  return status;
}

export default function PhaseCalendar({ tasks, startDate, durationDays, onTaskClick }: Props) {
  const phases = useMemo<PhaseGroup[]>(() => {
    const start = new Date(startDate + "T00:00:00");
    const totalMs = durationDays * 86400000;

    return PHASES.map((phase) => {
      const phaseStart = new Date(start.getTime() + phase.startPct * totalMs);
      const phaseEnd = new Date(start.getTime() + phase.endPct * totalMs);

      const phaseTasks = tasks.filter((t) => {
        const due = new Date(t.due_date + "T00:00:00");
        return due >= phaseStart && due < phaseEnd;
      });

      return { name: phase.name, tasks: phaseTasks };
    });
  }, [tasks, startDate, durationDays]);

  return (
    <div style={{ padding: "0 var(--space-6) var(--space-8)" }}>
      {phases.map((phase) => (
        <div key={phase.name} style={{ marginBottom: "var(--space-8)" }}>
          <div style={phaseHeaderStyle}>
            <div style={{ ...phaseDotStyle, background: phaseColors[phase.name] }} />
            <h2 style={phaseTitleStyle}>{phase.name}</h2>
            <span style={phaseCountStyle}>{phase.tasks.length} tasks</span>
          </div>

          {phase.tasks.length === 0 ? (
            <p style={emptyStyle}>No tasks in this phase.</p>
          ) : (
            <div style={taskGridStyle}>
              {phase.tasks.map((task) => {
                const Icon: LucideIcon = channelIcons[task.channel] || channelIcons["Website"];
                const status = normalizeStatus(task.status);
                const accent = statusAccent[status] || statusAccent.todo;
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={taskCardStyle(status)}
                  >
                    <div style={topBarStyle(accent)} />
                    <div style={leftBarStyle(accent)} />
                    <div style={cardTopRowStyle}>
                      <div style={{ ...dotStyle, background: status === "done" ? "var(--neutral-900)" : (channelColors[task.channel] || "var(--neutral-400)") }}>
                        <Icon size={12} color="var(--neutral-0)" />
                      </div>
                      <span style={channelNameStyle}>{task.channel}</span>
                      <span style={statusPillStyle(status)}>
                        {statusPillLabel[status] || statusPillLabel.todo}
                      </span>
                    </div>
                    {task.intent_tag && (
                      <span style={intentTagStyle(task.intent_tag)}>
                        {task.intent_tag}
                      </span>
                    )}
                    <div style={taskTitleStyle(status)}>
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

const taskCardStyle = (status: string): React.CSSProperties => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-4)",
  paddingTop: "calc(var(--space-4) + 3px)",
  borderRadius: "var(--radius-md)",
  border: status === "done"
    ? "1px solid var(--neutral-700)"
    : status === "in_progress"
      ? "1px solid var(--accent-500)"
      : "1px solid var(--todo-accent)",
  background: status === "done"
    ? "var(--neutral-50)"
    : status === "in_progress"
      ? "var(--accent-50)"
      : "var(--todo-bg)",
  textAlign: "left",
  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
  cursor: "pointer",
  overflow: "hidden",
  boxShadow: status === "in_progress"
    ? "0 1px 4px rgba(8, 190, 160, 0.12)"
    : status === "done"
      ? "0 1px 4px rgba(13, 27, 51, 0.10)"
      : "var(--shadow-sm)",
});

const topBarStyle = (color: string): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: color,
});

const leftBarStyle = (color: string): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: 3,
  background: color,
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

const statusPillStyle = (status: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.03em",
  padding: "2px var(--space-2)",
  borderRadius: "20px",
  background: statusPillBg[status] || statusPillBg.todo,
  color: statusPillText[status] || statusPillText.todo,
  flexShrink: 0,
  whiteSpace: "nowrap",
});

const estStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--neutral-400)",
  flexShrink: 0,
};

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

const taskTitleStyle = (status: string): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 500,
  color: status === "in_progress" ? "var(--accent-700)" : "var(--neutral-900)",
  lineHeight: 1.4,
  textDecoration: status === "done" ? "line-through" : "none",
});

const dueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
};
