import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Check,
  X,
  Calendar as CalendarIcon,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Campaign, Task, Note } from "../lib/types";
import { channelIcons, channelColors } from "../lib/channels";
import type { LucideIcon } from "lucide-react";

interface Props {
  userId: string;
  campaigns: Campaign[];
  onOpenCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
  onLoadDemo: () => void;
  onTaskClick: (task: Task) => void;
  tasksByCampaign: Record<string, Task[]>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sameDay(a: string, b: Date): boolean {
  return a === dateKey(b);
}

export default function HomeDashboard({
  userId,
  campaigns,
  onOpenCampaign,
  onCreateCampaign,
  onLoadDemo,
  onTaskClick,
  tasksByCampaign,
}: Props) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Load notes for authenticated user
  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load notes:", error.message);
      return;
    }
    setNotes((data as Note[]) || []);
  }, [userId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // All tasks across the user's campaigns
  const allTasks = useMemo(() => {
    return Object.values(tasksByCampaign).flat();
  }, [tasksByCampaign]);

  // Tasks due on the selected calendar date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return allTasks.filter((t) => sameDay(t.due_date, selectedDate));
  }, [allTasks, selectedDate]);

  // Today's to-dos
  const todayTasks = useMemo(() => {
    const today = new Date();
    return allTasks.filter((t) => sameDay(t.due_date, today) && t.status !== "done");
  }, [allTasks]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter((t) => {
      const due = new Date(t.due_date + "T00:00:00");
      return due < today && t.status !== "done";
    });
  }, [allTasks]);

  // Upcoming and launched campaigns
  const { upcoming, launched } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: Campaign[] = [];
    const launched: Campaign[] = [];
    for (const c of campaigns) {
      const start = new Date(c.start_date + "T00:00:00");
      if (start > today) {
        upcoming.push(c);
      } else {
        launched.push(c);
      }
    }
    return { upcoming, launched };
  }, [campaigns]);

  // Calendar grid for the displayed month
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < remaining; i++) cells.push(null);

    return cells;
  }, [calMonth]);

  // Tasks per day for the displayed month (for the mini calendar dots)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of allTasks) {
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    }
    return map;
  }, [allTasks]);

  // Large campaign calendar — next 35 days from start of current month
  const campaignCalendarDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
    const cells: { date: Date; tasks: Task[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      cells.push({ date: d, tasks: tasksByDate[key] || [] });
    }
    return cells;
  }, [tasksByDate]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: userId, content: noteText.trim() })
      .select()
      .single();
    setNoteSaving(false);
    if (error) {
      setNoteError("Failed to save note. Please try again.");
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
    setNoteText("");
  };

  const handleUpdateNote = async (id: string) => {
    if (!editingNoteText.trim()) return;
    setNoteSaving(true);
    const { data, error } = await supabase
      .from("notes")
      .update({ content: editingNoteText.trim(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    setNoteSaving(false);
    if (error) {
      setNoteError("Failed to update note.");
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? (data as Note) : n)));
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      setNoteError("Failed to delete note.");
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const prevMonth = () => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasNoCampaigns = campaigns.length === 0;

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 1400, margin: "0 auto" }}>
      {/* Welcome + Create */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--neutral-900)", marginBottom: "var(--space-1)" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 16, color: "var(--neutral-500)" }}>
            Here's what's happening with your campaigns.
          </p>
        </div>
        <button className="btn btn-primary btn-large" onClick={onCreateCampaign}>
          <Plus size={18} />
          Create Campaign
        </button>
      </div>

      {/* Empty state for new users */}
      {hasNoCampaigns ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>
            <CalendarIcon size={32} color="var(--accent-600)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--neutral-900)", marginBottom: "var(--space-2)" }}>
            Create Your First Campaign
          </h2>
          <p style={{ fontSize: 15, color: "var(--neutral-500)", marginBottom: "var(--space-6)", maxWidth: 400, textAlign: "center" }}>
            Plan your next marketing campaign with AI-generated tasks, a phase calendar, and focus mode.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary btn-large" onClick={onCreateCampaign}>
              <Plus size={18} />
              Create Campaign
            </button>
            <button className="btn btn-secondary btn-large" onClick={onLoadDemo}>
              <Sparkles size={18} />
              Load demo campaign
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid" style={dashboardGridStyle}>
          {/* LEFT COLUMN */}
          <div style={leftColStyle}>
            {/* Mini Calendar */}
            <div style={cardStyle}>
              <div style={calHeaderStyle}>
                <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: "var(--space-1)" }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={calTitleStyle}>
                  {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                </span>
                <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: "var(--space-1)" }}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div style={calGridStyle}>
                {WEEKDAYS.map((d) => (
                  <div key={d} style={calWeekdayStyle}>{d}</div>
                ))}
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const key = dateKey(d);
                  const dayTasks = tasksByDate[key] || [];
                  const isToday = sameDay(dateKey(today), d);
                  const isSelected = selectedDate && sameDay(dateKey(selectedDate), d);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(d)}
                      style={isSelected ? calDayActiveStyle : isToday ? calDayTodayStyle : calDayStyle}
                    >
                      <span>{d.getDate()}</span>
                      {dayTasks.length > 0 && (
                        <div style={calDotStyle(dayTasks.length)} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Today's To-Dos */}
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Today's To-Dos</h3>
              {todayTasks.length === 0 ? (
                <p style={emptyTextStyle}>Nothing due today. You're all caught up.</p>
              ) : (
                <div style={taskListStyle}>
                  {todayTasks.map((t) => {
                    const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
                    const campaign = campaigns.find((c) => c.id === t.campaign_id);
                    return (
                      <button key={t.id} style={taskRowStyle} onClick={() => onTaskClick(t)}>
                        <div style={{ ...taskDotStyle, background: channelColors[t.channel] || "var(--neutral-400)" }}>
                          <Icon size={12} color="var(--neutral-0)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={taskTitleTextStyle}>{t.title}</div>
                          {campaign && <div style={taskCampaignStyle}>{campaign.business_name}</div>}
                        </div>
                        <ArrowRight size={14} color="var(--neutral-400)" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                  <AlertCircle size={18} color="var(--error-500)" />
                  <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Overdue ({overdueTasks.length})</h3>
                </div>
                <div style={taskListStyle}>
                  {overdueTasks.map((t) => {
                    const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
                    const campaign = campaigns.find((c) => c.id === t.campaign_id);
                    return (
                      <button key={t.id} style={{ ...taskRowStyle, borderLeft: "3px solid var(--error-500)" }} onClick={() => onTaskClick(t)}>
                        <div style={{ ...taskDotStyle, background: channelColors[t.channel] || "var(--neutral-400)" }}>
                          <Icon size={12} color="var(--neutral-0)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={taskTitleTextStyle}>{t.title}</div>
                          {campaign && <div style={taskCampaignStyle}>{campaign.business_name}</div>}
                        </div>
                        <span style={overdueDateStyle}>
                          {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected date tasks */}
            {selectedDate && (
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                  {sameDay(dateKey(today), selectedDate) ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {selectedDateTasks.length === 0 ? (
                  <p style={emptyTextStyle}>No tasks scheduled for this date.</p>
                ) : (
                  <div style={taskListStyle}>
                    {selectedDateTasks.map((t) => {
                      const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
                      const campaign = campaigns.find((c) => c.id === t.campaign_id);
                      return (
                        <button key={t.id} style={taskRowStyle} onClick={() => onTaskClick(t)}>
                          <div style={{ ...taskDotStyle, background: channelColors[t.channel] || "var(--neutral-400)" }}>
                            <Icon size={12} color="var(--neutral-0)" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={taskTitleTextStyle}>{t.title}</div>
                            {campaign && <div style={taskCampaignStyle}>{campaign.business_name}</div>}
                          </div>
                          <ArrowRight size={14} color="var(--neutral-400)" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MAIN AREA */}
          <div style={mainColStyle}>
            {/* Upcoming Campaigns */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: "var(--space-8)" }}>
                <h2 style={sectionHeaderStyle}>Upcoming Campaigns</h2>
                <div className="campaign-card-grid" style={campaignGridStyle}>
                  {upcoming.map((c) => (
                    <CampaignCard key={c.id} campaign={c} tasks={tasksByCampaign[c.id] || []} onOpen={() => onOpenCampaign(c)} />
                  ))}
                </div>
              </div>
            )}

            {/* Launched Campaigns */}
            <div style={{ marginBottom: "var(--space-8)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                <h2 style={sectionHeaderStyle}>Launched Campaigns</h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--neutral-400)", marginBottom: "var(--space-4)" }}>
                "Launched" means the planned start date has arrived — not that content was automatically published.
              </p>
              {launched.length === 0 ? (
                <p style={emptyTextStyle}>No campaigns have started yet.</p>
              ) : (
                <div className="campaign-card-grid" style={campaignGridStyle}>
                  {launched.map((c) => (
                    <CampaignCard key={c.id} campaign={c} tasks={tasksByCampaign[c.id] || []} onOpen={() => onOpenCampaign(c)} />
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Calendar */}
            <div style={cardStyle}>
              <h2 style={{ ...sectionHeaderStyle, marginBottom: "var(--space-4)" }}>Campaign Calendar</h2>
              <div style={bigCalGridStyle}>
                {WEEKDAYS.map((d) => (
                  <div key={d} style={bigCalWeekdayStyle}>{d}</div>
                ))}
                {campaignCalendarDays.map((cell) => {
                  const key = dateKey(cell.date);
                  const isToday = sameDay(dateKey(today), cell.date);
                  return (
                    <div key={key} style={isToday ? bigCalDayTodayStyle : bigCalDayStyle}>
                      <div style={bigCalDayNumStyle}>{cell.date.getDate()}</div>
                      {cell.tasks.slice(0, 3).map((t) => {
                        const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
                        const campaign = campaigns.find((c) => c.id === t.campaign_id);
                        return (
                          <button
                            key={t.id}
                            style={bigCalTaskStyle}
                            onClick={() => onTaskClick(t)}
                            title={`${t.title}${campaign ? " — " + campaign.business_name : ""}`}
                          >
                            <Icon size={10} color="var(--neutral-0)" style={{ flexShrink: 0 }} />
                            <span style={bigCalTaskTextStyle}>{t.title}</span>
                          </button>
                        );
                      })}
                      {cell.tasks.length > 3 && (
                        <div style={bigCalMoreStyle}>+{cell.tasks.length - 3} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Quick Notes */}
          <div style={rightColStyle}>
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Quick Notes</h3>
              {noteError && (
                <div style={noteErrorStyle}>{noteError}</div>
              )}
              <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note..."
                  style={{ minHeight: 60, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAddNote();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddNote}
                  disabled={noteSaving || !noteText.trim()}
                  style={{ alignSelf: "flex-end" }}
                >
                  <Plus size={16} />
                </button>
              </div>
              {notes.length === 0 ? (
                <p style={emptyTextStyle}>No notes yet. Jot something down to save it to your account.</p>
              ) : (
                <div style={noteListStyle}>
                  {notes.map((n) => (
                    <div key={n.id} style={noteItemStyle}>
                      {editingNoteId === n.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            style={{ minHeight: 50 }}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            <button className="btn btn-primary" style={{ padding: "var(--space-1) var(--space-3)", fontSize: 13 }} onClick={() => handleUpdateNote(n.id)} disabled={noteSaving}>
                              <Check size={14} />
                              Save
                            </button>
                            <button className="btn btn-secondary" style={{ padding: "var(--space-1) var(--space-3)", fontSize: 13 }} onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={noteTextStyle}>{n.content}</p>
                          <div style={noteActionsStyle}>
                            <button className="btn btn-ghost" style={{ padding: "var(--space-1)", }} onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.content); }} aria-label="Edit note">
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "var(--space-1)", color: "var(--error-500)" }} onClick={() => handleDeleteNote(n.id)} aria-label="Delete note">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, tasks, onOpen }: { campaign: Campaign; tasks: Task[]; onOpen: () => void }) {
  const completed = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const startDate = new Date(campaign.start_date + "T00:00:00");
  const endDate = new Date(startDate.getTime() + campaign.duration_days * 86400000);

  return (
    <div style={campaignCardStyle}>
      <div style={{ marginBottom: "var(--space-3)" }}>
        <h3 style={campaignCardTitleStyle}>{campaign.business_name}</h3>
        <p style={campaignCardGoalStyle}>{campaign.goal}</p>
      </div>
      <div style={campaignCardMetaStyle}>
        <div style={campaignCardDatesStyle}>
          {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" — "}
          {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <div style={channelListStyle}>
          {campaign.channels.map((ch) => {
            const Icon: LucideIcon = channelIcons[ch];
            if (!Icon) return null;
            return (
              <div key={ch} style={channelChipStyle} title={ch}>
                <Icon size={12} />
              </div>
            );
          })}
          <span style={channelCountStyle}>
            {campaign.channels.length} Selected {campaign.channels.length === 1 ? "channel" : "channels"}
          </span>
        </div>
      </div>
      <div style={progressBarOuterStyle}>
        <div style={{ ...progressBarInnerStyle, width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
      </div>
      <div style={progressTextStyle}>
        {completed}/{total} tasks completed
      </div>
      <button className="btn btn-primary" style={{ width: "100%", marginTop: "var(--space-3)" }} onClick={onOpen}>
        Open
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// --- Styles ---

const dashboardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px 1fr 300px",
  gap: "var(--space-6)",
  alignItems: "start",
};

const leftColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
};

const mainColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const rightColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-200)",
  boxShadow: "var(--shadow-sm)",
  padding: "var(--space-5)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "var(--neutral-900)",
  marginBottom: "var(--space-3)",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "var(--neutral-900)",
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--neutral-400)",
  lineHeight: 1.5,
};

// Mini calendar
const calHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--space-3)",
};

const calTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-800)",
};

const calGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "2px",
};

const calWeekdayStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--neutral-400)",
  textAlign: "center",
  padding: "var(--space-1) 0",
};

const calDayStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-1)",
  borderRadius: "var(--radius-sm)",
  fontSize: 13,
  color: "var(--neutral-700)",
  cursor: "pointer",
  minHeight: 32,
  position: "relative",
  border: "none",
  background: "transparent",
};

const calDayTodayStyle: React.CSSProperties = {
  ...calDayStyle,
  fontWeight: 700,
  color: "var(--accent-700)",
  background: "var(--accent-50)",
};

const calDayActiveStyle: React.CSSProperties = {
  ...calDayStyle,
  background: "var(--accent-600)",
  color: "var(--neutral-0)",
  fontWeight: 600,
};

const calDotStyle = (count: number): React.CSSProperties => ({
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: count > 2 ? "var(--error-500)" : "var(--accent-500)",
  marginTop: 2,
});

// Task rows
const taskListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const taskRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-50)",
  cursor: "pointer",
  textAlign: "left",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const taskDotStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const taskTitleTextStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--neutral-800)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const taskCampaignStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const overdueDateStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--error-500)",
  fontWeight: 500,
  flexShrink: 0,
};

// Campaign cards
const campaignGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "var(--space-4)",
};

const campaignCardStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-200)",
  boxShadow: "var(--shadow-sm)",
  padding: "var(--space-5)",
  display: "flex",
  flexDirection: "column",
};

const campaignCardTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 600,
  color: "var(--neutral-900)",
  marginBottom: "var(--space-1)",
};

const campaignCardGoalStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-500)",
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const campaignCardMetaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  marginBottom: "var(--space-3)",
};

const campaignCardDatesStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-500)",
  fontWeight: 500,
};

const channelListStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-1)",
  flexWrap: "wrap",
};

const channelChipStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "var(--neutral-100)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--neutral-600)",
};

const channelCountStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  fontWeight: 500,
};

const progressBarOuterStyle: React.CSSProperties = {
  height: 6,
  borderRadius: "3px",
  background: "var(--neutral-100)",
  overflow: "hidden",
};

const progressBarInnerStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "3px",
  background: "var(--accent-500)",
  transition: "width 0.3s ease",
};

const progressTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  marginTop: "var(--space-1)",
};

// Big campaign calendar
const bigCalGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "1px",
  background: "var(--neutral-200)",
  borderRadius: "var(--radius-sm)",
  overflow: "hidden",
};

const bigCalWeekdayStyle: React.CSSProperties = {
  background: "var(--neutral-50)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--neutral-400)",
  textAlign: "center",
  padding: "var(--space-2) 0",
};

const bigCalDayStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  minHeight: 80,
  padding: "var(--space-1)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflow: "hidden",
};

const bigCalDayTodayStyle: React.CSSProperties = {
  ...bigCalDayStyle,
  background: "var(--accent-50)",
};

const bigCalDayNumStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--neutral-500)",
  marginBottom: 2,
};

const bigCalTaskStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "3px",
  padding: "2px 4px",
  borderRadius: "4px",
  background: "var(--neutral-100)",
  fontSize: 10,
  color: "var(--neutral-700)",
  cursor: "pointer",
  border: "none",
  textAlign: "left",
  overflow: "hidden",
};

const bigCalTaskTextStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const bigCalMoreStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--neutral-400)",
  padding: "0 4px",
};

// Notes
const noteListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const noteItemStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-50)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "var(--space-2)",
};

const noteTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--neutral-800)",
  lineHeight: 1.5,
  flex: 1,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const noteActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-1)",
  flexShrink: 0,
};

const noteErrorStyle: React.CSSProperties = {
  background: "var(--error-50)",
  color: "var(--error-600)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-2) var(--space-3)",
  fontSize: 13,
  marginBottom: "var(--space-3)",
};

// Empty state
const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-12) var(--space-6)",
  textAlign: "center",
};

const emptyIconStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "var(--accent-50)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "var(--space-5)",
};
