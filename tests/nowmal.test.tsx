import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NowmalApp } from "@/components/nowmal/NowmalApp";

function renderApp() {
  window.localStorage.clear();
  return render(<NowmalApp mode="demo" accountEmail="j.ellery@gmail.com" />);
}

describe("Nowmal public demo", () => {
  it("opens a deduplicated task with its evidence and lineage", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /Send Kestrel the two references/i }));

    expect(screen.getByText(/could you send over two references by end of day Friday/i)).toBeTruthy();
    expect(screen.getByText(/2 threads merged\. Deduped against the Aug 12 request/i)).toBeTruthy();
  });

  it("keeps the send locked until every human check is answered", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: /^Now\s*3$/i }));

    const locked = screen.getByRole("button", { name: /Locked · 2 unanswered/i });
    expect((locked as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: /Names two referees/i }));
    await user.click(screen.getByRole("button", { name: /Tobin Wray and Alia Ferrand/i }));
    await user.click(screen.getByRole("button", { name: /Both have agreed to be contacted/i }));
    await user.click(screen.getByRole("button", { name: /Yes, both agreed/i }));

    const send = screen.getByRole("button", { name: /Approve sample send/i });
    expect((send as HTMLButtonElement).disabled).toBe(false);
    await user.click(send);
    expect(screen.getByText("Confirm Tuesday 10:00 with Northline Systems")).toBeTruthy();
  });

  it("searches across the domain model and opens a result in context", async () => {
    const user = userEvent.setup();
    renderApp();
    const search = screen.getByRole("searchbox", { name: /Search tasks, people, or mail/i });
    await user.type(search, "Halyard");

    const result = screen.getByRole("button", { name: /Halyard still has not confirmed/i });
    await user.click(result);
    expect(screen.getByRole("heading", { name: /Every request, deadline, and follow-up/i })).toBeTruthy();
    expect(screen.getByText(/We should have the final number to you early next week/i)).toBeTruthy();
  });

  it("can grant the separately gated send permission in the demo", async () => {
    const user = userEvent.setup();
    renderApp();
    const settings = screen.getByRole("navigation", { name: /Settings navigation/i });
    await user.click(within(settings).getByRole("button", { name: "Setup" }));
    await user.click(screen.getByRole("button", { name: "Enable approved sends" }));
    expect(screen.getByRole("button", { name: "Approved sends on" })).toBeTruthy();
    expect(screen.getByText(/Send an approved draft/i)).toBeTruthy();
  });
});

describe("Nowmal connected workspace", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the caller's indexed Gmail instead of public sample records", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "nowmal.connected.v1",
      JSON.stringify({ connected: true, threadCount: 1, view: "mail" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            connected: true,
            mailboxStatus: "connected",
            threadCount: 1,
            correctionCount: 0,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
            eveSessionId: null,
            analysis: {
              version: "tasks-promises-v1",
              analyzedThreadCount: 1,
              pendingThreadCount: 0,
              workItemCount: 0,
            },
            workItems: [],
            drafts: [],
            threads: [
              {
                id: "thread-real-1",
                gmailThreadId: "gmail-real-1",
                subject: "Actual Gmail project update",
                participants: ["alia@example.com"],
                snippet: "Here is the update from the real indexed mailbox.",
                latestMessageAt: "2026-08-16T12:00:00.000Z",
                analyzed: true,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<NowmalApp mode="connected" accountEmail="owner@example.com" />);

    await waitFor(() =>
      expect(screen.getByText("Actual Gmail project update")).toBeTruthy(),
    );
    expect(screen.queryByText("Panel scheduling and references")).toBeNull();
  });

  it("analyzes the stored Gmail index without fetching Gmail again", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    window.localStorage.setItem(
      "nowmal.connected.v1",
      JSON.stringify({ connected: true, threadCount: 1, view: "setup" }),
    );
    let workspaceReads = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/gmail/status") {
        return new Response(
          JSON.stringify({ connected: true, permissionStatus: "current" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url === "/api/workspace/analyze") {
        return new Response(
          JSON.stringify({
            analyzedThreads: 1,
            workItemsUpserted: 1,
            rejectedCandidates: 0,
            failedThreads: 0,
            alreadyCurrent: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url === "/api/workspace") {
        workspaceReads += 1;
        const analyzed = workspaceReads > 1;
        return new Response(
          JSON.stringify({
            connected: true,
            mailboxStatus: "connected",
            threadCount: 1,
            correctionCount: 0,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
            eveSessionId: null,
            analysis: {
              version: "tasks-promises-v1",
              analyzedThreadCount: analyzed ? 1 : 0,
              pendingThreadCount: analyzed ? 0 : 1,
              workItemCount: analyzed ? 1 : 0,
            },
            workItems: [],
            drafts: [],
            threads: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<NowmalApp mode="connected" accountEmail="owner@example.com" />);
    await user.click(
      await screen.findByRole("button", { name: "Find tasks & promises" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Analysis current" })).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workspace/analyze",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/gmail/status")).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/gmail/sync",
      expect.anything(),
    );
  });

  it("shows enforced connected policy instead of sample-only rule claims", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "nowmal.connected.v1",
      JSON.stringify({ connected: true, threadCount: 3, view: "rules" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            connected: true,
            mailboxStatus: "connected",
            threadCount: 3,
            correctionCount: 2,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
            eveSessionId: null,
            analysis: {
              version: "tasks-promises-v1",
              analyzedThreadCount: 3,
              pendingThreadCount: 0,
              workItemCount: 1,
            },
            workItems: [],
            drafts: [],
            threads: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<NowmalApp mode="connected" accountEmail="owner@example.com" />);

    expect(await screen.findByRole("heading", { name: "See exactly what Nowmal may do." })).toBeTruthy();
    expect(screen.getByText("2 corrections are preserved for this workspace.")).toBeTruthy();
    expect(screen.queryByText(/In this sample/i)).toBeNull();
  });

  it("groups only repeated source-backed workstreams in the connected tracker view", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "nowmal.connected.v1",
      JSON.stringify({ connected: true, threadCount: 2, view: "pipeline" }),
    );
    const evidence = (suffix: string) => ({
      quote: `Exact source quote ${suffix}`,
      gmailMessageId: `message-${suffix}`,
      gmailThreadId: `thread-${suffix}`,
      subject: `Source ${suffix}`,
      sender: "person@example.com",
      sentAt: "2026-08-16T12:00:00.000Z",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            connected: true,
            mailboxStatus: "connected",
            threadCount: 2,
            correctionCount: 0,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
            eveSessionId: null,
            analysis: {
              version: "tasks-promises-v1",
              analyzedThreadCount: 2,
              pendingThreadCount: 0,
              workItemCount: 2,
            },
            workItems: [
              {
                id: "item-1",
                kind: "task",
                status: "needs_you",
                title: "Send the requested document",
                dueAt: null,
                confidence: 0.91,
                metadata: { counterparty: "Northline", sourceThreadCount: 1 },
                evidence: [evidence("one")],
              },
              {
                id: "item-2",
                kind: "promise",
                status: "waiting",
                title: "Follow up on the review",
                dueAt: null,
                confidence: 0.88,
                metadata: { counterparty: "Northline", sourceThreadCount: 1 },
                evidence: [evidence("two")],
              },
            ],
            drafts: [],
            threads: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<NowmalApp mode="connected" accountEmail="owner@example.com" />);

    expect(await screen.findByRole("heading", { name: "1 repeated workstream." })).toBeTruthy();
    expect(screen.getByText("Northline")).toBeTruthy();
    expect(screen.getByText("2 source threads")).toBeTruthy();
  });

  it("keeps the index available while asking for revoked Gmail access to be reviewed", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "nowmal.connected.v1",
      JSON.stringify({ connected: true, threadCount: 12, view: "setup" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/gmail/status") {
          return new Response(
            JSON.stringify({
              connected: true,
              permissionStatus: "current",
              readAuthorized: false,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            connected: true,
            mailboxStatus: "reauthorization_required",
            threadCount: 12,
            correctionCount: 1,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
            eveSessionId: null,
            analysis: {
              version: "tasks-promises-v1",
              analyzedThreadCount: 4,
              pendingThreadCount: 8,
              workItemCount: 2,
            },
            workItems: [],
            drafts: [],
            threads: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    render(<NowmalApp mode="connected" accountEmail="owner@example.com" />);

    expect(await screen.findByRole("heading", { name: "Reconnect Gmail without losing your workspace." })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Review Gmail access" }).getAttribute("href"),
    ).toBe("/account");
    expect(screen.getByText(/12 indexed threads are still available/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Find tasks & promises" })).toBeTruthy();
  });
});
