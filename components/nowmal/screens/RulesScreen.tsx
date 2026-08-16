"use client";

import { LEARNED, RULES } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { Eyebrow, Lede, PageHeading, SectionLabel } from "../ui";

export function RulesScreen() {
  const { state, patch } = useDemoStore();
  const learned = state.notTasks.length
    ? [`Today · you corrected ${state.notTasks.length} task ${state.notTasks.length === 1 ? "suggestion" : "suggestions"}. Eve will use that feedback on similar mail.`, ...LEARNED]
    : LEARNED;

  return (
    <div className="screen">
      <div className="screen-inner-860">
        <Eyebrow>Rules · your control over automation</Eyebrow>
        <PageHeading>Choose what Eve can notice, suggest, or do.</PageHeading>
        <Lede>
          Off ignores that pattern. Suggest shows you a recommendation first. Act applies the
          change and gives you an undo. Sending always requires separate approval.
        </Lede>

        <div className="rule-list">
          {RULES.map((rule) => (
            <article key={rule.id}>
              <div><strong>{rule.label}</strong><p>{rule.description}</p></div>
              <div className="rule-control" role="group" aria-label={rule.label}>
                {(["Off", "Suggest", "Act"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={state.rules[rule.id] === value ? "active" : ""}
                    onClick={() => patch({ rules: { ...state.rules, [rule.id]: value } })}
                  >{value}</button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <section className="learned-section">
          <SectionLabel>What Eve learned from you</SectionLabel>
          <div>
            {learned.map((line, index) => (
              <p key={line}><span className={index === 0 && state.notTasks.length ? "live" : ""} />{line}</p>
            ))}
          </div>
          <small>
            Corrections shape the suggestions and rules for this workspace.
            <br />You can review the changes here at any time.
          </small>
        </section>

        <div className="rules-closing">
          <span />
          <p>
            New mail groups require your approval. In this sample, Places to Live was suggested
            after four letting agents appeared in one week. A dismissed group stays dismissed.
          </p>
        </div>
      </div>
    </div>
  );
}
