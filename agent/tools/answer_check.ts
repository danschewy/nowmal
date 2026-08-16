import { defineTool } from "eve/tools";
import { z } from "zod";
import { isDatabaseConfigured } from "../../lib/data/client";
import { answerDraftCheck } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";
import { sessionDrafts } from "../lib/session-state";

export default defineTool({
  description: "Answer one draft evidence check using a citable Gmail source. Never use this for a tone check.",
  inputSchema: z.object({
    draftId: z.string().min(1),
    checkKey: z.string().min(1),
    answer: z.string().min(1).max(2_000),
    sourceMessageId: z.string().min(1),
    sourceQuote: z.string().min(1).max(1_000),
  }),
  async execute(input, ctx) {
    const { workspaceId, actorId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) return answerDraftCheck({ workspaceId, actorId, ...input });
    const draft = sessionDrafts.get().drafts[input.draftId];
    if (!draft) throw new Error("Draft not found in this Eve session.");
    const check = draft.checks.find((item) => item.key === input.checkKey);
    if (!check) throw new Error("Draft check not found.");
    sessionDrafts.update((current) => ({
      drafts: {
        ...current.drafts,
        [draft.id]: {
          ...draft,
          checks: draft.checks.map((item) =>
            item.key === input.checkKey
              ? { ...item, state: "answered", source: `${input.sourceMessageId}: ${input.sourceQuote}` }
              : item,
          ),
        },
      },
    }));
    return {
      draftId: draft.id,
      unresolvedCheckCount: draft.checks.filter((item) => item.key !== input.checkKey && item.state === "unresolved").length,
    };
  },
});
