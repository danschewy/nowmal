import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/data/client";
import { getMailboxStatus, setMailboxSendEnabled } from "@/lib/data/repository";
import { getGoogleAccessToken } from "@/lib/gmail/auth";
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
  if (status.connection) {
    let sendEnabled = false;
    try {
      await getGoogleAccessToken(session.userId, [product.gmailSendScope]);
      sendEnabled = true;
    } catch {
      sendEnabled = false;
    }
    if (status.connection.sendEnabled !== sendEnabled) {
      await setMailboxSendEnabled(session.userId, sendEnabled);
      status = await getMailboxStatus(session.userId);
    }
  }
  return NextResponse.json({ connected: Boolean(status.connection), ...status });
}
