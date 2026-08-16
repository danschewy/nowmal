"use client";

import { useState } from "react";
import { CLUSTERS, CLUSTER_SUGGESTIONS, THREADS } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, PageHeading } from "../ui";

export function MailScreen() {
  const { state, setState, patch, notify } = useDemoStore();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const suggestedClusters = CLUSTER_SUGGESTIONS.filter((suggestion) =>
    state.acceptedClusters.includes(suggestion.id),
  ).map((suggestion) => ({
    id: suggestion.id,
    name: suggestion.name,
    count: suggestion.count,
    note: suggestion.reason,
  }));
  const allClusters = [...CLUSTERS, ...suggestedClusters].filter(
    (cluster) => !state.deletedClusters.includes(cluster.id),
  );
  const cluster = allClusters.find((item) => item.id === state.clusterId) ?? allClusters[0];
  const dismissedThreadIds = state.dismissedSuggestions.filter((id) => id.startsWith("thread:"));
  const threads = (THREADS[cluster?.id ?? "search"] ?? []).filter(
    (thread) => state.showBin || !dismissedThreadIds.includes(`thread:${thread.id}`),
  );
  const suggestions = CLUSTER_SUGGESTIONS.filter(
    (suggestion) =>
      !state.acceptedClusters.includes(suggestion.id) &&
      !state.dismissedSuggestions.includes(suggestion.id),
  );

  if (!cluster) return null;

  const commitRename = () => {
    const value = renameValue.trim();
    if (value) patch({ clusterNames: { ...state.clusterNames, [cluster.id]: value } });
    setRenaming(false);
  };

  return (
    <div className="screen">
      <Eyebrow>Mail · 275 sample threads, {allClusters.length} groups</Eyebrow>
      <PageHeading>See conversations by topic, not arrival time.</PageHeading>

      {suggestions.length ? (
        <section className="cluster-suggestions">
          <div>Suggested groups</div>
          {suggestions.map((suggestion) => (
            <article key={suggestion.id}>
              <span />
              <div>
                <strong>{suggestion.name}</strong>
                <small>{suggestion.countLabel}</small>
                <p>{suggestion.reason}</p>
              </div>
              <div>
                <ActionButton
                  tone="solid"
                  onClick={() => {
                    patch({ acceptedClusters: [...state.acceptedClusters, suggestion.id], clusterId: suggestion.id });
                    notify(`Created group: ${suggestion.name}`, { kind: "accept-cluster", id: suggestion.id });
                  }}
                >Create group</ActionButton>
                <ActionButton onClick={() => patch({ dismissedSuggestions: [...state.dismissedSuggestions, suggestion.id] })}>Dismiss</ActionButton>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <div className="cluster-grid" style={{ gridTemplateColumns: `repeat(${Math.min(allClusters.length, 4)}, 1fr)` }}>
        {allClusters.map((item) => {
          const selected = item.id === cluster.id;
          const muted = state.mutedClusters.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`${selected ? "active" : ""} ${muted ? "muted" : ""}`}
              onClick={() => patch({ clusterId: item.id, openThreadId: null })}
            >
              <span><strong>{state.clusterNames[item.id] ?? item.name}</strong><small>{muted ? "muted" : item.count}</small></span>
              <p>{item.note}</p>
            </button>
          );
        })}
      </div>

      <div className="cluster-actions">
        {renaming ? (
          <>
            <input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && commitRename()}
            />
            <ActionButton tone="solid" onClick={commitRename}>Save</ActionButton>
          </>
        ) : (
          <>
            <strong>{state.clusterNames[cluster.id] ?? cluster.name}</strong>
            <button type="button" onClick={() => { setRenameValue(state.clusterNames[cluster.id] ?? cluster.name); setRenaming(true); }}>Rename</button>
            <button
              type="button"
              onClick={() =>
                patch({
                  mutedClusters: state.mutedClusters.includes(cluster.id)
                    ? state.mutedClusters.filter((id) => id !== cluster.id)
                    : [...state.mutedClusters, cluster.id],
                })
              }
            >{state.mutedClusters.includes(cluster.id) ? "Unmute" : "Mute"}</button>
            <button
              type="button"
              onClick={() => {
                const fallback = allClusters.find((item) => item.id !== cluster.id)?.id ?? "rest";
                patch({ deletedClusters: [...state.deletedClusters, cluster.id], clusterId: fallback });
                notify(`Deleted group: ${cluster.name}`, { kind: "delete-cluster", id: cluster.id });
              }}
            >Delete</button>
          </>
        )}
        <span>Deleting a group never deletes mail. Its threads return to Everything Else.</span>
      </div>

      {dismissedThreadIds.length ? (
        <button className="show-bin" type="button" onClick={() => patch({ showBin: !state.showBin })}>
          {state.showBin ? "Hide dismissed" : `${dismissedThreadIds.length} dismissed · show them`}
        </button>
      ) : null}

      <div className="thread-list">
        {threads.map((thread) => {
          const open = state.openThreadId === thread.id;
          return (
            <article key={thread.id}>
              <button type="button" onClick={() => patch({ openThreadId: open ? null : thread.id })} aria-expanded={open}>
                <span><strong>{thread.from}</strong><small>{thread.when}</small></span>
                <span><strong>{thread.subject}</strong><small><i className={thread.task ? "task" : ""} />{thread.eve}</small></span>
                <span className={thread.task ? "thread-task" : "thread-filed"}>{thread.task ? "Task" : "Filed"}</span>
              </button>
              {open ? (
                <div className="thread-reader">
                  <div>{thread.task ? "Why this became a task" : "Why this stayed as mail"}</div>
                  <blockquote>“{thread.quote ?? thread.eve}”</blockquote>
                  <p>{thread.eve}</p>
                  <div>
                    <ActionButton tone="solid" onClick={() => notify("Connect your own Gmail to open the original thread")}>Open in Gmail</ActionButton>
                    <ActionButton
                      onClick={() => {
                        setState((current) => ({
                          ...current,
                          dismissedSuggestions: [...current.dismissedSuggestions, `thread:${thread.id}`],
                          openThreadId: null,
                        }));
                        notify("Stopped reading this thread");
                      }}
                    >Dismiss this thread</ActionButton>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
