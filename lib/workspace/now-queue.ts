import type {
  WorkspaceDraftSummary,
  WorkspaceSnapshot,
  WorkspaceWorkItemSummary,
} from "./snapshot";

export const NOW_DUE_SOON_DAYS = 7;

type NowSource = Pick<WorkspaceSnapshot, "drafts" | "workItems">;

export interface ConnectedNowQueue {
  drafts: WorkspaceDraftSummary[];
  workItems: WorkspaceWorkItemSummary[];
  count: number;
}

export function selectConnectedNowQueue(
  source: NowSource | null | undefined,
  now = new Date(),
): ConnectedNowQueue {
  if (!source) return { drafts: [], workItems: [], count: 0 };

  const cutoff = new Date(now.getTime() + NOW_DUE_SOON_DAYS * 24 * 60 * 60 * 1_000);
  const drafts = source.drafts.filter(
    (draft) => draft.state !== "sent" && draft.state !== "cancelled",
  );
  const workItems = source.workItems
    .filter((item) => {
      if (item.status === "done" || item.status === "incorrect") return false;
      if (item.status === "needs_you") return true;
      const dueAt = parseDueAt(item.dueAt);
      return Boolean(dueAt && dueAt <= cutoff);
    })
    .sort((left, right) => compareWorkItems(left, right, now, cutoff));

  return { drafts, workItems, count: drafts.length + workItems.length };
}

function compareWorkItems(
  left: WorkspaceWorkItemSummary,
  right: WorkspaceWorkItemSummary,
  now: Date,
  cutoff: Date,
) {
  const leftDue = parseDueAt(left.dueAt);
  const rightDue = parseDueAt(right.dueAt);
  const priorityDifference = priority(left, leftDue, now, cutoff) - priority(right, rightDue, now, cutoff);
  if (priorityDifference) return priorityDifference;
  if (leftDue && rightDue) return leftDue.getTime() - rightDue.getTime();
  if (leftDue) return -1;
  if (rightDue) return 1;
  return left.title.localeCompare(right.title);
}

function priority(
  item: WorkspaceWorkItemSummary,
  dueAt: Date | null,
  now: Date,
  cutoff: Date,
) {
  if (dueAt && dueAt <= now) return 0;
  if (dueAt && dueAt <= cutoff) return 1;
  if (item.status === "needs_you") return 2;
  return 3;
}

function parseDueAt(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
