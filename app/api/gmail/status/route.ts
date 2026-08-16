import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/data/client";
import {
  getMailboxStatus,
  setMailboxAuthorizationStatus,
} from "@/lib/data/repository";
import { getGoogleScopeStatus } from "@/lib/gmail/auth";
import { product } from "@/lib/domain/config";

export async function GET() {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ connected: false, reason: "clerk_not_configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, reason: "database_not_configured" }, { status: 503 });
  }
  let status = await getMailboxStatus(session.userId);
  let readAuthorized = false;
  if (status.connection) {
    let sendEnabled: boolean;
    try {
      const scopes = await getGoogleScopeStatus(session.userId, [
        product.gmailScope,
        product.gmailSendScope,
      ]);
      readAuthorized = scopes[product.gmailScope] ?? false;
      sendEnabled = scopes[product.gmailSendScope] ?? false;
    } catch {
      return NextResponse.json(
        {
          connected: true,
          permissionStatus: "unknown",
          reason: "google_permission_check_failed",
        },
        { status: 502 },
      );
    }
    const connectionStatus = readAuthorized ? "connected" : "reauthorization_required";
    if (
      status.connection.sendEnabled !== sendEnabled ||
      status.connection.status !== connectionStatus
    ) {
      await setMailboxAuthorizationStatus({
        workspaceId: session.userId,
        status: connectionStatus,
        sendEnabled,
      });
      status = await getMailboxStatus(session.userId);
    }
  }
  return NextResponse.json({
    connected: Boolean(status.connection),
    permissionStatus: "current",
    readAuthorized,
    threadCount: status.threadCount,
    sendEnabled: status.connection?.sendEnabled ?? false,
    lastSyncedAt: status.connection?.lastSyncedAt?.toISOString() ?? null,
  });
}
