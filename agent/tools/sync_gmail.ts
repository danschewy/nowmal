import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { product } from "../../lib/domain/config";
import { isDatabaseConfigured } from "../../lib/data/client";
import { getGoogleAccessToken } from "../../lib/gmail/auth";
import { syncGmailMailbox } from "../../lib/gmail/sync";
import { workspaceFromContext } from "../lib/context";

export default defineTool({
  description: "Refresh the authenticated caller's bounded 30-day Gmail index. Use only for setup or an explicit refresh.",
  inputSchema: z.object({
    maxThreads: z
      .number()
      .int()
      .min(1)
      .max(product.gmailSyncHardMaxThreads)
      .default(product.gmailSyncDefaultMaxThreads),
  }),
  approval: once(),
  async execute({ maxThreads }, ctx) {
    const { workspaceId } = workspaceFromContext(ctx);
    if (!isDatabaseConfigured()) return { mode: "demo", hydratedThreads: 41 };
    const accessToken = await getGoogleAccessToken(workspaceId, [product.gmailScope]);
    return syncGmailMailbox({ workspaceId, accessToken, maxThreads });
  },
});
