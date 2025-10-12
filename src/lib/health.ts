import { getToken } from "@/lib/api";
import { API_BASE_URL } from "./env";

const BASE_URL = API_BASE_URL;

export type HealthResult = {
  ok: boolean;
  status: string;
  timestamp?: string;
  version?: string;
  error?: string;
  raw?: any;
};

function sanitize(text: any): string {
  let s = typeof text === "string" ? text : (() => { try { return JSON.stringify(text); } catch { return String(text); } })();
  // Mask API keys like sk-...
  s = s.replace(/(sk-[A-Za-z0-9]{3})[A-Za-z0-9_-]{10,}/g, "$1***");
  // Mask JWTs
  s = s.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "***jwt***");
  // Mask URI credentials user:pass@
  s = s.replace(/((?:mongodb\+srv|mongodb|postgresql?|mysql|redis|amqp|http|https):\/\/[^:\/@\s]+):[^@\s]+@/gi, "$1:***@");
  // Mask common JSON fields
  s = s.replace(/("(?:password|secret|api_?key|token)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
  // Mask connection strings fields
  s = s.replace(/("(?:connection_string|database_url|url|dsn)"\s*:\s*")([^"]+)(")/gi, '$1***$3');
  return s;
}

async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch {}
  }
  return undefined;
}

export async function getApiHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
    const body = await safeJson(res);
    if (!res.ok) {
      return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    }
    const status = String(body?.status ?? "unknown");
    return { ok: status === "healthy", status, timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch (e: any) {
    return { ok: false, status: "down", error: e?.message || "failed" };
  }
}

// Fetch /health and attempt to extract aggregate service statuses
export async function getAggregateHealth(): Promise<Record<string, HealthResult>> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
    const body = await safeJson(res);
    if (!res.ok || !body) return {};

    const out: Record<string, HealthResult> = {};
    // Map API top-level
    const apiStatus = String(body.status ?? "unknown");
    out["api"] = {
      ok: apiStatus === "healthy" || apiStatus === "ok" || apiStatus === "true",
      status: apiStatus,
      timestamp: body.timestamp,
      version: body.version,
      raw: body,
    };

    // Map nested services if present
    if (body.services && typeof body.services === "object") {
      for (const [key, val] of Object.entries<any>(body.services)) {
        const st = String(val?.status ?? val?.ok ?? "unknown");
        out[key] = {
          ok: st === "healthy" || st === "ok" || st === "true",
          status: st,
          timestamp: val?.timestamp,
          version: val?.version,
          raw: val,
        } as HealthResult;
      }
    }
    return out;
  } catch {
    return {};
  }
}

// New summary endpoint helper
export async function getHealthSummary(deep: boolean): Promise<Record<string, HealthResult>> {
  try {
    const token = getToken();
    const url = `${BASE_URL}/api/v1/health/summary${deep ? "?deep=true" : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok || !body) return {};

    const out: Record<string, HealthResult> = {};
    // top-level api
    const apiStatus = String(body.status ?? body.api?.status ?? "unknown");
    out["api"] = {
      ok: apiStatus === "healthy" || apiStatus === "ok" || apiStatus === "true",
      status: apiStatus,
      timestamp: body.timestamp || body.api?.timestamp,
      version: body.version || body.api?.version,
      raw: body.api || body,
    };
    const source = body.services || body; // allow flat responses
    const keys = ["pinecone", "openai", "redis", "database", "storage"];
    for (const k of keys) {
      const val: any = source[k];
      if (!val) continue;
      const st = String(val?.status ?? val?.ok ?? "unknown");
      out[k] = {
        ok: st === "healthy" || st === "ok" || st === "true",
        status: st,
        timestamp: val?.timestamp,
        version: val?.version,
        raw: val,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function getPineconeHealth(): Promise<HealthResult> {
  // Try a likely endpoint; fall back to API health if the response includes service statuses
  try {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/health/pinecone`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok) {
      return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    }
    const status = String(body?.status ?? "unknown");
    return { ok: status === "healthy", status, timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch {
    return { ok: false, status: "unknown", error: "endpoint not available" };
  }
}

export async function getOpenAIHealth(): Promise<HealthResult> {
  try {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/health/openai`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok) {
      return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    }
    const status = String(body?.status ?? "unknown");
    return { ok: status === "healthy", status, timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch {
    return { ok: false, status: "unknown", error: "endpoint not available" };
  }
}

export async function getRedisHealthDeep(): Promise<HealthResult> {
  try {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/health/redis?deep=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    const status = String(body?.status ?? body?.ok ?? "unknown");
    return { ok: status === "healthy" || status === "ok" || status === "true", status: String(status), timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch {
    return { ok: false, status: "unknown", error: "endpoint not available" };
  }
}

export async function getDatabaseHealthDeep(): Promise<HealthResult> {
  try {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/health/database?deep=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    const status = String(body?.status ?? body?.ok ?? "unknown");
    return { ok: status === "healthy" || status === "ok" || status === "true", status: String(status), timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch {
    return { ok: false, status: "unknown", error: "endpoint not available" };
  }
}

export async function getStorageHealthDeep(): Promise<HealthResult> {
  try {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/health/storage?deep=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, status: "down", error: sanitize(body?.detail || res.statusText), raw: body };
    const status = String(body?.status ?? body?.ok ?? "unknown");
    return { ok: status === "healthy" || status === "ok" || status === "true", status: String(status), timestamp: body?.timestamp, version: body?.version, raw: body };
  } catch {
    return { ok: false, status: "unknown", error: "endpoint not available" };
  }
}
