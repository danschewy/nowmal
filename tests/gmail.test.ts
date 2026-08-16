import { afterEach, describe, expect, it, vi } from "vitest";
import { sendGmailMessage } from "@/lib/gmail/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Gmail send construction", () => {
  it("creates one deterministic RFC 5322 message for the reserved idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "gmail-1", threadId: "thread-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGmailMessage("google-token", {
      to: "alia@example.com",
      subject: "References for Kestrel",
      body: "Hi Alia,\n\nHere they are.",
      idempotencyKey: "draft_01JABCDEF1234567",
    });

    expect(result).toEqual({ id: "gmail-1", threadId: "thread-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer google-token");

    const payload = JSON.parse(String(init.body)) as { raw: string };
    const message = Buffer.from(payload.raw, "base64url").toString("utf8");
    expect(message).toContain("To: alia@example.com\r\n");
    expect(message).toContain("Message-ID: <draft_01JABCDEF1234567@send.nowmal.app>\r\n");
    expect(message).toContain("\r\n\r\nHi Alia,\r\n\r\nHere they are.");
  });

  it("rejects header injection before making any Gmail request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendGmailMessage("google-token", {
        to: "alia@example.com\r\nBcc: attacker@example.com",
        subject: "References",
        body: "Safe body",
        idempotencyKey: "draft_01JABCDEF1234567",
      }),
    ).rejects.toThrow("Email headers may not contain newlines");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key that cannot form a Message-ID", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendGmailMessage("google-token", {
        to: "alia@example.com",
        subject: "References",
        body: "Safe body",
        idempotencyKey: "!!!!!!!!",
      }),
    ).rejects.toThrow("A valid idempotency key is required");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
