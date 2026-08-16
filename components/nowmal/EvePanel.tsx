"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useEveAgent, type EveDynamicToolPart, type EveMessagePart } from "eve/react";
import { EVE_SCRIPT } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";

export function EvePanel({ mode }: { mode: "demo" | "connected" }) {
  return mode === "connected" ? <ConnectedEvePanel /> : <DemoEvePanel />;
}

function DemoEvePanel() {
  const { state, setState, patch } = useDemoStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useAutoScroll(scrollRef, state.messages.length);

  const say = (label: string) => {
    const value = label.trim();
    if (!value) return;
    const scripted = EVE_SCRIPT[value];
    setState((current) => ({
      ...current,
      view: scripted?.go ?? current.view,
      eveInput: "",
      messages: [
        ...current.messages,
        { id: `you-${Date.now()}`, who: "You", text: value },
        {
          id: `eve-${Date.now()}`,
          who: "Eve",
          text:
            scripted?.text ??
            "I could not find anything in this sample inbox that answers that. Try asking about a task, promise, person, or thread.",
          draft: scripted?.draft,
        },
      ],
      chips: scripted?.chips
        ? [...scripted.chips]
        : ["What else is quiet?", "Draft a nudge"],
    }));
  };

  return (
    <PanelFrame status="Ready with sample mail">
      <div className="eve-messages" ref={scrollRef} aria-live="polite">
        {state.messages.map((message) => (
          <article key={message.id} className={`eve-message ${message.who === "You" ? "from-you" : ""}`}>
            <div>{message.who}</div>
            <p>{message.text}</p>
            {message.draft ? <pre>{message.draft}</pre> : null}
          </article>
        ))}
      </div>

      <Composer
        chips={state.chips}
        value={state.eveInput}
        onChange={(value) => patch({ eveInput: value })}
        onSay={say}
      />
    </PanelFrame>
  );
}

function ConnectedEvePanel() {
  const { state, patch, notify } = useDemoStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const agent = useEveAgent({
    prepareSend: (input) => ({
      ...input,
      clientContext: { surface: "nowmal-web", view: state.view },
    }),
    onError: (error) => notify(error.message),
  });
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const chips = ["What needs my attention?", "What am I waiting on?", "Check for new mail"];

  useAutoScroll(scrollRef, agent.events.length);

  const say = (label: string) => {
    const value = label.trim();
    if (!value || busy) return;
    patch({ eveInput: "" });
    void agent.send(value).catch((error: unknown) =>
      notify(error instanceof Error ? error.message : "Eve could not start that turn."),
    );
  };

  return (
    <PanelFrame status={busy ? "Working" : state.connected ? "Ready with your recent mail" : "Connect Gmail to begin"}>
      <div className="eve-messages" ref={scrollRef} aria-live="polite">
        {!agent.data.messages.length ? (
          <article className="eve-message">
            <div>Eve</div>
            <p>
              Ask what needs attention, search recent mail, or request a reply. I will show my
              sources, and I will stop for your approval before any sync or send.
            </p>
          </article>
        ) : null}

        {agent.data.messages.map((message) => (
          <article key={message.id} className={`eve-message ${message.role === "user" ? "from-you" : ""}`}>
            <div>{message.role === "user" ? "You" : "Eve"}</div>
            {message.parts.map((part, index) => (
              <ConnectedPart
                key={`${message.id}-${index}`}
                part={part}
                disabled={busy}
                respond={agent.respond}
              />
            ))}
          </article>
        ))}

        {agent.error ? (
          <article className="eve-message eve-error">
            <div>Could not continue</div>
            <p>{agent.error.message}</p>
          </article>
        ) : null}
      </div>

      <Composer
        chips={chips}
        value={state.eveInput}
        disabled={busy || !state.connected}
        onChange={(value) => patch({ eveInput: value })}
        onSay={say}
      />
    </PanelFrame>
  );
}

function ConnectedPart({
  part,
  disabled,
  respond,
}: {
  part: EveMessagePart;
  disabled: boolean;
  respond: ReturnType<typeof useEveAgent>["respond"];
}) {
  if (part.type === "text") return <p>{part.text}</p>;
  if (part.type === "reasoning" || part.type === "step-start" || part.type === "file") return null;

  if (part.type === "authorization") {
    if (part.state === "completed") {
      return <p>{part.outcome === "authorized" ? `${part.displayName} connected.` : part.reason ?? "Authorization did not complete."}</p>;
    }
    return (
      <div className="eve-authorization">
        <p>{part.description}</p>
        {part.authorization?.url ? <a href={part.authorization.url}>Authorize {part.displayName}</a> : null}
      </div>
    );
  }

  return <ToolPart part={part} disabled={disabled} respond={respond} />;
}

function ToolPart({
  part,
  disabled,
  respond,
}: {
  part: EveDynamicToolPart;
  disabled: boolean;
  respond: ReturnType<typeof useEveAgent>["respond"];
}) {
  const request = part.toolMetadata?.eve?.inputRequest;
  return (
    <div className={`eve-tool eve-tool-${part.state}`}>
      <div><code>{part.toolName}</code><small>{toolState(part)}</small></div>
      {part.state === "output-error" ? <p>{part.errorText}</p> : null}
      {part.state === "approval-requested" && request ? (
        <fieldset>
          <legend>{request.prompt}</legend>
          <div>
            {(request.options ?? []).map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                className={option.style === "primary" ? "primary" : option.style === "danger" ? "danger" : ""}
                onClick={() => void respond([{ requestId: request.requestId, optionId: option.id }])}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}

function toolState(part: EveDynamicToolPart) {
  switch (part.state) {
    case "approval-requested": return "Approval required";
    case "approval-responded": return "Approval received";
    case "output-available": return "Complete";
    case "output-error": return "Failed";
    case "output-denied": return "Denied";
    default: return "Working";
  }
}

function PanelFrame({ children, status }: { children: ReactNode; status: string }) {
  return (
    <aside className="eve-panel" aria-label="Eve assistant">
      <header className="eve-header">
        <span className="moss-dot" />
        <strong>Eve</strong>
        <span>{status}</span>
      </header>
      {children}
    </aside>
  );
}

function Composer({
  chips,
  value,
  disabled = false,
  onChange,
  onSay,
}: {
  chips: readonly string[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSay: (value: string) => void;
}) {
  return (
    <div className="eve-compose">
      <div className="eve-chips">
        {chips.map((chip) => (
          <button key={chip} type="button" disabled={disabled} onClick={() => onSay(chip)}>
            {chip}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSay(value);
        }}
      >
        <input
          aria-label="Ask Eve about your inbox"
          placeholder={disabled ? "Connect Gmail to ask Eve" : "Ask about tasks, people, or mail"}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="submit" disabled={disabled || !value.trim()}>Ask</button>
      </form>
    </div>
  );
}

function useAutoScroll(ref: RefObject<HTMLDivElement | null>, dependency: number) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, 30);
    return () => window.clearTimeout(timeout);
  }, [dependency, ref]);
}
