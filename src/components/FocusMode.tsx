import { useState, useMemo, useRef, useEffect } from "react";
import { Play, ChevronRight, Clock, Archive, CircleDot, HelpCircle, X, Check, CheckCircle2 } from "lucide-react";
import type { Task } from "../lib/types";
import { getUrgencyLevel, getFirstUnfinishedStep } from "../lib/types";
import { channelIcons, channelColors, intentTagColors, intentTagBg } from "../lib/channels";
import {
  statusLabel,
  statusBg,
  statusBorder,
  statusText,
  statusStrike,
} from "../lib/statusStyles";
import type { LucideIcon } from "lucide-react";

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export default function FocusMode({ tasks, onTaskClick, onTaskUpdate }: Props) {
  const [showStuck, setShowStuck] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    };
  }, []);

  const { doFirst, startNow, comingUp, laterCount, doneCount, doneTasks } = useMemo(() => {
    const unfinished = tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => a.sort_order - b.sort_order);

    const doneTasks = tasks
      .filter((t) => t.status === "done")
      .sort((a, b) => a.sort_order - b.sort_order);

    const doFirst = unfinished[0] || null;
    const startNow = unfinished.slice(1, 3);
    const comingUp = unfinished.slice(3, 6);
    const laterCount = Math.max(0, unfinished.length - 6);
    const doneCount = doneTasks.length;

    return { doFirst, startNow, comingUp, laterCount, doneCount, doneTasks };
  }, [tasks]);

  const handleComplete = (task: Task) => {
    if (completedRef.current.has(task.id)) return;
    completedRef.current.add(task.id);
    onTaskUpdate(task.id, { status: "done" });

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      setShowConfetti(true);
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  const handleStart = () => {
    if (doFirst) {
      if (doFirst.status === "todo") {
        onTaskUpdate(doFirst.id, { status: "in_progress" });
      }
      onTaskClick(doFirst);
    }
  };

  const handleStepDone = () => {
    if (!doFirst?.micro_steps) return;
    const updatedSteps = doFirst.micro_steps.map((s, i) =>
      i === doFirst.micro_steps!.findIndex((ms) => !ms.done) ? { ...s, done: true } : s
    );
    onTaskUpdate(doFirst.id, { micro_steps: updatedSteps });
  };

  const heroIsMelon = true;

  if (!doFirst) {
    return (
      <div style={emptyContainerStyle}>
        <div style={{ ...emptyIconWrap, background: "var(--accent-50)" }}>
          <CircleDot size={32} color="var(--accent-600)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--neutral-900)", marginBottom: "var(--space-2)" }}>
          All caught up
        </h2>
        <p style={{ color: "var(--neutral-500)", fontSize: 15, maxWidth: 360, textAlign: "center" }}>
          Every task is done. Your campaign is complete.
        </p>
        {doneCount > 0 && (
          <div style={{ marginTop: "var(--space-6)", width: "100%", maxWidth: 480 }}>
            <DoneSection
              doneTasks={doneTasks}
              doneExpanded={doneExpanded}
              setDoneExpanded={setDoneExpanded}
              onTaskClick={onTaskClick}
              onTaskUpdate={onTaskUpdate}
            />
          </div>
        )}
      </div>
    );
  }

  const heroUrgency = getUrgencyLevel(doFirst);
  const firstStep = getFirstUnfinishedStep(doFirst);
  const microStepText = firstStep
    ? firstStep.text
    : extractMicroStep(doFirst);
  const Icon: LucideIcon = channelIcons[doFirst.channel] || channelIcons["Website"];

  const heroCardFinalStyle: React.CSSProperties = {
    ...heroCardStyle,
    borderLeft: `4px solid var(--melon-border)`,
    background: "var(--melon-bg)",
  };

  return (
    <div style={containerStyle}>
      {showConfetti && <Confetti />}

      {/* Done section (expanded to left on desktop) */}
      {doneCount > 0 && doneExpanded && (
        <div style={{ width: "100%" }}>
          <DoneSection
            doneTasks={doneTasks}
            doneExpanded={doneExpanded}
            setDoneExpanded={setDoneExpanded}
            onTaskClick={onTaskClick}
            onTaskUpdate={onTaskUpdate}
          />
        </div>
      )}

      {/* Done count toggle (always visible) */}
      {doneCount > 0 && (
        <button
          className="btn btn-secondary"
          style={{ alignSelf: "flex-start", fontSize: 14 }}
          onClick={() => setDoneExpanded((v) => !v)}
        >
          <CheckCircle2 size={16} />
          Done ({doneCount})
          {doneExpanded ? <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} /> : <ChevronRight size={14} />}
        </button>
      )}

      {/* Do this first */}
      <div
        className={undefined}
        style={heroCardFinalStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ ...heroLabelStyle, color: "var(--melon-text)" }}>
            {urgencyColors[heroUrgency].label}
          </p>
          <span style={heroStatusPillStyle(doFirst.status)}>
            {statusLabel[doFirst.status]}
          </span>
        </div>
        <div style={heroIconRow}>
          <div style={{ ...heroDotStyle, background: channelColors[doFirst.channel] || "var(--neutral-400)" }}>
            <Icon size={20} color="var(--neutral-0)" />
          </div>
          <span style={heroChannelStyle}>{doFirst.channel}</span>
          {doFirst.intent_tag && (
            <span style={heroIntentTagStyle(doFirst.intent_tag)}>
              {doFirst.intent_tag}
            </span>
          )}
        </div>
        <h1 style={heroTitleStyle}>{doFirst.title}</h1>
        {microStepText && (
          <div style={microStepStyle}>
            <div style={microStepDotStyle} />
            <span style={microStepTextStyle}>{microStepText}</span>
            {firstStep && (
              <button style={stepDoneBtnStyle} onClick={handleStepDone}>
                <Check size={14} />
              </button>
            )}
          </div>
        )}
        <div style={heroMetaRow}>
          <span style={heroMetaItem}>
            <Clock size={14} />
            {doFirst.est_minutes ? `${doFirst.est_minutes} min` : "—"}
          </span>
          <span style={heroMetaItem}>
            {new Date(doFirst.due_date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-primary btn-large" style={{ ...startBtnStyle, flex: 1 }} onClick={handleStart}>
            <Play size={18} />
            {doFirst.status === "in_progress" ? "Open task" : "Start"}
          </button>
          <button
            className="btn btn-secondary btn-large"
            style={{ ...stuckBtnStyle }}
            onClick={() => setShowStuck(true)}
          >
            <HelpCircle size={18} />
            I'm stuck
          </button>
          <button
            className="btn btn-primary btn-large"
            style={{ ...completeBtnStyle }}
            onClick={() => handleComplete(doFirst)}
          >
            <Check size={18} />
            Done
          </button>
        </div>
      </div>

      {/* Start now */}
      {startNow.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ ...sectionTitleStyle, color: "var(--urgency-orange)" }}>Start now</h2>
          <div style={listStyle}>
            {startNow.map((task) => (
              <FocusTaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </div>
      )}

      {/* Coming up */}
      {comingUp.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ ...sectionTitleStyle, color: "var(--urgency-yellow)" }}>Coming up</h2>
          <div style={listStyle}>
            {comingUp.map((task) => (
              <FocusTaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </div>
      )}

      {/* Later count */}
      {laterCount > 0 && (
        <div style={countsRowStyle}>
          <button style={countClickableStyle} onClick={() => {
            const laterTask = tasks
          .filter((t) => t.status !== "done")
          .sort((a, b) => a.sort_order - b.sort_order)[6];
        if (laterTask) onTaskClick(laterTask);
      }}>
            <div style={{ ...countDotStyle, background: "var(--urgency-green)" }} />
            <span style={countTextStyle}>
              <strong style={{ color: "var(--neutral-700)" }}>{laterCount}</strong> later
            </span>
          </button>
        </div>
      )}

      {showStuck && (
        <StuckOverlay
          task={doFirst}
          onClose={() => setShowStuck(false)}
          onUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}

/* ---------- Done Section ---------- */
function DoneSection({ doneTasks, doneExpanded, setDoneExpanded, onTaskClick, onTaskUpdate }: {
  doneTasks: Task[];
  doneExpanded: boolean;
  setDoneExpanded: (v: boolean) => void;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}) {
  if (!doneExpanded) return null;
  return (
    <div style={doneSectionStyle}>
      <div style={doneHeaderStyle}>
        <CheckCircle2 size={18} color="var(--neutral-500)" />
        <span style={doneHeaderTextStyle}>Done ({doneTasks.length})</span>
        <button className="btn btn-ghost" style={{ padding: "var(--space-1)", marginLeft: "auto" }} onClick={() => setDoneExpanded(false)}>
          <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />
        </button>
      </div>
      <div style={doneListStyle}>
        {doneTasks.map((task) => {
          const Icon: LucideIcon = channelIcons[task.channel] || channelIcons["Website"];
          return (
            <div key={task.id} style={doneCardStyle(task.status)}>
              <button style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, textAlign: "left", cursor: "pointer", border: "none", background: "none" }} onClick={() => onTaskClick(task)}>
                <div style={{ ...rowDotStyle, background: channelColors[task.channel] || "var(--neutral-400)" }}>
                  <Icon size={12} color="var(--neutral-0)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={doneTitleStyle(task.status)}>{task.title}</div>
                  <div style={rowMetaStyle}>
                    {task.channel}
                    {" · "}
                    {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "var(--space-1) var(--space-2)", fontSize: 13, color: "var(--accent-600)", fontWeight: 600, flexShrink: 0 }}
                onClick={() => onTaskUpdate(task.id, { status: "todo" })}
              >
                Reopen
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Confetti ---------- */
function Confetti() {
  const colors = ["var(--accent-500)", "var(--urgency-orange)", "var(--urgency-yellow)", "var(--urgency-green)", "var(--status-todo-border)"];
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    color: colors[i % colors.length],
  }));
  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, top: "20%", background: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </>
  );
}

/* ---------- Urgency colors (kept for labels) ---------- */
const urgencyColors: Record<string, { border: string; dot: string; label: string }> = {
  red: { border: "#dc2626", dot: "#dc2626", label: "Do this first" },
  orange: { border: "#ea580c", dot: "#ea580c", label: "Start now" },
  yellow: { border: "#ca8a04", dot: "#ca8a04", label: "Coming up" },
  green: { border: "#16a34a", dot: "#16a34a", label: "Later" },
};

function extractMicroStep(task: Task): string | null {
  if (!task.draft_copy) return null;
  const lines = task.draft_copy.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstActionable = lines.find((l) =>
    l.startsWith("- ") || l.startsWith("1.") || l.startsWith("[") || l.length < 80
  );
  return firstActionable || lines[0] || null;
}

function FocusTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const Icon: LucideIcon = channelIcons[task.channel] || channelIcons["Website"];
  return (
    <button
      style={{ ...rowStyle, background: statusBg(task.status), border: `1px solid ${statusBorder(task.status)}` }}
      onClick={onClick}
    >
      <div style={{ ...rowDotStyle, background: channelColors[task.channel] || "var(--neutral-400)" }}>
        <Icon size={12} color="var(--neutral-0)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...rowTitleStyle, color: statusText(task.status), textDecoration: statusStrike(task.status) }}>{task.title}</div>
        <div style={rowMetaStyle}>
          {task.channel}
          {task.est_minutes != null && ` · ${task.est_minutes}m`}
          {" · "}
          {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <ChevronRight size={18} color="var(--neutral-400)" />
    </button>
  );
}

/* ---------- I'm Stuck overlay ---------- */

const STUCK_REASONS = [
  { id: "too_big", label: "Too big", tip: "Just do the first 5 minutes. That's it." },
  { id: "dont_know", label: "Don't know where to start", tip: "Open the task and read the draft copy. Pick one line to write." },
  { id: "no_time", label: "No time", tip: "Set a 2-minute timer and do one tiny thing." },
  { id: "avoiding", label: "Avoiding it", tip: "Set a 5-minute timer. You can stop after." },
];

function StuckOverlay({ task, onClose, onUpdate }: {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStartTimer = (minutes: number) => {
    setTimerDuration(minutes);
    setTimeLeft(minutes * 60);
    setTimerRunning(true);
    onUpdate(task.id, { status: "in_progress" });

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerRunning(false);
  };

  const selectedReason = STUCK_REASONS.find((r) => r.id === reason);

  return (
    <div style={stuckOverlayStyle} onClick={onClose}>
      <div style={stuckModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={stuckHeaderStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--neutral-900)" }}>
            I'm stuck
          </h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "var(--space-2)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={stuckBodyStyle}>
          {!reason && (
            <div>
              <p style={{ color: "var(--neutral-500)", fontSize: 15, marginBottom: "var(--space-4)" }}>
                What's getting in the way?
              </p>
              <div style={reasonGridStyle}>
                {STUCK_REASONS.map((r) => (
                  <button
                    key={r.id}
                    style={reasonBtnStyle}
                    onClick={() => setReason(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {reason && !timerDuration && (
            <div>
              <div style={tinyStepStyle}>
                <div style={tinyStepDotStyle} />
                <p style={tinyStepTextStyle}>{selectedReason?.tip}</p>
              </div>
              <p style={{ color: "var(--neutral-500)", fontSize: 15, marginBottom: "var(--space-4)", marginTop: "var(--space-6)" }}>
                Pick a timer and just start:
              </p>
              <div style={timerOptionsStyle}>
                <button style={timerBtnStyle} onClick={() => handleStartTimer(2)}>
                  <Clock size={18} />
                  2 min
                </button>
                <button style={timerBtnStyle} onClick={() => handleStartTimer(5)}>
                  <Clock size={18} />
                  5 min
                </button>
                <button style={timerBtnStyle} onClick={() => handleStartTimer(10)}>
                  <Clock size={18} />
                  10 min
                </button>
              </div>
            </div>
          )}

          {timerDuration && (
            <div style={{ textAlign: "center" }}>
              <TimerDisplay seconds={timeLeft} totalSeconds={timerDuration * 60} running={timerRunning} />
              <p style={{ color: "var(--neutral-500)", fontSize: 14, marginTop: "var(--space-4)" }}>
                {timerRunning ? "You're doing it. Just keep going." : "Time's up. You did it."}
              </p>
              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", marginTop: "var(--space-6)" }}>
                {timerRunning ? (
                  <button className="btn btn-secondary" onClick={handleStopTimer}>
                    Stop timer
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={onClose}>
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimerDisplay({ seconds, totalSeconds, running }: { seconds: number; totalSeconds: number; running: boolean }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
      <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={60} cy={60} r={radius} fill="none" stroke="var(--neutral-200)" strokeWidth={6} />
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke={running ? "var(--accent-600)" : "var(--success-500)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: 600,
        color: "var(--neutral-900)",
      }}>
        {display}
      </div>
    </div>
  );
}

/* ---------- Status pill helper ---------- */
function heroStatusPillStyle(status: Task["status"]): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px var(--space-2)",
    borderRadius: "20px",
    background: status === "todo" ? "var(--status-todo-pill-bg)" : status === "in_progress" ? "var(--status-progress-pill-bg)" : "var(--status-done-pill-bg)",
    color: status === "todo" ? "var(--status-todo-pill-text)" : status === "in_progress" ? "var(--status-progress-pill-text)" : "var(--status-done-pill-text)",
    whiteSpace: "nowrap",
  };
}

/* ---------- Styles ---------- */
const containerStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "var(--space-8) var(--space-6) var(--space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
};

const heroCardStyle: React.CSSProperties = {
  border: "1px solid var(--neutral-200)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-8)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  boxShadow: "var(--shadow-md)",
};

const heroLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const heroIconRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

const heroDotStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const heroChannelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--neutral-500)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const heroIntentTagStyle = (tag: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  padding: "2px var(--space-2)",
  borderRadius: "4px",
  background: intentTagBg[tag] || "var(--neutral-100)",
  color: intentTagColors[tag] || "var(--neutral-600)",
});

const heroTitleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  color: "var(--neutral-900)",
  lineHeight: 1.3,
};

const microStepStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
  background: "var(--accent-50)",
  borderRadius: "var(--radius-md)",
};

const microStepDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--accent-500)",
  marginTop: 6,
  flexShrink: 0,
};

const microStepTextStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--accent-900)",
  lineHeight: 1.5,
  flex: 1,
};

const stepDoneBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "var(--accent-600)",
  color: "var(--neutral-0)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: 2,
};

const heroMetaRow: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-5)",
};

const heroMetaItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-1)",
  fontSize: 14,
  color: "var(--neutral-400)",
};

const startBtnStyle: React.CSSProperties = {
  marginTop: "var(--space-2)",
};

const stuckBtnStyle: React.CSSProperties = {
  marginTop: "var(--space-2)",
  flexShrink: 0,
};

const completeBtnStyle: React.CSSProperties = {
  marginTop: "var(--space-2)",
  flexShrink: 0,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-0)",
  textAlign: "left",
  transition: "border-color 0.2s",
  cursor: "pointer",
};

const rowDotStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const rowTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: "var(--neutral-900)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rowMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
  marginTop: 2,
};

const countsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-8)",
  paddingTop: "var(--space-4)",
  borderTop: "1px solid var(--neutral-200)",
};

const countClickableStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: 0,
};

const countDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
};

const countTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--neutral-400)",
};

// Done section
const doneSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const doneHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

const doneHeaderTextStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-600)",
};

const doneListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  maxHeight: 200,
  overflowY: "auto",
};

const doneCardStyle = (status: Task["status"]): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  background: statusBg(status),
  border: `1px solid ${statusBorder(status)}`,
});

const doneTitleStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 500,
  color: statusText(status),
  textDecoration: statusStrike(status),
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const emptyContainerStyle: React.CSSProperties = {
  minHeight: "60vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-4)",
  padding: "var(--space-8)",
};

const emptyIconWrap: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/* Stuck overlay styles */
const stuckOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(28, 25, 22, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-4)",
  zIndex: 200,
};

const stuckModalStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-lg)",
  width: "100%",
  maxWidth: 440,
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "var(--shadow-lg)",
};

const stuckHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "var(--space-6)",
  borderBottom: "1px solid var(--neutral-200)",
};

const stuckBodyStyle: React.CSSProperties = {
  padding: "var(--space-6)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
};

const reasonGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--space-3)",
};

const reasonBtnStyle: React.CSSProperties = {
  padding: "var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-300)",
  background: "var(--neutral-0)",
  color: "var(--neutral-700)",
  fontSize: 15,
  fontWeight: 500,
  transition: "all 0.2s",
  textAlign: "center",
};

const tinyStepStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
  padding: "var(--space-5)",
  background: "var(--accent-50)",
  borderRadius: "var(--radius-md)",
};

const tinyStepDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--accent-500)",
  marginTop: 6,
  flexShrink: 0,
};

const tinyStepTextStyle: React.CSSProperties = {
  fontSize: 16,
  color: "var(--accent-900)",
  lineHeight: 1.5,
};

const timerOptionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  justifyContent: "center",
};

const timerBtnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-5)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--accent-300)",
  background: "var(--accent-50)",
  color: "var(--accent-900)",
  fontSize: 16,
  fontWeight: 600,
  transition: "all 0.2s",
  flex: 1,
};
