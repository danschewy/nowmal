# External setup

These are the only parts that cannot be completed from the repository alone.

## 1. Clerk and Google

1. Create a Clerk application and enable Google as a social connection.
2. For production, enable custom Google credentials in Clerk and use a Google Cloud OAuth client owned by the Nowmal project.
3. Enable the Gmail API in that Google Cloud project.
4. Add `https://www.googleapis.com/auth/gmail.readonly` to the Google connection's additional scopes.
5. Keep `https://www.googleapis.com/auth/gmail.send` out of the default sign-in grant. Nowmal requests it separately through `/account` when the user enables gated send.
6. Review Clerk's OAuth consent branding and enable dynamic client registration for MCP clients. Keep the allowed scopes minimal; Nowmal advertises only `openid` for MCP identity.
7. Put Clerk's publishable and secret keys into Vercel as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

Gmail mailbox scopes can require Google OAuth verification before a public production launch. During Testing status, add intended testers in Google Cloud.

## 2. Neon

Keep Neon inside the Vercel project rather than provisioning or wiring it separately:

1. In the Nowmal Vercel project, open **Storage**, choose **Create Database**, and install the
   [Neon native Marketplace integration](https://vercel.com/marketplace/neon). Use the
   Vercel-managed **Create New Neon Account** mode so the resource, connection, and billing stay
   visible in Vercel.
2. Connect the database to the Nowmal project and verify that the integration injected
   `DATABASE_URL` for Production and Preview. Vercel documents this automatic credential wiring
   in [Marketplace Storage](https://vercel.com/docs/marketplace-storage).
3. Keep the database region close to the Vercel Functions region and use the pooled connection
   supplied by the integration.
4. Apply the checked-in migration against the intended environment:

   ```bash
   npm run db:migrate
   ```

5. Leave preview branching enabled in the Neon integration so preview deployments do not mutate
   production data. Remove stale preview branches when they are no longer useful.

Do not copy a separately created Neon URL into Vercel unless deliberately migrating away from the
managed integration. The manual path exists, but Neon recommends the managed integration for the
minimal Vercel setup used here.

## 3. Vercel and Eve

1. Install or use the Vercel CLI, then link the project with `eve link`.
2. Add the environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_APP_URL` to the canonical production origin.
4. Deploy with `eve deploy`. The `withEve()` Next.js configuration produces one Vercel project with the web app and Eve service mounted together.
5. Confirm these routes after deployment:

   - `/demo` — public and accountless;
   - `/workspace` — Clerk-authenticated;
   - `/eve/v1/health` — public health probe;
   - `/eve/v1/mcp` — authenticated MCP transport.

Vercel AI Gateway uses project OIDC in deployment. `AI_GATEWAY_API_KEY` is only needed for direct local model calls.

## 4. Optional live Gmail push

The implemented sync uses Gmail `historyId`, so every refresh is incremental. Truly live arrival requires a Google Pub/Sub topic, Gmail `users.watch`, and an authenticated push handler. Add `GMAIL_PUBSUB_TOPIC` once that external topic and service-account permission exist. Until then, Setup and Eve perform bounded incremental pulls without rescanning the whole mailbox.

## Production checks

- Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Confirm the Clerk Google connection actually returns both configured scopes before enabling sends.
- Send one message to a controlled mailbox, verify the audit event and Gmail message ID, then test the duplicate idempotency key returns `already_sent`.
- Simulate an interrupted send and verify the draft becomes `uncertain` rather than retrying.
- Confirm the public demo cannot reach private Gmail APIs without a Clerk session.
