"use client";

import { LEARNED, RULES } from "@/lib/demo/data";
import { useDemoStore } from "@/lib/demo/store";
import { Eyebrow, Lede, PageHeading, SectionLabel } from "../ui";

export function RulesScreen() {
  const { state, patch } = useDemoStore();
  const learned = state.notTasks.length
    ? [`Today · you called ${state.notTasks.length} inference wrong. Eve is looking for what they share.`, ...LEARNED]
    : LEARNED;

  return (
    <div className="screen">
      <div className="screen-inner-860">
        <Eyebrow>Rules · what Eve is allowed to infer</Eyebrow>
        <PageHeading>You decide how far Eve gets to go.</PageHeading>
        <Lede>
          Off means Eve never looks. Suggest means she writes it down and waits. Act means she
          does it and tells you, with an undo. Sending has its own approval gate regardless.
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
            Corrections are the only training signal here.
            <br />Nothing you write is used to train anything outside this account.
          </small>
        </section>

        <div className="rules-closing">
          <span />
          <p>
            Clusters only become real after you accept them. Places to Live appeared on Aug 9,
            after four letting agents in one week. A deleted cluster is never proposed again.
          </p>
        </div>
      </div>
    </div>
  );
}
