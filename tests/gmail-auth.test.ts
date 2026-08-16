import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserOauthAccessToken } = vi.hoisted(() => ({
  getUserOauthAccessToken: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: { getUserOauthAccessToken },
  }),
}));

import { getGoogleAccessToken, getGoogleScopeStatus } from "@/lib/gmail/auth";

describe("Google scope reconciliation", () => {
  const previousSecret = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_clerk_secret";
    getUserOauthAccessToken.mockReset();
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previousSecret;
  });

  it("checks read and send scopes from one Clerk response", async () => {
    getUserOauthAccessToken.mockResolvedValue({
      data: [
        { token: "read-token", scopes: ["gmail.readonly"] },
        { token: "send-token", scopes: ["gmail.send"] },
      ],
    });

    const status = await getGoogleScopeStatus("user-1", [
      "gmail.readonly",
      "gmail.send",
      "gmail.modify",
    ]);

    expect(status).toEqual({
      "gmail.readonly": true,
      "gmail.send": true,
      "gmail.modify": false,
    });
    expect(getUserOauthAccessToken).toHaveBeenCalledOnce();
  });

  it("returns only a token that carries every requested scope", async () => {
    getUserOauthAccessToken.mockResolvedValue({
      data: [
        { token: "read-token", scopes: ["gmail.readonly"] },
        { token: "send-token", scopes: ["gmail.send"] },
      ],
    });

    await expect(getGoogleAccessToken("user-1", ["gmail.send"])).resolves.toBe("send-token");
    await expect(
      getGoogleAccessToken("user-1", ["gmail.readonly", "gmail.send"]),
    ).rejects.toThrow("missing required scopes");
  });
});
