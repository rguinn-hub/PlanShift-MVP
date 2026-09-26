import { useState, useEffect } from "react";
import { Sun, Moon, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Logo";

interface Props {
  onSkipLogin: () => void;
}

type AuthView = "signin" | "signup" | "forgot" | "reset";

export default function AuthScreen({ onSkipLogin }: Props) {
  const [view, setView] = useState<AuthView>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("planshift-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = saved === "dark" || (!saved && prefersDark);
    setDarkMode(useDark);
    document.documentElement.classList.toggle("dark", useDark);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const error_code = params.get("error_code");
    const error_desc = params.get("error_description");

    if (type === "recovery") {
      setView("reset");
    } else if (error_code || error_desc) {
      setView("signin");
      setError(error_desc || "The reset link is invalid or has expired. Please request a new one.");
    }

    if (type === "recovery" || error_code) {
      window.history.replaceState({}, "", window.location.pathname);
    }
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
    setMessage(null);
    setLoading(true);

    try {
      if (view === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created! You can now sign in.");
        setView("signin");
      } else if (view === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage("Reset link sent! Check your email for a password reset link.");
      } else if (view === "reset") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated! You can now sign in with your new password.");
        setView("signin");
        setPassword("");
        setConfirmPassword("");
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
            {view === "signup" && "Create your account to start planning"}
            {view === "signin" && "Welcome back. Sign in to continue."}
            {view === "forgot" && "Enter your email to get a reset link"}
            {view === "reset" && "Set your new password"}
          </p>
        </div>

        {(view === "signup" || view === "signin") && (
          <div style={toggleRowStyle}>
            <button
              className="btn"
              style={view === "signup" ? tabActiveStyle : tabStyle}
              onClick={() => { setView("signup"); setError(null); setMessage(null); }}
            >
              Sign up
            </button>
            <button
              className="btn"
              style={view === "signin" ? tabActiveStyle : tabStyle}
              onClick={() => { setView("signin"); setError(null); setMessage(null); }}
            >
              Sign in
            </button>
          </div>
        )}

        {(view === "forgot" || view === "reset") && (
          <button
            className="btn btn-ghost"
            style={{ marginBottom: "var(--space-4)", padding: "var(--space-1) var(--space-2)", fontSize: 14 }}
            onClick={() => { setView("signin"); setError(null); setMessage(null); }}
          >
            <ArrowLeft size={16} />
            Back to sign in
          </button>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {(view === "signup" || view === "signin" || view === "forgot") && (
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
          )}

          {(view === "signup" || view === "signin") && (
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
                autoComplete={view === "signup" ? "new-password" : "current-password"}
              />
            </div>
          )}

          {view === "reset" && (
            <>
              <div>
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          {message && (
            <div style={messageStyle}>
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? "Please wait..." :
              view === "signup" ? "Create account" :
              view === "signin" ? "Sign in" :
              view === "forgot" ? "Send reset link" :
              "Update password"}
          </button>
        </form>

        {view === "signin" && (
          <div style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 14, color: "var(--accent-600)" }}
              onClick={() => { setView("forgot"); setError(null); setMessage(null); }}
            >
              Forgot password?
            </button>
          </div>
        )}

        {view === "forgot" && message && (
          <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 14, color: "var(--accent-600)" }}
              onClick={() => { setView("forgot"); setError(null); setMessage(null); setEmail(""); }}
            >
              <Mail size={14} />
              Send another link
            </button>
          </div>
        )}

        {(view === "signup" || view === "signin") && (
          <>
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
          </>
        )}

        {view === "signup" && (
          <p style={{ fontSize: 13, color: "var(--neutral-400)", textAlign: "center", marginTop: "var(--space-3)" }}>
            By creating an account, you agree to use PlanShift for your marketing planning.
          </p>
        )}
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
  background: "var(--bg-page)",
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

const messageStyle: React.CSSProperties = {
  background: "var(--accent-50)",
  color: "var(--accent-700)",
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
