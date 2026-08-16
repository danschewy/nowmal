"use client";

import { useDemoStore } from "@/lib/demo/store";

export function Toast() {
  const { state, patch, undo } = useDemoStore();
  return (
    <div className={`toast ${state.toast ? "visible" : ""}`} aria-live="polite" role="status">
      <span>{state.toast?.text ?? ""}</span>
      {state.toast?.undo ? (
        <button type="button" onClick={undo}>
          Undo
        </button>
      ) : (
        <button type="button" onClick={() => patch({ toast: null })} aria-label="Dismiss message">
          Close
        </button>
      )}
    </div>
  );
}
