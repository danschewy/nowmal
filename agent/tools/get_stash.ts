import { defineTool } from "eve/tools";
import { z } from "zod";
import { TASKS } from "../../lib/demo/data";
import { isDatabaseConfigured } from "../../lib/data/client";
import { getStash } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "Get normalized metadata, the dedupe key, and linked Gmail thread IDs for one work item.",
  inputSchema: z.object({ workItemId: z.string().min(1) }),
  async execute({ workItemId }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) return getStash(workspaceId, workItemId);
    const task = TASKS.find((item) => item.id === workItemId);
    return task
      ? {
          id: task.id,
          dedupeKey: `${task.company.toLowerCase().replace(/\W+/g, "-")}:${task.title.toLowerCase().replace(/\W+/g, "-")}`,
          metadata: Object.fromEntries(task.fields),
          lineage: task.lineage,
        }
      : null;
  },
});
