import { and, asc, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  auditEvents,
  agentSessions,
  draftChecks,
  evidenceSpans,
  mailboxConnections,
  messages,
  nowDrafts,
  threads,
  userCorrections,
  workItems,
  workItemThreads,
  workspaces,
} from "./schema";
import type { WorkspaceSnapshot } from "@/lib/workspace/snapshot";
import { WORKSPACE_ANALYSIS_VERSION } from "@/lib/workspace/analysis-contract";

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

export interface AnalysisMessageRecord {
  id: string;
  gmailMessageId: string;
  direction: "inbound" | "outbound";
  sender: string;
  recipients: string[];
  subject: string;
  sentAt: Date;
  snippet: string;
  bodyText: string;
}

export interface AnalysisThreadRecord {
  id: string;
  gmailThreadId: string;
  subject: string;
  participants: string[];
  snippet: string;
  latestMessageAt: Date;
  attributes: Record<string, unknown>;
  messages: AnalysisMessageRecord[];
}

export interface ExtractedWorkItemRecord {
  kind: "task" | "promise";
  status: "needs_you" | "waiting" | "later";
  dedupeKey: string;
  title: string;
  dueAt: Date | null;
  confidence: number;
  metadata: Record<string, unknown>;
  sources: {
    threadId: string;
    gmailMessageId: string;
    quote: string;
  }[];
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

export async function recordAgentSession(input: {
  workspaceId: string;
  surface: string;
  eveSessionId: string;
}) {
  const db = getDb();
  await db
    .insert(agentSessions)
    .values({ ...input, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [agentSessions.workspaceId, agentSessions.surface],
      set: { eveSessionId: input.eveSessionId, updatedAt: new Date() },
    });
}

export async function getAgentSessionOwner(eveSessionId: string) {
  const db = getDb();
  const [owner] = await db
    .select({ workspaceId: agentSessions.workspaceId })
    .from(agentSessions)
    .where(eq(agentSessions.eveSessionId, eveSessionId))
    .limit(1);
  return owner?.workspaceId ?? null;
}

export async function getWorkspaceAgentSession(workspaceId: string) {
  const db = getDb();
  const session = await db.query.agentSessions.findFirst({
    where: eq(agentSessions.workspaceId, workspaceId),
    orderBy: desc(agentSessions.updatedAt),
  });
  return session?.eveSessionId ?? null;
}

export async function getThreadsForAnalysis(workspaceId: string, limit: number) {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const [workspace, threadRows] = await Promise.all([
    db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) }),
    db
      .select({
        id: threads.id,
        gmailThreadId: threads.gmailThreadId,
        subject: threads.normalizedSubject,
        participants: threads.participants,
        snippet: threads.snippet,
        latestMessageAt: threads.latestMessageAt,
        attributes: threads.attributes,
      })
      .from(threads)
      .where(eq(threads.workspaceId, workspaceId))
      .orderBy(desc(threads.latestMessageAt))
      .limit(safeLimit),
  ]);

  const pending = threadRows.filter((thread) => {
    const analysis = analysisMetadata(thread.attributes);
    return analysis?.version !== WORKSPACE_ANALYSIS_VERSION;
  });
  if (!pending.length) return { accountEmail: workspace?.email ?? "", threads: [] };

  const messageRows = await db
    .select({
      id: messages.id,
      threadId: messages.threadId,
      gmailMessageId: messages.gmailMessageId,
      direction: messages.direction,
      sender: messages.sender,
      recipients: messages.recipients,
      subject: messages.subject,
      sentAt: messages.sentAt,
      snippet: messages.snippet,
      bodyText: messages.bodyText,
    })
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspaceId),
        inArray(messages.threadId, pending.map((thread) => thread.id)),
      ),
    )
    .orderBy(asc(messages.sentAt));

  const messagesByThread = new Map<string, AnalysisMessageRecord[]>();
  for (const message of messageRows) {
    const group = messagesByThread.get(message.threadId) ?? [];
    group.push(message);
    messagesByThread.set(message.threadId, group);
  }

  return {
    accountEmail: workspace?.email ?? "",
    threads: pending.map((thread) => ({
      ...thread,
      messages: messagesByThread.get(thread.id) ?? [],
    })) satisfies AnalysisThreadRecord[],
  };
}

export async function upsertExtractedWorkItem(
  workspaceId: string,
  input: ExtractedWorkItemRecord,
) {
  const db = getDb();
  const existing = await db.query.workItems.findFirst({
    where: and(
      eq(workItems.workspaceId, workspaceId),
      eq(workItems.dedupeKey, input.dedupeKey),
    ),
  });
  const preservesUserDecision = existing?.status === "done" || existing?.status === "incorrect";
  const [item] = await db
    .insert(workItems)
    .values({
      workspaceId,
      kind: input.kind,
      status: input.status,
      dedupeKey: input.dedupeKey,
      title: input.title,
      dueAt: input.dueAt,
      confidence: input.confidence,
      primaryThreadId: input.sources[0]?.threadId,
      metadata: input.metadata,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [workItems.workspaceId, workItems.dedupeKey],
      set: {
        kind: input.kind,
        status: preservesUserDecision ? existing.status : input.status,
        title: input.title,
        dueAt: input.dueAt,
        confidence: input.confidence,
        primaryThreadId: input.sources[0]?.threadId,
        metadata: { ...(existing?.metadata ?? {}), ...input.metadata },
        updatedAt: new Date(),
      },
    })
    .returning({ id: workItems.id });

  const uniqueThreadIds = [...new Set(input.sources.map((source) => source.threadId))];
  for (const threadId of uniqueThreadIds) {
    await db
      .insert(workItemThreads)
      .values({ workItemId: item.id, threadId, relation: "source" })
      .onConflictDoNothing();
  }

  const sourceMessageIds = [...new Set(input.sources.map((source) => source.gmailMessageId))];
  const sourceMessages = await db
    .select({ id: messages.id, gmailMessageId: messages.gmailMessageId })
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspaceId),
        inArray(messages.gmailMessageId, sourceMessageIds),
      ),
    );
  const internalIdByGmailId = new Map(
    sourceMessages.map((message) => [message.gmailMessageId, message.id]),
  );
  const existingEvidence = await db
    .select({ gmailMessageId: messages.gmailMessageId, quote: evidenceSpans.quote })
    .from(evidenceSpans)
    .innerJoin(messages, eq(evidenceSpans.messageId, messages.id))
    .where(eq(evidenceSpans.workItemId, item.id));
  const evidenceKeys = new Set(
    existingEvidence.map((evidence) => `${evidence.gmailMessageId}\n${evidence.quote}`),
  );

  for (const source of input.sources) {
    const messageId = internalIdByGmailId.get(source.gmailMessageId);
    const evidenceKey = `${source.gmailMessageId}\n${source.quote}`;
    if (!messageId || evidenceKeys.has(evidenceKey)) continue;
    await db.insert(evidenceSpans).values({ workItemId: item.id, messageId, quote: source.quote });
    evidenceKeys.add(evidenceKey);
  }

  return item.id;
}

export async function markThreadsAnalyzed(workspaceId: string, threadRows: AnalysisThreadRecord[]) {
  if (!threadRows.length) return;
  const db = getDb();
  const analyzedAt = new Date().toISOString();
  const analysis = JSON.stringify({
    analysis: { version: WORKSPACE_ANALYSIS_VERSION, analyzedAt },
  });
  await db
    .update(threads)
    .set({ attributes: sql`${threads.attributes} || ${analysis}::jsonb` })
    .where(
      and(
        eq(threads.workspaceId, workspaceId),
        inArray(threads.id, threadRows.map((thread) => thread.id)),
      ),
    );
}

export async function getWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const db = getDb();
  const [connection, eveSessionId, counts, itemCounts, threadRows, itemRows, evidenceRows, draftRows] = await Promise.all([
    db.query.mailboxConnections.findFirst({
      where: eq(mailboxConnections.workspaceId, workspaceId),
    }),
    getWorkspaceAgentSession(workspaceId),
    db
      .select({
        count: sql<number>`count(*)::int`,
        analyzedCount: sql<number>`count(*) filter (where ${threads.attributes}->'analysis'->>'version' = ${WORKSPACE_ANALYSIS_VERSION})::int`,
      })
      .from(threads)
      .where(eq(threads.workspaceId, workspaceId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workItems)
      .where(eq(workItems.workspaceId, workspaceId)),
    db
      .select({
        id: threads.id,
        gmailThreadId: threads.gmailThreadId,
        subject: threads.normalizedSubject,
        participants: threads.participants,
        snippet: threads.snippet,
        latestMessageAt: threads.latestMessageAt,
        attributes: threads.attributes,
      })
      .from(threads)
      .where(eq(threads.workspaceId, workspaceId))
      .orderBy(desc(threads.latestMessageAt))
      .limit(100),
    db
      .select({
        id: workItems.id,
        kind: workItems.kind,
        status: workItems.status,
        title: workItems.title,
        dueAt: workItems.dueAt,
        confidence: workItems.confidence,
        metadata: workItems.metadata,
      })
      .from(workItems)
      .where(eq(workItems.workspaceId, workspaceId))
      .orderBy(asc(workItems.dueAt), desc(workItems.updatedAt))
      .limit(100),
    db
      .select({
        workItemId: evidenceSpans.workItemId,
        quote: evidenceSpans.quote,
        gmailMessageId: messages.gmailMessageId,
        gmailThreadId: threads.gmailThreadId,
        subject: messages.subject,
        sender: messages.sender,
        sentAt: messages.sentAt,
      })
      .from(evidenceSpans)
      .innerJoin(workItems, eq(evidenceSpans.workItemId, workItems.id))
      .innerJoin(messages, eq(evidenceSpans.messageId, messages.id))
      .innerJoin(threads, eq(messages.threadId, threads.id))
      .where(eq(workItems.workspaceId, workspaceId))
      .orderBy(desc(messages.sentAt))
      .limit(300),
    db
      .select({
        id: nowDrafts.id,
        state: nowDrafts.state,
        to: nowDrafts.to,
        subject: nowDrafts.subject,
        body: nowDrafts.body,
        unresolvedCheckCount: nowDrafts.unresolvedCheckCount,
        createdAt: nowDrafts.createdAt,
        sentAt: nowDrafts.sentAt,
      })
      .from(nowDrafts)
      .where(eq(nowDrafts.workspaceId, workspaceId))
      .orderBy(desc(nowDrafts.createdAt))
      .limit(50),
  ]);

  const evidenceByItem = new Map<string, WorkspaceSnapshot["workItems"][number]["evidence"]>();
  for (const evidence of evidenceRows) {
    const group = evidenceByItem.get(evidence.workItemId) ?? [];
    group.push({
      quote: evidence.quote,
      gmailMessageId: evidence.gmailMessageId,
      gmailThreadId: evidence.gmailThreadId,
      subject: evidence.subject,
      sender: evidence.sender,
      sentAt: evidence.sentAt.toISOString(),
    });
    evidenceByItem.set(evidence.workItemId, group);
  }

  return {
    connected: Boolean(connection),
    threadCount: counts[0]?.count ?? 0,
    sendEnabled: connection?.sendEnabled ?? false,
    lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
    eveSessionId,
    analysis: {
      version: WORKSPACE_ANALYSIS_VERSION,
      analyzedThreadCount: counts[0]?.analyzedCount ?? 0,
      pendingThreadCount: Math.max(
        0,
        (counts[0]?.count ?? 0) - (counts[0]?.analyzedCount ?? 0),
      ),
      workItemCount: itemCounts[0]?.count ?? 0,
    },
    threads: threadRows.map((thread) => ({
      id: thread.id,
      gmailThreadId: thread.gmailThreadId,
      subject: thread.subject,
      participants: thread.participants,
      snippet: thread.snippet,
      latestMessageAt: thread.latestMessageAt.toISOString(),
      analyzed: analysisMetadata(thread.attributes)?.version === WORKSPACE_ANALYSIS_VERSION,
    })),
    workItems: itemRows.map((item) => ({
      ...item,
      dueAt: item.dueAt?.toISOString() ?? null,
      evidence: evidenceByItem.get(item.id) ?? [],
    })),
    drafts: draftRows.map((draft) => ({
      ...draft,
      createdAt: draft.createdAt.toISOString(),
      sentAt: draft.sentAt?.toISOString() ?? null,
    })),
  };
}

function analysisMetadata(attributes: Record<string, unknown>) {
  const value = attributes.analysis;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as { version?: string; analyzedAt?: string };
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

export async function setWorkItemStatus(input: {
  workspaceId: string;
  workItemId: string;
  action: "done" | "incorrect" | "restore";
  reason?: string;
}) {
  const db = getDb();
  const current = await db.query.workItems.findFirst({
    where: and(
      eq(workItems.id, input.workItemId),
      eq(workItems.workspaceId, input.workspaceId),
    ),
  });
  if (!current) throw new Error("Work item not found in this workspace.");
  const status = input.action === "done"
    ? "done" as const
    : input.action === "incorrect"
      ? "incorrect" as const
      : "needs_you" as const;
  const [updatedRows] = await db.batch([
    db
      .update(workItems)
      .set({
        status,
        completedAt: status === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workItems.id, input.workItemId),
          eq(workItems.workspaceId, input.workspaceId),
        ),
      )
      .returning({ id: workItems.id, status: workItems.status }),
    db.insert(userCorrections).values({
      workspaceId: input.workspaceId,
      kind: `work_item_${input.action}`,
      targetId: input.workItemId,
      reason: input.reason,
      features: {
        previousStatus: current.status,
        nextStatus: status,
        kind: current.kind,
        dedupeKey: current.dedupeKey,
        confidence: current.confidence,
      },
    }),
  ]);
  const updated = updatedRows[0];
  if (!updated) throw new Error("Work item could not be updated.");
  return updated;
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
