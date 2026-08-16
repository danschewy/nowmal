import { describe, expect, it } from "vitest";
import type { WorkspaceWorkItemSummary } from "@/lib/workspace/snapshot";
import { buildConnectedTrackers } from "@/lib/workspace/workstreams";

function item(input: {
  id: string;
  title: string;
  counterparty: string;
  subject: string;
  summary?: string;
  status?: WorkspaceWorkItemSummary["status"];
}): WorkspaceWorkItemSummary {
  return {
    id: input.id,
    kind: "task",
    status: input.status ?? "needs_you",
    title: input.title,
    dueAt: null,
    confidence: 0.9,
    metadata: { counterparty: input.counterparty, summary: input.summary ?? input.title },
    evidence: [{
      quote: input.title,
      gmailMessageId: `message-${input.id}`,
      gmailThreadId: `thread-${input.id}`,
      subject: input.subject,
      sender: `${input.counterparty} <person@example.com>`,
      sentAt: "2026-08-16T12:00:00.000Z",
    }],
  };
}

describe("connected tracker inference", () => {
  it("builds one job-search pipeline across different recruiters and companies", () => {
    const trackers = buildConnectedTrackers([
      item({
        id: "one",
        title: "Send availability for a recruiter call",
        counterparty: "Mo",
        subject: "Product role",
      }),
      item({
        id: "two",
        title: "Schedule the interview",
        counterparty: "Grant Seward",
        subject: "Interview scheduling",
      }),
      item({
        id: "three",
        title: "Reply about the AI engineer opportunity",
        counterparty: "Ankit",
        subject: "Sr. AI Engineer role",
      }),
    ]);

    expect(trackers).toHaveLength(1);
    expect(trackers[0]).toMatchObject({
      key: "process:job-search",
      name: "Job Search",
      kind: "process",
      stages: ["Applied", "Screen", "Interview", "Onsite", "Offer"],
      threadCount: 3,
    });
    expect(trackers[0].entries.map((entry) => entry.name)).toEqual([
      "Grant Seward",
      "Mo",
      "Ankit",
    ]);
  });

  it("does not manufacture a tracker from one conversation", () => {
    expect(buildConnectedTrackers([
      item({
        id: "one",
        title: "Reply about one role",
        counterparty: "Northline",
        subject: "One opportunity",
      }),
    ])).toEqual([]);
  });

  it("retains repeated counterparty grouping for non-process obligations", () => {
    const trackers = buildConnectedTrackers([
      item({ id: "one", title: "Send the invoice", counterparty: "Northline", subject: "Invoice" }),
      item({ id: "two", title: "Confirm the scope", counterparty: "Northline", subject: "Scope" }),
    ]);

    expect(trackers).toHaveLength(1);
    expect(trackers[0]).toMatchObject({
      key: "counterparty:northline",
      name: "Northline",
      kind: "counterparty",
      threadCount: 2,
    });
  });
});
