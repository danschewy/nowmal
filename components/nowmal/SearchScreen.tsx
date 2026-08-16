"use client";

import { PROMISES, TASKS, THREADS, TRACKERS } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { Eyebrow } from "./ui";

interface SearchResult {
  key: string;
  kind: string;
  title: string;
  sub: string;
  go: () => void;
}

export function SearchScreen() {
  const { state, patch } = useDemoStore();
  const query = state.query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const task of TASKS) {
    if (`${task.title} ${task.company}`.toLowerCase().includes(query)) {
      results.push({
        key: `task-${task.id}`,
        kind: "Task",
        title: task.title,
        sub: `${task.company} · ${task.stage} · due ${task.due}`,
        go: () => patch({ view: "tasks", filter: "all", openTaskId: task.id, query: "" }),
      });
    }
  }
  for (const promise of PROMISES) {
    if (`${promise.quote} ${promise.to}`.toLowerCase().includes(query)) {
      results.push({
        key: `promise-${promise.id}`,
        kind: "Promise",
        title: `“${promise.quote}”`,
        sub: `You wrote this ${promise.said} to ${promise.to}`,
        go: () => patch({ view: "promises", promFilter: "all", query: "" }),
      });
    }
  }
  for (const [clusterId, threads] of Object.entries(THREADS)) {
    for (const thread of threads) {
      if (`${thread.subject} ${thread.from} ${thread.eve}`.toLowerCase().includes(query)) {
        results.push({
          key: `thread-${thread.id}`,
          kind: "Thread",
          title: thread.subject,
          sub: `${thread.from} · ${thread.when} · ${thread.eve}`,
          go: () =>
            patch({
              view: "mail",
              clusterId,
              openThreadId: thread.id,
              query: "",
            }),
        });
      }
    }
  }
  for (const tracker of Object.values(TRACKERS)) {
    for (const row of tracker.rows) {
      if (`${row.name} ${row.role}`.toLowerCase().includes(query)) {
        results.push({
          key: `tracked-${tracker.id}-${row.id}`,
        kind: "Tracker",
          title: row.name,
          sub: `${row.role} · ${row.stage}`,
          go: () => patch({ view: "pipeline", trackerId: tracker.id, query: "" }),
        });
      }
    }
  }

  return (
    <div className="screen screen-search">
      <Eyebrow>Search · tasks, promises, mail, and trackers</Eyebrow>
      <h1>{results.length ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${state.query}”` : `No results for “${state.query}”`}</h1>
      <div className="search-results">
        {results.map((result) => (
          <button key={result.key} type="button" onClick={result.go}>
            <span>{result.kind}</span>
            <span>
              <strong>{result.title}</strong>
              <small>{result.sub}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
