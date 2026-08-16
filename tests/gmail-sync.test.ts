import { beforeEach, describe, expect, it, vi } from "vitest";

const gmail = vi.hoisted(() => ({
  getGmailProfile: vi.fn(),
  getGmailThread: vi.fn(),
  listChangedThreadIds: vi.fn(),
  listRecentThreadIds: vi.fn(),
}));
const repository = vi.hoisted(() => ({
  getMailboxStatus: vi.fn(),
  listIndexedGmailThreadIds: vi.fn(),
  upsertGmailThread: vi.fn(),
  upsertMailboxConnection: vi.fn(),
  upsertWorkspace: vi.fn(),
}));

vi.mock("@/lib/gmail/client", () => ({
  ...gmail,
  headersOf: vi.fn(() => ({})),
  mapWithConcurrency: async <T, R>(
    items: readonly T[],
    _concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ) => Promise.all(items.map(mapper)),
  plainTextOf: vi.fn(() => ""),
}));

vi.mock("@/lib/data/repository", () => repository);

import { syncGmailMailbox } from "@/lib/gmail/sync";

beforeEach(() => {
  Object.values(gmail).forEach((mock) => mock.mockReset());
  Object.values(repository).forEach((mock) => mock.mockReset());
  gmail.getGmailProfile.mockResolvedValue({
    emailAddress: "owner@example.com",
    historyId: "history-new",
  });
  gmail.getGmailThread.mockImplementation(async (threadId: string) => ({
    id: threadId,
    messages: [],
  }));
  repository.upsertGmailThread.mockResolvedValue("thread-row");
});

describe("Gmail index expansion", () => {
  it("expands an older 100-thread workspace without rehydrating unchanged indexed threads", async () => {
    const recentIds = Array.from({ length: 300 }, (_, index) => `recent-${index}`);
    repository.getMailboxStatus
      .mockResolvedValueOnce({ connection: { historyId: "history-old" }, threadCount: 113 })
      .mockResolvedValueOnce({ connection: { historyId: "history-new" }, threadCount: 300 });
    gmail.listChangedThreadIds.mockResolvedValue({
      threadIds: ["recent-0"],
      historyId: "history-new",
    });
    gmail.listRecentThreadIds.mockResolvedValue(recentIds);
    repository.listIndexedGmailThreadIds.mockResolvedValue(recentIds.slice(0, 113));

    const result = await syncGmailMailbox({
      workspaceId: "workspace-1",
      accessToken: "google-token",
      maxThreads: 300,
    });

    expect(result.mode).toBe("expanded");
    expect(result.hydratedThreads).toBe(188);
    expect(repository.listIndexedGmailThreadIds).toHaveBeenCalledWith(
      "workspace-1",
      recentIds,
    );
    expect(gmail.getGmailThread).toHaveBeenCalledTimes(188);
  });

  it("keeps established 300-thread workspaces on incremental history reads", async () => {
    repository.getMailboxStatus
      .mockResolvedValueOnce({ connection: { historyId: "history-old" }, threadCount: 300 })
      .mockResolvedValueOnce({ connection: { historyId: "history-new" }, threadCount: 301 });
    gmail.listChangedThreadIds.mockResolvedValue({
      threadIds: ["changed-1"],
      historyId: "history-new",
    });

    const result = await syncGmailMailbox({
      workspaceId: "workspace-1",
      accessToken: "google-token",
      maxThreads: 300,
    });

    expect(result.mode).toBe("incremental");
    expect(gmail.listRecentThreadIds).not.toHaveBeenCalled();
    expect(gmail.getGmailThread).toHaveBeenCalledOnce();
  });
});
