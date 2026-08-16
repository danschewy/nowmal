import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-5.6-terra",
  reasoning: "medium",
  compaction: { thresholdPercent: 0.78 },
  limits: {
    maxInputTokensPerSession: 200_000,
    maxOutputTokensPerSession: 30_000,
    sessionTimeoutMs: 30 * 24 * 60 * 60 * 1_000,
  },
});
