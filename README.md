# Nowmal

Nowmal turns Gmail into a clear plan. It finds requests, deadlines, and commitments; groups related conversations; and keeps repeated processes current. Eve explains why each item surfaced, prepares replies, and—when separately enabled—can request a send that still requires human approval.

The full product demo is public at `/demo` and needs no account. `/workspace` is the private Clerk + Gmail + Neon path.

## What is implemented

- High-fidelity desktop product across Brief, Now, Tasks, Promises, Trackers, Mail, Setup, Rules, Agents, and global search.
- Real task evidence, dedupe lineage, stashed fields, corrections, snoozing, pull cadence, trackers, clusters, draft gates, undo, and a persistent Eve panel in the public demo.
- A filesystem-first Eve 0.38 agent mounted into Next.js 16 with `withEve()`, with the private
  assistant panel connected through Eve's streaming React client.
- Clerk-scoped Eve session ownership persisted in Neon, with the latest durable web session resumed after reload instead of trusting a caller-supplied session ID.
- Typed Eve tools for task queries, evidence, stash, thread search, Gmail sync, draft queuing, sourced check answers, and sending.
- Clerk route identity and Google OAuth token brokerage.
- Conservative initial Gmail sync (at most 100 threads from 30 days) and efficient incremental sync with Gmail `historyId` cursors.
- An authenticated, bounded workspace snapshot that renders real indexed threads, work items, drafts, counts, and search results without ever falling back to public sample records.
- A shared daily Now queue that puts draft approvals first, then every source-backed Needs-you item and any waiting or later work due within seven days; the screen and navigation count use the same selector.
- A truthful connected policy screen that reports enforced server behavior and correction counts rather than reusing sample-only automation switches.
- Source-backed workstream grouping that promotes only repeated counterparties or multi-thread obligations and refuses to invent pipeline stages from a single conversation.
- Bounded AI analysis of the stored index in 16-thread batches, with prompt-injection isolation, exact-quote validation, deterministic dedupe keys, incremental re-analysis, and append-only user corrections.
- A normalized Neon/Drizzle data model and checked-in migration.
- A `send_email` tool protected by Eve's durable `always()` approval, separate `gmail.send` consent, cleared-draft checks, a stable idempotency key, and an append-only audit record.
- Once-per-page Google consent reconciliation keeps the connected UI current without reading Gmail; transient Clerk failures leave the last known state untouched, while every real send still rechecks the scope authoritatively.
- Revoked Gmail read access is shown separately from the retained index: existing work remains usable, refresh pauses, and Setup routes the user to review Google access instead of pretending the mailbox is current.
- Streamable HTTP MCP channel at `/eve/v1/mcp`, protected by Vercel OIDC in production and local-dev identity locally.
- Unit interaction tests, production-browser tests, type checks, and a combined Eve + Next production build.

## Run locally

Requirements: Node.js 24 and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). The public demo requires no environment variables. A real Eve model call needs `AI_GATEWAY_API_KEY` locally; Vercel deployments can use project OIDC.

Useful checks:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run eve:info
```

## Connected workspace

Copy `.env.example` to `.env.local` and provide Clerk credentials. Provision Neon through the
Vercel project's native Marketplace storage integration; it owns and injects `DATABASE_URL`.
Pull that environment for local connected-workspace development, then apply the checked-in migration:

```bash
npm run db:migrate
```

The exact account and deployment steps are in [External setup](./docs/EXTERNAL-SETUP.md). No credential is required to evaluate the public demo.

The connected Setup flow separates three operations: Gmail indexing, task/promise analysis, and optional sending. Refreshing Gmail never starts model work. Before each analysis, a confirmation modal names the provider path and exact data bounds; analysis begins only after the user approves it. It reads only the bounded records already stored in Neon, never expands the Gmail window, and never grants send access.

## Product safety model

Read access and send access are separate Google grants. Eve can queue a draft without send access. A real send is accepted only when:

1. the draft exists in the caller's workspace;
2. every evidence and tone check is cleared;
3. the idempotency key matches the queued draft;
4. the caller has separately granted `gmail.send`;
5. Eve parks the run and a human approves that exact tool call.

The audit reservation is written before Gmail is called. If the process cannot prove whether Gmail accepted a request, the draft becomes `uncertain` and automatic retry is prohibited. That favors one manual reconciliation over a duplicate email.

## Architecture

See [Architecture](./docs/ARCHITECTURE.md) for the domain model, query strategy, Eve boundaries, and send design.

## Primary documentation used

- [Eve README and package model](https://github.com/vercel/eve/blob/main/README.md)
- [Eve + Next.js integration](https://github.com/vercel/eve/blob/main/docs/guides/frontend/nextjs.mdx)
- [Eve human-in-the-loop tools](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md)
- [Clerk authorization for Eve tools](https://clerk.com/docs/guides/ai/eve/authorize-tool-calls)
- [Clerk Google social connection and additional scopes](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview)
- [Gmail REST API](https://developers.google.com/workspace/gmail/api/reference/rest)
- [Google OAuth scope catalog](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
