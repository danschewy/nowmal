"use client";

import { useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import type { View } from "@/lib/domain/types";
import type {
  WorkspaceDraftSummary,
  WorkspaceThreadSummary,
  WorkspaceWorkItemSummary,
} from "@/lib/workspace/snapshot";
import { useWorkspaceData } from "./WorkspaceData";
import { ActionButton, Eyebrow, Lede, PageHeading, SectionLabel, StatusSquare } from "./ui";

export function ConnectedWorkspaceScreen({
  accountEmail,
  view,
}: {
  accountEmail: string;
  view: View;
}) {
  switch (view) {
    case "brief":
      return <ConnectedBriefScreen />;
    case "now":
      return <ConnectedNowScreen />;
    case "promises":
      return <ConnectedItemsScreen kind="promise" />;
    case "pipeline":
      return <ConnectedTrackersScreen />;
    case "mail":
      return <ConnectedMailScreen accountEmail={accountEmail} />;
    case "tasks":
    default:
      return <ConnectedItemsScreen kind="task" />;
  }
}

export function ConnectedSearchScreen() {
  const { snapshot } = useWorkspaceData();
  const { state, patch } = useDemoStore();
  const query = state.query.trim().toLowerCase();
  const items = (snapshot?.workItems ?? []).filter((item) =>
    `${item.title} ${metadataText(item.metadata)}`.toLowerCase().includes(query),
  );
  const threads = (snapshot?.threads ?? []).filter((thread) =>
    `${thread.subject} ${thread.participants.join(" ")} ${thread.snippet}`
      .toLowerCase()
      .includes(query),
  );
  const count = items.length + threads.length;

  return (
    <div className="screen screen-search">
      <Eyebrow>Search · your indexed Gmail workspace</Eyebrow>
      <h1>{count ? `${count} ${count === 1 ? "result" : "results"} for “${state.query}”` : `No results for “${state.query}”`}</h1>
      <div className="search-results">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              patch({
                view: item.kind === "task" ? "tasks" : "promises",
                openTaskId: item.kind === "task" ? item.id : null,
                query: "",
              })
            }
          >
            <span>{item.kind === "task" ? "Task" : "Promise"}</span>
            <span><strong>{item.title}</strong><small>{itemStatusLabel(item.status)} · {formatDue(item.dueAt)}</small></span>
          </button>
        ))}
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => patch({ view: "mail", openThreadId: thread.id, query: "" })}
          >
            <span>Thread</span>
            <span><strong>{thread.subject}</strong><small>{thread.participants.join(", ")} · {thread.snippet}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectedBriefScreen() {
  const { snapshot } = useWorkspaceData();
  const { patch } = useDemoStore();
  const openItems = (snapshot?.workItems ?? []).filter(
    (item) => item.status !== "done" && item.status !== "incorrect",
  );
  const recentThreads = snapshot?.threads.slice(0, 4) ?? [];

  return (
    <div className="screen">
      <div className="screen-inner-760">
        <Eyebrow>Brief · your connected Gmail</Eyebrow>
        <PageHeading>{openItems.length ? `${openItems.length} open ${openItems.length === 1 ? "item" : "items"} need a look.` : "Your recent mail is indexed."}</PageHeading>
        <Lede>
          This brief is built from your stored Gmail index. It never falls back to the public
          sample workspace.
        </Lede>
        <div className="brief-list">
          {openItems.slice(0, 6).map((item) => (
            <button key={item.id} type="button" onClick={() => patch({ view: item.kind === "task" ? "tasks" : "promises" })}>
              <span className="brief-tag brief-tag-moved">{item.kind === "task" ? "Task" : "Promise"}</span>
              <span>{item.title}</span>
            </button>
          ))}
          {!openItems.length
            ? recentThreads.map((thread) => (
                <button key={thread.id} type="button" onClick={() => patch({ view: "mail", openThreadId: thread.id })}>
                  <span className="brief-tag brief-tag-new">Mail</span>
                  <span>{thread.subject}</span>
                </button>
              ))
            : null}
        </div>
        {!openItems.length && !recentThreads.length ? (
          <ConnectedEmpty
            title="No indexed mail yet"
            body="Go to Setup and run the first bounded Gmail sync."
          />
        ) : null}
      </div>
    </div>
  );
}

function ConnectedItemsScreen({ kind }: { kind: "task" | "promise" }) {
  const { snapshot, refresh } = useWorkspaceData();
  const { state, patch, notify } = useDemoStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const items = (snapshot?.workItems ?? []).filter((item) => item.kind === kind);
  const isTask = kind === "task";

  const updateItem = async (
    item: WorkspaceWorkItemSummary,
    action: "done" | "incorrect" | "restore",
  ) => {
    setUpdatingId(item.id);
    try {
      const response = await fetch(`/api/workspace/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Item could not be updated.");
      await refresh();
      notify(
        action === "done"
          ? `Marked done: ${item.title}`
          : action === "incorrect"
            ? `Removed as an incorrect inference: ${item.title}`
            : `Restored: ${item.title}`,
      );
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Item could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="screen">
      <Eyebrow>{isTask ? "Tasks · from your connected Gmail" : "Promises · from your sent mail"}</Eyebrow>
      <PageHeading>{isTask ? "Requests and follow-ups found in your mail." : "Commitments found in your replies."}</PageHeading>
      <div className="tasks-subline">
        {items.filter((item) => item.status !== "done" && item.status !== "incorrect").length} open · {items.length} total
      </div>

      {!items.length ? (
        <ConnectedEmpty
          title={isTask ? "No tasks found yet" : "No promises found yet"}
          body={snapshot?.analysis.pendingThreadCount
            ? `Your real Gmail is indexed, but ${snapshot.analysis.pendingThreadCount} threads still need analysis. Open Setup to find source-backed tasks and promises.`
            : "Nowmal analyzed the bounded Gmail index and did not find a sufficiently clear open item. The public sample stays hidden."}
        />
      ) : (
        <div className="task-list connected-task-list">
          {items.map((item) => {
            const open = state.openTaskId === item.id;
            return (
              <article key={item.id} className={`task-item ${open ? "expanded" : ""}`}>
                <button
                  className="task-summary"
                  type="button"
                  aria-expanded={open}
                  onClick={() => patch({ openTaskId: open ? null : item.id })}
                >
                  <StatusSquare status={statusSquare(item.status)} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{itemStatusLabel(item.status)}{item.confidence === null ? "" : ` · ${Math.round(item.confidence * 100)}% confidence`}</small>
                  </span>
                  <span>{formatDue(item.dueAt)}</span>
                </button>
                {open ? (
                  <div className="task-detail connected-task-detail">
                    <div>
                      <SectionLabel>Evidence from Gmail</SectionLabel>
                      {item.evidence.map((evidence) => (
                        <div className="connected-evidence" key={`${evidence.gmailMessageId}-${evidence.quote}`}>
                          <blockquote>“{evidence.quote}”</blockquote>
                          <div className="evidence-source">
                            {evidence.sender} · {evidence.subject} · {formatDate(evidence.sentAt)}
                          </div>
                          <a
                            href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(evidence.gmailThreadId)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open source thread
                          </a>
                        </div>
                      ))}
                      {!item.evidence.length ? <p>No evidence quote was stored for this item.</p> : null}
                    </div>
                    <div>
                      <SectionLabel>Stored context</SectionLabel>
                      <dl>
                        {Object.entries(item.metadata).filter(([key]) => key !== "analysis").map(([key, value]) => (
                          <div key={key}><dt>{humanize(key)}</dt><dd>{formatMetadata(value)}</dd></div>
                        ))}
                      </dl>
                      {!Object.keys(item.metadata).filter((key) => key !== "analysis").length ? <p>No additional context was stored for this item.</p> : null}
                      <div className="task-actions">
                        {item.status === "done" || item.status === "incorrect" ? (
                          <ActionButton
                            disabled={updatingId === item.id}
                            onClick={() => void updateItem(item, "restore")}
                          >
                            Restore
                          </ActionButton>
                        ) : (
                          <>
                            <ActionButton
                              tone="solid"
                              disabled={updatingId === item.id}
                              onClick={() => void updateItem(item, "done")}
                            >
                              Mark done
                            </ActionButton>
                            <ActionButton
                              disabled={updatingId === item.id}
                              onClick={() => void updateItem(item, "incorrect")}
                            >
                              {isTask ? "Not a task" : "Not a promise"}
                            </ActionButton>
                          </>
                        )}
                      </div>
                      <p className="correction-note">
                        Your correction is stored separately and will not be overwritten by reanalysis.
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConnectedNowScreen() {
  const { snapshot } = useWorkspaceData();
  const drafts = snapshot?.drafts ?? [];
  const active = drafts.filter((draft) => !["sent", "cancelled"].includes(draft.state));

  return (
    <div className="screen">
      <div className="screen-inner-800">
        <Eyebrow>Now · real drafts from your workspace</Eyebrow>
        <PageHeading>{active.length ? `${active.length} ${active.length === 1 ? "draft" : "drafts"} waiting for review.` : "No drafts are waiting."}</PageHeading>
        {!active.length ? (
          <ConnectedEmpty
            title="Nothing needs approval"
            body="Ask Eve to prepare a reply. Drafting does not grant permission to send it."
          />
        ) : (
          <div className="connected-draft-list">
            {active.map((draft) => <ConnectedDraft key={draft.id} draft={draft} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectedDraft({ draft }: { draft: WorkspaceDraftSummary }) {
  return (
    <article className="draft-card connected-draft-card">
      <div><span>To</span><strong>{draft.to}</strong></div>
      <div><span>Subject</span><strong>{draft.subject}</strong></div>
      <div className="draft-body">{draft.body}</div>
      <footer>
        <span>{draftStateLabel(draft.state)}</span>
        <span>{draft.unresolvedCheckCount ? `${draft.unresolvedCheckCount} checks left` : "Checks clear"}</span>
      </footer>
    </article>
  );
}

function ConnectedTrackersScreen() {
  return (
    <div className="screen">
      <Eyebrow>Trackers · your connected workspace</Eyebrow>
      <ConnectedEmpty
        title="No trackers yet"
        body="Trackers will appear only after a repeated multi-thread process has been identified and you accept it."
      />
    </div>
  );
}

function ConnectedMailScreen({ accountEmail }: { accountEmail: string }) {
  const { snapshot } = useWorkspaceData();
  const { state, patch } = useDemoStore();
  const threads = snapshot?.threads ?? [];

  return (
    <div className="screen">
      <Eyebrow>Mail · {snapshot?.threadCount ?? 0} indexed Gmail {snapshot?.threadCount === 1 ? "thread" : "threads"}</Eyebrow>
      <PageHeading>Your recent Gmail, indexed and ready.</PageHeading>
      <Lede>
        These are your real synced conversations. The public sample appears only on the no-account demo.
      </Lede>

      {!threads.length ? (
        <ConnectedEmpty title="No mail indexed yet" body="Run a Gmail sync from Setup to load the bounded recent window." />
      ) : (
        <div className="thread-list connected-thread-list">
          {threads.map((thread) => {
            const open = state.openThreadId === thread.id;
            return (
              <article key={thread.id}>
                <button type="button" onClick={() => patch({ openThreadId: open ? null : thread.id })} aria-expanded={open}>
                  <span><strong>{threadParticipant(thread, accountEmail)}</strong><small>{formatDate(thread.latestMessageAt)}</small></span>
                  <span><strong>{thread.subject}</strong><small><i />{thread.snippet || "No preview available"}</small></span>
                  <span className="thread-filed">{thread.analyzed ? "Analyzed" : "Indexed"}</span>
                </button>
                {open ? (
                  <div className="thread-reader">
                    <div>Latest Gmail preview</div>
                    <blockquote>“{thread.snippet || "No preview available."}”</blockquote>
                    <div>
                      <a
                        className="action-button action-solid"
                        href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(thread.gmailThreadId)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Gmail
                      </a>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConnectedEmpty({ title, body }: { title: string; body: string }) {
  return <div className="tracker-empty connected-empty"><h1>{title}</h1><p>{body}</p></div>;
}

function threadParticipant(thread: WorkspaceThreadSummary, accountEmail: string) {
  const other = thread.participants.find(
    (participant) => !participant.toLowerCase().includes(accountEmail.toLowerCase()),
  );
  return (other ?? thread.participants[0] ?? "Unknown sender").replace(/\s*<[^>]+>\s*$/, "");
}

function statusSquare(status: WorkspaceWorkItemSummary["status"]): "now" | "wait" | "later" | "done" {
  if (status === "needs_you") return "now";
  if (status === "waiting") return "wait";
  if (status === "done") return "done";
  return "later";
}

function itemStatusLabel(status: WorkspaceWorkItemSummary["status"]) {
  return ({
    needs_you: "Needs you",
    waiting: "Waiting",
    later: "Later",
    done: "Done",
    incorrect: "Not a task",
  } as const)[status];
}

function draftStateLabel(state: WorkspaceDraftSummary["state"]) {
  return ({
    queued: "Waiting for checks",
    cleared: "Ready for approval",
    sending: "Sending",
    sent: "Sent",
    cancelled: "Cancelled",
    uncertain: "Check Gmail Sent",
  } as const)[state];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDue(value: string | null) {
  return value ? `Due ${formatDate(value)}` : "No due date";
}

function metadataText(metadata: Record<string, unknown>) {
  return Object.values(metadata).map(String).join(" ");
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatMetadata(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
