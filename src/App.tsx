import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { Menu, Sun, Moon, Home as HomeIcon } from "lucide-react";
import { supabase } from "./lib/supabase";
import AuthScreen from "./screens/AuthScreen";
import NewCampaign from "./screens/NewCampaign";
import CampaignView from "./screens/CampaignView";
import HomeDashboard from "./screens/HomeDashboard";
import FocusMode from "./components/FocusMode";
import Sidebar from "./components/Sidebar";
import TaskDetail from "./components/TaskDetail";
import type { Campaign, Task } from "./lib/types";
import { Logo } from "./components/Logo";
import { DEMO_CAMPAIGN, buildDemoTasks, initDemoState, saveDemoState, buildAllDemoCampaigns } from "./lib/demoData";

type Screen = "home" | "campaign" | "newCampaign";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [view, setView] = useState<"standard" | "focus">("standard");
  const [demoMode, setDemoMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [tasksByCampaign, setTasksByCampaign] = useState<Record<string, Task[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("planshift-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = saved === "dark" || (!saved && prefersDark);
    setDarkMode(useDark);
    document.documentElement.classList.toggle("dark", useDark);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("planshift-theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess && !demoMode) {
        setCampaigns([]);
        setActiveCampaign(null);
        setScreen("home");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [demoMode]);

  const loadCampaigns = useCallback(async () => {
    if (demoMode) {
      const demo = initDemoState();
      setCampaigns(demo.campaigns);
      setTasksByCampaign(demo.tasksByCampaign);
      return;
    }
    let query = supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (session) {
      query = query.eq("user_id", session.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load campaigns:", error.message);
      return;
    }

    setCampaigns((data as Campaign[]) || []);
  }, [session, demoMode]);

  useEffect(() => {
    if (session || demoMode) {
      loadCampaigns();
    }
  }, [session, demoMode, loadCampaigns]);

  // Load all tasks for the user's campaigns (for dashboard)
  const loadAllTasks = useCallback(async () => {
    if (demoMode) return;
    if (campaigns.length === 0) {
      setTasksByCampaign({});
      return;
    }
    const campaignIds = campaigns.map((c) => c.id);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load tasks:", error.message);
      return;
    }

    const taskList = (data as Task[]) || [];
    const byCampaign: Record<string, Task[]> = {};
    for (const t of taskList) {
      if (!byCampaign[t.campaign_id]) byCampaign[t.campaign_id] = [];
      byCampaign[t.campaign_id].push(t);
    }
    setTasksByCampaign(byCampaign);
  }, [campaigns, demoMode]);

  useEffect(() => {
    if (screen === "home") {
      loadAllTasks();
    }
  }, [screen, loadAllTasks]);

  const handleSignOut = async () => {
    setDemoMode(false);
    await supabase.auth.signOut();
  };

  const handleCampaignCreated = (c: Campaign) => {
    setCampaigns((prev) => {
      const updated = [c, ...prev];
      if (demoMode) saveDemoState(updated, tasksByCampaign);
      return updated;
    });
    setActiveCampaign(c);
    setScreen("campaign");
  };

  const handleCampaignUpdated = (updatedCampaign: Campaign) => {
    setCampaigns((prev) =>
      prev.map((campaign) => campaign.id === updatedCampaign.id ? updatedCampaign : campaign)
    );
    setActiveCampaign((current) =>
      current?.id === updatedCampaign.id ? updatedCampaign : current
    );
  };

  const handleSelectCampaign = (c: Campaign) => {
    setActiveCampaign(c);
    setScreen("campaign");
    setSidebarOpen(false);
  };

  const handleOpenCampaign = (c: Campaign) => {
    setActiveCampaign(c);
    setScreen("campaign");
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    const wasActive = activeCampaign?.id === campaign.id;

    if (demoMode) {
      const updatedCampaigns = campaigns.filter((c) => c.id !== campaign.id);
      const updatedTasks: Record<string, Task[]> = {};
      for (const [cid, tasks] of Object.entries(tasksByCampaign)) {
        if (cid !== campaign.id) updatedTasks[cid] = tasks;
      }
      setCampaigns(updatedCampaigns);
      setTasksByCampaign(updatedTasks);
      saveDemoState(updatedCampaigns, updatedTasks);
      if (wasActive) {
        setActiveCampaign(null);
        setScreen("home");
      }
      return;
    }

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaign.id);

    if (error) {
      console.error("Failed to delete campaign:", error.message);
      return;
    }

    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    if (wasActive) {
      setActiveCampaign(null);
      setScreen("home");
    }
  };

  const handleNewCampaign = () => {
    setScreen("newCampaign");
    setActiveCampaign(null);
    setSidebarOpen(false);
  };

  const handleGoHome = () => {
    setScreen("home");
    setActiveCampaign(null);
    setSidebarOpen(false);
  };

  const handleLoadDemo = async () => {
    const demo = initDemoState();
    setCampaigns(demo.campaigns);
    setTasksByCampaign(demo.tasksByCampaign);
    setScreen("home");
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    setTasksByCampaign((prev) => {
      const next: Record<string, Task[]> = {};
      for (const [cid, tasks] of Object.entries(prev)) {
        next[cid] = tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      }
      if (demoMode) saveDemoState(campaigns, next);
      return next;
    });

    setSelectedTask((prev) =>
      prev && prev.id === taskId ? { ...prev, ...updates } : prev
    );

    if (demoMode) return;

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      console.error("Failed to update task:", error.message);
      return;
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    setTasksByCampaign((prev) => {
      const next: Record<string, Task[]> = {};
      for (const [cid, tasks] of Object.entries(prev)) {
        next[cid] = tasks.filter((t) => t.id !== taskId);
      }
      if (demoMode) saveDemoState(campaigns, next);
      return next;
    });

    setSelectedTask(null);

    if (demoMode) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Failed to delete task:", error.message);
      return;
    }
  };

  const handleTaskCreate = async (taskData: Omit<Task, "id" | "created_at">): Promise<Task | null> => {
    if (demoMode) {
      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      setTasksByCampaign((prev) => {
        const existing = prev[taskData.campaign_id] || [];
        const next = { ...prev, [taskData.campaign_id]: [...existing, newTask] };
        saveDemoState(campaigns, next);
        return next;
      });
      return newTask;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error("Failed to create task:", error.message);
      return null;
    }

    const created = data as Task;
    setTasksByCampaign((prev) => {
      const existing = prev[created.campaign_id] || [];
      return { ...prev, [created.campaign_id]: [...existing, created] };
    });

    return created;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-page)" }}>
        <p style={{ color: "var(--neutral-400)", fontSize: 16 }}>Loading...</p>
      </div>
    );
  }

  if (!session && !demoMode) {
    return <AuthScreen onSkipLogin={() => { setDemoMode(true); setScreen("home"); }} />;
  }

  const showHeader = screen !== "newCampaign" || campaigns.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
      {showHeader && (
        <header style={headerStyle}>
          <button className="btn btn-ghost" onClick={() => setSidebarOpen(true)} style={{ padding: "var(--space-2)" }} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button onClick={handleGoHome} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Go to Home">
            <Logo />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost"
            onClick={handleGoHome}
            style={{
              padding: "var(--space-2) var(--space-3)",
              fontWeight: screen === "home" ? 600 : 400,
              color: screen === "home" ? "var(--accent-700)" : "var(--neutral-600)",
            }}
          >
            <HomeIcon size={18} />
            Home
          </button>
          <button className="btn btn-ghost" onClick={toggleDarkMode} style={{ padding: "var(--space-2)" }} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {screen !== "newCampaign" && (
            <div style={toggleStyle}>
              <button
                className="btn"
                style={view === "standard" ? toggleBtnActive : toggleBtn}
                onClick={() => setView("standard")}
              >
                Standard
              </button>
              <button
                className="btn"
                style={view === "focus" ? toggleBtnActive : toggleBtn}
                onClick={() => setView("focus")}
              >
                Focus
              </button>
            </div>
          )}
          <button className="btn btn-ghost" onClick={handleSignOut}>
            {demoMode ? "Exit demo" : "Sign out"}
          </button>
        </header>
      )}

      {screen === "newCampaign" ? (
        <NewCampaign
          userId={session?.user.id || "demo-user"}
          onCreated={handleCampaignCreated}
          demoMode={demoMode}
          onGoHome={handleGoHome}
        />
      ) : screen === "home" && view === "focus" ? (
        <div style={{ padding: "var(--space-6)", maxWidth: 720, margin: "0 auto" }}>
          <FocusMode
            tasks={Object.values(tasksByCampaign).flat()}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      ) : screen === "home" ? (
        <HomeDashboard
          userId={session?.user.id || "demo-user"}
          demoMode={demoMode}
          campaigns={campaigns}
          onOpenCampaign={handleOpenCampaign}
          onCreateCampaign={handleNewCampaign}
          onLoadDemo={handleLoadDemo}
          onTaskClick={setSelectedTask}
          tasksByCampaign={tasksByCampaign}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskCreate={handleTaskCreate}
        />
      ) : activeCampaign ? (
        <CampaignView
          campaign={activeCampaign}
          mode={view}
          demoMode={demoMode}
          onCampaignUpdated={handleCampaignUpdated}
          initialTasks={tasksByCampaign[activeCampaign.id] || []}
          onTaskUpdateExternal={handleTaskUpdate}
          allCampaigns={campaigns}
          allTasks={tasksByCampaign}
        />
      ) : (
        <HomeDashboard
          userId={session?.user.id || "demo-user"}
          demoMode={demoMode}
          campaigns={campaigns}
          onOpenCampaign={handleOpenCampaign}
          onCreateCampaign={handleNewCampaign}
          onLoadDemo={handleLoadDemo}
          onTaskClick={setSelectedTask}
          tasksByCampaign={tasksByCampaign}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskCreate={handleTaskCreate}
        />
      )}

      {sidebarOpen && (
        <Sidebar
          campaigns={campaigns}
          activeCampaignId={activeCampaign?.id || null}
          onSelect={handleSelectCampaign}
          onNewCampaign={handleNewCampaign}
          onHome={handleGoHome}
          onDeleteCampaign={handleDeleteCampaign}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {selectedTask && screen === "home" && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}

function TaskDetailModal({ task, onClose, onUpdate, onDelete }: {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <TaskDetail task={task} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-6)",
  borderBottom: "1px solid var(--neutral-200)",
  background: "var(--neutral-0)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  background: "var(--neutral-100)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-1)",
  gap: "var(--space-1)",
};

const toggleBtn: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "6px",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--neutral-500)",
  background: "transparent",
};

const toggleBtnActive: React.CSSProperties = {
  ...toggleBtn,
  background: "var(--neutral-0)",
  color: "var(--accent-600)",
  boxShadow: "var(--shadow-sm)",
};
