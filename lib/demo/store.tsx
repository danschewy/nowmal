"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { EveMessage, View } from "@/lib/domain/types";

export type TaskFilter = "all" | "now" | "wait" | "later" | "done" | "wrong";
export type PromiseFilter = "all" | "due" | "late" | "kept";

export interface ProspectOverride {
  stageIndex?: number;
  closed?: boolean;
  gone?: boolean;
}

export type ToastUndo =
  | { kind: "task-done"; id: string }
  | { kind: "not-task"; id: string }
  | { kind: "accept-cluster"; id: string }
  | { kind: "delete-cluster"; id: string }
  | { kind: "accept-tracker"; id: string }
  | { kind: "stop-tracker"; id: string }
  | { kind: "remove-prospect"; id: string };

export interface DemoState {
  view: View;
  query: string;
  connected: boolean;
  threadCount: number;
  sendEnabled: boolean;
  briefRead: boolean;
  filter: TaskFilter;
  openTaskId: string | null;
  doneTasks: string[];
  notTasks: string[];
  snoozingTaskId: string | null;
  collisionGone: boolean;
  pull: "live" | "scheduled";
  cadence: "15 min" | "Hourly" | "9:00 & 16:00";
  nowIndex: number;
  slots: Record<string, string>;
  openCheck: string | null;
  ledger: string[];
  promFilter: PromiseFilter;
  keptPromises: string[];
  trackerId: string;
  trackersOn: string[];
  trackerNames: Record<string, string>;
  openProspect: string | null;
  prospectState: Record<string, ProspectOverride>;
  clusterId: string;
  clusterNames: Record<string, string>;
  deletedClusters: string[];
  mutedClusters: string[];
  acceptedClusters: string[];
  dismissedSuggestions: string[];
  openThreadId: string | null;
  showBin: boolean;
  rules: Record<string, "Off" | "Suggest" | "Act">;
  toolOverrides: Record<string, boolean>;
  revokedAgents: string[];
  copied: boolean;
  messages: EveMessage[];
  chips: string[];
  eveInput: string;
  toast: { text: string; undo?: ToastUndo } | null;
}

export const initialDemoState: DemoState = {
  view: "tasks",
  query: "",
  connected: true,
  threadCount: 100,
  sendEnabled: false,
  briefRead: false,
  filter: "all",
  openTaskId: null,
  doneTasks: ["t8", "t9"],
  notTasks: [],
  snoozingTaskId: null,
  collisionGone: false,
  pull: "live",
  cadence: "Hourly",
  nowIndex: 0,
  slots: {},
  openCheck: null,
  ledger: [],
  promFilter: "all",
  keptPromises: ["p7"],
  trackerId: "job",
  trackersOn: ["job"],
  trackerNames: { job: "Job Search", places: "Places to Live" },
  openProspect: null,
  prospectState: {},
  clusterId: "search",
  clusterNames: {},
  deletedClusters: [],
  mutedClusters: [],
  acceptedClusters: [],
  dismissedSuggestions: [],
  openThreadId: null,
  showBin: false,
  rules: {
    tasks: "Act",
    dedupe: "Act",
    pipeline: "Act",
    clusters: "Suggest",
    holds: "Suggest",
    nudge: "Suggest",
  },
  toolOverrides: {},
  revokedAgents: ["Calendar agent"],
  copied: false,
  messages: [
    {
      id: "eve-0",
      who: "Eve",
      text: 'Halyard has been quiet for six days. Priya said "early next week" on the 10th, and that window closed on Friday.',
    },
  ],
  chips: ["Draft a nudge", "Show me the thread", "Leave it"],
  eveInput: "",
  toast: null,
};

interface DemoStoreValue {
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  patch: (values: Partial<DemoState>) => void;
  notify: (text: string, undo?: ToastUndo) => void;
  undo: () => void;
  reset: () => void;
}

const DemoStore = createContext<DemoStoreValue | null>(null);
const STORAGE_KEY = "nowmal.demo.v1";

export function DemoStoreProvider({
  children,
  mode = "demo",
}: {
  children: ReactNode;
  mode?: "demo" | "connected";
}) {
  const storageKey = mode === "demo" ? STORAGE_KEY : "nowmal.connected.v1";
  const [state, setState] = useState<DemoState>(() =>
    mode === "demo" ? initialDemoState : { ...initialDemoState, connected: false, threadCount: 0 },
  );
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DemoState>;
        setState((current) => ({ ...current, ...parsed, toast: null }));
      }
    } catch {
      // Device-local persistence is a convenience; a corrupt value should never block the demo.
    } finally {
      hydrated.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ ...state, toast: null, copied: false }),
      );
    } catch {
      // Private browsing can deny localStorage. The in-memory demo remains fully usable.
    }
  }, [state, storageKey]);

  const patch = useCallback((values: Partial<DemoState>) => {
    setState((current) => ({ ...current, ...values }));
  }, []);

  const notify = useCallback((text: string, undo?: ToastUndo) => {
    setState((current) => ({ ...current, toast: { text, undo } }));
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const action = current.toast?.undo;
      if (!action) return { ...current, toast: null };

      switch (action.kind) {
        case "task-done":
          return {
            ...current,
            doneTasks: current.doneTasks.filter((id) => id !== action.id),
            toast: null,
          };
        case "not-task":
          return {
            ...current,
            notTasks: current.notTasks.filter((id) => id !== action.id),
            toast: null,
          };
        case "accept-cluster":
          return {
            ...current,
            acceptedClusters: current.acceptedClusters.filter((id) => id !== action.id),
            clusterId: "search",
            toast: null,
          };
        case "delete-cluster":
          return {
            ...current,
            deletedClusters: current.deletedClusters.filter((id) => id !== action.id),
            clusterId: action.id,
            toast: null,
          };
        case "accept-tracker":
          return {
            ...current,
            trackersOn: current.trackersOn.filter((id) => id !== action.id),
            trackerId: "job",
            toast: null,
          };
        case "stop-tracker":
          return {
            ...current,
            trackersOn: [...current.trackersOn, action.id],
            trackerId: action.id,
            toast: null,
          };
        case "remove-prospect": {
          const next = { ...current.prospectState };
          delete next[action.id];
          return { ...current, prospectState: next, toast: null };
        }
      }
    });
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setState(mode === "demo" ? initialDemoState : { ...initialDemoState, connected: false, threadCount: 0 });
  }, [mode, storageKey]);

  const value = useMemo(
    () => ({ state, setState, patch, notify, undo, reset }),
    [notify, patch, reset, state, undo],
  );

  return <DemoStore.Provider value={value}>{children}</DemoStore.Provider>;
}

export function useDemoStore() {
  const value = useContext(DemoStore);
  if (!value) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return value;
}
