# Nowmal architecture

## Shape

```mermaid
flowchart LR
  Demo["Public /demo\nseeded adapter"] --> UI["Shared Next.js product shell"]
  User["Private /workspace\nClerk session"] --> UI
  UI --> API["Next.js Gmail APIs"]
  UI --> Eve["Eve durable sessions"]
  API --> Gmail["Gmail REST API"]
  API --> Neon["Neon Postgres"]
  Eve --> Tools["Narrow typed tools"]
  Tools --> Neon
  Tools --> Gmail
  MCP["Authenticated MCP client"] --> Eve
```

The demo and connected product are not separate mockups. They share the shell, interactions, store contract, terminology, and safety model. The demo adapter supplies realistic deterministic records; the connected adapter loads only the authenticated workspace's Gmail/Neon records. It never falls back to seeded records when a connected workspace is empty or unavailable.

The connected shell reads a single bounded workspace snapshot: mailbox status and counts, the 100 most recent indexed threads, up to 100 work items, and up to 50 drafts. Those independent reads run concurrently, stay scoped by Clerk's workspace ID, and refresh after Gmail sync. This avoids a request per navigation badge or screen while keeping the private and public data sources explicit.

The private assistant panel uses Eve's `useEveAgent` client on the same origin. It streams durable
turns and renders approval requests in place, so the approval shown beside a proposed send is the
actual Eve input request—not a second client-only confirmation.

Eve route authentication and Eve session ownership are separate boundaries. Clerk verifies every browser request. A `session.started` hook records the authenticated owner and session ID in Neon; every later ID-addressed message, stream, cancel, compact, clear, or reset request must match that owner. The workspace snapshot returns only the caller's latest mapped session, and the React client resumes its stream from the beginning after reload. Unknown and cross-account session IDs fail closed.

## Decisions

### Clerk over Neon Auth

Clerk is the smallest coherent choice here because the current Clerk SDK documents both Next.js resource protection and Eve tool authorization, and its backend can retrieve and refresh a user's Google provider token. That collapses identity and Gmail consent into one boundary. Neon remains data infrastructure rather than a second identity plane.

### Neon + Drizzle

The product needs cross-session, cross-agent, independently queryable state. Eve `defineState` is intentionally session-scoped, so durable inbox state belongs in Postgres. Drizzle keeps the schema executable and the checked-in SQL migration inspectable.

### One work-item table

Tasks and promises are symmetric reads of opposite mail directions. They share `work_items`; `kind` distinguishes them. This gives the hot workspace queries one index shape instead of two parallel systems:

- `(workspace_id, status, due_at)` for Now/Tasks;
- `(workspace_id, kind, status)` for Tasks versus Promises;
- unique `(workspace_id, dedupe_key)` for exactly one work item per inferred intent.

### Threads are stored once, relationships are joins

Gmail threads and messages are normalized. Tasks can cite several threads through `work_item_threads`, and clusters can contain a thread through `thread_clusters`. This avoids copying mail bodies into every feature and makes lineage cheap to explain.

### Evidence is first-class

`evidence_spans` links a short quote to the exact normalized Gmail message. A work item can be rebuilt without losing the source that justified it. `answer_check` refuses a source message outside the caller's workspace.

### Public demo without auth

`/demo` is a deliberate product mode, not an authentication exception on private APIs. It never receives Clerk or Gmail credentials and persists only device-local demo preferences. Private Gmail routes still check Clerk on the server.

## Gmail ingestion

The initial pull uses Gmail's search query `newer_than:30d`, stops after 100 thread IDs, and hydrates at concurrency 8. It stores one normalized thread and upserts messages by `(workspace_id, gmail_message_id)`.

Later pulls use the mailbox's Gmail `historyId` and request only `messageAdded` changes. An expired history cursor returns 404; the safe recovery is the same bounded 30-day rebuild. Search text is materialized once per thread and GIN-indexed, so search does not repeatedly concatenate messages.

The default manual pull hydrates at most 100 threads; the server also enforces an absolute 500-thread ceiling for explicit maintenance calls. This controls Gmail quota, data ingestion, and server duration. The next deployment step for large inboxes is to place user-approved continuation batches on Vercel Workflow and connect Gmail watch notifications through Google Pub/Sub.

## Task and promise analysis

Indexing and inference are separate operations. Gmail refresh never triggers inference. The connected Setup flow opens an explicit confirmation that states the pending-thread count, model-provider path, per-thread and per-message limits, and the operations that cannot occur. Only the confirmation action analyzes the stored bounded index. An already-connected account can run analysis without making another Gmail request.

Analysis processes at most 100 pending threads in 16-thread batches with concurrency two. Each message body is truncated before model input, long threads contribute only their 12 most recent messages, and mailbox text is delimited and treated as untrusted data rather than instructions. The model can propose a work item, but persistence accepts it only when:

- confidence is at least 0.76;
- a task cites an inbound message or a promise cites an outbound message;
- every saved quote can be found in the cited stored message after whitespace normalization;
- the Gmail thread and message IDs belong to the authenticated workspace; and
- the due date, status, and bounded field shapes validate.

The deterministic key combines analysis version, item kind, normalized counterparty, stable intent, and an occurrence key only for genuinely recurring work. Candidates with the same key merge before persistence, while `work_item_threads` and `evidence_spans` retain every validated source. A successful batch stamps its source threads with the analysis version; a later Gmail upsert removes that stamp, so only changed threads become pending again. Model or persistence failures leave the stamp absent and are safe to retry.

## Task and grouping efficiency

- Dedupe is a unique domain key, not a UI heuristic.
- `work_item_threads` records every merged source so one task can explain why it exists once.
- Stash metadata lives as bounded JSONB on the work item; frequently filtered fields remain typed columns.
- Tracker stages are integer positions, making funnel counts a single `stage_index >= N` aggregation.
- Corrections are append-only events, separate from the current work-item status.
- Clusters, trackers, and their entries have stable per-workspace keys so renames do not change identity.
- Eve session IDs are stored separately from product records; agent conversation retention does not determine mailbox retention.

The connected Trackers view intentionally starts one level below a guessed pipeline. It groups only
when two obligations share the same normalized counterparty or when one obligation already has evidence
from several Gmail threads. Those workstreams are computed from the bounded workspace snapshot, so the
view adds no mailbox query. The snapshot's connection, counts, session, threads, work items, evidence,
corrections, and drafts are issued as one Neon HTTP batch rather than a waterfall. Formal named trackers
remain normalized in `trackers` and `tracker_entries`; they should be created only after a real repeated
process supplies defensible stages.

Connected Rules is a policy report, not a set of decorative client toggles. It describes the server
boundaries that actually exist and reads the workspace's append-only correction count. The public
demo keeps interactive rule switches because it is explicitly a reversible product simulation.

## Send correctness

`send_email` is intentionally stricter than an ordinary Gmail wrapper:

1. Eve can call only the typed tool; shell, filesystem, arbitrary fetch, web search, and recursive-agent tools are disabled.
2. `always()` creates a durable human approval before every execution.
3. The draft must be in `cleared` state with zero unresolved checks.
4. The draft's stored idempotency key must match the call.
5. An audit event reserves `(workspace_id, idempotency_key)` before Gmail is called.
6. Gmail receives a deterministic RFC 5322 `Message-ID` derived from that key.
7. Success stores the Gmail message ID. A repeated successful request returns `already_sent`.
8. Any ambiguous failure becomes `uncertain`; the tool refuses to retry until a person reconciles Gmail Sent and creates a new draft if necessary.

The separate Google scope is `https://www.googleapis.com/auth/gmail.send`; normal indexing uses `https://www.googleapis.com/auth/gmail.readonly`.

On connected-app startup, `/api/gmail/status` reconciles Google authorization once against Clerk's
token scopes. This call reads authorization metadata, not Gmail. It reconciles both `gmail.readonly`
and `gmail.send` from one Clerk response. A missing read scope marks the connection
`reauthorization_required` without deleting the bounded index, tasks, or corrections; refresh pauses
and Setup links to account review. A Clerk outage returns an unknown status and preserves the last known
value. The send display flag is never trusted as authority—`send_email` obtains and verifies a current
token again before reserving the one-shot audit attempt.

## Trust boundaries

- Browser → Next APIs: Clerk session, checked again beside each resource mutation.
- Browser → Eve HTTP channel: Clerk bearer/session verification plus Neon-backed session ownership on every ID-addressed route; production fails closed without both.
- Same-project Vercel services/MCP → Eve: Vercel OIDC. User-scoped Gmail sends remain available
  only in an authenticated Clerk user session; a service identity cannot impersonate a mailbox owner.
- Eve → Gmail: user-scoped Clerk provider token with required-scope verification.
- Eve → Neon: server-only `DATABASE_URL`; every repository query includes `workspace_id`.
- Public demo: no path to Gmail, Neon, or real Eve sends.
