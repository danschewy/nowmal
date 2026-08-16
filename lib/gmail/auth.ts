import { createClerkClient } from "@clerk/backend";

export async function getGoogleAccessToken(userId: string, requiredScopes: readonly string[]) {
  const authorization = await getGoogleAuthorization(userId, requiredScopes);
  if (!authorization.token) {
    throw new Error(`Google authorization is missing required scopes: ${requiredScopes.join(", ")}`);
  }
  return authorization.token;
}

export async function getGoogleAuthorization(
  userId: string,
  requiredScopes: readonly string[],
) {
  const tokens = await getGoogleTokens(userId);
  const token = tokens.find((entry) => {
    const scopes = new Set(entry.scopes ?? []);
    return Boolean(entry.token) && requiredScopes.every((scope) => scopes.has(scope));
  });

  return {
    authorized: Boolean(token?.token),
    token: token?.token ?? null,
  };
}

export async function getGoogleScopeStatus(
  userId: string,
  requestedScopes: readonly string[],
) {
  const tokens = await getGoogleTokens(userId);
  const status: Record<string, boolean> = {};
  for (const scope of requestedScopes) {
    status[scope] = tokens.some(
      (entry) => Boolean(entry.token) && new Set(entry.scopes ?? []).has(scope),
    );
  }
  return status;
}

async function getGoogleTokens(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required to access Gmail.");

  const clerk = createClerkClient({ secretKey });
  const response = await clerk.users.getUserOauthAccessToken(userId, "google");
  return response.data;
}
