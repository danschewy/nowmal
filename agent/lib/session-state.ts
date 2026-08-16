import { defineState } from "eve/context";

export interface SessionDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  checks: { key: string; label: string; state: "unresolved" | "verified" | "answered"; source?: string }[];
  sent?: boolean;
}

export const sessionDrafts = defineState("nowmal.session-drafts.v1", () => ({
  drafts: {} as Record<string, SessionDraft>,
}));
