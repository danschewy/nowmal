import { verifyToken } from "@clerk/backend";
import { eveChannel } from "eve/channels/eve";
import {
  extractBearerToken,
  ForbiddenError,
  localDev,
  vercelOidc,
  withAuthChallenges,
  type AuthFn,
} from "eve/channels/auth";
import { isDatabaseConfigured } from "../../lib/data/client";
import { getAgentSessionOwner } from "../../lib/data/repository";

function clerkSession(): AuthFn<Request> {
  return withAuthChallenges(async (request) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return null;
    const bearer = extractBearerToken(request.headers.get("authorization"));
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("__session="))
      ?.slice("__session=".length);
    const token = bearer ?? cookie;
    if (!token) return null;
    try {
      const payload = await verifyToken(token, {
        secretKey,
        authorizedParties: process.env.NEXT_PUBLIC_APP_URL
          ? [process.env.NEXT_PUBLIC_APP_URL]
          : undefined,
      });
      const requestedSessionId = sessionIdFromRequest(request);
      if (requestedSessionId && isDatabaseConfigured()) {
        const ownerId = await getAgentSessionOwner(requestedSessionId);
        if (!ownerId || ownerId !== payload.sub) {
          throw new ForbiddenError({ message: "This Eve session is not available to this account." });
        }
      }
      return {
        authenticator: "clerk",
        principalId: payload.sub,
        principalType: "user",
        issuer: payload.iss,
        attributes: { sessionId: payload.sid },
      };
    } catch (cause) {
      if (cause instanceof ForbiddenError) throw cause;
      return null;
    }
  }, [{ scheme: "Bearer" }]);
}

export default eveChannel({
  auth: [clerkSession(), vercelOidc(), localDev()],
});

export function sessionIdFromRequest(request: Request) {
  const match = new URL(request.url).pathname.match(/\/eve\/v1\/session\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
