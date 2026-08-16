import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EveMarkdown } from "@/components/nowmal/EveMarkdown";

describe("Eve Markdown", () => {
  it("renders useful GitHub-flavored structure", () => {
    render(
      <EveMarkdown>{`## Attention

- **Reply** to Alia
- Review \`scope.pdf\`

| Item | State |
| --- | --- |
| Scope | Ready |`}</EveMarkdown>,
    );

    expect(screen.getByRole("heading", { name: "Attention", level: 2 })).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByText("Reply").tagName).toBe("STRONG");
    expect(screen.getByText("scope.pdf").tagName).toBe("CODE");
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("keeps raw HTML inert and never embeds remote images", () => {
    render(
      <EveMarkdown>{`<script>alert("no")</script>

![Evidence](https://tracker.example/pixel.png)

[Open source](https://example.com/thread)`}</EveMarkdown>,
    );

    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("link", { name: "Image: Evidence" }).getAttribute("href"))
      .toBe("https://tracker.example/pixel.png");
    const source = screen.getByRole("link", { name: "Open source" });
    expect(source.getAttribute("target")).toBe("_blank");
    expect(source.getAttribute("rel")).toContain("noopener");
  });
});
