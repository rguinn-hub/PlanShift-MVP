import { useState, useRef, useEffect } from "react";
import { X, Check, Clock, Circle, Timer, Split, Plus, Pencil, Undo2 } from "lucide-react";
import type { Task, MicroStep } from "../lib/types";
import { CHANNELS, INTENT_TAGS } from "../lib/types";
import { channelIcons, channelColors, intentTagColors, intentTagBg } from "../lib/channels";
import type { LucideIcon } from "lucide-react";

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const STATUS_OPTIONS: { value: Task["status"]; label: string; icon: typeof Clock }[] = [
  { value: "todo", label: "To do", icon: Circle },
  { value: "in_progress", label: "In progress", icon: Clock },
  { value: "done", label: "Done", icon: Check },
];

interface DeletedStep {
  step: MicroStep;
  index: number;
}

export default function TaskDetail({ task, onClose, onUpdate }: Props) {
  const [draftCopy, setDraftCopy] = useState(task.draft_copy || "");
  const [status, setStatus] = useState(task.status);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [splitText, setSplitText] = useState("");
  const [steps, setSteps] = useState<MicroStep[]>(task.micro_steps || []);

  const [metaEditing, setMetaEditing] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.due_date);
  const [editEstMinutes, setEditEstMinutes] = useState(task.est_minutes != null ? String(task.est_minutes) : "");
  const [editChannel, setEditChannel] = useState(task.channel);
  const [editIntentTag, setEditIntentTag] = useState(task.intent_tag || "");

  const [editError, setEditError] = useState<string | null>(null);

  const [deletedSteps, setDeletedSteps] = useState<DeletedStep[]>([]);

  const stepsRef = useRef<MicroStep[]>(steps);
  stepsRef.current = steps;
  const deletedStepsRef = useRef<DeletedStep[]>(deletedSteps);
  deletedStepsRef.current = deletedSteps;

  useEffect(() => {
    return () => {
      const currentDeleted = deletedStepsRef.current;
      if (currentDeleted.length > 0) {
        const currentSteps = stepsRef.current;
        onUpdate(task.id, { micro_steps: currentSteps });
      }
    };
  }, []);

  const Icon: LucideIcon = channelIcons[task.channel] || channelIcons["Website"];

  const handleSaveDraft = async () => {
    setSaving(true);
    onUpdate(task.id, { draft_copy: draftCopy });
    setEditing(false);
    setSaving(false);
  };

  const handleStatusChange = (newStatus: Task["status"]) => {
    setStatus(newStatus);
    onUpdate(task.id, { status: newStatus });
  };

  const handleSaveMeta = () => {
    setEditError(null);

    if (!editTitle.trim()) {
      setEditError("Task title is required.");
      return;
    }

    const parsedMinutes = editEstMinutes.trim() === "" ? null : Number.parseInt(editEstMinutes, 10);
    if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes <= 0)) {
      setEditError("Time estimate must be a positive whole number, or left blank.");
      return;
    }

    setMetaSaving(true);
    const updates: Partial<Task> = {
      title: editTitle.trim(),
      due_date: editDueDate,
      est_minutes: parsedMinutes,
      channel: editChannel,
      intent_tag: editIntentTag.trim() || null,
    };
    onUpdate(task.id, updates);
    setMetaEditing(false);
    setMetaSaving(false);
  };

  const handleCancelMeta = () => {
    setEditTitle(task.title);
    setEditDueDate(task.due_date);
    setEditEstMinutes(task.est_minutes != null ? String(task.est_minutes) : "");
    setEditChannel(task.channel);
    setEditIntentTag(task.intent_tag || "");
    setEditError(null);
    setMetaEditing(false);
  };

  const handleSplit = () => {
    const lines = splitText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ text: l, done: false }));
    const newSteps = [...steps, ...lines];
    setSteps(newSteps);
    onUpdate(task.id, { micro_steps: newSteps });
    setSplitText("");
    setShowSplit(false);
  };

  const handleToggleStep = (index: number) => {
    const step = steps[index];
    if (!step) return;
    const isNowDone = !step.done;
    const newSteps = steps.map((s, i) =>
      i === index ? { ...s, done: isNowDone } : s
    );
    setSteps(newSteps);
    onUpdate(task.id, { micro_steps: newSteps });

    if (isNowDone && status === "todo") {
      setStatus("in_progress");
      onUpdate(task.id, { status: "in_progress", micro_steps: newSteps });
    }
  };

  const handleDeleteStep = (index: number) => {
    const deletedStep = steps[index];
    if (!deletedStep) return;

    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    setDeletedSteps((prev) => [...prev, { step: deletedStep, index }]);
  };

  const handleUndoDelete = (deletedIndex: number) => {
    const deleted = deletedSteps[deletedIndex];
    if (!deleted) return;

    const restoredSteps = [...steps];
    restoredSteps.splice(deleted.index, 0, deleted.step);
    setSteps(restoredSteps);
    setDeletedSteps((prev) => prev.filter((_, i) => i !== deletedIndex));
  };

  const dueDate = new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
            <div style={{ ...iconDotStyle, background: channelColors[task.channel] || "var(--neutral-400)" }}>
              <Icon size={18} color="var(--neutral-0)" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {metaEditing ? (
                <div style={metaEditFormStyle}>
                  <div>
                    <label style={fieldLabelStyle}>Task title</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div style={metaFieldRowStyle}>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabelStyle}>Due date</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabelStyle}>Time estimate (min)</label>
                      <input
                        type="number"
                        min="1"
                        value={editEstMinutes}
                        onChange={(e) => setEditEstMinutes(e.target.value)}
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                  <div style={metaFieldRowStyle}>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabelStyle}>Channel</label>
                      <select value={editChannel} onChange={(e) => setEditChannel(e.target.value)}>
                        {CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabelStyle}>Intent tag</label>
                      <select value={editIntentTag} onChange={(e) => setEditIntentTag(e.target.value)}>
                        <option value="">None</option>
                        {INTENT_TAGS.map((tag) => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editError && <div style={editErrorStyle}>{editError}</div>}
                  <div style={metaEditActionsStyle}>
                    <button className="btn btn-primary" type="button" onClick={handleSaveMeta} disabled={metaSaving}>
                      {metaSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={handleCancelMeta} disabled={metaSaving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={metaRowStyle}>
                    <span style={metaTextStyle}>{task.channel}</span>
                    <span style={metaSepStyle}>&middot;</span>
                    <span style={metaTextStyle}>{dueDate}</span>
                    {task.est_minutes != null && (
                      <>
                        <span style={metaSepStyle}>&middot;</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", color: "var(--neutral-400)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <Timer size={12} />
                          {task.est_minutes} min
                        </span>
                      </>
                    )}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--neutral-900)" }}>
                    {task.title}
                  </h2>
                  {task.intent_tag && (
                    <span style={intentTagStyle(task.intent_tag)}>
                      {task.intent_tag}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          {!metaEditing && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", flexShrink: 0 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setMetaEditing(true)}
                style={{ padding: "var(--space-2)", color: "var(--neutral-500)" }}
                aria-label="Edit task details"
                title="Edit task details"
              >
                <Pencil size={16} />
              </button>
              <button className="btn btn-ghost" onClick={onClose} style={{ padding: "var(--space-2)" }} aria-label="Close">
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        <div style={modalBodyStyle}>
          {steps.length > 0 && (
            <div>
              <label>Micro-steps</label>
              <div style={stepsListStyle}>
                {steps.map((step, i) => (
                  <div key={i} style={stepRowStyle}>
                    <button
                      style={stepCheckboxStyle(step.done)}
                      onClick={() => handleToggleStep(i)}
                    >
                      {step.done && <Check size={14} color="var(--neutral-0)" />}
                    </button>
                    <span style={stepTextStyle(step.done)}>{step.text}</span>
                    <button
                      style={stepDeleteBtnStyle}
                      onClick={() => handleDeleteStep(i)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {deletedSteps.map((deleted, di) => (
                  <div key={`del-${di}`} style={deletedRowStyle}>
                    <span style={deletedTextStyle}>Step deleted</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "var(--space-1) var(--space-2)", fontSize: 13, color: "var(--accent-700)", fontWeight: 600 }}
                      onClick={() => handleUndoDelete(di)}
                    >
                      <Undo2 size={14} />
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showSplit ? (
            <button
              className="btn btn-secondary"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setShowSplit(true)}
            >
              <Split size={16} />
              Split into steps
            </button>
          ) : (
            <div style={splitBoxStyle}>
              <label>Add micro-steps (one per line)</label>
              <textarea
                value={splitText}
                onChange={(e) => setSplitText(e.target.value)}
                placeholder={"e.g.\nOpen the draft copy\nWrite the first sentence\nPick a photo"}
                style={{ minHeight: 100 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button className="btn btn-primary" onClick={handleSplit} disabled={!splitText.trim()}>
                  <Plus size={16} />
                  Add steps
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowSplit(false); setSplitText(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div>
            <label>Status</label>
            <div style={statusRowStyle}>
              {STATUS_OPTIONS.map((opt) => {
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    style={status === opt.value ? statusBtnActive : statusBtn}
                  >
                    <OptIcon size={16} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <label style={{ margin: 0 }}>Draft copy</label>
              {!editing && (
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: "var(--space-1) var(--space-2)" }} onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <textarea
                  value={draftCopy}
                  onChange={(e) => setDraftCopy(e.target.value)}
                  style={{ minHeight: 140 }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-primary" onClick={handleSaveDraft} disabled={saving}>
                    {saving ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setEditing(false); setDraftCopy(task.draft_copy || ""); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={draftBoxStyle}>
                {draftCopy || "No draft yet. Click Edit to add your copy."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(28, 25, 22, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-4)",
  zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-lg)",
  width: "100%",
  maxWidth: 560,
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "var(--shadow-lg)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "var(--space-6)",
  borderBottom: "1px solid var(--neutral-200)",
  gap: "var(--space-3)",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  marginBottom: "var(--space-1)",
};

const metaTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const metaSepStyle: React.CSSProperties = {
  color: "var(--neutral-300)",
  fontSize: 12,
};

const intentTagStyle = (tag: string): React.CSSProperties => ({
  display: "inline-block",
  marginTop: "var(--space-2)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  padding: "2px var(--space-2)",
  borderRadius: "4px",
  background: intentTagBg[tag] || "var(--neutral-100)",
  color: intentTagColors[tag] || "var(--neutral-600)",
});

const modalBodyStyle: React.CSSProperties = {
  padding: "var(--space-6)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
};

const iconDotStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const metaEditFormStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};

const metaFieldRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--neutral-500)",
  marginBottom: "var(--space-1)",
};

const metaEditActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  marginTop: "var(--space-1)",
};

const editErrorStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--error-600)",
  background: "var(--error-50)",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
};

const stepsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const stepRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  background: "var(--neutral-50)",
  border: "1px solid var(--neutral-200)",
};

const stepCheckboxStyle = (done: boolean): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: "6px",
  border: done ? "none" : "1.5px solid var(--neutral-300)",
  background: done ? "var(--accent-600)" : "var(--neutral-0)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.2s",
});

const stepTextStyle = (done: boolean): React.CSSProperties => ({
  flex: 1,
  fontSize: 14,
  color: done ? "var(--neutral-400)" : "var(--neutral-800)",
  textDecoration: done ? "line-through" : "none",
});

const stepDeleteBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "6px",
  color: "var(--neutral-400)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "color 0.2s",
};

const splitBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-50)",
};

const statusRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
};

const statusBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--neutral-300)",
  background: "var(--neutral-0)",
  color: "var(--neutral-600)",
  fontSize: 14,
  fontWeight: 500,
  transition: "all 0.2s",
};

const statusBtnActive: React.CSSProperties = {
  ...statusBtn,
  border: "1px solid var(--accent-500)",
  background: "var(--accent-50)",
  color: "var(--accent-700)",
};

const draftBoxStyle: React.CSSProperties = {
  background: "var(--neutral-50)",
  border: "1px solid var(--neutral-200)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-4)",
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--neutral-700)",
  whiteSpace: "pre-wrap",
};

const deletedRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  background: "var(--neutral-100)",
  border: "1px dashed var(--neutral-300)",
  opacity: 0.7,
};

const deletedTextStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  fontStyle: "italic",
  color: "var(--neutral-400)",
};
