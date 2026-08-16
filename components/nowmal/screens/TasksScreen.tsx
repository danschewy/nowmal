"use client";

import { COLLISION, EVE_SCRIPT, TASKS } from "@/lib/demo/data";
import { useDemoStore, type TaskFilter } from "@/lib/demo/store";
import type { Task, TaskStatus } from "@/lib/domain/types";
import { ActionButton, Eyebrow, PageHeading, SectionLabel, StatusSquare } from "../ui";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All open" },
  { id: "now", label: "Needs you" },
  { id: "wait", label: "Waiting" },
  { id: "later", label: "Later" },
  { id: "done", label: "Done" },
];

export function TasksScreen() {
  const { state, setState, patch, notify } = useDemoStore();
  const statusOf = (task: Task): TaskStatus =>
    state.doneTasks.includes(task.id)
      ? "done"
      : task.status === "done"
        ? "now"
        : task.status;

  const visible = TASKS.filter((task) => {
    const wrong = state.notTasks.includes(task.id);
    if (state.filter === "wrong") return wrong;
    if (wrong) return false;
    const status = statusOf(task);
    if (state.filter === "all") return status !== "done";
    return status === state.filter;
  });

  const counts = TASKS.reduce(
    (all, task) => {
      if (state.notTasks.includes(task.id)) return all;
      all[statusOf(task)] += 1;
      return all;
    },
    { now: 0, wait: 0, later: 0, done: 0 },
  );

  const markDone = (task: Task) => {
    setState((current) => ({
      ...current,
      doneTasks: current.doneTasks.includes(task.id)
        ? current.doneTasks.filter((id) => id !== task.id)
        : [...current.doneTasks, task.id],
      openTaskId: null,
    }));
    if (!state.doneTasks.includes(task.id)) {
      notify(`Marked done: ${task.title}`, { kind: "task-done", id: task.id });
      window.setTimeout(() => {
        setState((current) =>
          current.toast?.undo?.kind === "task-done" && current.toast.undo.id === task.id
            ? { ...current, toast: null }
            : current,
        );
      }, 4200);
    }
  };

  const askEve = (task: Task) => {
    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: `you-task-${Date.now()}`,
          who: "You",
          text: `What did you act on for “${task.title}”?`,
        },
        {
          id: `eve-task-${Date.now()}`,
          who: "Eve",
          text: `I acted on “${task.evidence[1]}”. ${task.lineage}`,
        },
      ],
      chips: ["Draft a reply", "What else is quiet?"],
    }));
  };

  const resolveCollision = () => {
    const scripted = EVE_SCRIPT["Ask Ostler Lane to move the references to Monday"];
    setState((current) => ({
      ...current,
      collisionGone: true,
      messages: [
        ...current.messages,
        {
          id: `you-collision-${Date.now()}`,
          who: "You",
          text: "Ask Ostler Lane to move the references to Monday",
        },
        {
          id: `eve-collision-${Date.now()}`,
          who: "Eve",
          text: scripted.text,
          draft: scripted.draft,
        },
      ],
      chips: [...(scripted.chips ?? [])],
    }));
    notify("Drafted: ask Ostler Lane for Monday");
  };

  return (
    <div className="screen">
      <div className="tasks-header">
        <Eyebrow>Tasks · found in your inbox</Eyebrow>
        <div className="pull-control">
          <div>
            <button
              type="button"
              className={state.pull === "live" ? "active" : ""}
              onClick={() => patch({ pull: "live" })}
            >
              <span className={state.pull === "live" ? "live-dot" : ""} /> Live
            </button>
            <button
              type="button"
              className={state.pull === "scheduled" ? "active" : ""}
              onClick={() => patch({ pull: "scheduled" })}
            >
              Scheduled
            </button>
          </div>
          {state.pull === "scheduled" ? (
            <div className="cadence-row">
              {(["15 min", "Hourly", "9:00 & 16:00"] as const).map((cadence) => (
                <button
                  type="button"
                  className={state.cadence === cadence ? "active" : ""}
                  key={cadence}
                  onClick={() => patch({ cadence })}
                >
                  {cadence}
                </button>
              ))}
            </div>
          ) : null}
          <span className={state.pull === "live" ? "watching" : "paused"}>
            {state.pull === "live"
              ? "Up to date · 3 changed threads since 09:00"
              : `Updates paused · next check ${
                  state.cadence === "15 min"
                    ? "11:45"
                    : state.cadence === "Hourly"
                      ? "12:00"
                      : "16:00"
                }`}
          </span>
        </div>
      </div>

      <PageHeading>Every request, deadline, and follow-up in one place.</PageHeading>
      <div className="tasks-subline">
        {counts.now} need you · {counts.wait} waiting on someone else · {counts.later} later
      </div>

      {!state.collisionGone ? (
        <section className="collision-card">
          <div className="collision-title">
            <span />
            <strong>{COLLISION.day} needs the same two people twice</strong>
          </div>
          <div className="collision-rows">
            {COLLISION.rows.map(([who, what, why]) => (
              <div key={who}>
                <strong>{who}</strong>
                <span>{what}</span>
                <small>{why}</small>
              </div>
            ))}
          </div>
          <p>{COLLISION.note}</p>
          <div>
            <ActionButton tone="solid" onClick={resolveCollision}>
              Ask Ostler Lane for Monday
            </ActionButton>
            <ActionButton onClick={() => patch({ collisionGone: true })}>
              Both are fine
            </ActionButton>
          </div>
        </section>
      ) : null}

      <div className="filter-bar" role="group" aria-label="Task status filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={state.filter === filter.id ? "active" : ""}
            onClick={() => patch({ filter: filter.id })}
          >
            {filter.label}
          </button>
        ))}
        {state.notTasks.length ? (
          <button
            type="button"
            className={state.filter === "wrong" ? "active" : ""}
            onClick={() => patch({ filter: "wrong" })}
          >
            Not tasks
          </button>
        ) : null}
      </div>

      <div className="task-list">
        {visible.map((task) => {
          const status = statusOf(task);
          const open = state.openTaskId === task.id;
          const wrong = state.notTasks.includes(task.id);
          return (
            <article key={task.id} className={`task-item ${open ? "expanded" : ""}`}>
              <button
                className="task-summary"
                type="button"
                aria-expanded={open}
                onClick={() => patch({ openTaskId: open ? null : task.id })}
              >
                <StatusSquare status={wrong ? "later" : status} />
                <span>
                  <strong className={status === "done" || wrong ? "closed" : ""}>{task.title}</strong>
                  <small>
                    {task.company} · {task.stage} · {Math.round(task.confidence * 100)}% confidence
                  </small>
                </span>
                <span className={task.due === "Today" ? "due-today" : ""}>{task.due}</span>
              </button>

              {open ? (
                <div className="task-detail">
                  <div>
                    <SectionLabel>Evidence</SectionLabel>
                    <blockquote>
                      {task.evidence[0]}
                      <mark>{task.evidence[1]}</mark>
                      {task.evidence[2]}
                    </blockquote>
                    <div className="evidence-source">{task.source}</div>
                    <div className="lineage">
                      <span />
                      <p>{task.lineage}</p>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Stashed</SectionLabel>
                    <dl>
                      {task.fields.map(([key, value]) => (
                        <div key={`${task.id}-${key}`}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="task-actions">
                      <ActionButton tone="solid" onClick={() => markDone(task)}>
                        {status === "done" ? "Reopen" : "Mark done"}
                      </ActionButton>
                      <ActionButton onClick={() => askEve(task)}>Ask Eve</ActionButton>
                      <ActionButton
                        onClick={() =>
                          patch({
                            snoozingTaskId: state.snoozingTaskId === task.id ? null : task.id,
                          })
                        }
                      >
                        Snooze
                      </ActionButton>
                      <ActionButton
                        tone={wrong ? "danger" : "ghost"}
                        onClick={() => {
                          setState((current) => ({
                            ...current,
                            notTasks: wrong
                              ? current.notTasks.filter((id) => id !== task.id)
                              : [...current.notTasks, task.id],
                            openTaskId: wrong ? task.id : null,
                          }));
                          if (!wrong) notify("Eve recorded the correction", { kind: "not-task", id: task.id });
                        }}
                      >
                        {wrong ? "Put it back" : "Not a task"}
                      </ActionButton>
                    </div>
                    {state.snoozingTaskId === task.id ? (
                      <div className="snooze-options">
                        {["Tomorrow morning", "Monday", "A week", "When they reply"].map((label) => (
                          <ActionButton
                            key={label}
                            onClick={() => {
                              patch({ snoozingTaskId: null });
                              notify(`Snoozed: ${label}`);
                            }}
                          >
                            {label}
                          </ActionButton>
                        ))}
                      </div>
                    ) : null}
                    <p className="correction-note">
                      If this was not a real request, mark it Not a task. Eve will use the
                      <br />
                      correction to avoid the same mistake next time.
                    </p>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="dedupe-note">
        Built from 41 threads · 7 duplicate asks merged.
        <br />One request stays one task, even when it appears across several messages.
      </p>
    </div>
  );
}
