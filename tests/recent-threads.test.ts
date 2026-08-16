import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  listRecentThreads: vi.fn(),
}));

vi.mock("@/lib/data/client", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/data/repository", () => ({
  listRecentThreads: repository.listRecentThreads,
}));

import listRecentThreadsTool from "@/agent/tools/list_recent_threads";

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
    repository.listRecentThreads.mockReset();
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
});
