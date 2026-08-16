import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("public demo exposes the full task and Eve shell without an account", async ({ page }) => {
  await expect(page.getByText("Nowmal", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Every request, deadline, and follow-up/i })).toBeVisible();
  await expect(page.getByLabel("Eve assistant")).toBeVisible();
  await expect(page.getByText("SAMPLE INBOX · SAFE TO EXPLORE")).toBeVisible();

  await page.getByRole("button", { name: /Send Kestrel the two references/i }).click();
  await expect(page.getByText(/2 threads merged\. Deduped against the Aug 12 request/i)).toBeVisible();
});

test("Now requires the human gate before a send", async ({ page }) => {
  await page.getByRole("button", { name: /^Now\s*3$/i }).click();
  await expect(page.getByRole("button", { name: /Locked · 2 unanswered/i })).toBeDisabled();

  await page.getByRole("button", { name: /Names two referees/i }).click();
  await page.getByRole("button", { name: /Tobin Wray and Alia Ferrand/i }).click();
  await page.getByRole("button", { name: /Both have agreed to be contacted/i }).click();
  await page.getByRole("button", { name: /Yes, both agreed/i }).click();

  await expect(page.getByRole("button", { name: /Approve sample send/i })).toBeEnabled();
});
