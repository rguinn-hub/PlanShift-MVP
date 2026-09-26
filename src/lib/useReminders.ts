import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Reminder } from "../lib/types";

interface DismissedReminder {
  id: string;
  dismissedAt: string;
}

export function useReminders(userId: string, demoMode: boolean) {
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [missedReminders, setMissedReminders] = useState<Reminder[]>([]);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadReminders = useCallback(async () => {
    if (demoMode) {
      const stored = localStorage.getItem("planshift-demo-reminders");
      if (stored) {
        try {
          const all = JSON.parse(stored) as Reminder[];
          const dismissedIds = getDismissedIds();
          const now = new Date();
          const due = all.filter((r) => !r.dismissed && !dismissedIds.includes(r.id) && new Date(r.scheduled_for) <= now);
          const missed = all.filter((r) => !r.dismissed && !dismissedIds.includes(r.id) && new Date(r.scheduled_for) <= now && new Date(r.scheduled_for) < new Date(now.getTime() - 60000));
          setActiveReminders(due);
          setMissedReminders(missed);
        } catch { /* empty */ }
      }
      return;
    }

    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("scheduled_for", { ascending: true });

    if (error) {
      console.error("Failed to load reminders:", error.message);
      return;
    }

    const all = (data as Reminder[]) || [];
    const dismissedIds = getDismissedIds();
    const now = new Date();
    const due = all.filter((r) => !dismissedIds.includes(r.id) && new Date(r.scheduled_for) <= now);
    setActiveReminders(due);
  }, [userId, demoMode]);

  useEffect(() => {
    loadReminders();
    checkIntervalRef.current = setInterval(loadReminders, 30000);
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [loadReminders]);

  const dismissReminder = useCallback(async (reminderId: string) => {
    addDismissedId(reminderId);
    setActiveReminders((prev) => prev.filter((r) => r.id !== reminderId));
    setMissedReminders((prev) => prev.filter((r) => r.id !== reminderId));

    if (demoMode) return;

    const { error } = await supabase
      .from("reminders")
      .update({ dismissed: true })
      .eq("id", reminderId);
    if (error) console.error("Failed to dismiss reminder:", error.message);
  }, [demoMode]);

  return { activeReminders, missedReminders, dismissReminder, loadReminders };
}

function getDismissedIds(): string[] {
  try {
    const stored = localStorage.getItem("planshift-dismissed-reminders");
    if (!stored) return [];
    const parsed = JSON.parse(stored) as DismissedReminder[];
    const oneWeekAgo = Date.now() - 7 * 86400000;
    return parsed.filter((d) => new Date(d.dismissedAt).getTime() > oneWeekAgo).map((d) => d.id);
  } catch {
    return [];
  }
}

function addDismissedId(id: string) {
  try {
    const stored = localStorage.getItem("planshift-dismissed-reminders");
    const existing = stored ? (JSON.parse(stored) as DismissedReminder[]) : [];
    const updated = [...existing.filter((d) => d.id !== id), { id, dismissedAt: new Date().toISOString() }];
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const filtered = updated.filter((d) => new Date(d.dismissedAt).getTime() > oneWeekAgo);
    localStorage.setItem("planshift-dismissed-reminders", JSON.stringify(filtered));
  } catch { /* empty */ }
}
