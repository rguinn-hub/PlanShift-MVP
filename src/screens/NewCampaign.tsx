import { useState } from "react";
import { supabase } from "../lib/supabase";
import { CHANNELS, type Campaign } from "../lib/types";
import { DEMO_CAMPAIGN, buildDemoTasks } from "../lib/demoData";
import type { LucideIcon } from "lucide-react";
import { channelIcons } from "../lib/channels";
import { Sparkles } from "lucide-react";

interface Props {
  userId: string;
  onCreated: (campaign: Campaign) => void;
  demoMode: boolean;
}

export default function NewCampaign({ userId, onCreated, demoMode }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [businessBrief, setBusinessBrief] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (channels.length === 0) {
      setError("Select at least one channel.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          business_name: businessName,
          business_brief: businessBrief,
          target_audience: targetAudience,
          goal,
          channels,
          start_date: startDate,
          duration_days: parseInt(durationDays, 10),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const campaign = data as Campaign;

      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            businessName,
            businessBrief,
            targetAudience,
            goal,
            channels,
            startDate,
            durationDays: parseInt(durationDays, 10),
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to generate tasks (${response.status})`);
      }

      onCreated(campaign);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          business_name: DEMO_CAMPAIGN.business_name,
          business_brief: DEMO_CAMPAIGN.business_brief,
          target_audience: DEMO_CAMPAIGN.target_audience,
          goal: DEMO_CAMPAIGN.goal,
          channels: DEMO_CAMPAIGN.channels,
          start_date: DEMO_CAMPAIGN.start_date,
          duration_days: DEMO_CAMPAIGN.duration_days,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const campaign = data as Campaign;
      const tasks = buildDemoTasks(campaign.id);

      const { error: taskError } = await supabase
        .from("tasks")
        .insert(tasks);

      if (taskError) throw taskError;

      onCreated(campaign);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--neutral-900)" }}>
          New Campaign
        </h1>
        <p style={{ color: "var(--neutral-500)", marginBottom: "var(--space-8)", fontSize: 15 }}>
          Tell us about your business and we'll generate a task plan for you.
        </p>

        {demoMode && (
          <div style={demoBannerStyle}>
            Demo mode — your campaign will be saved but you won't be able to return to it after exiting.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <label htmlFor="businessName">Business name</label>
            <input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. The Velvet Thread"
              required
            />
          </div>

          <div>
            <label htmlFor="businessBrief">Business brief</label>
            <textarea
              id="businessBrief"
              value={businessBrief}
              onChange={(e) => setBusinessBrief(e.target.value)}
              placeholder="What does your business do? What makes it unique?"
              required
            />
          </div>

          <div>
            <label htmlFor="targetAudience">Target audience</label>
            <input
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Style-conscious women who value curated, versatile pieces"
              required
            />
          </div>

          <div>
            <label htmlFor="goal">Campaign goal</label>
            <input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Sell out the Fall Capsule Collection launch"
              required
            />
          </div>

          <div>
            <label>Selected channels</label>
            <div style={channelGridStyle}>
              {CHANNELS.map((ch) => {
                const Icon: LucideIcon = channelIcons[ch];
                const selected = channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    style={selected ? channelBtnActive : channelBtn}
                  >
                    <Icon size={18} />
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="duration">Duration (days)</label>
              <input
                id="duration"
                type="number"
                min="3"
                max="90"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? "Generating your campaign..." : "Create campaign"}
          </button>
        </form>

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>or</span>
          <span style={dividerLineStyle} />
        </div>

        <button
          className="btn btn-secondary btn-large"
          style={{ width: "100%" }}
          onClick={handleLoadDemo}
          disabled={loading}
        >
          <Sparkles size={18} />
          Load demo campaign
        </button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 65px)",
  padding: "var(--space-8) var(--space-6)",
  display: "flex",
  justifyContent: "center",
  background: "var(--bg-page)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--neutral-200)",
  boxShadow: "var(--shadow-sm)",
  padding: "var(--space-10) var(--space-8)",
};

const demoBannerStyle: React.CSSProperties = {
  background: "var(--accent-50)",
  border: "1px solid var(--accent-200)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-3) var(--space-4)",
  fontSize: 14,
  color: "var(--accent-700)",
  marginBottom: "var(--space-6)",
};

const channelGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
  gap: "var(--space-2)",
};

const channelBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--neutral-300)",
  background: "var(--neutral-0)",
  color: "var(--neutral-600)",
  fontSize: 14,
  fontWeight: 500,
  transition: "all 0.2s",
};

const channelBtnActive: React.CSSProperties = {
  ...channelBtn,
  border: "1px solid var(--accent-500)",
  background: "var(--accent-50)",
  color: "var(--accent-700)",
};

const errorStyle: React.CSSProperties = {
  background: "var(--error-50)",
  color: "var(--error-600)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-3) var(--space-4)",
  fontSize: 14,
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  margin: "var(--space-6) 0",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--neutral-200)",
};

const dividerTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
};
