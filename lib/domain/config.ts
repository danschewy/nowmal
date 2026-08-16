export const product = {
  name: "Nowmal",
  subtitle: "A quiet layer over Gmail",
  principle: "Eve reads and drafts. You clear every send.",
  gmailScope: "https://www.googleapis.com/auth/gmail.readonly",
  gmailSendScope: "https://www.googleapis.com/auth/gmail.send",
  gmailInitialQuery: "newer_than:30d",
  gmailInitialWindowDays: 30,
  gmailSyncDefaultMaxThreads: 100,
  gmailSyncHardMaxThreads: 500,
} as const;
