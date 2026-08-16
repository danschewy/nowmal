import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/data/client";
import { product } from "@/lib/domain/config";
import { analyzeWorkspace } from "@/lib/workspace/analyze";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Account access is not configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Workspace storage is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { maxThreads?: number };
  const requestedMaxThreads = Number(body.maxThreads);
  const maxThreads = Math.max(
    1,
    Math.min(
      Number.isFinite(requestedMaxThreads)
        ? requestedMaxThreads
        : product.workspaceAnalysisDefaultMaxThreads,
      product.workspaceAnalysisDefaultMaxThreads,
    ),
  );

  try {
    const result = await analyzeWorkspace({
      workspaceId: session.userId,
      maxThreads,
      abortSignal: request.signal,
    });
    return NextResponse.json(result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Workspace analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
