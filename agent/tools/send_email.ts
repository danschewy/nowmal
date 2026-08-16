import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { product } from "../../lib/domain/config";
import { isDatabaseConfigured } from "../../lib/data/client";
import {
  completeSendAttempt,
  getClearedDraft,
  markSendUncertain,
  reserveSendAttempt,
} from "../../lib/data/repository";
import { getGoogleAccessToken } from "../../lib/gmail/auth";
import { sendGmailMessage } from "../../lib/gmail/client";
import { workspaceFromContext } from "../lib/context";
import { sessionDrafts } from "../lib/session-state";

export default defineTool({
  description: "Send one specific cleared Now draft. Always requires a fresh human approval and never retries an uncertain attempt.",
  inputSchema: z.object({
    draftId: z.string().min(1),
    idempotencyKey: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{7,159}$/, "Use the draft's opaque idempotency key."),
  }),
  approval: always(),
  async execute({ draftId, idempotencyKey }, ctx) {
    const { workspaceId, actorId, sessionId, principalType } = workspaceFromContext(ctx);
    if (principalType !== "user" && isDatabaseConfigured()) {
      throw new Error("Only an authenticated human workspace principal may approve Gmail sends.");
    }

    if (!isDatabaseConfigured()) {
      const draft = sessionDrafts.get().drafts[draftId];
      if (!draft) throw new Error("Draft not found in this Eve session.");
      if (draft.idempotencyKey !== idempotencyKey) throw new Error("Idempotency key does not match the draft.");
      if (draft.checks.some((check) => check.state === "unresolved")) {
        throw new Error("The draft still has unresolved checks.");
      }
      if (draft.sent) return { status: "already_sent", draftId, demo: true };
      sessionDrafts.update((current) => ({
        drafts: { ...current.drafts, [draftId]: { ...draft, sent: true } },
      }));
      return { status: "sent", draftId, gmailMessageId: `demo-${idempotencyKey}`, demo: true };
    }

    const record = await getClearedDraft(workspaceId, draftId);
    if (!record) throw new Error("Draft not found in this workspace.");
    if (record.draft.idempotencyKey !== idempotencyKey) throw new Error("Idempotency key does not match the draft.");
    if (record.draft.state === "sent") {
      return { status: "already_sent", draftId, gmailMessageId: record.draft.gmailMessageId };
    }
    if (record.draft.state !== "cleared" || record.draft.unresolvedCheckCount !== 0) {
      throw new Error("Every Now check must be cleared before sending.");
    }

    // Resolve consent before reserving the one-shot attempt. A missing scope is a
    // definite preflight failure, not an ambiguous Gmail outcome.
    const accessToken = await getGoogleAccessToken(workspaceId, [product.gmailSendScope]);

    const reservation = await reserveSendAttempt({
      workspaceId,
      draftId,
      idempotencyKey,
      actorId,
      sessionId,
      callId: ctx.callId,
    });
    if (!reservation.reserved) {
      if (reservation.event?.status === "succeeded") {
        return { status: "already_sent", draftId, ...(reservation.event.payload ?? {}) };
      }
      throw new Error(
        "A previous send attempt exists and its outcome is not safely retryable. Reconcile Gmail Sent before trying again with a new draft.",
      );
    }

    try {
      const result = await sendGmailMessage(accessToken, {
        to: record.draft.to,
        subject: record.draft.subject,
        body: record.draft.body,
        idempotencyKey,
      });
      const completion = await completeSendAttempt({
        eventId: reservation.event.id,
        draftId,
        gmailMessageId: result.id,
        gmailThreadId: result.threadId,
      });
      return {
        status: "sent",
        draftId,
        gmailMessageId: result.id,
        gmailThreadId: result.threadId,
        ...completion,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gmail send failure";
      await markSendUncertain(reservation.event.id, draftId, message);
      throw new Error(
        "The send outcome is uncertain, so Nowmal will not retry automatically. Check Gmail Sent and reconcile this draft.",
        { cause: error },
      );
    }
  },
});
