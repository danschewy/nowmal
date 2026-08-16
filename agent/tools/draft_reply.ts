import { defineTool } from "eve/tools";
import { z } from "zod";
import { isDatabaseConfigured } from "../../lib/data/client";
import { queueDraft } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";
import { sessionDrafts } from "../lib/session-state";

export default defineTool({
  description: "Queue an email draft in Now. This never sends. Claims that need a human or source must be checks.",
  inputSchema: z.object({
    workItemId: z.string().optional(),
    to: z.string().email(),
    subject: z.string().min(1).max(998),
    body: z.string().min(1).max(100_000),
    idempotencyKey: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{7,159}$/, "Use an opaque 8–160 character idempotency key."),
    checks: z.array(
      z.object({
        key: z.string().min(1).max(80),
        label: z.string().min(1).max(240),
        state: z.enum(["unresolved", "verified"]).default("unresolved"),
        sourceQuote: z.string().max(1_000).optional(),
      }),
    ).max(20),
  }),
  async execute(input, ctx) {
    const { workspaceId, sessionId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) {
      const draft = await queueDraft({ workspaceId, sessionId, ...input });
      return { draftId: draft.id, state: draft.state, unresolvedCheckCount: draft.unresolvedCheckCount };
    }
    const id = `demo-${input.idempotencyKey}`;
    sessionDrafts.update((current) => ({
      drafts: {
        ...current.drafts,
        [id]: {
          id,
          to: input.to,
          subject: input.subject,
          body: input.body,
          idempotencyKey: input.idempotencyKey,
          checks: input.checks.map((check) => ({ ...check })),
        },
      },
    }));
    return {
      draftId: id,
      state: input.checks.some((check) => check.state === "unresolved") ? "queued" : "cleared",
      unresolvedCheckCount: input.checks.filter((check) => check.state === "unresolved").length,
    };
  },
});
