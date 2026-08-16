"use client";

import { Fragment } from "react";
import { NOW_ITEMS } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow, PageHeading, SectionLabel } from "../ui";

export function NowScreen() {
  const { state, setState, notify } = useDemoStore();
  const item = NOW_ITEMS[state.nowIndex];

  if (!item) {
    return (
      <div className="screen">
        <div className="screen-inner-800 now-complete">
          <Eyebrow>Now · Focused session</Eyebrow>
          <PageHeading>Cleared.</PageHeading>
          <p>Every send crossed a gate. Eve kept the evidence; you made the calls.</p>
          <div className="session-ledger">
            {(state.ledger.length ? state.ledger : ["Nothing sent this session."]).map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <ActionButton
            tone="solid"
            onClick={() =>
              setState((current) => ({
                ...current,
                nowIndex: 0,
                slots: {},
                openCheck: null,
                ledger: [],
              }))
            }
          >
            Run it again
          </ActionButton>
        </div>
      </div>
    );
  }

  const unresolved = item.checks.filter(
    (check) => !check.verified && !state.slots[check.key],
  );
  const draft = item.draft(state.slots);

  const choose = (key: string, value: string) => {
    setState((current) => ({
      ...current,
      slots: { ...current.slots, [key]: value },
      openCheck: null,
    }));
  };

  const send = () => {
    if (unresolved.length) return;
    const recipient = item.to.split(" · ")[0];
    setState((current) => ({
      ...current,
      nowIndex: current.nowIndex + 1,
      openCheck: null,
      doneTasks: current.doneTasks.includes(item.id)
        ? current.doneTasks
        : [...current.doneTasks, item.id],
      ledger: [...current.ledger, `Sent · ${recipient} · ${item.subject}`],
      messages: [
        ...current.messages,
        {
          id: `eve-send-${Date.now()}`,
          who: "Eve",
          text: `Approved and sent to ${recipient}. ${
            NOW_ITEMS[current.nowIndex + 1]
              ? `Next up: ${NOW_ITEMS[current.nowIndex + 1].title.toLowerCase()}.`
              : "That was the last one."
          }`,
        },
      ],
    }));
    notify(`Sent: ${item.subject}`, { kind: "task-done", id: item.id });
  };

  return (
    <div className="screen">
      <div className="screen-inner-800">
        <Eyebrow>Now · Focused session</Eyebrow>
        <PageHeading>One at a time, until they are gone.</PageHeading>

        <div className="session-progress" aria-label={`Task ${state.nowIndex + 1} of ${NOW_ITEMS.length}`}>
          <div>
            {NOW_ITEMS.map((entry, index) => (
              <span
                key={entry.id}
                className={index < state.nowIndex ? "done" : index === state.nowIndex ? "current" : ""}
              />
            ))}
          </div>
          <span>
            {state.nowIndex + 1} of {NOW_ITEMS.length} · about{" "}
            {(NOW_ITEMS.length - state.nowIndex) * 4} minutes left
          </span>
        </div>

        <section className="now-task">
          <h2>{item.title}</h2>
          <div className="now-evidence">
            <span />
            <p>
              “{item.evidence}” <small>{item.source}</small>
            </p>
          </div>

          <div className="draft-card">
            <div><span>To</span><strong>{item.to}</strong></div>
            <div><span>Subject</span><strong>{item.subject}</strong></div>
            <div className="draft-body">{renderDraft(draft)}</div>
          </div>

          <div className="before-send">
            <SectionLabel
              right={
                <span className={unresolved.length ? "needs" : "clear"} id="remaining-checks">
                  {unresolved.length ? `${unresolved.length} left` : "All clear"}
                </span>
              }
            >
              Before this sends
            </SectionLabel>

            <div className="check-list">
              {item.checks.map((check) => {
                const answered = Boolean(state.slots[check.key]);
                const open = state.openCheck === check.key;
                return (
                  <div key={check.key} className={`check-row ${open ? "expanded" : ""}`}>
                    <button
                      type="button"
                      disabled={Boolean(check.verified)}
                      aria-expanded={open}
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          openCheck: current.openCheck === check.key ? null : check.key,
                        }))
                      }
                    >
                      <span className={`check-mark ${check.verified ? "verified" : answered ? "answered" : "open"}`} />
                      <span>{check.text}</span>
                      <span className={check.verified ? "verified-tag" : answered ? "answered-tag" : "needs-tag"}>
                        {check.verified ? check.source : answered ? "Answered by you" : "Needs you"}
                      </span>
                    </button>
                    {open && !check.verified ? (
                      <div className="check-detail">
                        <strong>{check.question}</strong>
                        <p>{check.note}</p>
                        <div>
                          {check.options?.map((option) => (
                            <ActionButton
                              key={option.value}
                              onClick={() => choose(check.key, option.value)}
                            >
                              {option.label}
                            </ActionButton>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="gate-footer">
            <div>
              <ActionButton
                tone={unresolved.length ? "outline" : "solid"}
                className={unresolved.length ? "send-locked" : ""}
                disabled={Boolean(unresolved.length)}
                aria-describedby="remaining-checks"
                onClick={send}
              >
                {unresolved.length
                  ? `Locked · ${unresolved.length} unanswered`
                  : "Approve, send and close"}
              </ActionButton>
              <ActionButton
                tone="ghost"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    nowIndex: current.nowIndex + 1,
                    openCheck: null,
                    ledger: [...current.ledger, `Skipped · ${item.title}`],
                  }))
                }
              >
                Skip for now
              </ActionButton>
            </div>
            <p>
              {unresolved.length
                ? "Eve wrote the draft.\nShe cannot clear these for you."
                : "Every claim in this draft\ntraces back to a source."}
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
}

function renderDraft(draft: string) {
  const parts = draft.split("————————————");
  if (parts.length === 1) return draft;
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 ? <mark className="draft-slot-missing">————————————</mark> : null}
    </Fragment>
  ));
}
