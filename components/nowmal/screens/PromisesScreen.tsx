"use client";

import { PROMISES } from "@/lib/demo/data";
import { useDemoStore, type PromiseFilter } from "@/lib/demo/store";
import { ActionButton, Eyebrow, Lede, PageHeading, StatusSquare } from "../ui";

const filters: { id: PromiseFilter; label: string }[] = [
  { id: "all", label: "Open" },
  { id: "due", label: "On time" },
  { id: "late", label: "Overdue" },
  { id: "kept", label: "Kept" },
];

export function PromisesScreen() {
  const { state, setState, patch, notify } = useDemoStore();
  const statusOf = (id: string, status: (typeof PROMISES)[number]["status"]) =>
    state.keptPromises.includes(id) ? "kept" : status;
  const visible = PROMISES.filter((promise) => {
    const status = statusOf(promise.id, promise.status);
    if (state.promFilter === "all") return status !== "kept";
    if (state.promFilter === "late") return status === "late" || status === "broken";
    return status === state.promFilter;
  });

  const toggleKept = (id: string, quote: string) => {
    const kept = state.keptPromises.includes(id);
    setState((current) => ({
      ...current,
      keptPromises: kept
        ? current.keptPromises.filter((value) => value !== id)
        : [...current.keptPromises, id],
    }));
    if (!kept) notify(`Kept: ${quote}`);
  };

  const sayLate = (to: string) => {
    const recipient = to.split(" · ")[0];
    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        { id: `you-late-${Date.now()}`, who: "You", text: `Tell ${recipient} it will be late` },
        {
          id: `eve-late-${Date.now()}`,
          who: "Eve",
          text: "I drafted a direct note that owns the miss and gives one new date. It is waiting in Now for your review.",
          draft: `Hi ${recipient.split(" ")[0]},\n\nI said I would have this to you already, and I missed that. I can send it by Monday. Sorry for leaving the gap unexplained.\n\nJ.`,
        },
      ],
      chips: ["Make it shorter", "Not yet"],
    }));
  };

  return (
    <div className="screen">
      <div className="screen-inner-880">
        <Eyebrow>Promises · read out of your sent mail</Eyebrow>
        <PageHeading>The things you said you would do.</PageHeading>
        <Lede>
          Tasks come from what people ask of you. These come from what you wrote back. Same
          evidence, opposite direction, and the one nobody tracks.
        </Lede>

        <div className="filter-bar promise-filters" role="group" aria-label="Promise filters">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={state.promFilter === filter.id ? "active" : ""}
              type="button"
              onClick={() => patch({ promFilter: filter.id })}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="promise-list">
          {visible.map((promise) => {
            const status = statusOf(promise.id, promise.status);
            const bad = status === "late" || status === "broken";
            return (
              <article key={promise.id} className={status === "kept" ? "promise-kept" : ""}>
                <StatusSquare status={status === "kept" ? "wait" : bad ? "now" : "later"} />
                <div>
                  <blockquote>“{promise.quote}”</blockquote>
                  <div className="promise-meta">
                    You wrote this · {promise.said} · to {promise.to}
                  </div>
                  <p>{promise.context}</p>
                  <div className="promise-actions">
                    <ActionButton tone={status === "kept" ? "outline" : "solid"} onClick={() => toggleKept(promise.id, promise.quote)}>
                      {status === "kept" ? "Reopen" : "Mark kept"}
                    </ActionButton>
                    {status !== "kept" ? (
                      <ActionButton onClick={() => sayLate(promise.to)}>Say it will be late</ActionButton>
                    ) : null}
                  </div>
                </div>
                <span className={bad ? "bad" : ""}>
                  {status === "kept" ? "Kept" : status === "broken" ? "Broken" : status === "late" ? "Late" : "Due"} · {promise.due}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
