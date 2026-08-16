const GMAIL_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailHeader {
  name?: string;
  value?: string;
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

export interface GmailThread {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
}

interface GmailListResponse {
  threads?: { id: string; historyId?: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailHistoryResponse {
  history?: {
    id?: string;
    messagesAdded?: { message?: { id?: string; threadId?: string } }[];
  }[];
  nextPageToken?: string;
  historyId?: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GMAIL_ROOT}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail API ${response.status}: ${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

export function getGmailProfile(accessToken: string) {
  return gmailFetch<GmailProfile>(accessToken, "/profile");
}

export async function listRecentThreadIds(
  accessToken: string,
  options: { query?: string; maxThreads?: number } = {},
) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  const maxThreads = options.maxThreads ?? 500;
  do {
    const params = new URLSearchParams({
      maxResults: String(Math.min(100, maxThreads - ids.length)),
      q: options.query ?? "newer_than:90d",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gmailFetch<GmailListResponse>(accessToken, `/threads?${params}`);
    ids.push(...(page.threads ?? []).map((thread) => thread.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < maxThreads);
  return ids.slice(0, maxThreads);
}

export async function listChangedThreadIds(
  accessToken: string,
  startHistoryId: string,
  maxThreads = 500,
) {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let historyId = startHistoryId;
  do {
    const params = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded", maxResults: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gmailFetch<GmailHistoryResponse>(accessToken, `/history?${params}`);
    for (const history of page.history ?? []) {
      for (const added of history.messagesAdded ?? []) {
        if (added.message?.threadId) ids.add(added.message.threadId);
        if (ids.size >= maxThreads) break;
      }
      if (ids.size >= maxThreads) break;
    }
    pageToken = page.nextPageToken;
    historyId = page.historyId ?? historyId;
  } while (pageToken && ids.size < maxThreads);
  return { threadIds: [...ids], historyId };
}

export function getGmailThread(accessToken: string, threadId: string) {
  const params = new URLSearchParams({ format: "full" });
  return gmailFetch<GmailThread>(accessToken, `/threads/${encodeURIComponent(threadId)}?${params}`);
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export function headersOf(message: GmailMessage) {
  return Object.fromEntries(
    (message.payload?.headers ?? [])
      .filter((header): header is { name: string; value: string } => Boolean(header.name && header.value))
      .map((header) => [header.name.toLowerCase(), header.value]),
  );
}

export function plainTextOf(message: GmailMessage) {
  const visit = (part?: GmailPart): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
    for (const child of part.parts ?? []) {
      const text = visit(child);
      if (text) return text;
    }
    if (part.body?.data && !part.mimeType?.startsWith("multipart/")) return decodeBase64Url(part.body.data);
    return "";
  };
  return visit(message.payload).slice(0, 100_000);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

export async function sendGmailMessage(
  accessToken: string,
  input: { to: string; subject: string; body: string; idempotencyKey: string },
) {
  if (/\r|\n/.test(input.to) || /\r|\n/.test(input.subject)) {
    throw new Error("Email headers may not contain newlines.");
  }
  if (!input.to.includes("@")) throw new Error("A valid recipient is required.");
  const messageIdToken = input.idempotencyKey.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
  if (!messageIdToken) throw new Error("A valid idempotency key is required.");
  const encodedSubject = Buffer.from(input.subject, "utf8").toString("base64");
  const raw = [
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    `Message-ID: <${messageIdToken}@send.nowmal.app>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
  const encoded = Buffer.from(raw, "utf8").toString("base64url");
  return gmailFetch<{ id: string; threadId?: string; labelIds?: string[] }>(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: encoded }),
  });
}
