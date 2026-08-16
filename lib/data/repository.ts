import { and, asc, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  auditEvents,
  draftChecks,
  evidenceSpans,
  mailboxConnections,
  messages,
  nowDrafts,
  threads,
  workItems,
  workItemThreads,
  workspaces,
} from "./schema";

export interface GmailThreadRecord {
  gmailThreadId: string;
  historyId?: string;
  normalizedSubject: string;
  participants: string[];
  latestMessageAt: Date;
  snippet: string;
  searchText: string;
  attributes?: Record<string, unknown>;
  messages: GmailMessageRecord[];
}

export interface GmailMessageRecord {
  gmailMessageId: string;
  direction: "inbound" | "outbound";
  sender: string;
  recipients: string[];
  subject: string;
  sentAt: Date;
  snippet: string;
  bodyText: string;
  headers: Record<string, string>;
}

export async function upsertWorkspace(input: { id: string; email: string; displayName?: string }) {
  const db = getDb();
  await db
    .insert(workspaces)
    .values({ ...input, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: { email: input.email, displayName: input.displayName, updatedAt: new Date() },
    });
}

export async function upsertMailboxConnection(input: {
  workspaceId: string;
  email: string;
  historyId?: string;
  lastSyncedAt?: Date;
}) {
  const db = getDb();
  await db
    .insert(mailboxConnections)
    .values({ ...input, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: mailboxConnections.workspaceId,
      set: {
        email: input.email,
        historyId: input.historyId,
        lastSyncedAt: input.lastSyncedAt,
        status: "connected",
        updatedAt: new Date(),
      },
    });
}

export async function upsertGmailThread(workspaceId: string, input: GmailThreadRecord) {
  const db = getDb();
  const [thread] = await db
    .insert(threads)
    .values({
      workspaceId,
      gmailThreadId: input.gmailThreadId,
      historyId: input.historyId,
      normalizedSubject: input.normalizedSubject,
      participants: input.participants,
      latestMessageAt: input.latestMessageAt,
      snippet: input.snippet,
      searchText: input.searchText,
      attributes: input.attributes ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [threads.workspaceId, threads.gmailThreadId],
      set: {
        historyId: input.historyId,
        normalizedSubject: input.normalizedSubject,
        participants: input.participants,
        latestMessageAt: input.latestMessageAt,
        snippet: input.snippet,
        searchText: input.searchText,
        attributes: input.attributes ?? {},
        updatedAt: new Date(),
      },
    })
    .returning({ id: threads.id });

  for (const message of input.messages) {
    await db
      .insert(messages)
      .values({ workspaceId, threadId: thread.id, ...message })
      .onConflictDoUpdate({
        target: [messages.workspaceId, messages.gmailMessageId],
        set: {
          threadId: thread.id,
          direction: message.direction,
          sender: message.sender,
          recipients: message.recipients,
          subject: message.subject,
          sentAt: message.sentAt,
          snippet: message.snippet,
          bodyText: message.bodyText,
          headers: message.headers,
        },
      });
  }

  return thread.id;
}

export async function getMailboxStatus(workspaceId: string) {
  const db = getDb();
  const connection = await db.query.mailboxConnections.findFirst({
    where: eq(mailboxConnections.workspaceId, workspaceId),
  });
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(threads)
    .where(eq(threads.workspaceId, workspaceId));
  return { connection: connection ?? null, threadCount: count };
}

export async function setMailboxSendEnabled(workspaceId: string, enabled: boolean) {
  const db = getDb();
  await db
    .update(mailboxConnections)
    .set({ sendEnabled: enabled, updatedAt: new Date() })
    .where(eq(mailboxConnections.workspaceId, workspaceId));
}

export async function listTasks(workspaceId: string, includeDone = false) {
  const db = getDb();
  return db
    .select({
      id: workItems.id,
      title: workItems.title,
      status: workItems.status,
      dueAt: workItems.dueAt,
      confidence: workItems.confidence,
      metadata: workItems.metadata,
    })
    .from(workItems)
    .where(
      and(
        eq(workItems.workspaceId, workspaceId),
        eq(workItems.kind, "task"),
        includeDone ? sql`true` : ne(workItems.status, "done"),
      ),
    )
    .orderBy(asc(workItems.dueAt), desc(workItems.updatedAt))
    .limit(100);
}

export async function getEvidence(workspaceId: string, workItemId: string) {
  const db = getDb();
  const item = await db.query.workItems.findFirst({
    where: and(eq(workItems.id, workItemId), eq(workItems.workspaceId, workspaceId)),
  });
  if (!item) return null;
  const evidence = await db
    .select({
      quote: evidenceSpans.quote,
      gmailMessageId: messages.gmailMessageId,
      sender: messages.sender,
      sentAt: messages.sentAt,
      subject: messages.subject,
    })
    .from(evidenceSpans)
    .innerJoin(messages, eq(evidenceSpans.messageId, messages.id))
    .where(eq(evidenceSpans.workItemId, item.id))
    .orderBy(asc(messages.sentAt));
  return { item, evidence };
}

export async function getStash(workspaceId: string, workItemId: string) {
  const db = getDb();
  const item = await db.query.workItems.findFirst({
    where: and(eq(workItems.id, workItemId), eq(workItems.workspaceId, workspaceId)),
  });
  if (!item) return null;
  const linked = await db
    .select({ gmailThreadId: threads.gmailThreadId, relation: workItemThreads.relation })
    .from(workItemThreads)
    .innerJoin(threads, eq(workItemThreads.threadId, threads.id))
    .where(eq(workItemThreads.workItemId, item.id));
  return { id: item.id, dedupeKey: item.dedupeKey, metadata: item.metadata, threads: linked };
}

export async function searchThreads(workspaceId: string, query: string, limit = 20) {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(limit, 50));
  return db
    .select({
      id: threads.id,
      gmailThreadId: threads.gmailThreadId,
      subject: threads.normalizedSubject,
      participants: threads.participants,
      snippet: threads.snippet,
      latestMessageAt: threads.latestMessageAt,
    })
    .from(threads)
    .where(and(eq(threads.workspaceId, workspaceId), ilike(threads.searchText, `%${query}%`)))
    .orderBy(desc(threads.latestMessageAt))
    .limit(safeLimit);
}

export async function queueDraft(input: {
  workspaceId: string;
  workItemId?: string;
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  sessionId?: string;
  checks: { key: string; label: string; state?: "unresolved" | "verified"; sourceQuote?: string }[];
}) {
  const db = getDb();
  const unresolvedCheckCount = input.checks.filter((check) => check.state !== "verified").length;
  const [draft] = await db
    .insert(nowDrafts)
    .values({
      workspaceId: input.workspaceId,
      workItemId: input.workItemId,
      to: input.to,
      subject: input.subject,
      body: input.body,
      unresolvedCheckCount,
      state: unresolvedCheckCount ? "queued" : "cleared",
      idempotencyKey: input.idempotencyKey,
      createdBySessionId: input.sessionId,
    })
    .onConflictDoUpdate({
      target: [nowDrafts.workspaceId, nowDrafts.idempotencyKey],
      set: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        unresolvedCheckCount,
        state: unresolvedCheckCount ? "queued" : "cleared",
        updatedAt: new Date(),
      },
    })
    .returning();

  for (const check of input.checks) {
    await db
      .insert(draftChecks)
      .values({
        draftId: draft.id,
        stableKey: check.key,
        label: check.label,
        state: check.state ?? "unresolved",
        sourceQuote: check.sourceQuote,
      })
      .onConflictDoUpdate({
        target: [draftChecks.draftId, draftChecks.stableKey],
        set: {
          label: check.label,
          state: check.state ?? "unresolved",
          sourceQuote: check.sourceQuote,
          updatedAt: new Date(),
        },
      });
  }
  return draft;
}

export async function answerDraftCheck(input: {
  workspaceId: string;
  draftId: string;
  checkKey: string;
  answer: string;
  sourceMessageId: string;
  sourceQuote: string;
  actorId: string;
}) {
  const db = getDb();
  const [draft] = await db
    .select({ id: nowDrafts.id })
    .from(nowDrafts)
    .where(and(eq(nowDrafts.id, input.draftId), eq(nowDrafts.workspaceId, input.workspaceId)))
    .limit(1);
  if (!draft) throw new Error("Draft not found in this workspace.");

  const [source] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, input.workspaceId),
        eq(messages.gmailMessageId, input.sourceMessageId),
      ),
    )
    .limit(1);
  if (!source) throw new Error("The cited Gmail message is not in this workspace.");

  const [updated] = await db
    .update(draftChecks)
    .set({
      state: "answered",
      answer: input.answer,
      sourceMessageId: source.id,
      sourceQuote: input.sourceQuote,
      answeredBy: input.actorId,
      updatedAt: new Date(),
    })
    .where(and(eq(draftChecks.draftId, draft.id), eq(draftChecks.stableKey, input.checkKey)))
    .returning({ id: draftChecks.id });
  if (!updated) throw new Error("Draft check not found.");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(draftChecks)
    .where(and(eq(draftChecks.draftId, draft.id), eq(draftChecks.state, "unresolved")));
  await db
    .update(nowDrafts)
    .set({ unresolvedCheckCount: count, state: count ? "queued" : "cleared", updatedAt: new Date() })
    .where(eq(nowDrafts.id, draft.id));
  return { draftId: draft.id, unresolvedCheckCount: count, state: count ? "queued" : "cleared" };
}

export async function getClearedDraft(workspaceId: string, draftId: string) {
  const db = getDb();
  const [draft] = await db
    .select()
    .from(nowDrafts)
    .where(and(eq(nowDrafts.id, draftId), eq(nowDrafts.workspaceId, workspaceId)))
    .limit(1);
  if (!draft) return null;
  const checks = await db.select().from(draftChecks).where(eq(draftChecks.draftId, draft.id));
  return { draft, checks };
}

export async function reserveSendAttempt(input: {
  workspaceId: string;
  draftId: string;
  idempotencyKey: string;
  actorId: string;
  sessionId?: string;
  callId?: string;
}) {
  const db = getDb();
  const inserted = await db
    .insert(auditEvents)
    .values({
      workspaceId: input.workspaceId,
      action: "send_email",
      targetId: input.draftId,
      idempotencyKey: input.idempotencyKey,
      status: "started",
      actorId: input.actorId,
      sessionId: input.sessionId,
      callId: input.callId,
    })
    .onConflictDoNothing({ target: [auditEvents.workspaceId, auditEvents.idempotencyKey] })
    .returning();

  if (!inserted.length) {
    const [existing] = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.workspaceId, input.workspaceId),
          eq(auditEvents.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    return { reserved: false as const, event: existing };
  }

  const [locked] = await db
    .update(nowDrafts)
    .set({ state: "sending", updatedAt: new Date() })
    .where(
      and(
        eq(nowDrafts.id, input.draftId),
        eq(nowDrafts.workspaceId, input.workspaceId),
        eq(nowDrafts.state, "cleared"),
        eq(nowDrafts.unresolvedCheckCount, 0),
      ),
    )
    .returning({ id: nowDrafts.id });

  if (!locked) {
    await db
      .update(auditEvents)
      .set({ status: "failed", payload: { reason: "draft_not_cleared" }, updatedAt: new Date() })
      .where(eq(auditEvents.id, inserted[0].id));
    throw new Error("The draft is not cleared for sending.");
  }
  return { reserved: true as const, event: inserted[0] };
}

export async function completeSendAttempt(input: {
  eventId: string;
  draftId: string;
  gmailMessageId: string;
  gmailThreadId?: string;
}) {
  const db = getDb();
  await db
    .update(nowDrafts)
    .set({ state: "sent", gmailMessageId: input.gmailMessageId, sentAt: new Date(), updatedAt: new Date() })
    .where(eq(nowDrafts.id, input.draftId));
  await db
    .update(auditEvents)
    .set({
      status: "succeeded",
      payload: { gmailMessageId: input.gmailMessageId, gmailThreadId: input.gmailThreadId },
      updatedAt: new Date(),
    })
    .where(eq(auditEvents.id, input.eventId));
}

export async function markSendUncertain(eventId: string, draftId: string, reason: string) {
  const db = getDb();
  await db.update(nowDrafts).set({ state: "uncertain", updatedAt: new Date() }).where(eq(nowDrafts.id, draftId));
  await db
    .update(auditEvents)
    .set({ status: "uncertain", payload: { reason }, updatedAt: new Date() })
    .where(eq(auditEvents.id, eventId));
}
