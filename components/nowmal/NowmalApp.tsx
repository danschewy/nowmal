"use client";

import { DemoStoreProvider, useDemoStore } from "@/lib/demo/store";
import { LeftRail } from "./LeftRail";
import { EvePanel } from "./EvePanel";
import { SearchScreen } from "./SearchScreen";
import { Toast } from "./Toast";
import { EmptyState } from "./ui";
import { ConnectedSearchScreen, ConnectedWorkspaceScreen } from "./ConnectedWorkspaceScreen";
import { WorkspaceDataProvider, useWorkspaceData } from "./WorkspaceData";
import { AgentsScreen } from "./screens/AgentsScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { MailScreen } from "./screens/MailScreen";
import { NowScreen } from "./screens/NowScreen";
import { PromisesScreen } from "./screens/PromisesScreen";
import { RulesScreen } from "./screens/RulesScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { TrackersScreen } from "./screens/TrackersScreen";
import "./nowmal.css";

export function NowmalApp({
  mode,
  accountEmail,
}: {
  mode: "demo" | "connected";
  accountEmail: string;
}) {
  return (
    <DemoStoreProvider mode={mode}>
      <WorkspaceDataProvider mode={mode}>
        <NowmalShell mode={mode} accountEmail={accountEmail} />
      </WorkspaceDataProvider>
    </DemoStoreProvider>
  );
}

function NowmalShell({
  mode,
  accountEmail,
}: {
  mode: "demo" | "connected";
  accountEmail: string;
}) {
  const { state, patch } = useDemoStore();
  const { snapshot, loading, error, refresh } = useWorkspaceData();
  const contentViews = ["brief", "now", "tasks", "promises", "pipeline", "mail"];
  const connected = mode === "demo" ? state.connected : snapshot?.connected ?? state.connected;
  const disconnected = !connected && contentViews.includes(state.view);
  const loadingWorkspace = mode === "connected" && loading && !snapshot;
  const unavailableWorkspace = mode === "connected" && Boolean(error) && !snapshot;

  return (
    <main className="nowmal-shell" data-mode={mode}>
      <LeftRail mode={mode} accountEmail={accountEmail} />
      <section className="center-column" aria-label="Nowmal workspace">
        {loadingWorkspace ? (
          <WorkspaceStatus title="Loading your workspace" body="Reading the indexed Gmail data already stored for this account." />
        ) : unavailableWorkspace ? (
          <WorkspaceStatus title="Your workspace could not be loaded" body={error ?? "Try again."} onRetry={() => void refresh()} />
        ) : state.query ? (
          mode === "connected" ? <ConnectedSearchScreen /> : <SearchScreen />
        ) : disconnected ? (
          <EmptyState onSetup={() => patch({ view: "setup" })} />
        ) : (
          <CurrentScreen mode={mode} accountEmail={accountEmail} />
        )}
      </section>
      <EvePanel
        mode={mode}
        initialSessionId={snapshot?.eveSessionId ?? null}
        workspaceReady={mode === "demo" || Boolean(snapshot)}
      />
      <Toast />
    </main>
  );
}

function CurrentScreen({
  mode,
  accountEmail,
}: {
  mode: "demo" | "connected";
  accountEmail: string;
}) {
  const { state } = useDemoStore();
  if (
    mode === "connected" &&
    (["brief", "now", "tasks", "promises", "pipeline", "mail"] as const).includes(
      state.view as "brief" | "now" | "tasks" | "promises" | "pipeline" | "mail",
    )
  ) {
    return <ConnectedWorkspaceScreen view={state.view} accountEmail={accountEmail} />;
  }
  switch (state.view) {
    case "brief":
      return <BriefScreen />;
    case "now":
      return <NowScreen />;
    case "promises":
      return <PromisesScreen />;
    case "pipeline":
      return <TrackersScreen />;
    case "mail":
      return <MailScreen />;
    case "setup":
      return <SetupScreen mode={mode} accountEmail={accountEmail} />;
    case "rules":
      return <RulesScreen />;
    case "agents":
      return <AgentsScreen mode={mode} />;
    case "tasks":
    default:
      return <TasksScreen />;
  }
}

function WorkspaceStatus({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="empty-state">
      <h1>{title}</h1>
      <p>{body}</p>
      {onRetry ? <button className="action-button action-solid" type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}
