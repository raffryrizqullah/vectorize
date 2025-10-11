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
