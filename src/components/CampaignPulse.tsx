import type { Campaign, Task } from "../lib/types";
import { ListChecks, Radio, Clock, CalendarClock } from "lucide-react";

interface Props {
  campaign: Campaign;
  tasks: Task[];
}

export default function CampaignPulse({ campaign, tasks }: Props) {
  const tasksLeft = tasks.filter((t) => t.status !== "done").length;
  const activeChannels = campaign.channels.length;

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.est_minutes || 0), 0);
  const weeksInCampaign = Math.max(1, campaign.duration_days / 7);
  const weeklyMinutes = Math.round(totalMinutes / weeksInCampaign);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const launchDate = new Date(campaign.start_date + "T00:00:00");
  const diffMs = launchDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  const launchLabel =
    diffDays > 0 ? `${diffDays} Day${diffDays === 1 ? "" : "s"}` :
    diffDays === 0 ? "Today" :
    "Launched";

  const stats = [
    {
      icon: ListChecks,
      label: "Tasks left",
      value: String(tasksLeft),
    },
    {
      icon: Radio,
      label: "Selected channels",
      value: String(activeChannels),
    },
    {
      icon: Clock,
      label: "Weekly workload",
      value: formatMinutes(weeklyMinutes),
    },
    {
      icon: CalendarClock,
      label: "Days to start",
      value: launchLabel,
    },
  ];

  return (
    <div style={containerStyle}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} style={statStyle}>
            <div style={iconWrapStyle}>
              <Icon size={18} color="var(--accent-600)" />
            </div>
            <div>
              <div style={valueStyle}>{stat.value}</div>
              <div style={labelStyle}>{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const containerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  borderBottom: "1px solid var(--neutral-200)",
};

const statStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
};

const iconWrapStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "var(--radius-sm)",
  background: "var(--accent-50)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "var(--neutral-900)",
  lineHeight: 1.2,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-500)",
};
