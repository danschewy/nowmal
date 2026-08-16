"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { product } from "@/lib/domain/config";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, Lede, PageHeading } from "../ui";
import { useWorkspaceData } from "../WorkspaceData";

export function SetupScreen({ accountEmail, mode }: { accountEmail: string; mode: "demo" | "connected" }) {
  const { state, patch, notify } = useDemoStore();
  const { snapshot, refresh } = useWorkspaceData();
  const [phase, setPhase] = useState<"idle" | "syncing" | "analyzing">("idle");
  const [analysisConfirmationOpen, setAnalysisConfirmationOpen] = useState(false);
  const confirmAnalysisRef = useRef<HTMLButtonElement>(null);
  const mailboxNeedsReview =
    mode === "connected" && snapshot?.mailboxStatus === "reauthorization_required";
  const readAuthorized =
    mode === "demo" ? state.connected : snapshot?.mailboxStatus === "connected";
  const pendingAnalysisThreads = Math.min(
    snapshot?.analysis.pendingThreadCount ?? 0,
    product.workspaceAnalysisDefaultMaxThreads,
  );

  useEffect(() => {
    if (!analysisConfirmationOpen) return;
    confirmAnalysisRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAnalysisConfirmationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [analysisConfirmationOpen]);

  const analyze = async () => {
    if (mode === "demo") return null;
    setPhase("analyzing");
    const response = await fetch("/api/workspace/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxThreads: product.workspaceAnalysisDefaultMaxThreads }),
    });
    const result = (await response.json()) as {
      analyzedThreads?: number;
      workItemsUpserted?: number;
      failedThreads?: number;
      alreadyCurrent?: boolean;
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? "Workspace analysis failed.");
    await refresh();
    return result;
  };

  const connect = async () => {
    if (mode === "demo") {
      patch({ connected: !state.connected, sendEnabled: state.connected ? false : state.sendEnabled });
      notify(state.connected ? "Sample Gmail disconnected" : "Sample Gmail connected");
      return;
    }
    setPhase("syncing");
    try {
      const response = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxThreads: product.gmailSyncDefaultMaxThreads }),
      });
      const result = (await response.json()) as { hydratedThreads?: number; totalThreads?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Gmail sync failed.");
      patch({ connected: true, threadCount: result.totalThreads ?? state.threadCount });
      await refresh();
      notify(
        `${result.hydratedThreads ?? 0} Gmail threads refreshed · analysis waits for your approval`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gmail sync failed.");
    } finally {
      setPhase("idle");
    }
  };

  const analyzeExisting = async () => {
    setAnalysisConfirmationOpen(false);
    try {
      const result = await analyze();
      notify(
        result?.alreadyCurrent
          ? "Your workspace analysis is already current"
          : `${result?.analyzedThreads ?? 0} threads analyzed · ${result?.workItemsUpserted ?? 0} tasks and promises found`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Workspace analysis failed.");
    } finally {
      setPhase("idle");
    }
  };

  const permissions = [
    [
      "Read recent mail",
      "Indexes up to 100 threads from the last 30 days. Older mail stays untouched.",
      "Included",
      readAuthorized,
      mailboxNeedsReview ? "Review" : "Included",
    ],
    [
      "Check for updates",
      "After the first pass, refreshes fetch only conversations that changed.",
      "Included",
      readAuthorized,
      mailboxNeedsReview ? "Review" : "Included",
    ],
    [
      "Find tasks and promises",
      "Analyzes only the bounded index and saves an exact source quote with every result.",
      "Included",
      Boolean(snapshot?.analysis.analyzedThreadCount),
      "Included",
    ],
    [
      "Keep one record per task",
      "Stores the useful context and source threads so the same request is not created twice.",
      "Included",
      state.connected,
      "Included",
    ],
    [
      "Send an approved draft",
      "Optional access. Every send still pauses for your confirmation and is recorded.",
      "Optional",
      state.sendEnabled,
      "Off",
    ],
  ] as const;

  return (
    <div className="screen">
      <div className="screen-inner-720">
        <Eyebrow>Setup · Gmail connection</Eyebrow>
        <PageHeading>
          {mailboxNeedsReview
            ? "Reconnect Gmail without losing your workspace."
            : "Start read-only. Add sending only if you want it."}
        </PageHeading>
        <Lede>
          {mailboxNeedsReview
            ? "Your indexed threads, tasks, and corrections remain available. Review the Google connection before the next refresh; Nowmal will not treat a revoked token as a healthy inbox."
            : "Nowmal begins with up to 100 recent threads—enough to build a useful workspace without pulling your whole mailbox. Future refreshes fetch only what changed. Read access can never send, edit, or delete email."}
        </Lede>

        <section className="account-card">
          <div>
            <strong>{accountEmail}</strong>
            <small>
              {mailboxNeedsReview
                ? "Indexed data retained · Google access needs review"
                : "Read-only · last 30 days · up to 100 recent threads"}
              {" · "}{state.threadCount.toLocaleString()} indexed
            </small>
          </div>
          {mailboxNeedsReview ? (
            <Link href="/account" className="action-button action-solid">Review Gmail access</Link>
          ) : (
            <ActionButton
              tone={state.connected ? "outline" : "solid"}
              onClick={connect}
              disabled={phase !== "idle"}
            >
              {phase === "syncing"
                ? "Reading Gmail…"
                : phase === "analyzing"
                  ? "Finding work…"
                  : state.connected
                    ? "Refresh Gmail"
                    : "Connect Gmail"}
            </ActionButton>
          )}
          <div className="scan-track"><span style={{ width: state.connected ? "100%" : "0%" }} /></div>
          <p>{state.connected
            ? mode === "demo"
              ? "Sample ready · 41 relevant threads · 9 tasks · 7 duplicate asks merged"
              : mailboxNeedsReview
                ? `${state.threadCount.toLocaleString()} indexed threads are still available · reconnect before refreshing Gmail`
                : `${state.threadCount.toLocaleString()} recent threads indexed · ${snapshot?.analysis.analyzedThreadCount.toLocaleString() ?? 0} analyzed · future refreshes fetch changes only`
            : "Connect when you are ready. Nothing is fetched beforehand."}</p>
        </section>

        {mode === "connected" && state.connected ? (
          <section className="analysis-card">
            <div>
              <strong>Turn the index into a workspace.</strong>
              <p>
                {snapshot?.analysis.pendingThreadCount
                  ? `${snapshot.analysis.pendingThreadCount.toLocaleString()} indexed threads still need analysis. No additional Gmail data will be fetched.`
                  : `${snapshot?.analysis.workItemCount.toLocaleString() ?? 0} source-backed tasks and promises are current.`}
              </p>
            </div>
            <ActionButton
              tone={snapshot?.analysis.pendingThreadCount ? "solid" : "outline"}
              disabled={phase !== "idle" || !snapshot?.analysis.pendingThreadCount}
              onClick={() => setAnalysisConfirmationOpen(true)}
            >
              {phase === "analyzing"
                ? "Finding work…"
                : snapshot?.analysis.pendingThreadCount
                  ? "Find tasks & promises"
                  : "Analysis current"}
            </ActionButton>
          </section>
        ) : null}

        <div className="permission-list">
          {permissions.map(([label, note, tag, granted, inactiveTag]) => (
            <div key={label}>
              <span className={granted ? "granted" : "denied"} />
              <div><strong>{label}</strong><p>{note}</p></div>
              <small>{granted ? tag : inactiveTag}</small>
            </div>
          ))}
        </div>

        <div className="send-permission-card">
          <div>
            <strong>Sending is optional and separate.</strong>
            <p>
              If you enable it, Nowmal can send only a draft you have reviewed and explicitly
              approved. It never receives permission to edit or delete your mailbox.
            </p>
          </div>
          {mode === "connected" ? (
            <Link
              href={state.connected ? "/account" : "#"}
              className={`action-button ${state.sendEnabled ? "action-outline" : "action-solid"} ${state.connected ? "" : "is-disabled"}`}
              aria-disabled={!state.connected}
              onClick={(event) => { if (!state.connected) event.preventDefault(); }}
            >
              {mailboxNeedsReview
                ? "Review Google access"
                : state.sendEnabled
                  ? "Review send access"
                  : "Enable approved sends"}
            </Link>
          ) : (
            <ActionButton
              tone={state.sendEnabled ? "outline" : "solid"}
              disabled={!state.connected}
              onClick={() => {
                patch({ sendEnabled: !state.sendEnabled });
                notify(state.sendEnabled ? "Sample send access disabled" : "Approved sends enabled in the sample");
              }}
            >
              {state.sendEnabled ? "Approved sends on" : "Enable approved sends"}
            </ActionButton>
          )}
        </div>

        {analysisConfirmationOpen ? (
          <div
            className="confirmation-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAnalysisConfirmationOpen(false);
            }}
          >
            <section
              className="confirmation-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="analysis-confirmation-title"
              aria-describedby="analysis-confirmation-description"
            >
              <Eyebrow>One-time model use</Eyebrow>
              <h2 id="analysis-confirmation-title">
                Analyze {pendingAnalysisThreads.toLocaleString()} indexed {pendingAnalysisThreads === 1 ? "thread" : "threads"}?
              </h2>
              <p id="analysis-confirmation-description" className="confirmation-intro">
                Nowmal will send bounded text already stored in your private workspace to OpenAI
                through Vercel AI Gateway to find unresolved tasks and promises.
              </p>
              <dl className="confirmation-facts">
                <div>
                  <dt>Included</dt>
                  <dd>
                    Up to {product.workspaceAnalysisMessagesPerThread} recent messages per thread,
                    capped at {product.workspaceAnalysisMaxMessageChars.toLocaleString()} characters each
                  </dd>
                </div>
                <div>
                  <dt>Not included</dt>
                  <dd>No new Gmail fetch, no mailbox edits, and no email sending</dd>
                </div>
                <div>
                  <dt>Saved</dt>
                  <dd>Only validated tasks and promises, each with an exact source quote</dd>
                </div>
              </dl>
              <p className="confirmation-metering">
                Model usage is metered by Vercel. The exact cost depends on the amount of text in
                these threads, so no fixed estimate is shown.
              </p>
              <div className="confirmation-actions">
                <ActionButton
                  tone="outline"
                  type="button"
                  onClick={() => setAnalysisConfirmationOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  ref={confirmAnalysisRef}
                  tone="solid"
                  type="button"
                  onClick={() => void analyzeExisting()}
                >
                  Analyze indexed threads
                </ActionButton>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
