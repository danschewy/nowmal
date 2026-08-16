import { createClerkClient } from "@clerk/backend";
import {
  withAuthChallenges,
  type AuthFn,
} from "eve/channels/auth";
import { clerkIssuerFromEnvironment } from "../../lib/auth/clerk-issuer";

type AuthorizedClerkRequest = (input: {
  request: Request;
  userId: string;
}) => Promise<void> | void;

export function clerkSessionAuth(authorize?: AuthorizedClerkRequest): AuthFn<Request> {
  return withAuthChallenges(async (request) => {
    const client = clerkClientFromEnvironment();
    if (!client) return null;
    const state = await (async () => {
      try {
        return await client.authenticateRequest(request, {
          acceptsToken: "session_token",
          authorizedParties: authorizedParties(),
        });
      } catch {
        return null;
      }
    })();
    if (!state?.isAuthenticated) return null;
    const auth = state.toAuth();
    if (!auth.userId) return null;
    await authorize?.({ request, userId: auth.userId });
    const attributes: Record<string, string | readonly string[]> = {};
    if (auth.sessionId) attributes.sessionId = auth.sessionId;
    return {
      authenticator: "clerk-session",
      principalId: auth.userId,
      principalType: "user",
      attributes,
    };
  }, [{ scheme: "Bearer" }]);
}

export function clerkOAuthAuth(): AuthFn<Request> {
  return withAuthChallenges(async (request) => {
    const client = clerkClientFromEnvironment();
    if (!client) return null;
    const state = await (async () => {
      try {
        return await client.authenticateRequest(request, {
          acceptsToken: "oauth_token",
        });
      } catch {
        return null;
      }
    })();
    if (!state?.isAuthenticated) return null;
    const auth = state.toAuth();
    if (!auth.userId) return null;
    return {
      authenticator: "clerk-oauth",
      principalId: auth.userId,
      principalType: "user",
      attributes: {
        clientId: auth.clientId,
        scopes: auth.scopes,
      },
    };
  }, [{ scheme: "Bearer" }]);
}

export function clerkIssuer() {
  return clerkIssuerFromEnvironment();
}

function clerkClientFromEnvironment() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!publishableKey || !secretKey) return null;
  return createClerkClient({ publishableKey, secretKey });
}

function authorizedParties() {
  return [...new Set([
    process.env.NEXT_PUBLIC_APP_URL,
    "https://nowmal.vercel.app",
  ].filter((value): value is string => Boolean(value)))];
}
