import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { product } from "@/lib/domain/config";
import { isDatabaseConfigured } from "@/lib/data/client";
import { getGoogleAccessToken } from "@/lib/gmail/auth";
import { syncGmailMailbox } from "@/lib/gmail/sync";

export async function POST(request: Request) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Clerk is not configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Neon is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { maxThreads?: number };
  const maxThreads = Math.max(1, Math.min(Number(body.maxThreads ?? 500), 500));
  const token = await getGoogleAccessToken(session.userId, [product.gmailScope]);
  const user = await currentUser();
  const result = await syncGmailMailbox({
    workspaceId: session.userId,
    accessToken: token,
    displayName: user?.fullName ?? undefined,
    maxThreads,
  });
  return NextResponse.json(result);
}
