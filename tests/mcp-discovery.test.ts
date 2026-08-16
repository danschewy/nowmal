import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPublishableKey } from "@clerk/shared/keys";
import { GET } from "@/app/.well-known/oauth-protected-resource/eve/v1/mcp/route";

afterEach(() => vi.unstubAllEnvs());

describe("production MCP discovery", () => {
  it("serves the protected-resource metadata URL advertised by the MCP challenge", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nowmal.vercel.app/");
    vi.stubEnv(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      buildPublishableKey("accounts.nowmal.test"),
    );

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      authorization_servers: ["https://accounts.nowmal.test"],
      resource: "https://nowmal.vercel.app/eve/v1/mcp",
      scopes_supported: ["openid"],
    });
  });
});
