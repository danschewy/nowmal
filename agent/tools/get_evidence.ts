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
    if (isDatabaseConfigured()) return getEvidence(workspaceId, workItemId);
    const task = TASKS.find((item) => item.id === workItemId);
    if (!task) return null;
    return {
      item: { id: task.id, title: task.title },
      evidence: [{ quote: task.evidence.join(""), source: task.source }],
      lineage: task.lineage,
    };
  },
});
