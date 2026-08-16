import { defineHook } from "eve/hooks";
import { isDatabaseConfigured } from "../../lib/data/client";
import { recordAgentSession } from "../../lib/data/repository";
import { durableAgentSessionSurface } from "../../lib/eve/session-surface";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const principal = ctx.session.auth.current;
      if (!principal || principal.principalType !== "user" || !isDatabaseConfigured()) return;
      await recordAgentSession({
        workspaceId: principal.principalId,
        surface: durableAgentSessionSurface(ctx.channel.kind),
        eveSessionId: ctx.session.id,
      });
    },
  },
});
