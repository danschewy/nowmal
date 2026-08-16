import { defineTool } from "eve/tools";
import { z } from "zod";
import { THREADS } from "../../lib/demo/data";
import { isDatabaseConfigured } from "../../lib/data/client";
import { searchThreads } from "../../lib/data/repository";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "Search the bounded Gmail index for matching people, subjects, or text. Use list_recent_threads instead for latest, recent, or newest-email questions.",
  inputSchema: z.object({ query: z.string().min(2).max(120), limit: z.number().int().min(1).max(50).default(20) }),
  async execute({ query, limit }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (isDatabaseConfigured()) {
      const matches = await searchThreads(workspaceId, query, limit);
      return matches.map((thread) => ({
        ...thread,
        latestMessageAt: thread.latestMessageAt.toISOString(),
      }));
    }
    const needle = query.toLowerCase();
    return Object.values(THREADS)
      .flat()
      .filter((thread) => `${thread.from} ${thread.subject} ${thread.quote ?? ""} ${thread.eve}`.toLowerCase().includes(needle))
      .slice(0, limit);
  },
});
