import { parsePublishableKey } from "@clerk/shared/keys";

export function clerkIssuerFromEnvironment() {
  const configured = process.env.CLERK_ISSUER_URL;
  if (configured) return configured.replace(/\/$/, "");
  const key = parsePublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return key ? `https://${key.frontendApi}` : "https://clerk.invalid";
}
