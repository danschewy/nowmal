"use client";

import { BRIEF } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import type { View } from "@/lib/domain/types";
import { ActionButton, Eyebrow, Lede, PageHeading } from "../ui";

export function BriefScreen() {
  const { state, patch } = useDemoStore();

  return (
    <div className="screen">
      <div className="screen-inner-760">
        <Eyebrow>Brief · Sample update at 09:00</Eyebrow>
        <PageHeading>The six things worth your attention.</PageHeading>
        <Lede>
          A concise summary of what changed, what is waiting, and where you made a commitment.
          Nothing sends until you review and approve it.
        </Lede>

        <div className="brief-list">
          {BRIEF.map(([tag, text, view]) => (
            <button
              key={tag}
              type="button"
              onClick={() => patch({ view: view as View, briefRead: true })}
            >
              <span className={`brief-tag brief-tag-${tag.toLowerCase()}`}>{tag}</span>
              <span>{text}</span>
            </button>
          ))}
        </div>

        <div className="brief-footer">
          <div>
            <ActionButton tone="solid" onClick={() => patch({ view: "now", briefRead: true })}>
              Review next actions
            </ActionButton>
            <ActionButton
              tone="ghost"
              onClick={() => patch({ briefRead: true })}
              disabled={state.briefRead}
            >
              {state.briefRead ? "Marked read" : "Mark read"}
            </ActionButton>
          </div>
          <span>
            Next brief {state.pull === "live" ? "at 16:00 · changes stay current" : `on the ${state.cadence} schedule`}
          </span>
        </div>
      </div>
    </div>
  );
}
