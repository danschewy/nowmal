import { defineTool } from "eve/tools";
import { z } from "zod";
import { TASKS } from "../../lib/demo/data";
import { isDatabaseConfigured } from "../../lib/data/client";
import { listTasks } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "List the caller's Nowmal tasks with stable IDs, status, due date, confidence, and stash metadata.",
  inputSchema: z.object({ includeDone: z.boolean().default(false) }),
  async execute({ includeDone }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) return listTasks(workspaceId, includeDone);
    return TASKS.filter((task) => includeDone || task.status !== "done").map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      due: task.due,
      confidence: task.confidence,
      metadata: Object.fromEntries(task.fields),
    }));
  },
});
