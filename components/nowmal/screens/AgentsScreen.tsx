"use client";

import { AGENT_TOOLS, CONNECTED_AGENTS } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, Lede, PageHeading, SectionLabel } from "../ui";

export function AgentsScreen({ mode }: { mode: "demo" | "connected" }) {
  const { state, setState, patch } = useDemoStore();
  const endpoint = "/eve/v1/mcp";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(endpoint, window.location.origin).toString());
    } catch {
      // Clipboard permission may be unavailable in the embedded preview.
    }
    patch({ copied: true });
    window.setTimeout(() => patch({ copied: false }), 1600);
  };

  return (
    <div className="screen">
      <div className="screen-inner-900">
        <Eyebrow>Agents · MCP access</Eyebrow>
        <PageHeading>Let other agents help without giving up control.</PageHeading>
        <Lede>
          Connect an MCP client to inspect tasks and evidence, search indexed mail, and prepare
          replies. Any sync or send request pauses for human approval before it can continue.
        </Lede>

        <section className="connection-card">
          <div><span>Endpoint</span><code>{endpoint}</code><ActionButton tone={state.copied ? "outline" : "solid"} onClick={copy}>{state.copied ? "Copied" : "Copy"}</ActionButton></div>
          <div><span>Auth</span><code>Your Nowmal account through Clerk OAuth · local identity in development</code><span /></div>
          <div><span>Transport</span><code>Streamable HTTP · approval required for sensitive actions</code><span /></div>
        </section>

        <div className="agent-tool-list">
          <SectionLabel right={`${AGENT_TOOLS.filter(([name, , , defaultOn]) => state.toolOverrides[name] ?? defaultOn).length} of ${AGENT_TOOLS.length} enabled`}>Tools</SectionLabel>
          {AGENT_TOOLS.map(([name, description, scope, defaultOn]) => {
            const enabled = state.toolOverrides[name] ?? defaultOn;
            return (
              <article key={name}>
                <div><code>{name}</code><p>{description}</p></div>
                <span className={`scope-${scope.toLowerCase().replace(" ", "-")}`}>{scope}</span>
                <button
                  type="button"
                  className={enabled ? "enabled" : ""}
                  disabled={mode === "connected"}
                  onClick={() => patch({ toolOverrides: { ...state.toolOverrides, [name]: !enabled } })}
                  aria-pressed={enabled}
                  title={mode === "connected" ? "Server policy is defined in the Eve agent" : "Preview this policy in the public demo"}
                >{mode === "connected" ? "Server" : enabled ? "Enabled" : "Off"}</button>
              </article>
            );
          })}
        </div>

        <div className="agent-gate-note">
          <span />
          <p>
            {mode === "demo" ? "Tool switches here are a public policy preview; the connected workspace reads server policy.\n" : ""}
            <code>send_email</code> accepts only a reviewed Now draft and always pauses for approval.
            <br />Evidence checks require a source. Tone and final approval always stay with you.
          </p>
        </div>

        <div className="connected-agents">
          <SectionLabel>Connected agents</SectionLabel>
          {mode === "connected" ? (
            <article>
              <span className="revoked" />
              <div>
                <strong>No external agent identities yet</strong>
                <p>Authorized MCP clients will appear here after their first call.</p>
              </div>
              <small>0 calls</small>
              <span />
            </article>
          ) : CONNECTED_AGENTS.map((agent) => {
            const revoked = state.revokedAgents.includes(agent.name);
            return (
              <article key={agent.name}>
                <span className={revoked ? "revoked" : ""} />
                <div><strong>{agent.name}</strong><p>{agent.activity}</p></div>
                <small>{agent.calls}</small>
                <ActionButton
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      revokedAgents: revoked
                        ? current.revokedAgents.filter((name) => name !== agent.name)
                        : [...current.revokedAgents, agent.name],
                    }))
                  }
                >{revoked ? "Reconnect" : "Revoke"}</ActionButton>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
