import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const itemKind = pgEnum("item_kind", ["task", "promise"]);
export const itemStatus = pgEnum("item_status", [
  "needs_you",
  "waiting",
  "later",
  "done",
  "incorrect",
]);
export const messageDirection = pgEnum("message_direction", ["inbound", "outbound"]);
export const draftState = pgEnum("draft_state", ["queued", "cleared", "sending", "sent", "cancelled", "uncertain"]);
export const checkState = pgEnum("check_state", ["unresolved", "verified", "answered"]);
export const auditStatus = pgEnum("audit_status", ["started", "succeeded", "failed", "uncertain"]);

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxConnections = pgTable("mailbox_connections", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  providerAccountId: text("provider_account_id"),
  email: text("email").notNull(),
  historyId: text("history_id"),
  status: text("status").default("connected").notNull(),
  sendEnabled: boolean("send_enabled").default(false).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    gmailThreadId: text("gmail_thread_id").notNull(),
    historyId: text("history_id"),
    normalizedSubject: text("normalized_subject").notNull(),
    participants: text("participants").array().default(sql`'{}'::text[]`).notNull(),
    latestMessageAt: timestamp("latest_message_at", { withTimezone: true }).notNull(),
    snippet: text("snippet").default("").notNull(),
    searchText: text("search_text").default("").notNull(),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("threads_workspace_gmail_uidx").on(table.workspaceId, table.gmailThreadId),
    index("threads_workspace_latest_idx").on(table.workspaceId, table.latestMessageAt),
    index("threads_search_idx").using("gin", sql`to_tsvector('english', ${table.searchText})`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").notNull(),
    direction: messageDirection("direction").notNull(),
    sender: text("sender").notNull(),
    recipients: text("recipients").array().default(sql`'{}'::text[]`).notNull(),
    subject: text("subject").default("").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    snippet: text("snippet").default("").notNull(),
    bodyText: text("body_text").default("").notNull(),
    headers: jsonb("headers").$type<Record<string, string>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("messages_workspace_gmail_uidx").on(table.workspaceId, table.gmailMessageId),
    index("messages_thread_sent_idx").on(table.threadId, table.sentAt),
  ],
);

export const trackers = pgTable(
  "trackers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    name: text("name").notNull(),
    stages: text("stages").array().notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("trackers_workspace_key_uidx").on(table.workspaceId, table.stableKey)],
);

export const workItems = pgTable(
  "work_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: itemKind("kind").notNull(),
    status: itemStatus("status").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    confidence: real("confidence"),
    primaryThreadId: uuid("primary_thread_id").references(() => threads.id, { onDelete: "set null" }),
    trackerId: uuid("tracker_id").references(() => trackers.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("work_items_workspace_dedupe_uidx").on(table.workspaceId, table.dedupeKey),
    index("work_items_workspace_status_due_idx").on(table.workspaceId, table.status, table.dueAt),
    index("work_items_workspace_kind_status_idx").on(table.workspaceId, table.kind, table.status),
    index("work_items_tracker_idx").on(table.trackerId, table.status),
  ],
);

export const workItemThreads = pgTable(
  "work_item_threads",
  {
    workItemId: uuid("work_item_id")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    relation: text("relation").default("source").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workItemId, table.threadId] }),
    index("work_item_threads_thread_idx").on(table.threadId),
  ],
);

export const evidenceSpans = pgTable(
  "evidence_spans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workItemId: uuid("work_item_id")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    quote: text("quote").notNull(),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("evidence_work_item_idx").on(table.workItemId)],
);

export const trackerEntries = pgTable(
  "tracker_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackerId: uuid("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    name: text("name").notNull(),
    stageIndex: integer("stage_index").notNull(),
    status: text("status").default("active").notNull(),
    lastSignalAt: timestamp("last_signal_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tracker_entries_key_uidx").on(table.trackerId, table.stableKey),
    index("tracker_entries_stage_idx").on(table.trackerId, table.status, table.stageIndex),
  ],
);

export const clusters = pgTable(
  "clusters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("clusters_workspace_key_uidx").on(table.workspaceId, table.stableKey)],
);

export const threadClusters = pgTable(
  "thread_clusters",
  {
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => clusters.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    confidence: real("confidence"),
  },
  (table) => [
    primaryKey({ columns: [table.clusterId, table.threadId] }),
    index("thread_clusters_thread_idx").on(table.threadId),
  ],
);

export const nowDrafts = pgTable(
  "now_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    workItemId: uuid("work_item_id").references(() => workItems.id, { onDelete: "set null" }),
    state: draftState("state").default("queued").notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    unresolvedCheckCount: integer("unresolved_check_count").default(0).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    gmailMessageId: text("gmail_message_id"),
    createdBySessionId: text("created_by_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("now_drafts_workspace_idempotency_uidx").on(table.workspaceId, table.idempotencyKey),
    index("now_drafts_workspace_state_idx").on(table.workspaceId, table.state, table.createdAt),
  ],
);

export const draftChecks = pgTable(
  "draft_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => nowDrafts.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    label: text("label").notNull(),
    state: checkState("state").default("unresolved").notNull(),
    answer: text("answer"),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, { onDelete: "set null" }),
    sourceQuote: text("source_quote"),
    answeredBy: text("answered_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("draft_checks_draft_key_uidx").on(table.draftId, table.stableKey),
    index("draft_checks_draft_state_idx").on(table.draftId, table.state),
  ],
);

export const userCorrections = pgTable(
  "user_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    features: jsonb("features").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("corrections_workspace_created_idx").on(table.workspaceId, table.createdAt)],
);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    surface: text("surface").notNull(),
    eveSessionId: text("eve_session_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.surface] })],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetId: text("target_id"),
    idempotencyKey: text("idempotency_key"),
    status: auditStatus("status").notNull(),
    actorId: text("actor_id").notNull(),
    sessionId: text("session_id"),
    callId: text("call_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("audit_workspace_idempotency_uidx").on(table.workspaceId, table.idempotencyKey),
    index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);
