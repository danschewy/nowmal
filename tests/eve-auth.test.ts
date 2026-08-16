import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublishableKey } from "@clerk/shared/keys";
import { ForbiddenError } from "eve/channels/auth";
import { sessionIdFromRequest } from "@/agent/channels/eve";
import { clerkIssuer, clerkOAuthAuth, clerkSessionAuth } from "@/agent/lib/clerk-auth";

const clerk = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({ authenticateRequest: clerk.authenticateRequest }),
}));

beforeEach(() => {
  clerk.authenticateRequest.mockReset();
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", buildPublishableKey("accounts.nowmal.test"));
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_nowmal");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Eve session ownership boundary", () => {
  it("extracts an immutable session id only from id-addressed Eve routes", () => {
    expect(
      sessionIdFromRequest(new Request("https://nowmal.vercel.app/eve/v1/session/session_123/stream")),
    ).toBe("session_123");
    expect(
      sessionIdFromRequest(new Request("https://nowmal.vercel.app/eve/v1/session/session%3A123/cancel")),
    ).toBe("session:123");
    expect(
      sessionIdFromRequest(new Request("https://nowmal.vercel.app/eve/v1/session")),
    ).toBeNull();
    expect(
      sessionIdFromRequest(new Request("https://nowmal.vercel.app/eve/v1/session-history/session_123")),
    ).toBeNull();
  });

  it("keeps an ownership rejection as a forbidden response", async () => {
    clerk.authenticateRequest.mockResolvedValue({
      isAuthenticated: true,
      toAuth: () => ({ userId: "user-1", sessionId: "clerk-session-1" }),
    });
    const auth = clerkSessionAuth(() => {
      throw new ForbiddenError({ message: "Wrong owner" });
    });

    await expect(auth(new Request("https://nowmal.vercel.app/eve/v1/session/session-1")))
      .rejects.toThrow("Wrong owner");
  });
});

describe("MCP Clerk OAuth boundary", () => {
  it("advertises Clerk and maps an OAuth token to its Nowmal user workspace", async () => {
    clerk.authenticateRequest.mockResolvedValue({
      isAuthenticated: true,
      toAuth: () => ({
        userId: "user-1",
        clientId: "mcp-client-1",
        scopes: ["openid"],
      }),
    });

    expect(clerkIssuer()).toBe("https://accounts.nowmal.test");
    await expect(clerkOAuthAuth()(new Request("https://nowmal.vercel.app/eve/v1/mcp", {
      headers: { authorization: "Bearer oauth-token" },
    }))).resolves.toMatchObject({
      authenticator: "clerk-oauth",
      principalId: "user-1",
      principalType: "user",
      attributes: { clientId: "mcp-client-1", scopes: ["openid"] },
    });
    expect(clerk.authenticateRequest).toHaveBeenCalledWith(expect.any(Request), {
      acceptsToken: "oauth_token",
    });
  });
});
