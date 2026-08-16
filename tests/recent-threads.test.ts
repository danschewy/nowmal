import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  getEvidence: vi.fn(),
  listRecentThreads: vi.fn(),
  listTasks: vi.fn(),
  searchThreads: vi.fn(),
}));

vi.mock("@/lib/data/client", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/data/repository", () => ({
  getEvidence: repository.getEvidence,
  listRecentThreads: repository.listRecentThreads,
  listTasks: repository.listTasks,
  searchThreads: repository.searchThreads,
}));

import getEvidenceTool from "@/agent/tools/get_evidence";
import listRecentThreadsTool from "@/agent/tools/list_recent_threads";
import listTasksTool from "@/agent/tools/list_tasks";
import searchThreadsTool from "@/agent/tools/search_threads";

const context = {
  session: {
    id: "session-1",
    auth: {
      current: { principalId: "workspace-1", principalType: "user" },
    },
  },
};

describe("Eve recent Gmail threads", () => {
  beforeEach(() => {
    repository.getEvidence.mockReset();
    repository.listRecentThreads.mockReset();
    repository.listTasks.mockReset();
    repository.searchThreads.mockReset();
  });

  it("lists newest indexed threads without inventing a text query", async () => {
    const newest = [{
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      subject: "A genuinely recent message",
      participants: ["sender@example.com"],
      snippet: "The latest indexed message",
      latestMessageAt: new Date("2026-08-16T16:00:00.000Z"),
    }];
    repository.listRecentThreads.mockResolvedValue(newest);

    const result = await listRecentThreadsTool.execute({ limit: 1 }, context as never);

    expect(repository.listRecentThreads).toHaveBeenCalledWith("workspace-1", 1);
    expect(result).toEqual([{ ...newest[0], latestMessageAt: "2026-08-16T16:00:00.000Z" }]);
  });

  it("returns JSON-safe dates from every Gmail read tool", async () => {
    repository.listTasks.mockResolvedValue([{
      id: "task-1",
      title: "Reply to Trillium",
      status: "needs_you",
      dueAt: new Date("2026-08-17T16:00:00.000Z"),
      confidence: 0.92,
      metadata: {},
    }]);
    repository.searchThreads.mockResolvedValue([{
      id: "thread-1",
      gmailThreadId: "gmail-thread-1",
      subject: "Interview confirmation",
      participants: ["careers@example.com"],
      snippet: "Your interview is confirmed.",
      latestMessageAt: new Date("2026-08-16T16:00:00.000Z"),
    }]);
    repository.getEvidence.mockResolvedValue({
      item: {
        id: "task-1",
        kind: "task",
        status: "needs_you",
        title: "Reply to Trillium",
        dueAt: new Date("2026-08-17T16:00:00.000Z"),
        metadata: {},
        createdAt: new Date("2026-08-16T10:00:00.000Z"),
      },
      evidence: [{
        quote: "Please reply.",
        gmailMessageId: "message-1",
        sender: "careers@example.com",
        sentAt: new Date("2026-08-16T16:00:00.000Z"),
        subject: "Interview confirmation",
      }],
    });

    const outputs = await Promise.all([
      listTasksTool.execute({ includeDone: false }, context as never),
      searchThreadsTool.execute({ query: "interview", limit: 10 }, context as never),
      getEvidenceTool.execute({ workItemId: "task-1" }, context as never),
    ]);

    outputs.forEach(expectJsonSafe);
  });
});

function expectJsonSafe(value: unknown): void {
  expect(value).not.toBeInstanceOf(Date);
  if (Array.isArray(value)) {
    value.forEach(expectJsonSafe);
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(expectJsonSafe);
  }
}
