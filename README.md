# Nowmal

Nowmal is an intelligence layer for Gmail, not another inbox. It finds requests, deadlines, and commitments; groups related conversations; and turns the work that matters into a calm, one-at-a-time queue. Eve can explain every inference and prepare a reply, but a person always controls what leaves the account.

Try the complete account-free product at [`/demo`](https://nowmal.vercel.app/demo). The connected product lives at [`/workspace`](https://nowmal.vercel.app/workspace) and uses the signed-in person's Gmail, Clerk identity, and isolated Neon workspace.

## Product model

- **Mail** is the private, bounded Gmail index and the source of truth for every inference.
- **Tasks** are asks from other people; **Promises** are commitments found in the user's own sent mail.
- **Now** is the focused execution surface: one source-backed decision at a time, not a second task list.
- **Trackers** summarize repeated, multi-thread processes only when the evidence supports a real grouping.
- **Eve** is a conversational interface over narrow typed tools. It reads, explains, drafts, and requests approval; it does not get a general shell or an unchecked send path.

## Architecture at a glance

1. **One product, two explicit data adapters.** `/demo` and `/workspace` share the same shell and interaction model. The demo is deterministic and local; the connected adapter is Clerk-authenticated and never substitutes sample data for an empty or failed private workspace.
2. **Index first, analyze second.** Gmail sync stores at most 300 recent threads, then follows `historyId` incrementally. Analysis is a separate, user-confirmed, bounded model operation, so refreshing mail cannot silently create cost or mutate inferred work. Pending filtering happens in Neon before each 100-thread analysis limit, so repeated passes progress through the entire bounded index.
3. **Evidence before automation.** Threads and messages are normalized once in Neon. Work items cite exact message spans, use deterministic dedupe keys, and retain append-only corrections. Confirmed analysis may close an item only with a newer exact quote that explicitly fulfills or cancels it; an approved Nowmal send closes only its directly linked task.
4. **One canonical work queue.** A pure selector derives Now from drafts, tasks, promises, status, and due dates. Navigation counts and the focused screen therefore cannot drift into competing definitions of “needs attention.”
5. **Narrow agent boundary.** Eve 0.38 is mounted into Next.js 16 through `withEve()`. Its tool set is typed and workspace-scoped; browser conversations are durable, Clerk-owned, and generation-versioned so an obsolete manifest or MCP session cannot replace the current web chat.
6. **Human-gated sending.** Read and send consent are separate. A send requires a cleared stored draft, zero unresolved checks, matching idempotency key, current `gmail.send` scope, a durable Eve approval, and an audit reservation written before Gmail is called.
7. **One identity plane, one data plane.** Clerk owns user identity and Google token brokerage. Neon, provisioned through Vercel Marketplace and accessed with Drizzle, owns queryable product state. Every private query is scoped by the Clerk user ID.
8. **Bounded search with a truthful fallback.** Search checks the indexed full message text first. An exact miss may hydrate at most ten matching Gmail conversations; it never turns an arbitrary search into an unbounded mailbox import.
9. **The same agent is available over MCP.** `/eve/v1/mcp` exposes the typed Nowmal agent behind OAuth/Vercel identity while preserving the same workspace and send constraints as the browser.

## What is working

The production app includes Brief, Now, Tasks, Promises, evidence-backed Trackers, Mail, Setup, Rules, Agents, global search, Gmail refresh, confirmed task analysis, durable Eve chat, draft gates, safe send infrastructure, and the public demo. The repository includes the normalized Drizzle schema and migration, interaction tests, security-boundary tests, type checking, and combined Eve + Next production builds.

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

The connected Setup flow separates three operations: Gmail indexing, task/promise analysis, and optional sending. Refreshing Gmail never starts model work. Before each analysis, a confirmation modal names the provider path and exact data bounds; analysis begins only after the user approves it. It reads only the bounded records already stored in Neon, never expands the Gmail window, and never grants send access. Changed conversations can resolve old work during that confirmed pass, but only with newer source-backed completion or cancellation evidence.

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
