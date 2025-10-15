import { API_BASE_URL } from "./env";
import { httpDelete, httpGet, httpPost } from "./http";
import {
  TOKEN_STORAGE_KEY,
  getToken,
  setToken,
  clearToken,
  handleUnauthorized,
} from "./auth-storage";

export { TOKEN_STORAGE_KEY, getToken, setToken, clearToken };

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    role?: string;
    is_active?: boolean;
    created_at?: string;
  };
};

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const sanitize = (text: any) => {
    let s =
      typeof text === "string"
        ? text
        : (() => {
            try {
              return JSON.stringify(text);
            } catch {
              return String(text);
            }
          })();
    s = s.replace(/(sk-[A-Za-z0-9]{3})[A-Za-z0-9_-]{10,}/g, "$1***");
    s = s.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "***jwt***");
    s = s.replace(
      /((?:mongodb\+srv|mongodb|postgresql?|mysql|redis|amqp|http|https):\/\/[^:\/@\s]+):[^@\s]+@/gi,
      "$1:***@",
    );
    s = s.replace(/("(?:password|secret|api_?key|token)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
    s = s.replace(/("(?:connection_string|database_url|url|dsn)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
    return s;
  };

  try {
    return await httpPost<LoginResponse>(
      "/api/v1/auth/login",
      { username, password },
      {
        headers: { Accept: "application/json" },
        skipUnauthorizedHandling: true,
      },
    );
  } catch (error: any) {
    throw new Error(sanitize(error?.message || "Login failed"));
  }
}

export type MeResponse = {
  id?: string;
  username?: string;
  email?: string;
  full_name?: string | null;
  role?: string | null;
  user?: {
    id?: string;
    username?: string;
    email?: string;
    full_name?: string | null;
    role?: string | null;
    [key: string]: any;
  } | null;
  [key: string]: any;
};

export async function meRequest(token: string): Promise<MeResponse> {
  return httpGet<MeResponse>("/api/v1/auth/me", { token });
}

export type RegisterBody = {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: string; // admin | lecturer | student
};

export async function registerRequest(token: string, body: RegisterBody) {
  return httpPost("/api/v1/auth/register", body, { token });
}

// Admin users list
export type UserSummary = {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  created_at?: string;
};

export async function listUsers(
  token: string,
  opts?: { search?: string; role?: string; is_active?: boolean; limit?: number; offset?: number }
): Promise<UserSummary[]> {
  const searchParams: Record<string, string | undefined> = {
    search: opts?.search || undefined,
    role: opts?.role || undefined,
    is_active: typeof opts?.is_active === "boolean" ? String(opts.is_active) : undefined,
    limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
    offset: opts?.offset !== undefined ? String(opts.offset) : undefined,
  };

  const body = await httpGet<any>("/api/v1/admin/users", { token, searchParams });
  // Assume API returns array or object with users array
  if (Array.isArray(body)) return body as UserSummary[];
  if (body?.users && Array.isArray(body.users)) return body.users as UserSummary[];
  return [];
}

// API Keys
export type ApiKeyItem = {
  id: string;
  key_prefix: string;
  name: string;
  user_id: string;
  username?: string;
  is_active: boolean;
  created_at?: string;
  last_used_at?: string | null;
  api_key?: string; // only on creation
};

export async function createApiKey(token: string, body: { user_id: string; name: string }): Promise<ApiKeyItem> {
  return httpPost<ApiKeyItem>("/api/v1/admin/api-keys", body, { token });
}

export async function listApiKeys(token: string): Promise<ApiKeyItem[]> {
  const data = await httpGet<any>("/api/v1/admin/api-keys", { token });
  if (Array.isArray(data)) return data as ApiKeyItem[];
  if (data?.api_keys) return data.api_keys as ApiKeyItem[];
  return [];
}

export async function getApiKey(token: string, key_id: string): Promise<ApiKeyItem> {
  return httpGet<ApiKeyItem>(`/api/v1/admin/api-keys/${key_id}`, { token });
}

export async function revokeApiKey(token: string, key_id: string): Promise<{ success: boolean }> {
  await httpDelete(`/api/v1/admin/api-keys/${key_id}`, { token });
  return { success: true };
}

export async function listApiKeysByUser(token: string, user_id: string): Promise<ApiKeyItem[]> {
  const data = await httpGet<any>(`/api/v1/admin/users/${user_id}/api-keys`, { token });
  if (Array.isArray(data)) return data as ApiKeyItem[];
  if (data?.api_keys) return data.api_keys as ApiKeyItem[];
  return [];
}

// Document upload
export type UploadSingleResult = {
  document_id: string;
  filename: string;
  source_link?: string;
  custom_metadata?: Record<string, any>;
  status: string; // queued | processing | completed | failed
  metadata?: {
    num_texts?: number;
    num_tables?: number;
    num_images?: number;
    total_chunks?: number;
    upload_timestamp?: string;
    [k: string]: any;
  };
  message?: string;
};

export type UploadBatchResponse = {
  total_uploaded?: number;
  successful?: number;
  failed?: number;
  results?: UploadSingleResult[];
  message?: string;
} & UploadSingleResult; // allow server to also return single-file shape

export async function uploadDocuments(
  token: string,
  files: File[],
  sourceLinks: string[],
  customMetadata?: Record<string, any>,
): Promise<UploadBatchResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  // repeat source_links to match number of files if more than one
  if (sourceLinks && sourceLinks.length) {
    sourceLinks.forEach((s) => form.append("source_links", s));
  }
  if (customMetadata) {
    form.append("custom_metadata", JSON.stringify(customMetadata));
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    let message = "Upload failed";
    if (body) {
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      else if (body.message) message = body.message;
    }
    throw new Error(message);
  }
  return body as UploadBatchResponse;
}

// Documents list
export type DocumentSummary = {
  document_id: string;
  document_name?: string | null;
  author?: string | null;
  client_upload_timestamp?: string | null;
  sensitivity?: string | null;
  total_chunks: number;
  counts?: Record<string, number>;
  source_links?: string[] | null;
  metadata?: Record<string, any>;
};

export type DocumentsListResponse = {
  total_documents: number;
  total_vectors: number;
  documents: DocumentSummary[];
};

export async function listDocuments(
  token: string,
  opts?: { filter?: string; limit?: number; namespace?: string }
): Promise<DocumentsListResponse> {
  const searchParams: Record<string, string | undefined> = {
    filter: opts?.filter || undefined,
    limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
    namespace: opts?.namespace || undefined,
  };
  return httpGet<DocumentsListResponse>("/api/v1/documents/list", { token, searchParams });
}

// Chat history
export type ChatSessionInfo = {
  session_id: string;
  created_at?: string;
  last_activity?: string;
  expires_at?: string;
  ttl?: number | null;
  metadata?: Record<string, any> | null;
  [key: string]: any;
};

export type ChatHistoryMessage = {
  role: string;
  content: string;
  timestamp?: string;
  created_at?: string;
  metadata?: Record<string, any> | null;
  [key: string]: any;
};

export type ChatHistoryResult = {
  session_id?: string;
  messages: ChatHistoryMessage[];
  message_count?: number;
  ttl?: number | null;
  [key: string]: any;
};

function normalizeSessionEntry(entry: any): ChatSessionInfo | null {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { session_id: entry };
  }
  const session_id = entry.session_id || entry.id || entry.sessionId || entry.key;
  if (!session_id) return null;
  const info: ChatSessionInfo = {
    session_id,
    created_at: entry.created_at ?? entry.createdAt,
    last_activity: entry.last_activity ?? entry.lastActivity,
    expires_at: entry.expires_at ?? entry.expiresAt,
    ttl: entry.ttl ?? entry.ttl_seconds ?? entry.time_to_live ?? entry.expires_in ?? entry.expiresIn,
    metadata: entry.metadata ?? entry.meta ?? null,
  };
  return { ...entry, ...info };
}

function normalizeHistoryEntry(entry: any, index: number): ChatHistoryMessage | null {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { role: index % 2 === 0 ? "user" : "assistant", content: entry };
  }
  const role = entry.role || entry.speaker || entry.author || entry.from || "unknown";
  const rawContent = entry.content ?? entry.message ?? entry.text;
  const content = typeof rawContent === "string" ? rawContent : (() => {
    try {
      return JSON.stringify(rawContent);
    } catch {
      return String(rawContent);
    }
  })();
  const message: ChatHistoryMessage = {
    ...entry,
    role,
    content,
    timestamp: entry.timestamp ?? entry.ts ?? entry.time ?? entry.created_at ?? entry.createdAt,
    created_at: entry.created_at ?? entry.createdAt,
    metadata: entry.metadata ?? entry.meta ?? null,
  };
  return message;
}

export async function listChatSessions(token?: string | null, opts?: { limit?: number }): Promise<ChatSessionInfo[]> {
  const query = opts?.limit ? `?limit=${encodeURIComponent(String(opts.limit))}` : "";
  const endpoints = [
    `${API_BASE_URL}/api/v1/sessions${query}`,
    `${API_BASE_URL}/api/v1/history`,
  ];

  const collectFromData = (data: any) => {
    const collected: ChatSessionInfo[] = [];
    const seen = new Set<string>();
    const push = (value: any) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach(push);
        return;
      }
      const normalized = normalizeSessionEntry(value);
      if (normalized && !seen.has(normalized.session_id)) {
        seen.add(normalized.session_id);
        collected.push(normalized);
      }
    };

    if (Array.isArray(data)) {
      push(data);
    } else if (data && typeof data === "object") {
      push((data as any).sessions);
      const sessionsObj = (data as any).sessions;
      if (!Array.isArray(sessionsObj) && sessionsObj && typeof sessionsObj === "object") {
        push(Object.values(sessionsObj));
      }
      push((data as any).data);
      push((data as any).results);
      push((data as any).items);
      push((data as any).session_ids);
      push((data as any).ids);
      push(data);
    } else {
      push(data);
    }

    return collected;
  };

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(endpoint, {
        headers,
        cache: "no-store",
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("Unauthorized");
      }
      const data = await res.json().catch(() => undefined);
      if (res.status === 404) {
        lastError = new Error(`Endpoint ${endpoint} tidak ditemukan (404).`);
        continue;
      }
      if (!res.ok) {
        const message = (data && (data.detail || data.message || data.error)) || `Failed to fetch chat sessions from ${endpoint}`;
        throw new Error(message);
      }
      return collectFromData(data);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // try next endpoint if available
    }
  }

  if (lastError) throw lastError;
  return [];
}

export async function getChatHistory(session_id: string): Promise<ChatHistoryResult> {
  const data = await httpGet<any>(`/api/v1/history/${encodeURIComponent(session_id)}`, {
    headers: { Accept: "application/json" },
  });
  const collected: ChatHistoryMessage[] = [];
  const push = (value: any) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const normalized = normalizeHistoryEntry(value, collected.length);
    if (normalized) collected.push(normalized);
  };

  if (Array.isArray(data)) {
    push(data);
  } else if (data && typeof data === "object") {
    push((data as any).messages);
    push((data as any).history);
    push((data as any).conversation);
    push((data as any).data);
    // Some APIs return `message_history`
    push((data as any).message_history);
  }

  if (!collected.length) {
    push(data);
  }

  const result: ChatHistoryResult = {
    session_id: (data as any)?.session_id ?? session_id,
    messages: collected,
    message_count: (data as any)?.message_count ?? collected.length,
    ttl: (data as any)?.ttl ?? null,
  };
  if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      if (!(key in result)) (result as any)[key] = value;
    });
  }
  return result;
}

export async function getChatSessionMeta(session_id: string): Promise<ChatSessionInfo | null> {
  const data = await httpGet<any>(`/api/v1/session/${encodeURIComponent(session_id)}`, {
    headers: { Accept: "application/json" },
  });
  if (Array.isArray(data)) {
    const first = data[0];
    return normalizeSessionEntry(first);
  }
  if (typeof data === "string") return normalizeSessionEntry(data);
  if (data && typeof data === "object") {
    if (data.session) return normalizeSessionEntry(data.session);
    return normalizeSessionEntry(data);
  }
  return null;
}

export async function clearChatHistory(session_id: string): Promise<boolean> {
  await httpDelete(`/api/v1/history/${encodeURIComponent(session_id)}`, {
    headers: { Accept: "application/json" },
  });
  return true;
}
