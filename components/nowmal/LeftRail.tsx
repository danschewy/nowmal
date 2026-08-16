"use client";

import Link from "next/link";
import { TASKS } from "@/lib/demo/data";
import { product } from "@/lib/domain/config";
import { useDemoStore } from "@/lib/demo/store";
import type { View } from "@/lib/domain/types";
import { selectConnectedNowQueue } from "@/lib/workspace/now-queue";
import { buildConnectedTrackers } from "@/lib/workspace/workstreams";
import { useWorkspaceData } from "./WorkspaceData";

const primary: { view: View; label: string }[] = [
  { view: "brief", label: "Brief" },
  { view: "now", label: "Now" },
  { view: "tasks", label: "Tasks" },
  { view: "promises", label: "Promises" },
  { view: "pipeline", label: "Trackers" },
  { view: "mail", label: "Mail" },
];

const secondary: { view: View; label: string }[] = [
  { view: "setup", label: "Setup" },
  { view: "rules", label: "Rules" },
  { view: "agents", label: "Agents" },
];

export function LeftRail({
  accountEmail,
  mode,
}: {
  accountEmail: string;
  mode: "demo" | "connected";
}) {
  const { state, patch, reset } = useDemoStore();
  const { snapshot } = useWorkspaceData();
  const mailboxNeedsReview =
    mode === "connected" && snapshot?.mailboxStatus === "reauthorization_required";
  const activeTasks = mode === "demo"
    ? TASKS.filter(
        (task) => !state.doneTasks.includes(task.id) && !state.notTasks.includes(task.id),
      ).length
    : snapshot?.workItems.filter(
        (item) => item.kind === "task" && item.status !== "done" && item.status !== "incorrect",
      ).length ?? 0;
  const activePromises = mode === "demo"
    ? 6 - state.keptPromises.filter((id) => id !== "p7").length
    : snapshot?.workItems.filter(
        (item) => item.kind === "promise" && item.status !== "done" && item.status !== "incorrect",
      ).length ?? 0;
  const nowCount = mode === "demo"
    ? Math.max(0, 3 - state.nowIndex)
    : selectConnectedNowQueue(snapshot).count;
  const connectedTrackerCount = mode === "connected"
    ? buildConnectedTrackers(snapshot?.workItems ?? []).length
    : 0;
  const counts: Partial<Record<View, number>> = {
    brief: mode === "demo" ? (state.briefRead ? 0 : 6) : activeTasks + activePromises,
    now: nowCount,
    tasks: activeTasks,
    promises: activePromises,
    pipeline: mode === "demo" ? state.trackersOn.length : connectedTrackerCount,
    mail: mode === "demo" ? 275 : snapshot?.threadCount ?? state.threadCount,
  };

  const go = (view: View) => patch({ view, query: "", openThreadId: null });

  return (
    <aside className="left-rail">
      <div>
        <div className="wordmark">{product.name}</div>
        <div className="wordmark-sub">{product.subtitle}</div>
      </div>

      <label className="search-field">
        <span className="sr-only">Search tasks, people, or mail</span>
        <input
          value={state.query}
          onChange={(event) => patch({ query: event.target.value })}
          placeholder="Search tasks, people, or mail"
          type="search"
        />
      </label>

      <nav className="primary-nav" aria-label="Main navigation">
        {primary.map((item) => (
          <button
            key={item.view}
            className={state.view === item.view && !state.query ? "active" : ""}
            onClick={() => go(item.view)}
            type="button"
          >
            <span>{item.label}</span>
            <span className="nav-count">{counts[item.view] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="rail-spacer" />

      <nav className="secondary-nav" aria-label="Settings navigation">
        {secondary.map((item) => (
          <button
            key={item.view}
            className={state.view === item.view && !state.query ? "active" : ""}
            onClick={() => go(item.view)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="rail-footer">
        <div className="account-email">{accountEmail}</div>
        <div className="sync-line">
          <span className={`moss-dot ${mailboxNeedsReview ? "needs-review" : ""}`} />
          {mode === "demo"
            ? "SAMPLE INBOX · SAFE TO EXPLORE"
            : mailboxNeedsReview
              ? "GMAIL ACCESS NEEDS REVIEW"
              : state.connected
              ? "GMAIL CONNECTED · UP TO DATE"
              : "GMAIL READY TO CONNECT"}
        </div>
        <p>{product.principle.toUpperCase()}</p>
        {mode === "demo" ? (
          <div className="demo-links">
            <Link href="/workspace">Use your Gmail</Link>
            <button type="button" onClick={reset}>
              Reset sample
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
