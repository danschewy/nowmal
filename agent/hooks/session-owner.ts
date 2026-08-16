import { defineHook } from "eve/hooks";
import { isDatabaseConfigured } from "../../lib/data/client";
import { recordAgentSession } from "../../lib/data/repository";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const principal = ctx.session.auth.current;
      if (!principal || principal.principalType !== "user" || !isDatabaseConfigured()) return;
      await recordAgentSession({
        workspaceId: principal.principalId,
        surface: ctx.channel.kind ?? "eve",
        eveSessionId: ctx.session.id,
      });
    },
  },
});
