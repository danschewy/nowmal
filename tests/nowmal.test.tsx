import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
