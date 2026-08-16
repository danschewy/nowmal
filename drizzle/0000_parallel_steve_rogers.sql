CREATE TYPE "public"."audit_status" AS ENUM('started', 'succeeded', 'failed', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."check_state" AS ENUM('unresolved', 'verified', 'answered');--> statement-breakpoint
CREATE TYPE "public"."draft_state" AS ENUM('queued', 'cleared', 'sending', 'sent', 'cancelled', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('task', 'promise');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('needs_you', 'waiting', 'later', 'done', 'incorrect');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"workspace_id" text NOT NULL,
	"surface" text NOT NULL,
	"eve_session_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_sessions_workspace_id_surface_pk" PRIMARY KEY("workspace_id","surface")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"idempotency_key" text,
	"status" "audit_status" NOT NULL,
	"actor_id" text NOT NULL,
	"session_id" text,
	"call_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"stable_key" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"label" text NOT NULL,
	"state" "check_state" DEFAULT 'unresolved' NOT NULL,
	"answer" text,
	"source_message_id" uuid,
	"source_quote" text,
	"answered_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_spans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_item_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"quote" text NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_connections" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"provider_account_id" text,
	"email" text NOT NULL,
	"history_id" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"send_enabled" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"gmail_message_id" text NOT NULL,
	"direction" "message_direction" NOT NULL,
	"sender" text NOT NULL,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "now_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"work_item_id" uuid,
	"state" "draft_state" DEFAULT 'queued' NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"unresolved_check_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"gmail_message_id" text,
	"created_by_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "thread_clusters" (
	"cluster_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"confidence" real,
	CONSTRAINT "thread_clusters_cluster_id_thread_id_pk" PRIMARY KEY("cluster_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"history_id" text,
	"normalized_subject" text NOT NULL,
	"participants" text[] DEFAULT '{}'::text[] NOT NULL,
	"latest_message_at" timestamp with time zone NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracker_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracker_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"name" text NOT NULL,
	"stage_index" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_signal_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trackers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"stable_key" text NOT NULL,
	"name" text NOT NULL,
	"stages" text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_item_threads" (
	"work_item_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"relation" text DEFAULT 'source' NOT NULL,
	CONSTRAINT "work_item_threads_work_item_id_thread_id_pk" PRIMARY KEY("work_item_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" "item_kind" NOT NULL,
	"status" "item_status" NOT NULL,
	"dedupe_key" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone,
	"confidence" real,
	"primary_thread_id" uuid,
	"tracker_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_checks" ADD CONSTRAINT "draft_checks_draft_id_now_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."now_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_checks" ADD CONSTRAINT "draft_checks_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_spans" ADD CONSTRAINT "evidence_spans_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_spans" ADD CONSTRAINT "evidence_spans_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_connections" ADD CONSTRAINT "mailbox_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "now_drafts" ADD CONSTRAINT "now_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "now_drafts" ADD CONSTRAINT "now_drafts_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_clusters" ADD CONSTRAINT "thread_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_clusters" ADD CONSTRAINT "thread_clusters_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_entries" ADD CONSTRAINT "tracker_entries_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackers" ADD CONSTRAINT "trackers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_corrections" ADD CONSTRAINT "user_corrections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_threads" ADD CONSTRAINT "work_item_threads_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_threads" ADD CONSTRAINT "work_item_threads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_primary_thread_id_threads_id_fk" FOREIGN KEY ("primary_thread_id") REFERENCES "public"."threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."trackers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_workspace_idempotency_uidx" ON "audit_events" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "audit_workspace_created_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clusters_workspace_key_uidx" ON "clusters" USING btree ("workspace_id","stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "draft_checks_draft_key_uidx" ON "draft_checks" USING btree ("draft_id","stable_key");--> statement-breakpoint
CREATE INDEX "draft_checks_draft_state_idx" ON "draft_checks" USING btree ("draft_id","state");--> statement-breakpoint
CREATE INDEX "evidence_work_item_idx" ON "evidence_spans" USING btree ("work_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_workspace_gmail_uidx" ON "messages" USING btree ("workspace_id","gmail_message_id");--> statement-breakpoint
CREATE INDEX "messages_thread_sent_idx" ON "messages" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "now_drafts_workspace_idempotency_uidx" ON "now_drafts" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "now_drafts_workspace_state_idx" ON "now_drafts" USING btree ("workspace_id","state","created_at");--> statement-breakpoint
CREATE INDEX "thread_clusters_thread_idx" ON "thread_clusters" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "threads_workspace_gmail_uidx" ON "threads" USING btree ("workspace_id","gmail_thread_id");--> statement-breakpoint
CREATE INDEX "threads_workspace_latest_idx" ON "threads" USING btree ("workspace_id","latest_message_at");--> statement-breakpoint
CREATE INDEX "threads_search_idx" ON "threads" USING gin (to_tsvector('english', "search_text"));--> statement-breakpoint
CREATE UNIQUE INDEX "tracker_entries_key_uidx" ON "tracker_entries" USING btree ("tracker_id","stable_key");--> statement-breakpoint
CREATE INDEX "tracker_entries_stage_idx" ON "tracker_entries" USING btree ("tracker_id","status","stage_index");--> statement-breakpoint
CREATE UNIQUE INDEX "trackers_workspace_key_uidx" ON "trackers" USING btree ("workspace_id","stable_key");--> statement-breakpoint
CREATE INDEX "corrections_workspace_created_idx" ON "user_corrections" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "work_item_threads_thread_idx" ON "work_item_threads" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_workspace_dedupe_uidx" ON "work_items" USING btree ("workspace_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "work_items_workspace_status_due_idx" ON "work_items" USING btree ("workspace_id","status","due_at");--> statement-breakpoint
CREATE INDEX "work_items_workspace_kind_status_idx" ON "work_items" USING btree ("workspace_id","kind","status");--> statement-breakpoint
CREATE INDEX "work_items_tracker_idx" ON "work_items" USING btree ("tracker_id","status");