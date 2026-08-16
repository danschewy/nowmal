/**
 * Durable browser conversations keep the tools and instructions that were
 * resolved when their Eve session started. Bump this generation whenever a
 * change makes an existing browser session incompatible with the current
 * agent manifest.
 */
export const EVE_WEB_SESSION_SURFACE = "channel:eve:nowmal-web:v2";

export function durableAgentSessionSurface(channelKind: string | undefined) {
  return channelKind === "http" || channelKind === "channel:eve"
    ? EVE_WEB_SESSION_SURFACE
    : channelKind ?? "unknown";
}
