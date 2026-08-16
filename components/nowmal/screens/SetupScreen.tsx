"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { product } from "@/lib/domain/config";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, Lede, PageHeading } from "../ui";

export function SetupScreen({ accountEmail, mode }: { accountEmail: string; mode: "demo" | "connected" }) {
  const { state, patch, notify } = useDemoStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (mode !== "connected") return;
    let active = true;
    void fetch("/api/gmail/status", { cache: "no-store" })
      .then(async (response) => {
        const status = (await response.json()) as {
          connected?: boolean;
          threadCount?: number;
          connection?: { sendEnabled?: boolean };
        };
        if (active) patch({
          connected: Boolean(status.connected),
          threadCount: status.threadCount ?? 0,
          sendEnabled: Boolean(status.connection?.sendEnabled),
        });
      })
      .catch(() => active && patch({ connected: false }));
    return () => { active = false; };
  }, [mode, patch]);

  const connect = async () => {
    if (mode === "demo") {
      patch({ connected: !state.connected, sendEnabled: state.connected ? false : state.sendEnabled });
      notify(state.connected ? "Gmail disconnected" : "Demo Gmail connected");
      return;
    }
    setSyncing(true);
    try {
      const response = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxThreads: 500 }),
      });
      const result = (await response.json()) as { hydratedThreads?: number; totalThreads?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Gmail sync failed.");
      patch({ connected: true, threadCount: result.totalThreads ?? state.threadCount });
      notify(`Gmail connected · ${result.hydratedThreads ?? 0} threads refreshed`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gmail sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const permissions = [
    ["Read the last 90 days, once", "The first pass is bounded. Older mail is never fetched.", "Required", state.connected],
    ["Refresh only changed mail", "After the first pass, Gmail's history cursor returns only changed threads.", "Required", state.connected],
    ["Keep a stash per task", "Company, role, stage, contact, dates, thread ids. Stored so a task is never invented twice.", "Required", state.connected],
    ["Send a cleared Now draft", "A separate Gmail scope. Every call pauses for your approval, checks idempotency, and writes an audit record.", "Gated", state.sendEnabled],
  ] as const;

  return (
    <div className="screen">
      <div className="screen-inner-720">
        <Eyebrow>Setup · step 2 of 3</Eyebrow>
        <PageHeading>Nowmal reads. Sending stays gated.</PageHeading>
        <Lede>
          The first pass reads ninety days once, then each refresh uses Gmail's history cursor.
          Eve can prepare a send, but only a cleared Now draft with a fresh human approval may
          leave the account.
        </Lede>

        <section className="account-card">
          <div>
            <strong>{accountEmail}</strong>
            <small>Read-only · 90 days · {state.threadCount.toLocaleString()} threads indexed</small>
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
              ? "4,118 threads read · 41 open · 9 tasks · 7 duplicates discarded"
              : `${state.threadCount.toLocaleString()} threads indexed · later refreshes use the saved Gmail cursor`
            : "Waiting to connect"}</p>
        </section>

        <div className="permission-list">
          {permissions.map(([label, note, tag, granted]) => (
            <div key={label}>
              <span className={granted ? "granted" : "denied"} />
              <div><strong>{label}</strong><p>{note}</p></div>
              <small>{granted ? tag : tag === "Gated" ? "Off" : tag}</small>
            </div>
          ))}
        </div>

        <div className="send-permission-card">
          <div>
            <strong>Gated send is a second permission.</strong>
            <p>
              It requests only <code>{product.gmailSendScope}</code>. Eve never receives a general
              mailbox write scope and cannot skip the Now gate.
            </p>
          </div>
          {mode === "connected" ? (
            <Link
              href={state.connected ? "/account" : "#"}
              className={`action-button ${state.sendEnabled ? "action-outline" : "action-solid"} ${state.connected ? "" : "is-disabled"}`}
              aria-disabled={!state.connected}
              onClick={(event) => { if (!state.connected) event.preventDefault(); }}
            >
              {state.sendEnabled ? "Review send access" : "Enable gated send"}
            </Link>
          ) : (
            <ActionButton
              tone={state.sendEnabled ? "outline" : "solid"}
              disabled={!state.connected}
              onClick={() => {
                patch({ sendEnabled: !state.sendEnabled });
                notify(state.sendEnabled ? "Gated send disabled" : "Gated send enabled for the demo");
              }}
            >
              {state.sendEnabled ? "Gated send on" : "Enable gated send"}
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}
