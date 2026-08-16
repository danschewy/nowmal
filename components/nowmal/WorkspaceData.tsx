"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WorkspaceSnapshot } from "@/lib/workspace/snapshot";
import { useDemoStore } from "@/lib/demo/store";

interface WorkspaceDataValue {
  snapshot: WorkspaceSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<WorkspaceSnapshot | null>;
}

const WorkspaceData = createContext<WorkspaceDataValue | null>(null);

export function WorkspaceDataProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "demo" | "connected";
}) {
  const { patch } = useDemoStore();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(mode === "connected");
  const [error, setError] = useState<string | null>(null);
  const permissionCheckStarted = useRef(false);

  const refresh = useCallback(async () => {
    if (mode === "demo") return null;
    setLoading(true);
    setError(null);
    try {
      if (!permissionCheckStarted.current) {
        permissionCheckStarted.current = true;
        try {
          await fetch("/api/gmail/status", { cache: "no-store" });
        } catch {
          // Permission reconciliation is best effort. The send tool always
          // performs its own authoritative scope check before Gmail is called.
        }
      }
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const result = (await response.json()) as WorkspaceSnapshot | { error?: string };
      if (!response.ok || !("connected" in result)) {
        throw new Error("error" in result ? result.error ?? "Workspace could not be loaded." : "Workspace could not be loaded.");
      }
      setSnapshot(result);
      patch({
        connected: result.connected,
        threadCount: result.threadCount,
        sendEnabled: result.sendEnabled,
      });
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be loaded.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode, patch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ snapshot, loading, error, refresh }),
    [error, loading, refresh, snapshot],
  );

  return <WorkspaceData.Provider value={value}>{children}</WorkspaceData.Provider>;
}

export function useWorkspaceData() {
  const value = useContext(WorkspaceData);
  if (!value) throw new Error("useWorkspaceData must be used inside WorkspaceDataProvider.");
  return value;
}
