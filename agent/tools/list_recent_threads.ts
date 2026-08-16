import { defineTool } from "eve/tools";
import { z } from "zod";
import { THREADS } from "../../lib/demo/data";
import { isDatabaseConfigured } from "../../lib/data/client";
import { listRecentThreads } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "List the newest threads already stored in the bounded Gmail index. Use for latest, recent, or newest-email questions; this does not refresh Gmail.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
  async execute({ limit }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) {
      const recent = await listRecentThreads(workspaceId, limit);
      return recent.map((thread) => ({
        ...thread,
        latestMessageAt: thread.latestMessageAt.toISOString(),
      }));
    }

    return Object.values(THREADS)
      .flat()
      .toSorted((left, right) => demoTimestamp(right.when) - demoTimestamp(left.when))
      .slice(0, limit);
  },
});

function demoTimestamp(label: string) {
  const parsed = Date.parse(`${label}, 2026`);
  return Number.isNaN(parsed) ? 0 : parsed;
}
