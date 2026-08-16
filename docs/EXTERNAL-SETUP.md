# External setup

These are the only parts that cannot be completed from the repository alone.

## 1. Clerk and Google

1. Create a Clerk application and enable Google as a social connection.
2. For production, enable custom Google credentials in Clerk and use a Google Cloud OAuth client owned by the Nowmal project.
3. Enable the Gmail API in that Google Cloud project.
4. Add `https://www.googleapis.com/auth/gmail.readonly` to the Google connection's additional scopes.
5. Keep `https://www.googleapis.com/auth/gmail.send` out of the default sign-in grant. Nowmal requests it separately through `/account` when the user enables gated send.
6. Put Clerk's publishable and secret keys into Vercel as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

Gmail mailbox scopes can require Google OAuth verification before a public production launch. During Testing status, add intended testers in Google Cloud.

## 2. Neon

1. Create a Neon project and copy its pooled connection string to `DATABASE_URL`.
2. Apply the checked-in migration:

   ```bash
   npm run db:migrate
   ```

3. Use separate Neon branches for preview and production Vercel environments.

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
