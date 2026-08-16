import { eveChannel } from "eve/channels/eve";
import {
  ForbiddenError,
  localDev,
  vercelOidc,
} from "eve/channels/auth";
import { isDatabaseConfigured } from "../../lib/data/client";
import { getAgentSessionOwner } from "../../lib/data/repository";
import { clerkSessionAuth } from "../lib/clerk-auth";

const clerk = clerkSessionAuth(async ({ request, userId }) => {
  const requestedSessionId = sessionIdFromRequest(request);
  if (requestedSessionId && isDatabaseConfigured()) {
    const ownerId = await waitForAgentSessionOwner(requestedSessionId);
    if (!ownerId || ownerId !== userId) {
      throw new ForbiddenError({ message: "This Eve session is not available to this account." });
    }
  }
});

export default eveChannel({
  auth: [clerk, vercelOidc(), localDev()],
});

export function sessionIdFromRequest(request: Request) {
  const match = new URL(request.url).pathname.match(/\/eve\/v1\/session\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function waitForAgentSessionOwner(
  sessionId: string,
  options: {
    attempts?: number;
    delayMs?: number;
    lookup?: (sessionId: string) => Promise<string | null>;
  } = {},
) {
  const attempts = Math.max(1, options.attempts ?? 10);
  const delayMs = Math.max(0, options.delayMs ?? 500);
  const lookup = options.lookup ?? getAgentSessionOwner;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ownerId = await lookup(sessionId);
    if (ownerId) return ownerId;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
