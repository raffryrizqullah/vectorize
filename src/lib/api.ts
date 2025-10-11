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

const BASE_URL = "http://127.0.0.1:8000";

export const TOKEN_STORAGE_KEY = "jwt_token";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

export const setToken = (token: string) => {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  // Backend expects JSON (per Postman screenshot)
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const sanitize = (text: any) => {
    let s = typeof text === "string" ? text : (() => { try { return JSON.stringify(text); } catch { return String(text); } })();
    s = s.replace(/(sk-[A-Za-z0-9]{3})[A-Za-z0-9_-]{10,}/g, "$1***");
    s = s.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "***jwt***");
    s = s.replace(/((?:mongodb\+srv|mongodb|postgresql?|mysql|redis|amqp|http|https):\/\/[^:\/@\s]+):[^@\s]+@/gi, "$1:***@");
    s = s.replace(/("(?:password|secret|api_?key|token)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
    s = s.replace(/("(?:connection_string|database_url|url|dsn)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
    return s;
  };

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    let message = "Login failed";
    if (body) {
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      else if (body.message) message = body.message;
    }
    throw new Error(sanitize(message));
  }
  return body as LoginResponse;
}

export async function meRequest(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }
  return res.json();
}

export type RegisterBody = {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: string; // admin | lecturer | student
};

export async function registerRequest(token: string, body: RegisterBody) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    let message = "Register failed";
    if (data) {
      if (typeof data.detail === "string") message = data.detail;
      else if (Array.isArray(data.detail)) message = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      else if (data.message) message = data.message;
    }
    throw new Error(message);
  }
  return data;
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
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.role) params.set("role", opts.role);
  if (typeof opts?.is_active === "boolean") params.set("is_active", String(opts.is_active));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const url = `${BASE_URL}/api/v1/admin/users${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    let message = "Failed to fetch users";
    if (body) {
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      else if (body.message) message = body.message;
    }
    throw new Error(message);
  }
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
  const res = await fetch(`${BASE_URL}/api/v1/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data && (data.detail || data.message)) || "Failed to create API key");
  return data as ApiKeyItem;
}

export async function listApiKeys(token: string): Promise<ApiKeyItem[]> {
  const res = await fetch(`${BASE_URL}/api/v1/admin/api-keys`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data && (data.detail || data.message)) || "Failed to fetch API keys");
  if (Array.isArray(data)) return data as ApiKeyItem[];
  if (data?.api_keys) return data.api_keys as ApiKeyItem[];
  return [];
}

export async function getApiKey(token: string, key_id: string): Promise<ApiKeyItem> {
  const res = await fetch(`${BASE_URL}/api/v1/admin/api-keys/${key_id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data && (data.detail || data.message)) || "Failed to get API key");
  return data as ApiKeyItem;
}

export async function revokeApiKey(token: string, key_id: string): Promise<{ success: boolean } | ApiKeyItem> {
  const res = await fetch(`${BASE_URL}/api/v1/admin/api-keys/${key_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (res.status === 204) return { success: true };
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data && (data.detail || data.message)) || "Failed to revoke key");
  return data as any;
}

export async function listApiKeysByUser(token: string, user_id: string): Promise<ApiKeyItem[]> {
  const res = await fetch(`${BASE_URL}/api/v1/admin/users/${user_id}/api-keys`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data && (data.detail || data.message)) || "Failed to fetch user's API keys");
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

  const res = await fetch(`${BASE_URL}/api/v1/documents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  });

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
  const params = new URLSearchParams();
  if (opts?.filter) params.set("filter", opts.filter);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.namespace) params.set("namespace", opts.namespace);
  const url = `${BASE_URL}/api/v1/documents/list${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    let message = "Failed to fetch documents";
    if (body) {
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      else if (body.message) message = body.message;
    }
    throw new Error(message);
  }
  return body as DocumentsListResponse;
}
