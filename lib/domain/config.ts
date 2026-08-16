export const product = {
  name: "Nowmal",
  subtitle: "Know what your inbox needs",
  principle: "Eve can read and draft. Only you can send.",
  gmailScope: "https://www.googleapis.com/auth/gmail.readonly",
  gmailSendScope: "https://www.googleapis.com/auth/gmail.send",
  gmailInitialQuery: "newer_than:30d",
  gmailInitialWindowDays: 30,
  gmailSyncDefaultMaxThreads: 100,
  gmailSyncHardMaxThreads: 500,
} as const;
