import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { product } from "../../lib/domain/config";
import { isDatabaseConfigured } from "../../lib/data/client";
import { analyzeWorkspace } from "../../lib/workspace/analyze";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "Analyze the caller's already indexed Gmail and save source-backed tasks and promises. This does not fetch more mail or send anything.",
  inputSchema: z.object({
    maxThreads: z
      .number()
      .int()
      .min(1)
      .max(product.workspaceAnalysisDefaultMaxThreads)
      .default(product.workspaceAnalysisDefaultMaxThreads),
  }),
  approval: once(),
  async execute({ maxThreads }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (!isDatabaseConfigured()) {
      return { mode: "demo", analyzedThreads: 41, workItemsUpserted: 9 };
    }
    return analyzeWorkspace({ workspaceId, maxThreads, abortSignal: ctx.abortSignal });
  },
});
