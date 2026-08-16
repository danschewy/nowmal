export type WorkspaceItemKind = "task" | "promise";
export type WorkspaceItemStatus = "needs_you" | "waiting" | "later" | "done" | "incorrect";

export interface WorkspaceThreadSummary {
  id: string;
  gmailThreadId: string;
  subject: string;
  participants: string[];
  snippet: string;
  latestMessageAt: string;
}

export interface WorkspaceWorkItemSummary {
  id: string;
  kind: WorkspaceItemKind;
  status: WorkspaceItemStatus;
  title: string;
  dueAt: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

export interface WorkspaceDraftSummary {
  id: string;
  state: "queued" | "cleared" | "sending" | "sent" | "cancelled" | "uncertain";
  to: string;
  subject: string;
  body: string;
  unresolvedCheckCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface WorkspaceSnapshot {
  connected: boolean;
  threadCount: number;
  sendEnabled: boolean;
  lastSyncedAt: string | null;
  workItems: WorkspaceWorkItemSummary[];
  threads: WorkspaceThreadSummary[];
  drafts: WorkspaceDraftSummary[];
}
