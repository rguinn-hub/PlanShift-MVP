import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { Menu, Sun, Moon } from "lucide-react";
import { supabase } from "./lib/supabase";
import AuthScreen from "./screens/AuthScreen";
import NewCampaign from "./screens/NewCampaign";
import CampaignView from "./screens/CampaignView";
import Sidebar from "./components/Sidebar";
import type { Campaign } from "./lib/types";
import { Logo } from "./components/Logo";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [view, setView] = useState<"standard" | "focus">("standard");
  const [demoMode, setDemoMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
        setShowNewCampaign(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [demoMode]);

  const loadCampaigns = useCallback(async () => {
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

    const list = (data as Campaign[]) || [];
    setCampaigns(list);

    if (list.length > 0 && !activeCampaign && !showNewCampaign) {
      setActiveCampaign(list[0]);
    }

    if (list.length === 0) {
      setShowNewCampaign(true);
    }
  }, [session, activeCampaign, showNewCampaign]);

  useEffect(() => {
    if (session || demoMode) {
      loadCampaigns();
    }
  }, [session, demoMode, loadCampaigns]);

  const handleSignOut = async () => {
    setDemoMode(false);
    await supabase.auth.signOut();
  };

  const handleCampaignCreated = (c: Campaign) => {
    setCampaigns((prev) => [c, ...prev]);
    setActiveCampaign(c);
    setShowNewCampaign(false);
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
    setShowNewCampaign(false);
    setSidebarOpen(false);
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    const wasActive = activeCampaign?.id === campaign.id;

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
      setShowNewCampaign(true);
    }
  };

  const handleNewCampaign = () => {
    setShowNewCampaign(true);
    setActiveCampaign(null);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "var(--neutral-400)", fontSize: 16 }}>Loading...</p>
      </div>
    );
  }

  if (!session && !demoMode) {
    return <AuthScreen onSkipLogin={() => { setDemoMode(true); setShowNewCampaign(true); }} />;
  }

  if (showNewCampaign || campaigns.length === 0) {
    return (
      <div>
        <header style={headerStyle}>
          {campaigns.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setSidebarOpen(true)} style={{ padding: "var(--space-2)" }}>
              <Menu size={20} />
            </button>
          )}
          <Logo />
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={toggleDarkMode} style={{ padding: "var(--space-2)" }} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-ghost" onClick={handleSignOut}>
            {demoMode ? "Exit demo" : "Sign out"}
          </button>
        </header>
        <NewCampaign
          userId={session?.user.id || "demo-user"}
          onCreated={handleCampaignCreated}
          demoMode={demoMode}
        />
        {sidebarOpen && campaigns.length > 0 && (
          <Sidebar
            campaigns={campaigns}
            activeCampaignId={null}
            onSelect={handleSelectCampaign}
            onNewCampaign={handleNewCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <header style={headerStyle}>
        <button className="btn btn-ghost" onClick={() => setSidebarOpen(true)} style={{ padding: "var(--space-2)" }}>
          <Menu size={20} />
        </button>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginLeft: "auto" }}>
          <button className="btn btn-ghost" onClick={toggleDarkMode} style={{ padding: "var(--space-2)" }} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
          <button className="btn btn-ghost" onClick={handleSignOut}>
            {demoMode ? "Exit demo" : "Sign out"}
          </button>
        </div>
      </header>
      <CampaignView
        campaign={activeCampaign!}
        mode={view}
        demoMode={demoMode}
        onCampaignUpdated={handleCampaignUpdated}
      />

      {sidebarOpen && (
        <Sidebar
          campaigns={campaigns}
          activeCampaignId={activeCampaign?.id || null}
          onSelect={handleSelectCampaign}
          onNewCampaign={handleNewCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </div>
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
