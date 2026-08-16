"use client";

import { useEffect, useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import type { View } from "@/lib/domain/types";
import type {
  WorkspaceDraftSummary,
  WorkspaceThreadSummary,
  WorkspaceWorkItemSummary,
} from "@/lib/workspace/snapshot";
import { selectConnectedNowQueue } from "@/lib/workspace/now-queue";
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

export function ConnectedRulesScreen() {
  const { snapshot } = useWorkspaceData();
  const corrections = snapshot?.correctionCount ?? 0;
  const analyzed = snapshot?.analysis.analyzedThreadCount ?? 0;
  const policies = [
    {
      label: "Index recent Gmail",
      description: "Runs only when you connect or refresh. The first pass is capped at 100 threads from 30 days; later passes ask Gmail only for changes.",
      value: snapshot?.mailboxStatus === "reauthorization_required" ? "Review access" : "You choose",
    },
    {
      label: "Find tasks and promises",
      description: "Runs only when you request analysis. A result is saved only above the confidence floor and with an exact quote from the bounded index.",
      value: "Suggest",
    },
    {
      label: "Merge duplicate obligations",
      description: "Uses a stable intent, counterparty, kind, and occurrence key. Every supporting source thread stays attached to the one resulting item.",
      value: "Automatic",
    },
    {
      label: "Keep your corrections",
      description: "Done and incorrect decisions are stored separately from model output, so a later analysis cannot silently undo them.",
      value: "Preserved",
    },
    {
      label: "Prepare replies",
      description: "Eve may queue a draft and its unresolved checks. A draft has no permission to leave Nowmal.",
      value: "Suggest",
    },
    {
      label: "Send email",
      description: "Requires separate Google send access, a cleared draft, and fresh approval for that exact send. Ambiguous attempts are never retried automatically.",
      value: snapshot?.sendEnabled ? "Approval only" : "Off",
    },
  ];

  return (
    <div className="screen">
      <div className="screen-inner-860">
        <Eyebrow>Rules · enforced workspace policy</Eyebrow>
        <PageHeading>See exactly what Nowmal may do.</PageHeading>
        <Lede>
          These are the connected workspace&apos;s real server boundaries—not sample switches.
          Reading, analysis, drafting, and sending remain separate actions.
        </Lede>

        <div className="rule-list connected-policy-list">
          {policies.map((policy) => (
            <article key={policy.label}>
              <div><strong>{policy.label}</strong><p>{policy.description}</p></div>
              <div className="policy-value">{policy.value}</div>
            </article>
          ))}
        </div>

        <section className="learned-section">
          <SectionLabel>Workspace record</SectionLabel>
          <div>
            <p><span className={analyzed ? "live" : ""} />{analyzed.toLocaleString()} indexed {analyzed === 1 ? "thread has" : "threads have"} passed the current evidence checks.</p>
            <p><span className={corrections ? "live" : ""} />{corrections ? `${corrections.toLocaleString()} ${corrections === 1 ? "correction is" : "corrections are"} preserved for this workspace.` : "No task or promise corrections have been recorded yet."}</p>
            <p><span className={snapshot?.sendEnabled ? "live" : ""} />Approved-send access is {snapshot?.sendEnabled ? "available behind the per-send gate" : "off"}.</p>
            <p><span className={snapshot?.mailboxStatus === "connected" ? "live" : ""} />Google read access is {snapshot?.mailboxStatus === "reauthorization_required" ? "ready to reconnect; the existing index is retained" : snapshot?.mailboxStatus === "connected" ? "current" : "not connected"}.</p>
          </div>
          <small>
            Nowmal records decisions; it does not claim to learn a new behavior until that
            behavior has a real, reviewable effect.
          </small>
        </section>

        <div className="rules-closing">
          <span />
          <p>Server policy is deliberately conservative. Sending never becomes an automatic rule.</p>
        </div>
      </div>
    </div>
  );
}

export function ConnectedSearchScreen() {
  const { snapshot } = useWorkspaceData();
  const { state, patch } = useDemoStore();
  const rawQuery = state.query.trim();
  const query = rawQuery.toLowerCase();
  const [serverResult, setServerResult] = useState<{
    expandedIndex: boolean;
    query: string;
    threads: WorkspaceThreadSummary[];
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const items = (snapshot?.workItems ?? []).filter((item) =>
    `${item.title} ${metadataText(item.metadata)}`.toLowerCase().includes(query),
  );
  const localThreads = (snapshot?.threads ?? []).filter((thread) =>
    `${thread.subject} ${thread.participants.join(" ")} ${thread.snippet}`
      .toLowerCase()
      .includes(query),
  );
  const threads = serverResult?.query === rawQuery ? serverResult.threads : localThreads;
  const count = items.length + threads.length;

  useEffect(() => {
    if (rawQuery.length < 2) {
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `/api/workspace/search?q=${encodeURIComponent(rawQuery)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as {
          error?: string;
          expandedIndex?: boolean;
          threads?: WorkspaceThreadSummary[];
        };
        if (!response.ok) throw new Error(result.error ?? "Search could not be completed.");
        setServerResult({
          expandedIndex: result.expandedIndex ?? false,
          query: rawQuery,
          threads: result.threads ?? [],
        });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setSearchError(cause instanceof Error ? cause.message : "Search could not be completed.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [rawQuery]);

  return (
    <div className="screen screen-search">
      <Eyebrow>Search · your indexed Gmail workspace</Eyebrow>
      <h1>{count ? `${count} ${count === 1 ? "result" : "results"} for “${state.query}”` : `No results for “${state.query}”`}</h1>
      <div className="connected-search-status" aria-live="polite">
        {searching
          ? "Searching the private index, then up to 10 matching Gmail conversations if needed…"
          : searchError
            ? `${searchError} Showing matches from the current workspace view.`
            : serverResult?.query === rawQuery && serverResult.expandedIndex
              ? "Found beyond the initial mailbox sample and added only the matching conversations to your private index."
              : "Matches include full message text in your private index, not only the recent mail on screen."}
      </div>
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
          <a
            key={thread.id}
            href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(thread.gmailThreadId)}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>Thread</span>
            <span><strong>{thread.subject}</strong><small>{thread.participants.join(", ")} · {thread.snippet}</small></span>
          </a>
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
  const { snapshot, refresh } = useWorkspaceData();
  const { notify } = useDemoStore();
  const queue = selectConnectedNowQueue(snapshot);
  const [handledIds, setHandledIds] = useState<Set<string>>(() => new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const drafts = queue.drafts.filter((draft) => !handledIds.has(draft.id));
  const workItems = queue.workItems.filter((item) => !handledIds.has(item.id));
  const activeDraft = drafts[0] ?? null;
  const activeItem = activeDraft ? null : workItems[0] ?? null;
  const remainingCount = drafts.length + workItems.length;
  const sessionTotal = handledIds.size + remainingCount;
  const progressDots = Math.min(sessionTotal, 8);

  const advance = (id: string) => {
    setHandledIds((current) => new Set(current).add(id));
  };

  const updateItem = async (
    item: WorkspaceWorkItemSummary,
    action: "done" | "incorrect",
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
      advance(item.id);
      await refresh();
      notify(action === "done" ? `Completed: ${item.title}` : `Removed: ${item.title}`);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Item could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!queue.count) {
    return (
      <div className="screen">
        <div className="screen-inner-800 now-complete">
          <Eyebrow>Now · Session complete</Eyebrow>
          <PageHeading>{handledIds.size ? "You finished this pass." : "You are caught up."}</PageHeading>
          <p>
            {handledIds.size
              ? `${handledIds.size} ${handledIds.size === 1 ? "decision is" : "decisions are"} recorded. Nothing else is waiting in Now.`
              : "No open source-backed task, promise, or draft is waiting for a decision."}
          </p>
        </div>
      </div>
    );
  }

  if (!activeDraft && !activeItem) {
    return (
      <div className="screen">
        <div className="screen-inner-800 now-complete">
          <Eyebrow>Now · Session complete</Eyebrow>
          <PageHeading>You made it through this pass.</PageHeading>
          <p>
            {handledIds.size} {handledIds.size === 1 ? "item was" : "items were"} completed,
            corrected, or intentionally skipped. Skipped work remains available next time.
          </p>
          <ActionButton tone="solid" onClick={() => setHandledIds(new Set())}>
            Review the queue again
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-inner-800">
        <Eyebrow>Now · One decision at a time</Eyebrow>
        <PageHeading>Give this one thing your full attention.</PageHeading>
        <Lede>
          Nowmal orders the work; you decide what is true and what happens next. Nothing is
          completed, corrected, or sent silently.
        </Lede>

        <div className="session-progress" aria-label={`${handledIds.size + 1} of ${sessionTotal}`}>
          <div>
            {Array.from({ length: progressDots }, (_, index) => (
              <span
                key={index}
                className={
                  index < Math.min(handledIds.size, progressDots - 1)
                    ? "done"
                    : index === Math.min(handledIds.size, progressDots - 1)
                      ? "current"
                      : ""
                }
              />
            ))}
          </div>
          <span>
            {handledIds.size + 1} of {sessionTotal} · {remainingCount - 1} after this
          </span>
        </div>

        {activeDraft ? (
          <section className="now-task connected-now-focus">
            <div className="connected-now-kind">Draft · {draftStateLabel(activeDraft.state)}</div>
            <h2>Review the reply to {activeDraft.to}</h2>
            <ConnectedDraft draft={activeDraft} />
            <div className="connected-now-guidance">
              <SectionLabel right={activeDraft.unresolvedCheckCount ? `${activeDraft.unresolvedCheckCount} left` : "Checks clear"}>
                Before anything can send
              </SectionLabel>
              <p>
                Use Eve at the right to inspect or answer the draft checks. Sending still requires
                your explicit confirmation for this exact draft.
              </p>
            </div>
            <footer className="gate-footer">
              <div>
                <ActionButton tone="ghost" onClick={() => advance(activeDraft.id)}>
                  Skip for now
                </ActionButton>
              </div>
              <p>The draft stays queued. Skipping cannot send it.</p>
            </footer>
          </section>
        ) : activeItem ? (
          <section className="now-task connected-now-focus">
            <div className="connected-now-kind">
              {activeItem.kind} · {itemStatusLabel(activeItem.status)} · {formatDue(activeItem.dueAt)}
            </div>
            <h2>{activeItem.title}</h2>
            {activeItem.evidence[0] ? (
              <div className="now-evidence">
                <span />
                <p>
                  “{activeItem.evidence[0].quote}”
                  <small>
                    {activeItem.evidence[0].sender} · {formatDate(activeItem.evidence[0].sentAt)}
                  </small>
                </p>
              </div>
            ) : (
              <p className="connected-now-no-evidence">No exact source quote is attached to this item.</p>
            )}

            <div className="connected-now-context">
              <SectionLabel right={`${activeItem.evidence.length} verified ${activeItem.evidence.length === 1 ? "source" : "sources"}`}>
                What Nowmal knows
              </SectionLabel>
              <dl>
                {Object.entries(activeItem.metadata)
                  .filter(([key]) => key !== "analysis")
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <div key={key}><dt>{humanize(key)}</dt><dd>{formatMetadata(value)}</dd></div>
                  ))}
              </dl>
              {activeItem.evidence[0] ? (
                <a
                  href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(activeItem.evidence[0].gmailThreadId)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source thread
                </a>
              ) : null}
            </div>

            <footer className="gate-footer">
              <div>
                <ActionButton
                  tone="solid"
                  disabled={updatingId === activeItem.id}
                  onClick={() => void updateItem(activeItem, "done")}
                >
                  Mark done
                </ActionButton>
                <ActionButton
                  disabled={updatingId === activeItem.id}
                  onClick={() => void updateItem(activeItem, "incorrect")}
                >
                  Not {activeItem.kind === "task" ? "a task" : "a promise"}
                </ActionButton>
                <ActionButton tone="ghost" disabled={updatingId === activeItem.id} onClick={() => advance(activeItem.id)}>
                  Skip for now
                </ActionButton>
              </div>
              <p>Your decision is preserved across later Gmail analysis.</p>
            </footer>
          </section>
        ) : null}
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
  const { snapshot } = useWorkspaceData();
  const { patch } = useDemoStore();
  const items = (snapshot?.workItems ?? []).filter((item) => item.status !== "incorrect");
  const grouped = groupWorkstreams(items);

  return (
    <div className="screen">
      <Eyebrow>Trackers · repeated workstreams</Eyebrow>
      <PageHeading>{grouped.length ? `${grouped.length} repeated ${grouped.length === 1 ? "workstream" : "workstreams"}.` : "No repeated workstream yet."}</PageHeading>
      <Lede>
        Nowmal groups the same counterparty across obligations and source threads. It will not
        invent a pipeline or stage from a single conversation.
      </Lede>
      {!items.length ? (
        <ConnectedEmpty
          title="Nothing to group yet"
          body={snapshot?.analysis.pendingThreadCount
            ? "The bounded Gmail index still needs analysis. Tasks and promises must exist before Nowmal can find a repeated workstream."
            : "The current evidence did not support a repeated process."}
        />
      ) : !grouped.length ? (
        <ConnectedEmpty
          title={`${items.length} ${items.length === 1 ? "item is" : "items are"} still independent`}
          body="A workstream appears only when at least two obligations share a stable counterparty or one obligation is supported by several threads."
        />
      ) : (
        <div className="connected-workstreams">
          {grouped.map((group) => (
            <article key={group.key}>
              <header>
                <div><strong>{group.name}</strong><small>{group.threadCount} source {group.threadCount === 1 ? "thread" : "threads"}</small></div>
                <span>{group.openCount} open</span>
              </header>
              <div className="workstream-stats">
                <span>{group.tasks} {group.tasks === 1 ? "task" : "tasks"}</span>
                <span>{group.promises} {group.promises === 1 ? "promise" : "promises"}</span>
                <span>{group.done} done</span>
              </div>
              <ul>
                {group.items.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <StatusSquare status={statusSquare(item.status)} />
                    <button type="button" onClick={() => patch({ view: item.kind === "task" ? "tasks" : "promises", openTaskId: item.kind === "task" ? item.id : null })}>
                      <span>{item.title}</span><small>{itemStatusLabel(item.status)} · {formatDue(item.dueAt)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
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

function groupWorkstreams(items: WorkspaceWorkItemSummary[]) {
  const groups = new Map<string, WorkspaceWorkItemSummary[]>();
  for (const item of items) {
    const raw = typeof item.metadata.counterparty === "string"
      ? item.metadata.counterparty.trim()
      : "";
    if (!raw) continue;
    const key = raw.toLocaleLowerCase();
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, groupItems]) => {
      const sourceThreads = new Set(
        groupItems.flatMap((item) => item.evidence.map((evidence) => evidence.gmailThreadId)),
      );
      const metadataThreadCount = Math.max(
        0,
        ...groupItems.map((item) => typeof item.metadata.sourceThreadCount === "number" ? item.metadata.sourceThreadCount : 0),
      );
      const threadCount = Math.max(sourceThreads.size, metadataThreadCount);
      const repeated = groupItems.length > 1 || threadCount > 1;
      return {
        key,
        name: String(groupItems[0].metadata.counterparty),
        items: [...groupItems].sort((left, right) => {
          const leftDone = left.status === "done" ? 1 : 0;
          const rightDone = right.status === "done" ? 1 : 0;
          return leftDone - rightDone;
        }),
        threadCount,
        repeated,
        openCount: groupItems.filter((item) => item.status !== "done").length,
        tasks: groupItems.filter((item) => item.kind === "task").length,
        promises: groupItems.filter((item) => item.kind === "promise").length,
        done: groupItems.filter((item) => item.status === "done").length,
      };
    })
    .filter((group) => group.repeated)
    .sort((left, right) => right.openCount - left.openCount || right.threadCount - left.threadCount);
}
