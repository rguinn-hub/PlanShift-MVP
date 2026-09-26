import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Logo";

interface Props {
  onSkipLogin: () => void;
}

export default function AuthScreen({ onSkipLogin }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <button className="btn btn-ghost" onClick={toggleDarkMode} style={themeToggleStyle} aria-label="Toggle dark mode">
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-4)" }}>
            <Logo size="large" />
          </div>
          <p style={{ color: "var(--neutral-500)", fontSize: 15 }}>
            {mode === "signup"
              ? "Create your account to start planning"
              : "Welcome back. Sign in to continue."}
          </p>
        </div>

        <div style={toggleRowStyle}>
          <button
            className="btn"
            style={mode === "signup" ? tabActiveStyle : tabStyle}
            onClick={() => { setMode("signup"); setError(null); }}
          >
            Sign up
          </button>
          <button
            className="btn"
            style={mode === "signin" ? tabActiveStyle : tabStyle}
            onClick={() => { setMode("signin"); setError(null); }}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
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
          onClick={onSkipLogin}
        >
          Skip login for demo
        </button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-6)",
  background: "var(--neutral-0)",
  position: "relative",
};

const themeToggleStyle: React.CSSProperties = {
  position: "absolute",
  top: "var(--space-5)",
  right: "var(--space-5)",
  padding: "var(--space-2)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "var(--neutral-0)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--neutral-200)",
  boxShadow: "var(--shadow-md)",
  padding: "var(--space-10) var(--space-8)",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-1)",
  background: "var(--neutral-100)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-1)",
  marginBottom: "var(--space-6)",
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "6px",
  fontWeight: 500,
  fontSize: 14,
  color: "var(--neutral-500)",
  background: "transparent",
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: "var(--neutral-0)",
  color: "var(--accent-600)",
  boxShadow: "var(--shadow-sm)",
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
