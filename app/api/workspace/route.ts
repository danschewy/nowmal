import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/data/client";
import { getWorkspaceSnapshot } from "@/lib/data/repository";

export async function GET() {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Account access is not configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Workspace storage is not configured." }, { status: 503 });
  }

  return NextResponse.json(await getWorkspaceSnapshot(session.userId));
}
