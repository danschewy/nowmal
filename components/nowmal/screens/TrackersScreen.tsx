"use client";

import { useState } from "react";
import { TRACKERS, TRACKER_SUGGESTION } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { ActionButton, Eyebrow } from "../ui";

export function TrackersScreen() {
  const { state, setState, patch, notify } = useDemoStore();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const tracker = TRACKERS[state.trackerId] ?? TRACKERS.job;
  const trackerOn = state.trackersOn.includes(tracker.id);
  const rows = tracker.rows.filter((row) => !state.prospectState[row.id]?.gone);

  const commitRename = () => {
    const name = renameValue.trim();
    if (name) patch({ trackerNames: { ...state.trackerNames, [tracker.id]: name } });
    setRenaming(false);
  };

  const updateProspect = (id: string, values: Record<string, number | boolean>) => {
    setState((current) => ({
      ...current,
      prospectState: {
        ...current.prospectState,
        [id]: { ...current.prospectState[id], ...values },
      },
    }));
  };

  const stopTracker = () => {
    setState((current) => ({
      ...current,
      trackersOn: current.trackersOn.filter((id) => id !== tracker.id),
      trackerId: current.trackersOn.find((id) => id !== tracker.id) ?? "job",
    }));
    notify(`Stopped tracking ${state.trackerNames[tracker.id]}`, {
      kind: "stop-tracker",
      id: tracker.id,
    });
  };

  return (
    <div className="screen">
      <Eyebrow>Trackers · built out of your mail, named by you</Eyebrow>
      <div className="tracker-tabs">
        {state.trackersOn.map((id) => (
          <button
            key={id}
            type="button"
            className={state.trackerId === id ? "active" : ""}
            onClick={() => patch({ trackerId: id, openProspect: null })}
          >
            {state.trackerNames[id]} {TRACKERS[id]?.rows.length ?? 0}
          </button>
        ))}
      </div>

      {!state.trackersOn.length || !trackerOn ? (
        <div className="tracker-empty">
          <h1>Nothing tracked</h1>
          <p>
            Nothing is being tracked. Eve keeps reading, and will offer something again when a
            pattern is worth a tracker.
          </p>
        </div>
      ) : (
        <>
          <div className="tracker-title-row">
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
                <h1>{state.trackerNames[tracker.id]}</h1>
                <button type="button" onClick={() => { setRenameValue(state.trackerNames[tracker.id]); setRenaming(true); }}>Rename</button>
                <button type="button" onClick={stopTracker}>Stop tracking</button>
              </>
            )}
          </div>
          <p className="tracker-note">{tracker.note}</p>

          {state.trackersOn.includes("places") || state.dismissedSuggestions.includes("places") ? null : (
            <div className="suggestion-card">
              <span />
              <div>
                <strong>{TRACKER_SUGGESTION.name}</strong>
                <p>{TRACKER_SUGGESTION.reason}</p>
              </div>
              <div>
                <ActionButton
                  tone="solid"
                  onClick={() => {
                    patch({ trackersOn: [...state.trackersOn, "places"], trackerId: "places" });
                    notify("Now tracking: Places to Live", { kind: "accept-tracker", id: "places" });
                  }}
                >Track it</ActionButton>
                <ActionButton onClick={() => patch({ dismissedSuggestions: [...state.dismissedSuggestions, "places"] })}>No</ActionButton>
              </div>
            </div>
          )}

          <div className="stage-rail">
            {tracker.stages.map((stage, index) => (
              <div key={stage}>
                <span>{stage}</span>
                <strong>{rows.filter((row) => (state.prospectState[row.id]?.stageIndex ?? row.stageIndex) >= index + 1).length}</strong>
              </div>
            ))}
          </div>

          <div className="prospect-list">
            {rows.map((row) => {
              const override = state.prospectState[row.id];
              const stageIndex = override?.stageIndex ?? row.stageIndex;
              const closed = Boolean(override?.closed);
              const open = state.openProspect === row.id;
              return (
                <article key={row.id} className={closed ? "closed" : ""}>
                  <button type="button" onClick={() => patch({ openProspect: open ? null : row.id })} aria-expanded={open}>
                    <span>
                      <strong>{row.name}</strong>
                      <small>{row.role}</small>
                      <p>{row.signal}</p>
                    </span>
                    <span className="progress-track">
                      {tracker.stages.map((stage, index) => (
                        <i key={stage} className={index + 1 < stageIndex ? "passed" : index + 1 === stageIndex ? "current" : ""} />
                      ))}
                    </span>
                    <span className={row.warm ? "warm" : ""}>
                      <strong>{row.age}</strong>
                      <small>{tracker.stages[Math.min(stageIndex - 1, tracker.stages.length - 1)]}</small>
                    </span>
                  </button>
                  {open ? (
                    <div className="prospect-actions">
                      <ActionButton
                        tone="solid"
                        disabled={stageIndex >= tracker.stages.length}
                        onClick={() => updateProspect(row.id, { stageIndex: Math.min(stageIndex + 1, tracker.stages.length) })}
                      >
                        {stageIndex >= tracker.stages.length ? "At final stage" : `Advance to ${tracker.stages[stageIndex]}`}
                      </ActionButton>
                      <ActionButton onClick={() => updateProspect(row.id, { closed: !closed })}>{closed ? "Reopen" : "Closed, no"}</ActionButton>
                      <ActionButton
                        tone="ghost"
                        onClick={() => {
                          updateProspect(row.id, { gone: true });
                          notify(`Removed: ${row.name}`, { kind: "remove-prospect", id: row.id });
                        }}
                      >Not a real one</ActionButton>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
