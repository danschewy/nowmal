import { describe, expect, it } from "vitest";
import { sessionIdFromRequest } from "@/agent/channels/eve";

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
});
