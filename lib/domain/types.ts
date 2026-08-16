export type View =
  | "brief"
  | "now"
  | "tasks"
  | "promises"
  | "pipeline"
  | "mail"
  | "setup"
  | "rules"
  | "agents";

export type TaskStatus = "now" | "wait" | "later" | "done";

export interface Task {
  id: string;
  status: TaskStatus;
  title: string;
  company: string;
  stage: string;
  due: string;
  confidence: number;
  evidence: readonly [string, string, string];
  source: string;
  lineage: string;
  fields: readonly (readonly [string, string])[];
}

export interface PromiseItem {
  id: string;
  to: string;
  said: string;
  status: "due" | "late" | "broken" | "kept";
  due: string;
  quote: string;
  context: string;
}

export interface Prospect {
  id: string;
  name: string;
  role: string;
  stageIndex: number;
  stage: string;
  age: string;
  warm: boolean;
  signal: string;
}

export interface Tracker {
  id: string;
  name: string;
  stages: readonly string[];
  rows: readonly Prospect[];
  note: string;
}

export interface MailThread {
  id: string;
  from: string;
  when: string;
  subject: string;
  quote?: string;
  eve: string;
  task: boolean;
  gmailUrl?: string;
}

export interface Cluster {
  id: string;
  name: string;
  count: number;
  note: string;
}

export interface EveMessage {
  id: string;
  who: "Eve" | "You";
  text: string;
  draft?: string;
}

export interface ToastState {
  text: string;
  undo?: () => void;
}
