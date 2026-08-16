export const WORKSPACE_ANALYSIS_VERSION = "tasks-promises-v1";

export interface AnalysisProgress {
  version: typeof WORKSPACE_ANALYSIS_VERSION;
  analyzedThreadCount: number;
  pendingThreadCount: number;
  workItemCount: number;
}
