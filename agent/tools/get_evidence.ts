import { defineTool } from "eve/tools";
import { z } from "zod";
import { TASKS } from "../../lib/demo/data";
import { isDatabaseConfigured } from "../../lib/data/client";
import { getEvidence } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "Get the exact cited Gmail evidence and provenance for one Nowmal work item.",
  inputSchema: z.object({ workItemId: z.string().min(1) }),
  async execute({ workItemId }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) {
      const result = await getEvidence(workspaceId, workItemId);
      if (!result) return null;
      return {
        item: {
          id: result.item.id,
          kind: result.item.kind,
          status: result.item.status,
          title: result.item.title,
          dueAt: result.item.dueAt?.toISOString() ?? null,
          confidence: result.item.confidence,
          metadata: result.item.metadata,
        },
        evidence: result.evidence.map((source) => ({
          ...source,
          sentAt: source.sentAt.toISOString(),
        })),
      };
    }
    const task = TASKS.find((item) => item.id === workItemId);
    if (!task) return null;
    return {
      item: { id: task.id, title: task.title },
      evidence: [{ quote: task.evidence.join(""), source: task.source }],
      lineage: task.lineage,
    };
  },
});
