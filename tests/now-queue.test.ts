import { describe, expect, it } from "vitest";
import { selectConnectedNowQueue } from "@/lib/workspace/now-queue";
import type {
  WorkspaceDraftSummary,
  WorkspaceWorkItemSummary,
} from "@/lib/workspace/snapshot";

const now = new Date("2026-08-16T12:00:00.000Z");

function workItem(
  id: string,
  status: WorkspaceWorkItemSummary["status"],
  dueAt: string | null = null,
): WorkspaceWorkItemSummary {
  return {
    id,
    kind: "task",
    status,
    title: id,
    dueAt,
    confidence: 0.9,
    metadata: {},
    evidence: [],
  };
}

function draft(id: string, state: WorkspaceDraftSummary["state"]): WorkspaceDraftSummary {
  return {
    id,
    state,
    to: "person@example.com",
    subject: id,
    body: "Draft body",
    unresolvedCheckCount: 0,
    createdAt: now.toISOString(),
    sentAt: null,
  };
}

describe("connected Now queue", () => {
  it("combines active drafts, needs-you work, and non-actionable work due within seven days", () => {
    const queue = selectConnectedNowQueue(
      {
        drafts: [draft("queued", "queued"), draft("sent", "sent")],
        workItems: [
          workItem("needs-you", "needs_you"),
          workItem("waiting-overdue", "waiting", "2026-08-15T12:00:00.000Z"),
          workItem("later-soon", "later", "2026-08-20T12:00:00.000Z"),
          workItem("waiting-no-date", "waiting"),
          workItem("later-future", "later", "2026-09-20T12:00:00.000Z"),
          workItem("done", "done", "2026-08-15T12:00:00.000Z"),
        ],
      },
      now,
    );

    expect(queue.drafts.map((item) => item.id)).toEqual(["queued"]);
    expect(queue.workItems.map((item) => item.id)).toEqual([
      "waiting-overdue",
      "later-soon",
      "needs-you",
    ]);
    expect(queue.count).toBe(4);
  });
});
