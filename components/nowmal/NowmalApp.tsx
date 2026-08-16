"use client";

import { DemoStoreProvider, useDemoStore } from "@/lib/demo/store";
import { LeftRail } from "./LeftRail";
import { EvePanel } from "./EvePanel";
import { SearchScreen } from "./SearchScreen";
import { Toast } from "./Toast";
import { EmptyState } from "./ui";
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
      <NowmalShell mode={mode} accountEmail={accountEmail} />
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
  const contentViews = ["brief", "now", "tasks", "promises", "pipeline", "mail"];
  const disconnected = !state.connected && contentViews.includes(state.view);

  return (
    <main className="nowmal-shell" data-mode={mode}>
      <LeftRail mode={mode} accountEmail={accountEmail} />
      <section className="center-column" aria-label="Nowmal workspace">
        {state.query ? (
          <SearchScreen />
        ) : disconnected ? (
          <EmptyState onSetup={() => patch({ view: "setup" })} />
        ) : (
          <CurrentScreen mode={mode} accountEmail={accountEmail} />
        )}
      </section>
      <EvePanel mode={mode} />
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
