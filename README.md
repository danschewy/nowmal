# Nowmal

Nowmal is an intelligence layer for Gmail, not another inbox. It finds requests, deadlines, and commitments; groups related conversations; and turns the work that matters into a calm, one-at-a-time queue. Eve can explain every inference and prepare a reply, but a person always controls what leaves the account.

Try the complete account-free product at [`/demo`](https://nowmal.vercel.app/demo). The connected product lives at [`/workspace`](https://nowmal.vercel.app/workspace) and uses the signed-in person's Gmail, Clerk identity, and isolated Neon workspace.

## Product model

- **Mail** is the private, bounded Gmail index and the source of truth for every inference.
- **Tasks** are asks from other people; **Promises** are commitments found in the user's own sent mail.
- **Now** is the focused execution surface: one source-backed decision at a time, not a second task list.
- **Trackers** summarize repeated, multi-thread processes only when the evidence supports a real grouping.
- **Eve** is a conversational interface over narrow typed tools. It reads, explains, drafts, and requests approval; it does not get a general shell or an unchecked send path.

## Five decisions that shape the app

1. **The demo is the real product with safe sample data.** `/demo` and `/workspace` use the same screens and interactions. The only difference is the data source: the demo stays on the device, while the connected app uses the signed-in person's private workspace. An empty or broken connected account never falls back to sample mail.
2. **Nowmal works from a small Gmail index, not the whole mailbox.** The first refresh stores up to 300 recent threads in Neon; later refreshes fetch only changes. Search uses that index first and may fetch up to ten exact Gmail matches when needed. Mail refresh and AI analysis are separate, so importing mail cannot silently spend model tokens or rewrite tasks.
3. **Every task must be explainable.** Gmail threads and messages are stored once. Tasks, promises, and trackers point back to exact source messages, while stable keys prevent the same request from becoming several tasks. A model suggestion is accepted only after the server validates its source, shape, and confidence.
4. **There is one definition of what needs attention.** The Now screen and its navigation count come from the same queue function. Drafts, tasks, promises, status, and due dates cannot drift into competing dashboards. Trackers are conservative groupings over those same source-backed items.
5. **Eve can help, but authority stays narrow.** Clerk owns identity and Google consent; Vercel-managed Neon owns durable product data. Eve reaches them only through typed, workspace-scoped tools in web chat or MCP. Sending is a separate permission and always requires a checked draft, a fresh human approval, and duplicate-send protection.

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

See [Architecture](./docs/ARCHITECTURE.md) for the five core decisions, data ownership, request flows, safety guarantees, current limits, and code map.

## Primary documentation used

- [Eve README and package model](https://github.com/vercel/eve/blob/main/README.md)
- [Eve + Next.js integration](https://github.com/vercel/eve/blob/main/docs/guides/frontend/nextjs.mdx)
- [Eve human-in-the-loop tools](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md)
- [Clerk authorization for Eve tools](https://clerk.com/docs/guides/ai/eve/authorize-tool-calls)
- [Clerk Google social connection and additional scopes](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview)
- [Gmail REST API](https://developers.google.com/workspace/gmail/api/reference/rest)
- [Google OAuth scope catalog](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
