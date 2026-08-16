import { describe, expect, it } from "vitest";
import type {
  AnalysisOpenWorkItemRecord,
  AnalysisThreadRecord,
} from "@/lib/data/repository";
import {
  mergeValidatedCandidates,
  validateExtractionCandidates,
  validateResolutionCandidates,
} from "@/lib/workspace/analyze";
import { normalizeEmailBody } from "@/lib/gmail/text";

function thread(input: {
  id: string;
  gmailThreadId: string;
  direction: "inbound" | "outbound";
  messageId: string;
  body: string;
  sentAt?: string;
}): AnalysisThreadRecord {
  return {
    id: input.id,
    gmailThreadId: input.gmailThreadId,
    subject: "Project update",
    participants: ["owner@example.com", "alia@example.com"],
    snippet: input.body,
    latestMessageAt: new Date(input.sentAt ?? "2026-08-16T12:00:00.000Z"),
    attributes: {},
    messages: [
      {
        id: `internal-${input.messageId}`,
        gmailMessageId: input.messageId,
        direction: input.direction,
        sender: input.direction === "inbound" ? "alia@example.com" : "owner@example.com",
        recipients: input.direction === "inbound" ? ["owner@example.com"] : ["alia@example.com"],
        subject: "Project update",
        sentAt: new Date(input.sentAt ?? "2026-08-16T12:00:00.000Z"),
        snippet: input.body,
        bodyText: input.body,
      },
    ],
  };
}

describe("workspace analysis evidence boundary", () => {
  it("normalizes HTML-only Gmail bodies before model input and quote validation", () => {
    expect(
      normalizeEmailBody("<style>.hidden{display:none}</style><p>Please send&nbsp;the scope.</p>"),
    ).toBe("Please send the scope.");
    expect(normalizeEmailBody("Dan <dan@example.com> asked for the scope.")).toBe(
      "Dan <dan@example.com> asked for the scope.",
    );
  });

  it("keeps only confident candidates with an exact stored quote and matching direction", () => {
    const source = thread({
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      direction: "inbound",
      messageId: "gmail-message-1",
      body: "Could you send the signed scope by Friday?",
    });
    const candidates = validateExtractionCandidates([source], [
      {
        gmailThreadId: "gmail-thread-1",
        kind: "task",
        status: "needs_you",
        title: "Send Alia the signed scope",
        stableIntentKey: "send-signed-scope",
        occurrenceKey: null,
        counterparty: "Alia",
        summary: "Alia asked for the signed scope.",
        dueAt: "2026-08-21T21:00:00.000Z",
        confidence: 0.94,
        evidence: [{ gmailMessageId: "gmail-message-1", quote: "send the signed scope by Friday" }],
      },
      {
        gmailThreadId: "gmail-thread-1",
        kind: "task",
        status: "needs_you",
        title: "Invented follow-up",
        stableIntentKey: "invented-follow-up",
        occurrenceKey: null,
        counterparty: "Alia",
        summary: "This quote does not exist.",
        dueAt: null,
        confidence: 0.99,
        evidence: [{ gmailMessageId: "gmail-message-1", quote: "Please book the venue immediately" }],
      },
      {
        gmailThreadId: "gmail-thread-1",
        kind: "promise",
        status: "needs_you",
        title: "Send the signed scope",
        stableIntentKey: "send-signed-scope",
        occurrenceKey: null,
        counterparty: "Alia",
        summary: "Inbound text is not an owner promise.",
        dueAt: null,
        confidence: 0.99,
        evidence: [{ gmailMessageId: "gmail-message-1", quote: "send the signed scope by Friday" }],
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "task",
      dedupeKey: "tasks-promises-v1:task:alia:send-signed-scope:one-off",
      title: "Send Alia the signed scope",
    });
  });

  it("merges the same obligation across threads while retaining both sources", () => {
    const first = thread({
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      direction: "inbound",
      messageId: "gmail-message-1",
      body: "Please send the signed scope.",
      sentAt: "2026-08-15T12:00:00.000Z",
    });
    const second = thread({
      id: "thread-2",
      gmailThreadId: "gmail-thread-2",
      direction: "inbound",
      messageId: "gmail-message-2",
      body: "Following up on the signed scope request.",
      sentAt: "2026-08-16T12:00:00.000Z",
    });
    const common = {
      kind: "task" as const,
      status: "needs_you" as const,
      stableIntentKey: "send-signed-scope",
      occurrenceKey: null,
      counterparty: "Alia",
      dueAt: null,
      confidence: 0.91,
    };
    const validated = validateExtractionCandidates([first, second], [
      {
        ...common,
        gmailThreadId: "gmail-thread-1",
        title: "Send Alia the signed scope",
        summary: "Initial request.",
        evidence: [{ gmailMessageId: "gmail-message-1", quote: "send the signed scope" }],
      },
      {
        ...common,
        gmailThreadId: "gmail-thread-2",
        title: "Send Alia the signed scope",
        summary: "Follow-up request.",
        evidence: [{ gmailMessageId: "gmail-message-2", quote: "signed scope request" }],
      },
    ]);
    const merged = mergeValidatedCandidates(validated);

    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toHaveLength(2);
    expect(merged[0].metadata).toMatchObject({ sourceThreadCount: 2 });
  });

  it("accepts only newer exact evidence for an explicit work-item resolution", () => {
    const changedThread = thread({
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      direction: "inbound",
      messageId: "request-message",
      body: "Could you send the signed scope?",
      sentAt: "2026-08-15T12:00:00.000Z",
    });
    changedThread.messages.push({
      id: "internal-reply-message",
      gmailMessageId: "reply-message",
      direction: "outbound",
      sender: "owner@example.com",
      recipients: ["alia@example.com"],
      subject: "Re: Project update",
      sentAt: new Date("2026-08-16T12:00:00.000Z"),
      snippet: "Attached is the signed scope you requested.",
      bodyText: "Attached is the signed scope you requested.",
    });
    const openItems: AnalysisOpenWorkItemRecord[] = [{
      id: "work-item-1",
      kind: "task",
      status: "needs_you",
      title: "Send Alia the signed scope",
      metadata: { counterparty: "Alia" },
      sourceThreadIds: ["thread-1"],
      latestEvidenceAt: new Date("2026-08-15T12:00:00.000Z"),
    }];

    const resolutions = validateResolutionCandidates([changedThread], openItems, [
      {
        workItemId: "work-item-1",
        gmailThreadId: "gmail-thread-1",
        resolution: "fulfilled",
        confidence: 0.97,
        evidence: {
          gmailMessageId: "reply-message",
          quote: "Attached is the signed scope you requested",
        },
      },
      {
        workItemId: "work-item-1",
        gmailThreadId: "gmail-thread-1",
        resolution: "fulfilled",
        confidence: 0.99,
        evidence: {
          gmailMessageId: "request-message",
          quote: "Could you send the signed scope",
        },
      },
    ]);

    expect(resolutions).toEqual([{
      workItemId: "work-item-1",
      gmailMessageId: "reply-message",
      quote: "Attached is the signed scope you requested",
      resolution: "fulfilled",
      confidence: 0.97,
    }]);
  });

  it("rejects weak, cross-thread, or directionally invalid completion claims", () => {
    const changedThread = thread({
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      direction: "inbound",
      messageId: "new-inbound-message",
      body: "Thanks for the update.",
      sentAt: "2026-08-16T12:00:00.000Z",
    });
    const openItems: AnalysisOpenWorkItemRecord[] = [{
      id: "work-item-1",
      kind: "task",
      status: "needs_you",
      title: "Send Alia the signed scope",
      metadata: {},
      sourceThreadIds: ["different-thread"],
      latestEvidenceAt: new Date("2026-08-15T12:00:00.000Z"),
    }];

    expect(validateResolutionCandidates([changedThread], openItems, [{
      workItemId: "work-item-1",
      gmailThreadId: "gmail-thread-1",
      resolution: "fulfilled",
      confidence: 0.99,
      evidence: { gmailMessageId: "new-inbound-message", quote: "Thanks for the update" },
    }])).toEqual([]);
  });
});
