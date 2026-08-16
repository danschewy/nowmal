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
    const ownerId = await getAgentSessionOwner(requestedSessionId);
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
