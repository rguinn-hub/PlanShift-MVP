import { useEffect, useState, useCallback } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Campaign, Task } from "../lib/types";
import CampaignPulse from "../components/CampaignPulse";
import PhaseCalendar from "../components/PhaseCalendar";
import FocusMode from "../components/FocusMode";
import TaskDetail from "../components/TaskDetail";
import EditCampaignModal from "../components/EditCampaignModal";

interface Props {
  campaign: Campaign;
  mode: "standard" | "focus";
  demoMode: boolean;
  onCampaignUpdated: (campaign: Campaign) => void;
}

export default function CampaignView({ campaign, mode, onCampaignUpdated }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingCampaign, setEditingCampaign] = useState(false);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load tasks:", error.message);
      return;
    }

    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [campaign.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      console.error("Failed to update task:", error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setSelectedTask((prev) =>
      prev && prev.id === taskId ? { ...prev, ...updates } : prev
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
        <p style={{ color: "var(--neutral-400)" }}>Loading your campaign...</p>
      </div>
    );
  }

  if (mode === "focus") {
    return (
      <>
        <div style={headerStyle}>
          <div>
            <div style={titleRowStyle}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--neutral-900)", margin: 0 }}>
                {campaign.business_name}
              </h1>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setEditingCampaign(true)}
                style={editButtonStyle}
              >
                <Pencil size={14} />
                Edit Campaign
              </button>
            </div>
            <p style={{ color: "var(--neutral-500)", fontSize: 14 }}>
              {campaign.goal}
            </p>
          </div>
        </div>

        <FocusMode
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onTaskUpdate={handleTaskUpdate}
        />
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleTaskUpdate}
          />
        )}
        {editingCampaign && (
          <EditCampaignModal
            campaign={campaign}
            onSaved={(updatedCampaign) => {
              onCampaignUpdated(updatedCampaign);
              setEditingCampaign(false);
            }}
            onClose={() => setEditingCampaign(false)}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <div style={titleRowStyle}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--neutral-900)", margin: 0 }}>
              {campaign.business_name}
            </h1>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setEditingCampaign(true)}
              style={editButtonStyle}
            >
              <Pencil size={14} />
              Edit Campaign
            </button>
          </div>
          <p style={{ color: "var(--neutral-500)", fontSize: 14 }}>
            {campaign.goal}
          </p>
        </div>
      </div>

      <CampaignPulse campaign={campaign} tasks={tasks} />

      <PhaseCalendar
        tasks={tasks}
        startDate={campaign.start_date}
        durationDays={campaign.duration_days}
        onTaskClick={setSelectedTask}
      />

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}

      {editingCampaign && (
        <EditCampaignModal
          campaign={campaign}
          onSaved={(updatedCampaign) => {
            onCampaignUpdated(updatedCampaign);
            setEditingCampaign(false);
          }}
          onClose={() => setEditingCampaign(false)}
        />
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "var(--space-6) var(--space-6) var(--space-4)",
};

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--space-3)",
  marginBottom: "var(--space-1)",
};

const editButtonStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  fontSize: 12,
};
