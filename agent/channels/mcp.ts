import { localDev, oauthResource, vercelOidc } from "eve/channels/auth";
import { mcpChannel } from "eve/channels/mcp";
import { clerkIssuer, clerkOAuthAuth } from "../lib/clerk-auth";

const resource = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://nowmal.vercel.app").replace(/\/$/, "")}/eve/v1/mcp`;
const auth = oauthResource([clerkOAuthAuth(), vercelOidc(), localDev()], {
  issuer: clerkIssuer(),
  resource,
  scopes: ["openid"],
});

export default mcpChannel({
  auth,
});
