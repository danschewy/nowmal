import { createClerkClient } from "@clerk/backend";

export async function getGoogleAccessToken(userId: string, requiredScopes: readonly string[]) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required to access Gmail.");

  const clerk = createClerkClient({ secretKey });
  const response = await clerk.users.getUserOauthAccessToken(userId, "google");
  const token = response.data.find((entry) => {
    const scopes = new Set(entry.scopes ?? []);
    return Boolean(entry.token) && requiredScopes.every((scope) => scopes.has(scope));
  });

  if (!token?.token) {
    throw new Error(`Google authorization is missing required scopes: ${requiredScopes.join(", ")}`);
  }
  return token.token;
}
