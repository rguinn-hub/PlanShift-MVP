import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  X,
  Calendar as CalendarIcon,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Bell,
  StickyNote,
  Clock,
  User,
  MapPin,
  FileText,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Campaign, Task, Note, CalendarItem, CampaignPhase, ReminderOffset } from "../lib/types";
import { PHASES, REMINDER_OPTIONS } from "../lib/types";
import { channelIcons, channelColors } from "../lib/channels";
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
import CalendarAddModal, { type AddItemType } from "../components/CalendarAddModal";
import { useReminders } from "../lib/useReminders";

type ViewMode = "daily" | "weekly" | "monthly";

interface Props {
  userId: string;
  demoMode: boolean;
  campaigns: Campaign[];
  onOpenCampaign: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
  onLoadDemo: () => void;
  onTaskClick: (task: Task) => void;
  tasksByCampaign: Record<string, Task[]>;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskCreate: (task: Omit<Task, "id" | "created_at">) => Promise<Task | null>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: string, b: Date): boolean {
  return a === dateKey(b);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function getPhaseForDate(campaign: Campaign, date: Date): CampaignPhase | null {
  const start = new Date(campaign.start_date + "T00:00:00");
  const end = addDays(start, campaign.duration_days);
  if (date < start || date >= end) return null;
  const totalMs = campaign.duration_days * 86400000;
  const pct = (date.getTime() - start.getTime()) / totalMs;
  for (const p of PHASES) {
    if (pct >= p.startPct && pct < p.endPct) return p.name;
  }
  return null;
}

export default function HomeDashboard({
  userId,
  demoMode,
  campaigns,
  onOpenCampaign,
  onCreateCampaign,
  onLoadDemo,
  onTaskClick,
  tasksByCampaign,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
}: Props) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [launchedOpen, setLaunchedOpen] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
  const [addItemType, setAddItemType] = useState<AddItemType | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [showItemTypePicker, setShowItemTypePicker] = useState(false);

  const loadNotes = useCallback(async () => {
    if (demoMode) {
      const stored = localStorage.getItem("planshift-demo-notes");
      if (stored) {
        try { setNotes(JSON.parse(stored)); } catch { setNotes([]); }
      }
      return;
    }
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
  }, [userId, demoMode]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const { activeReminders, dismissReminder } = useReminders(userId, demoMode);

  const loadCalendarItems = useCallback(async () => {
    if (demoMode) {
      const stored = localStorage.getItem("planshift-demo-calendar-items");
      if (stored) {
        try { setCalendarItems(JSON.parse(stored)); } catch { setCalendarItems([]); }
      }
      return;
    }
    const { data, error } = await supabase
      .from("calendar_items")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });
    if (error) {
      console.error("Failed to load calendar items:", error.message);
      return;
    }
    setCalendarItems((data as CalendarItem[]) || []);
  }, [userId, demoMode]);

  useEffect(() => {
    loadCalendarItems();
  }, [loadCalendarItems]);

  const allTasks = useMemo(() => {
    return Object.values(tasksByCampaign).flat();
  }, [tasksByCampaign]);

  const filteredTasks = useMemo(() => {
    if (campaignFilter === "all") return allTasks;
    return allTasks.filter((t) => t.campaign_id === campaignFilter);
  }, [allTasks, campaignFilter]);

  const todayTasks = useMemo(() => {
    const today = new Date();
    return allTasks.filter((t) => sameDay(t.due_date, today) && t.status !== "done");
  }, [allTasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter((t) => {
      const due = new Date(t.due_date + "T00:00:00");
      return due < today && t.status !== "done";
    });
  }, [allTasks]);

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

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    }
    return map;
  }, [filteredTasks]);

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

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    if (demoMode) {
      const newNote: Note = {
        id: crypto.randomUUID(),
        user_id: "demo-user",
        content: noteText.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scheduled_date: null,
        scheduled_time: null,
        reminder_offset: null,
      };
      const updated = [newNote, ...notes];
      setNotes(updated);
      localStorage.setItem("planshift-demo-notes", JSON.stringify(updated));
      setNoteSaving(false);
      setNoteText("");
      return;
    }
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
    setNoteError(null);
    if (demoMode) {
      const updated = notes.map((n) =>
        n.id === id ? { ...n, content: editingNoteText.trim(), updated_at: new Date().toISOString() } : n
      );
      setNotes(updated);
      localStorage.setItem("planshift-demo-notes", JSON.stringify(updated));
      setNoteSaving(false);
      setEditingNoteId(null);
      setEditingNoteText("");
      return;
    }
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
    setNoteError(null);
    if (demoMode) {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      localStorage.setItem("planshift-demo-notes", JSON.stringify(updated));
      return;
    }
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      setNoteError("Failed to delete note.");
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const prevMonth = () => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const goPrev = () => {
    if (viewMode === "daily") setSelectedDate((d) => addDays(d, -1));
    else if (viewMode === "weekly") setSelectedDate((d) => addDays(d, -7));
    else setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNext = () => {
    if (viewMode === "daily") setSelectedDate((d) => addDays(d, 1));
    else if (viewMode === "weekly") setSelectedDate((d) => addDays(d, 7));
    else setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const rangeLabel = useMemo(() => {
    if (viewMode === "daily") {
      return selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (viewMode === "weekly") {
      const start = startOfWeek(selectedDate);
      const end = addDays(start, 6);
      const sStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const eStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${sStr} — ${eStr}`;
    }
    return `${MONTHS[calMonth.getMonth()]} ${calMonth.getFullYear()}`;
  }, [viewMode, selectedDate, calMonth]);

  const handleDaySelect = (d: Date) => {
    setSelectedDate(d);
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const handleSwitchToDaily = (d: Date) => {
    handleDaySelect(d);
    setViewMode("daily");
  };

  const openAddTask = (date: Date) => {
    setAddTaskDate(date);
    setShowItemTypePicker(true);
    setAddTaskError(null);
  };

  const handleItemTypeSelect = (type: AddItemType) => {
    setShowItemTypePicker(false);
    setAddItemType(type);
    setShowAddTask(true);
  };

  const handleGeneralItemCreate = async (item: {
    item_type: "general_task" | "appointment";
    title: string;
    description: string | null;
    due_date: string;
    start_time: string | null;
    end_time: string | null;
    all_day: boolean;
    location: string | null;
    meeting_link: string | null;
  }): Promise<boolean> => {
    if (demoMode) {
      const newItem: CalendarItem = {
        id: crypto.randomUUID(),
        user_id: "demo-user",
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        due_date: item.due_date,
        start_time: item.start_time,
        end_time: item.end_time,
        all_day: item.all_day,
        location: item.location,
        meeting_link: item.meeting_link,
        status: "todo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [...calendarItems, newItem];
      setCalendarItems(updated);
      localStorage.setItem("planshift-demo-calendar-items", JSON.stringify(updated));
      return true;
    }
    const { data, error } = await supabase
      .from("calendar_items")
      .insert({ ...item, user_id: userId })
      .select()
      .single();
    if (error) {
      console.error("Failed to create calendar item:", error.message);
      return false;
    }
    setCalendarItems((prev) => [...prev, data as CalendarItem]);
    return true;
  };

  const handleNoteCreate = async (
    content: string,
    scheduledDate: string,
    scheduledTime: string | null,
    reminderOffset: ReminderOffset
  ): Promise<boolean> => {
    if (demoMode) {
      const newNote: Note = {
        id: crypto.randomUUID(),
        user_id: "demo-user",
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reminder_offset: reminderOffset,
      };
      const updated = [newNote, ...notes];
      setNotes(updated);
      localStorage.setItem("planshift-demo-notes", JSON.stringify(updated));
      return true;
    }
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        content,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reminder_offset: reminderOffset,
      })
      .select()
      .single();
    if (error) {
      console.error("Failed to create note:", error.message);
      return false;
    }
    setNotes((prev) => [data as Note, ...prev]);
    return true;
  };

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 1400, margin: "0 auto" }}>
      {/* Welcome + Create */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
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
                const isSelected = sameDay(dateKey(selectedDate), d);
                return (
                  <button
                    key={key}
                    onClick={() => handleDaySelect(d)}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
              <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Today's To-Dos</h3>
              <button className="btn btn-ghost" style={{ padding: "var(--space-1) var(--space-2)", fontSize: 13 }} onClick={() => openAddTask(new Date())}>
                <Plus size={14} />
                Add
              </button>
            </div>
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

          {/* Upcoming Campaigns Accordion */}
          {upcoming.length > 0 && (
            <div style={cardStyle}>
              <button
                onClick={() => setUpcomingOpen((v) => !v)}
                style={accordionHeaderStyle}
              >
                <ChevronDown size={16} color="var(--neutral-700)" style={{ transform: upcomingOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                <span style={accordionTitleStyle}>Upcoming ({upcoming.length})</span>
              </button>
              {upcomingOpen && (
                <div style={accordionListStyle}>
                  {upcoming.map((c) => (
                    <CompactCampaignRow
                      key={c.id}
                      campaign={c}
                      tasks={tasksByCampaign[c.id] || []}
                      onOpen={() => onOpenCampaign(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Launched Campaigns Accordion */}
          <div style={cardStyle}>
            <button
              onClick={() => setLaunchedOpen((v) => !v)}
              style={accordionHeaderStyle}
            >
              <ChevronDown size={16} color="var(--neutral-700)" style={{ transform: launchedOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
              <span style={accordionTitleStyle}>Launched ({launched.length})</span>
            </button>
            {launchedOpen && (
              <div style={accordionListStyle}>
                {launched.length === 0 ? (
                  <p style={emptyTextStyle}>No campaigns have started yet.</p>
                ) : (
                  launched.map((c) => (
                    <CompactCampaignRow
                      key={c.id}
                      campaign={c}
                      tasks={tasksByCampaign[c.id] || []}
                      onOpen={() => onOpenCampaign(c)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAIN AREA — Calendar */}
        <div style={mainColStyle}>
          <div style={cardStyle}>
            {/* View mode toggle + controls */}
            <div style={calToolbarStyle}>
              <div style={viewToggleStyle}>
                <button
                  className="btn"
                  style={viewMode === "daily" ? viewBtnActive : viewBtnStyle}
                  onClick={() => setViewMode("daily")}
                >
                  Daily
                </button>
                <button
                  className="btn"
                  style={viewMode === "weekly" ? viewBtnActive : viewBtnStyle}
                  onClick={() => setViewMode("weekly")}
                >
                  Weekly
                </button>
                <button
                  className="btn"
                  style={viewMode === "monthly" ? viewBtnActive : viewBtnStyle}
                  onClick={() => setViewMode("monthly")}
                >
                  Monthly
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <button className="btn btn-ghost" style={{ padding: "var(--space-1)" }} onClick={goPrev}>
                  <ChevronLeft size={18} />
                </button>
                <span style={rangeLabelStyle}>{rangeLabel}</span>
                <button className="btn btn-ghost" style={{ padding: "var(--space-1)" }} onClick={goNext}>
                  <ChevronRight size={18} />
                </button>
                <button className="btn btn-secondary" style={{ padding: "var(--space-1) var(--space-3)", fontSize: 13 }} onClick={goToday}>
                  Today
                </button>
              </div>
            </div>

            {/* Campaign filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <label style={{ margin: 0, fontSize: 13, color: "var(--neutral-500)", fontWeight: 500 }}>Filter:</label>
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                style={{ width: "auto", minWidth: 160, fontSize: 13, padding: "var(--space-1) var(--space-3)" }}
              >
                <option value="all">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.business_name}</option>
                ))}
              </select>
            </div>

            {/* Calendar content */}
            {viewMode === "monthly" && (
              <MonthlyView
                calMonth={calMonth}
                tasksByDate={tasksByDate}
                campaigns={campaigns}
                today={today}
                selectedDate={selectedDate}
                onDayClick={handleSwitchToDaily}
                onTaskClick={onTaskClick}
                onAddTask={openAddTask}
              />
            )}
            {viewMode === "weekly" && (
              <WeeklyView
                weekDays={weekDays}
                tasksByDate={tasksByDate}
                campaigns={campaigns}
                today={today}
                onDayHeadingClick={handleSwitchToDaily}
                onTaskClick={onTaskClick}
                onAddTask={openAddTask}
              />
            )}
            {viewMode === "daily" && (
              <DailyView
                date={selectedDate}
                tasksByDate={tasksByDate}
                campaigns={campaigns}
                today={today}
                onTaskClick={onTaskClick}
                onAddTask={openAddTask}
              />
            )}
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
                          <button className="btn btn-ghost" style={{ padding: "var(--space-1)" }} onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.content); }} aria-label="Edit note">
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

      {showItemTypePicker && addTaskDate && (
        <div style={overlayStyle} onClick={() => setShowItemTypePicker(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--neutral-900)" }}>Add to calendar</h2>
              <button className="btn btn-ghost" onClick={() => setShowItemTypePicker(false)} style={{ padding: "var(--space-2)" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <button style={itemPickerBtnStyle} onClick={() => handleItemTypeSelect("campaign_task")}>
                <div style={{ ...itemPickerIconStyle, background: "var(--accent-100)" }}><CalendarIcon size={18} color="var(--accent-700)" /></div>
                <div><div style={itemPickerTitleStyle}>Campaign task</div><div style={itemPickerDescStyle}>Requires a campaign and channel</div></div>
              </button>
              <button style={itemPickerBtnStyle} onClick={() => handleItemTypeSelect("general_task")}>
                <div style={{ ...itemPickerIconStyle, background: "var(--status-progress-bg)" }}><Check size={18} color="var(--status-progress-border)" /></div>
                <div><div style={itemPickerTitleStyle}>General task</div><div style={itemPickerDescStyle}>No campaign needed</div></div>
              </button>
              <button style={itemPickerBtnStyle} onClick={() => handleItemTypeSelect("note")}>
                <div style={{ ...itemPickerIconStyle, background: "var(--status-todo-bg)" }}><StickyNote size={18} color="var(--status-todo-border)" /></div>
                <div><div style={itemPickerTitleStyle}>Note / reminder</div><div style={itemPickerDescStyle}>Quick note with optional reminder</div></div>
              </button>
              <button style={itemPickerBtnStyle} onClick={() => handleItemTypeSelect("appointment")}>
                <div style={{ ...itemPickerIconStyle, background: "var(--urgency-orange-bg)" }}><Clock size={18} color="var(--urgency-orange)" /></div>
                <div><div style={itemPickerTitleStyle}>Appointment</div><div style={itemPickerDescStyle}>Name, time, location, meeting link</div></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddTask && addTaskDate && addItemType && (
        <CalendarAddModal
          date={addTaskDate}
          campaigns={campaigns}
          demoMode={demoMode}
          userId={userId}
          itemType={addItemType}
          onClose={() => { setShowAddTask(false); setAddItemType(null); setAddTaskError(null); }}
          onCampaignTaskCreate={async (taskData) => {
            const created = await onTaskCreate(taskData);
            if (created) { setShowAddTask(false); setAddItemType(null); setAddTaskError(null); }
            return created;
          }}
          onGeneralItemCreate={async (item) => {
            const ok = await handleGeneralItemCreate(item);
            if (ok) { setShowAddTask(false); setAddItemType(null); }
            return ok;
          }}
          onNoteCreate={async (content, scheduledDate, scheduledTime, reminderOffset) => {
            const ok = await handleNoteCreate(content, scheduledDate, scheduledTime, reminderOffset);
            if (ok) { setShowAddTask(false); setAddItemType(null); }
            return ok;
          }}
        />
      )}

      {activeReminders.length > 0 && (
        <ReminderPopup reminders={activeReminders} onDismiss={dismissReminder} onOpen={() => {}} />
      )}
    </div>
  );
}

/* ---------- Monthly View ---------- */
function MonthlyView({ calMonth, tasksByDate, campaigns, today, selectedDate, onDayClick, onTaskClick, onAddTask }: {
  calMonth: Date;
  tasksByDate: Record<string, Task[]>;
  campaigns: Campaign[];
  today: Date;
  selectedDate: Date;
  onDayClick: (d: Date) => void;
  onTaskClick: (t: Task) => void;
  onAddTask: (d: Date) => void;
}) {
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

  return (
    <div>
      <div style={bigCalGridStyle}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={bigCalWeekdayStyle}>{d}</div>
        ))}
        {calendarDays.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={bigCalEmptyStyle} />;
          const key = dateKey(d);
          const dayTasks = tasksByDate[key] || [];
          const isToday = sameDay(dateKey(today), d);
          const isSelected = sameDay(dateKey(selectedDate), d);
          return (
            <div key={key} style={{ ...bigCalDayStyle, ...(isToday ? bigCalDayTodayStyle : {}), ...(isSelected ? bigCalDaySelectedStyle : {}) }}>
              <div style={bigCalDayHeaderStyle}>
                <button style={bigCalDayNumStyle} onClick={() => onDayClick(d)}>
                  {d.getDate()}
                </button>
                <button className="btn btn-ghost" style={{ padding: "0 2px", fontSize: 11, color: "var(--neutral-400)" }} onClick={() => onAddTask(d)}>
                  <Plus size={12} />
                </button>
              </div>
              {dayTasks.slice(0, 3).map((t) => {
                const campaign = campaigns.find((c) => c.id === t.campaign_id);
                return (
                  <button
                    key={t.id}
                    style={calTaskEntryStyle(t.status)}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                    title={`${t.title}${campaign ? " — " + campaign.business_name : ""}`}
                  >
                    <span style={calTaskDotStyle(t.status)} />
                    <span style={calTaskTextStyle}>{t.title}</span>
                  </button>
                );
              })}
              {dayTasks.length > 3 && (
                <button style={bigCalMoreStyle} onClick={() => onDayClick(d)}>
                  +{dayTasks.length - 3} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Weekly View ---------- */
function WeeklyView({ weekDays, tasksByDate, campaigns, today, onDayHeadingClick, onTaskClick, onAddTask }: {
  weekDays: Date[];
  tasksByDate: Record<string, Task[]>;
  campaigns: Campaign[];
  today: Date;
  onDayHeadingClick: (d: Date) => void;
  onTaskClick: (t: Task) => void;
  onAddTask: (d: Date) => void;
}) {
  return (
    <div style={weeklyGridStyle}>
      {weekDays.map((d) => {
        const key = dateKey(d);
        const dayTasks = tasksByDate[key] || [];
        const isToday = sameDay(dateKey(today), d);
        return (
          <div key={key} style={weeklyDayColStyle}>
            <div style={{ ...weeklyDayHeaderStyle, ...(isToday ? weeklyDayTodayHeaderStyle : {}) }}>
              <button style={weeklyDayLabelStyle} onClick={() => onDayHeadingClick(d)}>
                <span style={weeklyDayNameStyle}>{WEEKDAYS_FULL[d.getDay()].slice(0, 3)}</span>
                <span style={weeklyDayNumStyle}>{d.getDate()}</span>
              </button>
              <button className="btn btn-ghost" style={{ padding: "0 2px", fontSize: 11 }} onClick={() => onAddTask(d)}>
                <Plus size={12} />
              </button>
            </div>
            <div style={weeklyTaskListStyle}>
              {dayTasks.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--neutral-400)", padding: "var(--space-2)" }}>No tasks</p>
              ) : (
                dayTasks.map((t) => {
                  const campaign = campaigns.find((c) => c.id === t.campaign_id);
                  const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
                  return (
                    <button
                      key={t.id}
                      style={weeklyTaskCardStyle(t.status)}
                      onClick={() => onTaskClick(t)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", marginBottom: 2 }}>
                        <div style={{ ...taskDotStyle, background: channelColors[t.channel] || "var(--neutral-400)", width: 16, height: 16 }}>
                          <Icon size={9} color="var(--neutral-0)" />
                        </div>
                        <span style={weeklyTaskChannelStyle}>{t.channel}</span>
                      </div>
                      <div style={weeklyTaskTitleStyle(t.status)}>{t.title}</div>
                      {campaign && <div style={weeklyTaskCampaignStyle}>{campaign.business_name}</div>}
                      {t.est_minutes != null && <div style={weeklyTaskMetaStyle}>{t.est_minutes} min</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Daily View ---------- */
function DailyView({ date, tasksByDate, campaigns, today, onTaskClick, onAddTask }: {
  date: Date;
  tasksByDate: Record<string, Task[]>;
  campaigns: Campaign[];
  today: Date;
  onTaskClick: (t: Task) => void;
  onAddTask: (d: Date) => void;
}) {
  const key = dateKey(date);
  const dayTasks = tasksByDate[key] || [];
  const isToday = sameDay(dateKey(today), date);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>
          {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {" — "}
          {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
        </h3>
        <button className="btn btn-primary" style={{ padding: "var(--space-2) var(--space-4)", fontSize: 14 }} onClick={() => onAddTask(date)}>
          <Plus size={16} />
          Add Task
        </button>
      </div>
      {dayTasks.length === 0 ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--neutral-400)", fontSize: 15, marginBottom: "var(--space-4)" }}>
            No tasks scheduled for this date.
          </p>
          <button className="btn btn-primary" onClick={() => onAddTask(date)}>
            <Plus size={16} />
            Add a task
          </button>
        </div>
      ) : (
        <div style={dailyListStyle}>
          {dayTasks.map((t) => {
            const campaign = campaigns.find((c) => c.id === t.campaign_id);
            const Icon: LucideIcon = channelIcons[t.channel] || channelIcons["Website"];
            return (
              <button key={t.id} style={dailyTaskCardStyle(t.status)} onClick={() => onTaskClick(t)}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                  <div style={{ ...taskDotStyle, background: channelColors[t.channel] || "var(--neutral-400)" }}>
                    <Icon size={12} color="var(--neutral-0)" />
                  </div>
                  <span style={dailyChannelStyle}>{t.channel}</span>
                  <span style={dailyStatusPillStyle(t.status)}>{statusLabel[t.status]}</span>
                </div>
                <div style={dailyTitleStyle(t.status)}>{t.title}</div>
                <div style={dailyMetaStyle}>
                  {campaign && <span>{campaign.business_name}</span>}
                  {t.est_minutes != null && <span> · {t.est_minutes} min</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Compact Campaign Row ---------- */
function CompactCampaignRow({ campaign, tasks, onOpen }: { campaign: Campaign; tasks: Task[]; onOpen: () => void }) {
  const completed = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const startDate = new Date(campaign.start_date + "T00:00:00");
  const endDate = addDays(startDate, campaign.duration_days);

  return (
    <div style={compactRowStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={compactNameStyle}>{campaign.business_name}</div>
          <div style={compactDatesStyle}>
            {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" — "}
            {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ padding: "var(--space-1) var(--space-3)", fontSize: 13, flexShrink: 0 }} onClick={onOpen}>
          Open
          <ArrowRight size={14} />
        </button>
      </div>
      <div style={compactProgressOuterStyle}>
        <div style={{ ...compactProgressInnerStyle, width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
      </div>
      <div style={compactProgressTextStyle}>
        {completed}/{total} tasks
      </div>
    </div>
  );
}

/* ---------- Reminder Popup ---------- */
function ReminderPopup({ reminders, onDismiss, onOpen }: {
  reminders: import("../lib/types").Reminder[];
  onDismiss: (id: string) => void;
  onOpen: () => void;
}) {
  if (reminders.length === 0) return null;
  return (
    <div style={reminderOverlayStyle}>
      {reminders.slice(0, 3).map((r) => (
        <div key={r.id} style={reminderCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={reminderIconStyle}>
              <Bell size={20} color="var(--accent-700)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={reminderTitleStyle}>{r.item_title}</p>
              <p style={reminderTimeStyle}>
                {new Date(r.scheduled_for).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button className="btn btn-primary" style={{ padding: "var(--space-2) var(--space-4)", fontSize: 14 }} onClick={onOpen}>
              Open
            </button>
            <button className="btn btn-secondary" style={{ padding: "var(--space-2) var(--space-4)", fontSize: 14 }} onClick={() => onDismiss(r.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
      {reminders.length > 3 && (
        <p style={{ textAlign: "center", color: "var(--neutral-500)", fontSize: 13, marginTop: "var(--space-2)" }}>
          +{reminders.length - 3} more reminders
        </p>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
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
  maxHeight: "calc(100vh - 120px)",
  overflowY: "auto",
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

// Accordion
const accordionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  width: "100%",
  padding: 0,
  cursor: "pointer",
};

const accordionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-800)",
};

const accordionListStyle: React.CSSProperties = {
  marginTop: "var(--space-3)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  maxHeight: 300,
  overflowY: "auto",
};

// Compact campaign row
const compactRowStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-50)",
};

const compactNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--neutral-900)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const compactDatesStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  marginTop: 2,
};

const compactProgressOuterStyle: React.CSSProperties = {
  height: 4,
  borderRadius: "2px",
  background: "var(--neutral-200)",
  overflow: "hidden",
  marginTop: "var(--space-2)",
};

const compactProgressInnerStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "2px",
  background: "var(--accent-500)",
  transition: "width 0.3s ease",
};

const compactProgressTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--neutral-400)",
  marginTop: 2,
};

// Calendar toolbar
const calToolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "var(--space-3)",
  marginBottom: "var(--space-4)",
};

const viewToggleStyle: React.CSSProperties = {
  display: "flex",
  background: "var(--neutral-100)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-1)",
  gap: "var(--space-1)",
};

const viewBtnStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "6px",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--neutral-500)",
  background: "transparent",
};

const viewBtnActive: React.CSSProperties = {
  ...viewBtnStyle,
  background: "var(--neutral-0)",
  color: "var(--accent-600)",
  boxShadow: "var(--shadow-sm)",
};

const rangeLabelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-800)",
  minWidth: 120,
  textAlign: "center",
};

// Big monthly calendar
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

const bigCalEmptyStyle: React.CSSProperties = {
  background: "var(--neutral-50)",
};

const bigCalDayStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  minHeight: 90,
  padding: "var(--space-1)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflow: "hidden",
};

const bigCalDayTodayStyle: React.CSSProperties = {
  background: "var(--accent-50)",
};

const bigCalDaySelectedStyle: React.CSSProperties = {
  outline: "2px solid var(--accent-400)",
  outlineOffset: -2,
};

const bigCalDayHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const bigCalDayNumStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--neutral-500)",
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: 0,
};

const calTaskEntryStyle = (status: Task["status"]): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "3px",
  padding: "2px 4px",
  borderRadius: "4px",
  background: statusBg(status),
  border: `1px solid ${statusBorder(status)}`,
  fontSize: 10,
  color: statusText(status),
  cursor: "pointer",
  textAlign: "left",
  overflow: "hidden",
  textDecoration: statusStrike(status),
});

const calTaskDotStyle = (status: Task["status"]): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: statusBorder(status),
  flexShrink: 0,
});

const calTaskTextStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const bigCalMoreStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--accent-600)",
  padding: "0 4px",
  cursor: "pointer",
  border: "none",
  background: "none",
  textAlign: "left",
};

// Weekly view
const weeklyGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "var(--space-2)",
};

const weeklyDayColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: 300,
};

const weeklyDayHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
  background: "var(--neutral-50)",
  borderBottom: "1px solid var(--neutral-200)",
};

const weeklyDayTodayHeaderStyle: React.CSSProperties = {
  background: "var(--accent-50)",
};

const weeklyDayLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: 0,
};

const weeklyDayNameStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--neutral-400)",
  textTransform: "uppercase",
};

const weeklyDayNumStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "var(--neutral-800)",
};

const weeklyTaskListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-2)",
  flex: 1,
};

const weeklyTaskCardStyle = (status: Task["status"]): React.CSSProperties => ({
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
  background: statusBg(status),
  border: `1px solid ${statusBorder(status)}`,
  cursor: "pointer",
  textAlign: "left",
});

const weeklyTaskChannelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--neutral-500)",
  textTransform: "uppercase",
};

const weeklyTaskTitleStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 500,
  color: statusText(status),
  lineHeight: 1.3,
  textDecoration: statusStrike(status),
});

const weeklyTaskCampaignStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--neutral-400)",
  marginTop: 2,
};

const weeklyTaskMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--neutral-400)",
  marginTop: 2,
};

// Daily view
const dailyListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};

const dailyTaskCardStyle = (status: Task["status"]): React.CSSProperties => ({
  padding: "var(--space-4)",
  borderRadius: "var(--radius-md)",
  background: statusBg(status),
  border: `1px solid ${statusBorder(status)}`,
  cursor: "pointer",
  textAlign: "left",
});

const dailyChannelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--neutral-500)",
  textTransform: "uppercase",
};

const dailyStatusPillStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  padding: "2px var(--space-2)",
  borderRadius: "20px",
  background: statusPillBg(status),
  color: statusPillText(status),
  whiteSpace: "nowrap",
});

const dailyTitleStyle = (status: Task["status"]): React.CSSProperties => ({
  fontSize: 15,
  fontWeight: 500,
  color: statusText(status),
  marginTop: "var(--space-1)",
  textDecoration: statusStrike(status),
});

const dailyMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  marginTop: "var(--space-1)",
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

// Add task modal
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
  maxWidth: 480,
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "var(--shadow-lg)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "var(--space-6)",
  borderBottom: "1px solid var(--neutral-200)",
};

const modalBodyStyle: React.CSSProperties = {
  padding: "var(--space-6)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
};

const errorBoxStyle: React.CSSProperties = {
  background: "var(--error-50)",
  color: "var(--error-600)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-3) var(--space-4)",
  fontSize: 14,
};

// Item type picker
const itemPickerBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--neutral-200)",
  background: "var(--neutral-50)",
  cursor: "pointer",
  textAlign: "left",
  transition: "border-color 0.15s",
};
const itemPickerIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "var(--radius-sm)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const itemPickerTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-900)",
};
const itemPickerDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
  marginTop: 2,
};

// Reminder popup
const reminderOverlayStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "var(--space-6)",
  right: "var(--space-6)",
  zIndex: 200,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  maxWidth: 360,
};
const reminderCardStyle: React.CSSProperties = {
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--accent-300)",
  boxShadow: "var(--shadow-lg)",
  padding: "var(--space-5)",
};
const reminderIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "var(--accent-50)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const reminderTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--neutral-900)",
};
const reminderTimeStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-500)",
  marginTop: 2,
};
