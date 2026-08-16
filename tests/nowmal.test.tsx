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
            threadCount: 1,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
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
            threadCount: 1,
            sendEnabled: false,
            lastSyncedAt: "2026-08-16T12:00:00.000Z",
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
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/gmail/sync",
      expect.anything(),
    );
  });
});
