import type { GmailMessage, GmailThread } from "./client";
import {
  getGmailProfile,
  getGmailThread,
  headersOf,
  listChangedThreadIds,
  listRecentThreadIds,
  mapWithConcurrency,
  plainTextOf,
} from "./client";
import {
  getMailboxStatus,
  upsertGmailThread,
  upsertMailboxConnection,
  upsertWorkspace,
  type GmailThreadRecord,
} from "@/lib/data/repository";

export async function syncGmailMailbox(input: {
  workspaceId: string;
  accessToken: string;
  displayName?: string;
  maxThreads?: number;
}) {
  const profile = await getGmailProfile(input.accessToken);
  await upsertWorkspace({ id: input.workspaceId, email: profile.emailAddress, displayName: input.displayName });

  const current = await getMailboxStatus(input.workspaceId);
  let threadIds: string[];
  let mode: "initial" | "incremental" = "initial";
  try {
    if (current.connection?.historyId) {
      const changed = await listChangedThreadIds(
        input.accessToken,
        current.connection.historyId,
        input.maxThreads ?? 500,
      );
      threadIds = changed.threadIds;
      mode = "incremental";
    } else {
      threadIds = await listRecentThreadIds(input.accessToken, { maxThreads: input.maxThreads ?? 500 });
    }
  } catch (error) {
    // Gmail expires history cursors. A bounded 90-day rebuild is the correct recovery path.
    if (!(error instanceof Error) || !error.message.includes("Gmail API 404")) throw error;
    threadIds = await listRecentThreadIds(input.accessToken, { maxThreads: input.maxThreads ?? 500 });
  }

  const hydrated = await mapWithConcurrency(threadIds, 8, async (threadId) => {
    const thread = await getGmailThread(input.accessToken, threadId);
    const normalized = normalizeThread(profile.emailAddress, thread);
    await upsertGmailThread(input.workspaceId, normalized);
    return normalized;
  });

  await upsertMailboxConnection({
    workspaceId: input.workspaceId,
    email: profile.emailAddress,
    historyId: profile.historyId,
    lastSyncedAt: new Date(),
  });
  const updated = await getMailboxStatus(input.workspaceId);

  return {
    mode,
    email: profile.emailAddress,
    hydratedThreads: hydrated.length,
    totalThreads: updated.threadCount,
    historyId: profile.historyId,
  };
}

function normalizeThread(accountEmail: string, thread: GmailThread): GmailThreadRecord {
  const sourceMessages = thread.messages ?? [];
  const messages = sourceMessages.map((message) => normalizeMessage(accountEmail, message));
  const latest = messages.reduce(
    (current, message) => (message.sentAt > current ? message.sentAt : current),
    new Date(0),
  );
  const participants = [...new Set(messages.flatMap((message) => [message.sender, ...message.recipients]).filter(Boolean))];
  const subject = messages.at(-1)?.subject ?? "(no subject)";
  const snippet = sourceMessages.at(-1)?.snippet ?? "";
  const searchText = [subject, participants.join(" "), snippet, ...messages.map((message) => message.bodyText)].join("\n").slice(0, 500_000);
  return {
    gmailThreadId: thread.id,
    historyId: thread.historyId,
    normalizedSubject: normalizeSubject(subject),
    participants,
    latestMessageAt: latest,
    snippet,
    searchText,
    attributes: { messageCount: messages.length },
    messages,
  };
}

function normalizeMessage(accountEmail: string, message: GmailMessage) {
  const headers = headersOf(message);
  const sender = headers.from ?? "Unknown sender";
  const recipients = [headers.to, headers.cc].filter(Boolean).flatMap((value) => value.split(",").map((item) => item.trim()));
  return {
    gmailMessageId: message.id,
    direction: sender.toLowerCase().includes(accountEmail.toLowerCase()) ? ("outbound" as const) : ("inbound" as const),
    sender,
    recipients,
    subject: headers.subject ?? "(no subject)",
    sentAt: new Date(Number(message.internalDate ?? Date.now())),
    snippet: message.snippet ?? "",
    bodyText: plainTextOf(message),
    headers,
  };
}

function normalizeSubject(subject: string) {
  return subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").trim() || "(no subject)";
}
