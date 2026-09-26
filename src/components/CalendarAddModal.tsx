import { useState, useEffect, useRef } from "react";
import { X, Check, Clock, MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import type { Campaign, Task, ReminderOffset } from "../lib/types";
import { REMINDER_OPTIONS } from "../lib/types";
import { CHANNELS } from "../lib/types";
import { PHASES } from "../lib/types";
import { supabase } from "../lib/supabase";

export type AddItemType = "campaign_task" | "general_task" | "note" | "appointment";

interface Props {
  date: Date;
  campaigns: Campaign[];
  demoMode: boolean;
  userId: string;
  itemType: AddItemType;
  onClose: () => void;
  onCampaignTaskCreate: (task: Omit<Task, "id" | "created_at">) => Promise<Task | null>;
  onGeneralItemCreate: (item: {
    item_type: "general_task" | "appointment";
    title: string;
    description: string | null;
    due_date: string;
    start_time: string | null;
    end_time: string | null;
    all_day: boolean;
    location: string | null;
    meeting_link: string | null;
  }) => Promise<boolean>;
  onNoteCreate: (content: string, scheduledDate: string, scheduledTime: string | null, reminderOffset: ReminderOffset) => Promise<boolean>;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getPhaseForDate(campaign: Campaign, date: Date) {
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

export default function CalendarAddModal({
  date,
  campaigns,
  demoMode,
  userId,
  itemType,
  onClose,
  onCampaignTaskCreate,
  onGeneralItemCreate,
  onNoteCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(dateKey(date));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [reminder, setReminder] = useState<ReminderOffset>("none");
  const [campaignId, setCampaignId] = useState(campaigns.length > 0 ? campaigns[0].id : "");
  const [channel, setChannel] = useState("");
  const [estMinutes, setEstMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const availableChannels = selectedCampaign?.channels || [];

  useEffect(() => {
    if (itemType === "campaign_task" && availableChannels.length > 0 && !channel) {
      setChannel(availableChannels[0]);
    }
  }, [availableChannels, channel, itemType]);

  const handleCreate = async () => {
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }

    if (itemType === "campaign_task") {
      if (!campaignId) { setError("Please select a campaign."); return; }
      if (!channel) { setError("Please select a channel."); return; }
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const campaignStart = new Date(campaign.start_date + "T00:00:00");
        const campaignEnd = addDays(campaignStart, campaign.duration_days);
        const taskDate = new Date(dueDate + "T00:00:00");
        if (taskDate < campaignStart || taskDate >= campaignEnd) {
          setError(`Date is outside the campaign range (${campaignStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${campaignEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}).`);
          return;
        }
      }
      const parsedMinutes = estMinutes.trim() === "" ? null : Number.parseInt(estMinutes, 10);
      if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes <= 0)) {
        setError("Time estimate must be a positive whole number.");
        return;
      }
      const phase = campaign ? getPhaseForDate(campaign, new Date(dueDate + "T00:00:00")) : null;
      setSaving(true);
      await onCampaignTaskCreate({
        campaign_id: campaignId,
        title: title.trim(),
        channel,
        due_date: dueDate,
        draft_copy: description.trim() || null,
        status: "todo",
        est_minutes: parsedMinutes,
        intent_tag: null,
        campaign_phase: phase,
        micro_steps: null,
        sort_order: 0,
      });
      setSaving(false);
    } else if (itemType === "general_task") {
      setSaving(true);
      const ok = await onGeneralItemCreate({
        item_type: "general_task",
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        start_time: allDay ? null : (startTime || null),
        end_time: null,
        all_day: allDay,
        location: null,
        meeting_link: null,
      });
      setSaving(false);
      if (!ok) { setError("Failed to create task."); return; }
    } else if (itemType === "appointment") {
      if (!allDay) {
        if (!startTime.trim()) { setError("Start time is required for timed appointments."); return; }
        if (endTime.trim() && startTime >= endTime) { setError("End time must be after start time."); return; }
      }
      setSaving(true);
      const ok = await onGeneralItemCreate({
        item_type: "appointment",
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        start_time: allDay ? null : (startTime || null),
        end_time: allDay ? null : (endTime || null),
        all_day: allDay,
        location: location.trim() || null,
        meeting_link: meetingLink.trim() || null,
      });
      setSaving(false);
      if (!ok) { setError("Failed to create appointment."); return; }
    } else if (itemType === "note") {
      setSaving(true);
      const ok = await onNoteCreate(title.trim(), dueDate, allDay ? null : (startTime || null), reminder);
      setSaving(false);
      if (!ok) { setError("Failed to create note."); return; }
    }
    onClose();
  };

  const typeLabel: Record<AddItemType, string> = {
    campaign_task: "Campaign Task",
    general_task: "General Task",
    note: "Note / Reminder",
    appointment: "Appointment",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--neutral-900)" }}>
            Add {typeLabel[itemType]}
          </h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "var(--space-2)" }}>
            <X size={20} />
          </button>
        </div>
        <div style={bodyStyle}>
          {error && <div style={errorBoxStyle}>{error}</div>}
          <div>
            <label>{itemType === "note" ? "Note text" : "Title"}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={itemType === "note" ? "Write your note..." : "Title"} autoFocus />
          </div>

          {itemType === "campaign_task" && (
            <>
              <div>
                <label>Campaign</label>
                <select value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setChannel(""); }}>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <div style={{ flex: 1 }}>
                  <label>Channel</label>
                  <select value={channel} onChange={(e) => setChannel(e.target.value)} disabled={availableChannels.length === 0}>
                    {availableChannels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Est. minutes</label>
                  <input type="number" min="1" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} placeholder="30" />
                </div>
              </div>
            </>
          )}

          {(itemType === "general_task" || itemType === "appointment" || itemType === "campaign_task") && (
            <div>
              <label>Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." style={{ minHeight: 70 }} />
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>
              <label>Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {(itemType === "general_task" || itemType === "appointment" || itemType === "note") && (
              <div style={{ flex: 1 }}>
                <label>All day</label>
                <select value={allDay ? "true" : "false"} onChange={(e) => setAllDay(e.target.value === "true")}>
                  <option value="true">All day</option>
                  <option value="false">Timed</option>
                </select>
              </div>
            )}
          </div>

          {!allDay && (itemType === "general_task" || itemType === "appointment" || itemType === "note") && (
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <div style={{ flex: 1 }}>
                <label>Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              {itemType === "appointment" && (
                <div style={{ flex: 1 }}>
                  <label>End time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {itemType === "appointment" && (
            <>
              <div>
                <label>Location (optional)</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or room" />
              </div>
              <div>
                <label>Meeting link (optional)</label>
                <input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://..." />
              </div>
            </>
          )}

          {(itemType === "note" || itemType === "general_task" || itemType === "appointment") && (
            <div>
              <label>Reminder</label>
              <select value={reminder} onChange={(e) => setReminder(e.target.value as ReminderOffset)}>
                {REMINDER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(28, 25, 22, 0.4)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", zIndex: 100,
};
const modalStyle: React.CSSProperties = {
  background: "var(--neutral-0)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 480,
  maxHeight: "85vh", overflowY: "auto", boxShadow: "var(--shadow-lg)",
};
const headerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "var(--space-6)", borderBottom: "1px solid var(--neutral-200)",
};
const bodyStyle: React.CSSProperties = {
  padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)",
};
const errorBoxStyle: React.CSSProperties = {
  background: "var(--error-50)", color: "var(--error-600)", borderRadius: "var(--radius-sm)",
  padding: "var(--space-3) var(--space-4)", fontSize: 14,
};
