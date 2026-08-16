"use client";

import { useState } from "react";
import Link from "next/link";
import { product } from "@/lib/domain/config";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, Lede, PageHeading } from "../ui";
import { useWorkspaceData } from "../WorkspaceData";

export function SetupScreen({ accountEmail, mode }: { accountEmail: string; mode: "demo" | "connected" }) {
  const { state, patch, notify } = useDemoStore();
  const { refresh } = useWorkspaceData();
  const [syncing, setSyncing] = useState(false);

  const connect = async () => {
    if (mode === "demo") {
      patch({ connected: !state.connected, sendEnabled: state.connected ? false : state.sendEnabled });
      notify(state.connected ? "Sample Gmail disconnected" : "Sample Gmail connected");
      return;
    }
    setSyncing(true);
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
      notify(`Gmail connected · ${result.hydratedThreads ?? 0} recent threads indexed`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gmail sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const permissions = [
    ["Read recent mail", "Indexes up to 100 threads from the last 30 days. Older mail stays untouched.", "Included", state.connected],
    ["Check for updates", "After the first pass, refreshes fetch only conversations that changed.", "Included", state.connected],
    ["Keep one record per task", "Stores the useful context and source threads so the same request is not created twice.", "Included", state.connected],
    ["Send an approved draft", "Optional access. Every send still pauses for your confirmation and is recorded.", "Optional", state.sendEnabled],
  ] as const;

  return (
    <div className="screen">
      <div className="screen-inner-720">
        <Eyebrow>Setup · Gmail connection</Eyebrow>
        <PageHeading>Start read-only. Add sending only if you want it.</PageHeading>
        <Lede>
          Nowmal begins with up to 100 recent threads—enough to build a useful workspace without
          pulling your whole mailbox. Future refreshes fetch only what changed. Read access can
          never send, edit, or delete email.
        </Lede>

        <section className="account-card">
          <div>
            <strong>{accountEmail}</strong>
            <small>Read-only · last 30 days · up to 100 recent threads · {state.threadCount.toLocaleString()} indexed</small>
          </div>
          <ActionButton
            tone={state.connected ? "outline" : "solid"}
            onClick={connect}
            disabled={syncing || (mode === "connected" && state.connected)}
          >
            {syncing ? "Reading Gmail…" : state.connected ? "Connected" : "Connect Gmail"}
          </ActionButton>
          <div className="scan-track"><span style={{ width: state.connected ? "100%" : "0%" }} /></div>
          <p>{state.connected
            ? mode === "demo"
              ? "Sample ready · 41 relevant threads · 9 tasks · 7 duplicate asks merged"
              : `${state.threadCount.toLocaleString()} recent threads indexed · future refreshes fetch changes only`
            : "Connect when you are ready. Nothing is fetched beforehand."}</p>
        </section>

        <div className="permission-list">
          {permissions.map(([label, note, tag, granted]) => (
            <div key={label}>
              <span className={granted ? "granted" : "denied"} />
              <div><strong>{label}</strong><p>{note}</p></div>
              <small>{granted ? tag : tag === "Optional" ? "Off" : tag}</small>
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
              {state.sendEnabled ? "Review send access" : "Enable approved sends"}
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
      </div>
    </div>
  );
}
