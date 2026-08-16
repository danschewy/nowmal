import type { WorkspaceWorkItemSummary } from "./snapshot";

export interface ConnectedTrackerEntry {
  key: string;
  name: string;
  role: string;
  signal: string;
  stageIndex: number;
  primaryItem: WorkspaceWorkItemSummary;
  itemCount: number;
}

export interface ConnectedTracker {
  key: string;
  kind: "process" | "counterparty";
  name: string;
  note: string;
  stages: string[];
  entries: ConnectedTrackerEntry[];
  items: WorkspaceWorkItemSummary[];
  threadCount: number;
  openCount: number;
  tasks: number;
  promises: number;
  done: number;
}

interface ProcessDefinition {
  key: string;
  name: string;
  note: string;
  stages: string[];
  match: RegExp;
  stageRules: { index: number; match: RegExp }[];
}

const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  {
    key: "job-search",
    name: "Job Search",
    note: "Applications and recruiting conversations found across different people and companies.",
    stages: ["Applied", "Screen", "Interview", "Onsite", "Offer"],
    match: /\b(application|applied|candidate|career|engineer|job|opportunity|recruit(?:er|ing)?|interview|onsite|offer|hiring|position|role|talent|resume|résumé)\b/i,
    stageRules: [
      { index: 5, match: /\boffer\b/i },
      { index: 4, match: /\b(onsite|on-site|panel|take-home|technical)\b/i },
      { index: 3, match: /\binterview\b/i },
      { index: 2, match: /\b(screen|recruit(?:er|ing)?|availability|schedule|call)\b/i },
    ],
  },
  {
    key: "housing-search",
    name: "Places to Live",
    note: "Property conversations following the same enquire, view, apply, and sign progression.",
    stages: ["Enquired", "Viewing", "Viewed", "Applied", "Signed"],
    match: /\b(apartment|flat|housing|landlord|lease|letting|property|realtor|rent(?:al)?|residential|tenant|tenancy|unit|viewing)\b/i,
    stageRules: [
      { index: 5, match: /\b(signed|lease executed|countersigned)\b/i },
      { index: 4, match: /\b(applied|application|questionnaire|documents submitted)\b/i },
      { index: 3, match: /\b(viewed|saw the (?:apartment|flat|property|unit))\b/i },
      { index: 2, match: /\b(viewing|tour|appointment)\b/i },
    ],
  },
];

export function buildConnectedTrackers(items: WorkspaceWorkItemSummary[]) {
  const eligible = items.filter((item) => item.status !== "incorrect");
  const claimedIds = new Set<string>();
  const processTrackers: ConnectedTracker[] = [];

  for (const definition of PROCESS_DEFINITIONS) {
    const matching = eligible.filter((item) => definition.match.test(itemSearchText(item)));
    if (!isRepeatedProcess(matching)) continue;
    matching.forEach((item) => claimedIds.add(item.id));
    processTrackers.push(buildProcessTracker(definition, matching));
  }

  const counterpartyGroups = new Map<string, WorkspaceWorkItemSummary[]>();
  for (const item of eligible) {
    if (claimedIds.has(item.id)) continue;
    const counterparty = counterpartyOf(item);
    if (!counterparty) continue;
    const key = normalizeKey(counterparty);
    const group = counterpartyGroups.get(key) ?? [];
    group.push(item);
    counterpartyGroups.set(key, group);
  }

  const counterpartyTrackers = [...counterpartyGroups.entries()]
    .filter(([, group]) => isRepeatedProcess(group))
    .map(([key, group]) => buildCounterpartyTracker(key, group));

  return [...processTrackers, ...counterpartyTrackers].sort(
    (left, right) =>
      Number(right.kind === "process") - Number(left.kind === "process") ||
      right.openCount - left.openCount ||
      right.threadCount - left.threadCount,
  );
}

function buildProcessTracker(
  definition: ProcessDefinition,
  items: WorkspaceWorkItemSummary[],
): ConnectedTracker {
  const entryGroups = new Map<string, WorkspaceWorkItemSummary[]>();
  for (const item of items) {
    const name = counterpartyOf(item) || item.title;
    const key = normalizeKey(name) || item.id;
    const group = entryGroups.get(key) ?? [];
    group.push(item);
    entryGroups.set(key, group);
  }

  const entries = [...entryGroups.entries()]
    .map(([key, group]): ConnectedTrackerEntry => {
      const primaryItem = sortItems(group)[0];
      const text = group.map(itemSearchText).join("\n");
      const stageIndex = definition.stageRules.find((rule) => rule.match.test(text))?.index ?? 1;
      return {
        key,
        name: counterpartyOf(primaryItem) || primaryItem.title,
        role: roleOf(primaryItem),
        signal: signalOf(primaryItem),
        stageIndex,
        primaryItem,
        itemCount: group.length,
      };
    })
    .sort((left, right) => right.stageIndex - left.stageIndex || left.name.localeCompare(right.name));

  return trackerSummary({
    key: `process:${definition.key}`,
    kind: "process",
    name: definition.name,
    note: definition.note,
    stages: definition.stages,
    entries,
    items,
  });
}

function buildCounterpartyTracker(key: string, items: WorkspaceWorkItemSummary[]) {
  const sorted = sortItems(items);
  const name = counterpartyOf(sorted[0]) || "Repeated workstream";
  const entries = sorted.map((item): ConnectedTrackerEntry => ({
    key: item.id,
    name: item.title,
    role: item.kind === "task" ? "Task" : "Promise",
    signal: signalOf(item),
    stageIndex: item.status === "done" ? 3 : item.status === "waiting" ? 2 : 1,
    primaryItem: item,
    itemCount: 1,
  }));
  return trackerSummary({
    key: `counterparty:${key}`,
    kind: "counterparty",
    name,
    note: `${items.length} obligations share this counterparty or span several source threads.`,
    stages: ["Open", "Waiting", "Done"],
    entries,
    items,
  });
}

function trackerSummary(
  input: Pick<ConnectedTracker, "key" | "kind" | "name" | "note" | "stages" | "entries" | "items">,
): ConnectedTracker {
  const threadCount = sourceThreadCount(input.items);
  return {
    ...input,
    threadCount,
    openCount: input.items.filter((item) => item.status !== "done").length,
    tasks: input.items.filter((item) => item.kind === "task").length,
    promises: input.items.filter((item) => item.kind === "promise").length,
    done: input.items.filter((item) => item.status === "done").length,
  };
}

function isRepeatedProcess(items: WorkspaceWorkItemSummary[]) {
  if (items.length < 2) return false;
  return new Set(items.map((item) => counterpartyOf(item)).filter(Boolean)).size > 1 ||
    sourceThreadCount(items) > 1;
}

function sourceThreadCount(items: WorkspaceWorkItemSummary[]) {
  const evidenceThreads = new Set(
    items.flatMap((item) => item.evidence.map((evidence) => evidence.gmailThreadId)),
  );
  const metadataCount = Math.max(
    0,
    ...items.map((item) =>
      typeof item.metadata.sourceThreadCount === "number" ? item.metadata.sourceThreadCount : 0,
    ),
  );
  return Math.max(evidenceThreads.size, metadataCount);
}

function sortItems(items: WorkspaceWorkItemSummary[]) {
  return [...items].sort((left, right) => {
    const statusRank = (item: WorkspaceWorkItemSummary) =>
      item.status === "needs_you" ? 0 : item.status === "waiting" ? 1 : item.status === "later" ? 2 : 3;
    return statusRank(left) - statusRank(right) ||
      (left.dueAt ?? "9999").localeCompare(right.dueAt ?? "9999");
  });
}

function itemSearchText(item: WorkspaceWorkItemSummary) {
  return [
    item.title,
    counterpartyOf(item),
    typeof item.metadata.summary === "string" ? item.metadata.summary : "",
    typeof item.metadata.role === "string" ? item.metadata.role : "",
    ...item.evidence.flatMap((evidence) => [evidence.subject, evidence.quote, evidence.sender]),
  ].join("\n");
}

function counterpartyOf(item: WorkspaceWorkItemSummary) {
  if (typeof item.metadata.counterparty === "string" && item.metadata.counterparty.trim()) {
    return item.metadata.counterparty.trim();
  }
  return (item.evidence[0]?.sender ?? "")
    .replace(/\s*<[^>]+>\s*$/, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function roleOf(item: WorkspaceWorkItemSummary) {
  return typeof item.metadata.role === "string" && item.metadata.role.trim()
    ? item.metadata.role.trim()
    : item.title;
}

function signalOf(item: WorkspaceWorkItemSummary) {
  if (typeof item.metadata.summary === "string" && item.metadata.summary.trim()) {
    return item.metadata.summary.trim();
  }
  return item.evidence[0]?.quote ?? "Open the source-backed item for details.";
}

function normalizeKey(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
