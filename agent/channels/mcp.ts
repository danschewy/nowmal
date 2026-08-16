import { localDev, vercelOidc } from "eve/channels/auth";
import { mcpChannel } from "eve/channels/mcp";

export default mcpChannel({
  auth: [vercelOidc(), localDev()],
});
