import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { product } from "@/lib/domain/config";
import { isDatabaseConfigured } from "@/lib/data/client";
import { searchThreads } from "@/lib/data/repository";
import { getGoogleAccessToken } from "@/lib/gmail/auth";
import { searchAndIndexGmailMailbox } from "@/lib/gmail/sync";

export async function GET(request: Request) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Account access is not configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Workspace storage is not configured." }, { status: 503 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: "Search terms must be between 2 and 120 characters." },
      { status: 400 },
    );
  }

  let threads = await searchThreads(session.userId, query, 50);
  let expandedIndex = false;
  if (!threads.length) {
    const token = await getGoogleAccessToken(session.userId, [product.gmailScope]);
    const expansion = await searchAndIndexGmailMailbox({
      workspaceId: session.userId,
      accessToken: token,
      query,
      maxThreads: 10,
    });
    expandedIndex = expansion.hydratedThreads > 0;
    if (expandedIndex) threads = await searchThreads(session.userId, query, 50);
  }
  return NextResponse.json({
    expandedIndex,
    threads: threads.map((thread) => ({
      ...thread,
      latestMessageAt: thread.latestMessageAt.toISOString(),
      analyzed: false,
    })),
  });
}
