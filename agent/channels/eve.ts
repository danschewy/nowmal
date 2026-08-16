import { verifyToken } from "@clerk/backend";
import { eveChannel } from "eve/channels/eve";
import {
  extractBearerToken,
  localDev,
  vercelOidc,
  withAuthChallenges,
  type AuthFn,
} from "eve/channels/auth";

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
      return {
        authenticator: "clerk",
        principalId: payload.sub,
        principalType: "user",
        issuer: payload.iss,
        attributes: { sessionId: payload.sid },
      };
    } catch {
      return null;
    }
  }, [{ scheme: "Bearer" }]);
}

export default eveChannel({
  auth: [clerkSession(), vercelOidc(), localDev()],
});
