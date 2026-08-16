import { describe, expect, it } from "vitest";
import {
  durableAgentSessionSurface,
  EVE_WEB_SESSION_SURFACE,
} from "@/lib/eve/session-surface";

describe("durable Eve session surfaces", () => {
  it("versions browser sessions so incompatible manifests do not resume", () => {
    expect(durableAgentSessionSurface("http")).toBe(EVE_WEB_SESSION_SURFACE);
    expect(durableAgentSessionSurface("channel:eve")).toBe(EVE_WEB_SESSION_SURFACE);
    expect(EVE_WEB_SESSION_SURFACE).not.toBe("channel:eve");
  });

  it("keeps non-browser channels separate from the web conversation", () => {
    expect(durableAgentSessionSurface("channel:mcp")).toBe("channel:mcp");
    expect(durableAgentSessionSurface("subagent")).toBe("subagent");
    expect(durableAgentSessionSurface(undefined)).toBe("unknown");
  });
});
