import type { Task } from "./types";

export type TaskStatus = Task["status"];

export const statusLabel: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const statusBg = (status: TaskStatus): string => {
  switch (status) {
    case "todo": return "var(--status-todo-bg)";
    case "in_progress": return "var(--status-progress-bg)";
    case "done": return "var(--status-done-bg)";
  }
};

export const statusBorder = (status: TaskStatus): string => {
  switch (status) {
    case "todo": return "var(--status-todo-border)";
    case "in_progress": return "var(--status-progress-border)";
    case "done": return "var(--status-done-border)";
  }
};

export const statusText = (status: TaskStatus): string => {
  switch (status) {
    case "todo": return "var(--status-todo-text)";
    case "in_progress": return "var(--status-progress-text)";
    case "done": return "var(--status-done-text)";
  }
};

export const statusPillBg = (status: TaskStatus): string => {
  switch (status) {
    case "todo": return "var(--status-todo-pill-bg)";
    case "in_progress": return "var(--status-progress-pill-bg)";
    case "done": return "var(--status-done-pill-bg)";
  }
};

export const statusPillText = (status: TaskStatus): string => {
  switch (status) {
    case "todo": return "var(--status-todo-pill-text)";
    case "in_progress": return "var(--status-progress-pill-text)";
    case "done": return "var(--status-done-pill-text)";
  }
};

export const statusStrike = (status: TaskStatus): string => {
  return status === "done" ? "line-through" : "none";
};
