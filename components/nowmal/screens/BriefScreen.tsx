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
        <Eyebrow>Brief · Saturday 16 August, 09:00</Eyebrow>
        <PageHeading>Six lines, then you can go.</PageHeading>
        <Lede>
          Eve only writes this at your pull times. There is nothing to check in between, and
          nothing here that can quietly send itself.
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
              Start the session
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
            Next brief {state.pull === "live" ? "16:00 · live in between" : state.cadence}
          </span>
        </div>
      </div>
    </div>
  );
}
