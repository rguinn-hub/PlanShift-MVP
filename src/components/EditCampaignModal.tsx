import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { CHANNELS, type Campaign } from "../lib/types";
import { channelIcons } from "../lib/channels";
import { saveDemoState } from "../lib/demoData";
import type { LucideIcon } from "lucide-react";

interface Props {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
  onClose: () => void;
  demoMode?: boolean;
  allCampaigns?: Campaign[];
  allTasks?: Record<string, import("../lib/types").Task[]>;
}

export default function EditCampaignModal({ campaign, onSaved, onClose, demoMode, allCampaigns, allTasks }: Props) {
  const [businessName, setBusinessName] = useState(campaign.business_name);
  const [businessBrief, setBusinessBrief] = useState(campaign.business_brief);
  const [targetAudience, setTargetAudience] = useState(campaign.target_audience);
  const [goal, setGoal] = useState(campaign.goal);
  const [channels, setChannels] = useState<string[]>(campaign.channels);
  const [startDate, setStartDate] = useState(campaign.start_date);
  const [durationDays, setDurationDays] = useState(String(campaign.duration_days));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (channel: string) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedDuration = Number.parseInt(durationDays, 10);
    if (channels.length === 0) {
      setError("Select at least one channel.");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 3 || parsedDuration > 90) {
      setError("Duration must be between 3 and 90 days.");
      return;
    }

    setSaving(true);
    const updates = {
      business_name: businessName.trim(),
      business_brief: businessBrief.trim(),
      target_audience: targetAudience.trim(),
      goal: goal.trim(),
      channels,
      start_date: startDate,
      duration_days: parsedDuration,
    };

    if (demoMode) {
      const updatedCampaign: Campaign = { ...campaign, ...updates };
      const updatedCampaigns = (allCampaigns || []).map((c) => c.id === campaign.id ? updatedCampaign : c);
      saveDemoState(updatedCampaigns, allTasks || {});
      onSaved(updatedCampaign);
      setSaving(false);
      return;
    }

    const { data, error: updateError } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", campaign.id)
      .select()
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (!data) {
      setError("We couldn't find that campaign to update.");
      setSaving(false);
      return;
    }

    onSaved(data as Campaign);
    setSaving(false);
  };

  return (
    <div style={overlayStyle} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="edit-campaign-title">
        <div style={modalHeaderStyle}>
          <div>
            <h2 id="edit-campaign-title" style={titleStyle}>Edit Campaign</h2>
            <p style={subtitleStyle}>Update the campaign details used across your plan.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onClose} aria-label="Close edit campaign dialog" style={{ padding: "var(--space-2)" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label htmlFor="edit-business-name">Business name</label>
            <input id="edit-business-name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
          </div>

          <div>
            <label htmlFor="edit-business-brief">Business brief</label>
            <textarea id="edit-business-brief" value={businessBrief} onChange={(event) => setBusinessBrief(event.target.value)} required />
          </div>

          <div>
            <label htmlFor="edit-target-audience">Target audience</label>
            <input id="edit-target-audience" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} required />
          </div>

          <div>
            <label htmlFor="edit-goal">Campaign goal</label>
            <input id="edit-goal" value={goal} onChange={(event) => setGoal(event.target.value)} required />
          </div>

          <div>
            <label>Selected channels</label>
            <div style={channelGridStyle}>
              {CHANNELS.map((channel) => {
                const Icon: LucideIcon = channelIcons[channel];
                const selected = channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    style={selected ? channelButtonActiveStyle : channelButtonStyle}
                  >
                    <Icon size={16} />
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={dateDurationStyle}>
            <div>
              <label htmlFor="edit-start-date">Start date</label>
              <input id="edit-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="edit-duration">Duration (days)</label>
              <input id="edit-duration" type="number" min="3" max="90" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required />
            </div>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={actionsStyle}>
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-5)",
  background: "rgba(13, 27, 51, 0.42)",
};

const modalStyle: React.CSSProperties = {
  width: "min(100%, 640px)",
  maxHeight: "min(760px, calc(100vh - 40px))",
  overflowY: "auto",
  background: "var(--neutral-0)",
  border: "1px solid var(--neutral-200)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "var(--space-4)",
  padding: "var(--space-6) var(--space-6) var(--space-4)",
  borderBottom: "1px solid var(--neutral-200)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--neutral-900)",
  fontSize: 20,
  fontWeight: 600,
};

const subtitleStyle: React.CSSProperties = {
  margin: "var(--space-1) 0 0",
  color: "var(--neutral-500)",
  fontSize: 13,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
};

const channelGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
  gap: "var(--space-2)",
};

const channelButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--neutral-300)",
  borderRadius: "var(--radius-sm)",
  background: "var(--neutral-0)",
  color: "var(--neutral-600)",
  fontSize: 13,
  fontWeight: 500,
};

const channelButtonActiveStyle: React.CSSProperties = {
  ...channelButtonStyle,
  borderColor: "var(--accent-500)",
  background: "var(--accent-50)",
  color: "var(--accent-700)",
};

const dateDurationStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-4)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-3)",
  paddingTop: "var(--space-2)",
};

const errorStyle: React.CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-sm)",
  background: "var(--error-50)",
  color: "var(--error-600)",
  fontSize: 14,
};
