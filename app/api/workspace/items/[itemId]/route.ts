import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/data/client";
import { setWorkItemStatus } from "@/lib/data/repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Account access is not configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Workspace storage is not configured." }, { status: 503 });
  }

  const { itemId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: "done" | "incorrect" | "restore";
    reason?: string;
  };
  if (!body.action || !["done", "incorrect", "restore"].includes(body.action)) {
    return NextResponse.json({ error: "A valid work-item action is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await setWorkItemStatus({
        workspaceId: session.userId,
        workItemId: itemId,
        action: body.action,
        reason: body.reason?.slice(0, 500),
      }),
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Work item could not be updated.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not found") ? 404 : 500 },
    );
  }
}
