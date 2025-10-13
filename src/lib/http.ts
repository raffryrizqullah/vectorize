import { API_BASE_URL } from "./env";
import { handleUnauthorized } from "./auth-storage";

type RequestOptions = RequestInit & {
  path: string;
  token?: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  skipUnauthorizedHandling?: boolean;
};

function buildUrl(path: string, searchParams?: RequestOptions["searchParams"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, API_BASE_URL);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

export async function httpRequest<TResponse>(options: RequestOptions): Promise<TResponse> {
  const { path, token, searchParams, headers, skipUnauthorizedHandling = false, ...rest } = options;
  const url = buildUrl(path, searchParams);
  const mergedHeaders: HeadersInit = {
    Accept: "application/json",
    ...headers,
  };
  if (token) {
    (mergedHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
  });
  if (response.status === 401 && !skipUnauthorizedHandling) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => undefined)
    : undefined;
  if (!response.ok) {
    const errorMessage =
      body?.detail ||
      body?.message ||
      body?.error ||
      response.statusText ||
      "Request failed";
    throw new Error(errorMessage);
  }
  return body as TResponse;
}

export function httpGet<TResponse>(path: string, options: Omit<RequestOptions, "path" | "method"> = {}) {
  return httpRequest<TResponse>({ path, method: "GET", ...options });
}

export function httpPost<TResponse>(
  path: string,
  body: any,
  options: Omit<RequestOptions, "path" | "method" | "body"> = {},
) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  return httpRequest<TResponse>({
    ...options,
    path,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export function httpDelete<TResponse>(
  path: string,
  options: Omit<RequestOptions, "path" | "method"> = {},
) {
  return httpRequest<TResponse>({ ...options, path, method: "DELETE" });
}
