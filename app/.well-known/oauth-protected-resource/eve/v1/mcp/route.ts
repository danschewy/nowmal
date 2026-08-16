import { NextResponse } from "next/server";
import { clerkIssuerFromEnvironment } from "@/lib/auth/clerk-issuer";

export function GET() {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://nowmal.vercel.app").replace(/\/$/, "");
  return NextResponse.json(
    {
      authorization_servers: [clerkIssuerFromEnvironment()],
      resource: `${origin}/eve/v1/mcp`,
      scopes_supported: ["openid"],
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
