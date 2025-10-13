export const TOKEN_STORAGE_KEY = "jwt_token";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

export const setToken = (token: string) => {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export function handleUnauthorized() {
  if (typeof window === "undefined") return;
  clearToken();
  try {
    window.dispatchEvent(new CustomEvent("auth:logout"));
  } catch {}
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}
