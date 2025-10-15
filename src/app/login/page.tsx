"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CubeTransparentIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { loginRequest, TOKEN_STORAGE_KEY, getToken, meRequest } from "@/lib/api";
import { getHealthSummary } from "@/lib/health";
import Silk from "@/components/Silk";
import { fieldInputClass, alertStyles } from "@/styles/design";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // If already authenticated, redirect only if admin
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    meRequest(token)
      .then((u) => {
        const role = u?.role || u?.user?.role;
        if (role === "admin") {
          router.replace("/dashboard");
        }
      })
      .catch(() => {/* ignore */});
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "").trim();
    setLoading(true);
    try {
      const resp = await loginRequest(username, password);
      // Persist token for the next session
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_STORAGE_KEY, resp.access_token);
      }
      // Allow only admin role to proceed
      try {
        const me = await meRequest(resp.access_token);
        const role = me?.role || me?.user?.role;
        if (role !== "admin") {
          if (typeof window !== "undefined") localStorage.removeItem(TOKEN_STORAGE_KEY);
          setError("Only administrators can access the dashboard.");
          return;
        }
      } catch {
        // If we cannot verify role, treat as failure
        if (typeof window !== "undefined") localStorage.removeItem(TOKEN_STORAGE_KEY);
        setError("Failed to verify user role.");
        return;
      }
      setError(null);
      // Prefetch health summary once login succeeds
      try {
        const summary = await getHealthSummary(true);
        const payload = { data: summary, ts: new Date().toISOString() };
        localStorage.setItem("health_cache", JSON.stringify(payload));
      } catch {}
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-white">
        <body class="h-full">
        ```
      */}
      <div className="flex min-h-screen flex-1">
        <div className="relative hidden flex-1 overflow-hidden bg-secondary/5 lg:flex lg:basis-1/2">
          <Silk speed={4.2} scale={1.25} noiseIntensity={1} color="#06337b" rotation={0.35} />
          <div className="absolute inset-x-12 bottom-16 max-w-xl text-white">
            <div className="mt-6 h-px w-60 bg-white/40" />
            <h2 className="mt-8 text-6xl leading-tight text-white dm-serif-text-regular-italic">
              <span className="block whitespace-nowrap">Get Your Knowledge Base</span>
              <span className="block whitespace-nowrap">Vectorized</span>
            </h2>
            <p className="mt-5 text-sm text-white/80 dm-serif-text-regular">
              You can unlock the true potential of your knowledge when you organize, vectorize, and let intelligence do the rest.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:basis-1/2 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <Link href="/" className="inline-block">
                <span className="sr-only">Home</span>
                <CubeTransparentIcon aria-hidden="true" className="h-10 w-10 text-primary" />
              </Link>
              <h2 className="mt-8 text-4xl font-bold tracking-tight text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter your email and password to access your account.
              </p>
            </div>

            <div className="mt-10">
              <div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="username" className="block text-sm/6 font-medium text-gray-900">
                      Username
                    </label>
                    <div className="mt-2">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        className={fieldInputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                      Password
                    </label>
                    <div className="mt-2 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPwd ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        className={`${fieldInputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-6 shrink-0 items-center">
                        <div className="group grid size-4 grid-cols-1">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                        className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                          />
                          <svg
                            fill="none"
                            viewBox="0 0 14 14"
                            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                          >
                            <path
                              d="M3 8L6 11L11 3.5"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-checked:opacity-100"
                            />
                            <path
                              d="M3 7H11"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-indeterminate:opacity-100"
                            />
                          </svg>
                        </div>
                      </div>
                      <label htmlFor="remember-me" className="block text-sm/6 text-gray-900">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm/6">
                      <a href="#" className="font-semibold text-primary hover:opacity-90">
                        Forgot Password?
                      </a>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                  {error && <div className={alertStyles.error}>{error}</div>}

                </form>
                <p className="mt-8 text-center text-sm text-gray-500">
                  Don’t have an account?{" "}
                  <a className="font-semibold text-primary hover:opacity-90" href="#">
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
