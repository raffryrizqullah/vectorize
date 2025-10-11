"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getApiHealth,
  getOpenAIHealth,
  getPineconeHealth,
  getRedisHealthDeep,
  getDatabaseHealthDeep,
  getStorageHealthDeep,
  getAggregateHealth,
  getHealthSummary,
  type HealthResult,
} from "@/lib/health";
import { ServerIcon, BoltIcon, CircleStackIcon, CloudIcon, CubeIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
const HealthLineChart = dynamic(() => import("@/components/HealthLineChart"), { ssr: false });

type CardKey = "api" | "pinecone" | "openai" | "redis" | "database" | "storage";
type Card = { key: CardKey; title: string; fetcher: () => Promise<HealthResult>; icon: (props: any) => JSX.Element };

const CARDS: Card[] = [
  { key: "api", title: "API Service", fetcher: getApiHealth, icon: ServerIcon },
  { key: "pinecone", title: "Pinecone Vector DB", fetcher: getPineconeHealth, icon: CubeIcon },
  { key: "openai", title: "OpenAI Service", fetcher: getOpenAIHealth, icon: CpuChipIcon },
  { key: "redis", title: "Redis Cache (deep)", fetcher: getRedisHealthDeep, icon: BoltIcon },
  { key: "database", title: "Database (deep)", fetcher: getDatabaseHealthDeep, icon: CircleStackIcon },
  { key: "storage", title: "Storage (deep)", fetcher: getStorageHealthDeep, icon: CloudIcon },
];

function StatusDot({ state }: { state: "ok" | "down" | "unknown" }) {
  const color = state === "ok" ? "bg-green-500" : state === "down" ? "bg-red-500" : "bg-gray-400";
  return <span className={`inline-block size-2 rounded-full ${color}`} aria-hidden />;
}

// Tiny inline sparkline using SVG
function Sparkline({ points, height = 24, stroke = "#0414d7" }: { points: number[]; height?: number; stroke?: string }) {
  if (!points || points.length === 0) return null;
  const w = Math.max(60, points.length * 10);
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const stepX = w / (points.length - 1 || 1);
  const d = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="text-primary">
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
}

// Minimal donut chart for last 24h distribution
function Donut({ healthy, unhealthy, config }: { healthy: number; unhealthy: number; config: number }) {
  const total = Math.max(1, healthy + unhealthy + config);
  const r = 18;
  const c = 2 * Math.PI * r;
  const seg = (v: number) => (v / total) * c;
  const g = seg(healthy);
  const u = seg(unhealthy);
  const conf = seg(config);
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <g transform="translate(24,24)">
        <circle r={r} cx={0} cy={0} fill="transparent" stroke="#e5e7eb" strokeWidth={8} />
        <circle r={r} cx={0} cy={0} fill="transparent" stroke="#22c55e" strokeWidth={8} strokeDasharray={`${g} ${c - g}`} strokeDashoffset={c * 0.25} />
        <circle r={r} cx={0} cy={0} fill="transparent" stroke="#ef4444" strokeWidth={8} strokeDasharray={`${u} ${c - u}`} strokeDashoffset={c * 0.25 - g} />
        <circle r={r} cx={0} cy={0} fill="transparent" stroke="#f59e0b" strokeWidth={8} strokeDasharray={`${conf} ${c - conf}`} strokeDashoffset={c * 0.25 - g - u} />
      </g>
    </svg>
  );
}

export default function HealthCheckPage() {
  const [results, setResults] = useState<Record<string, HealthResult>>({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [latency, setLatency] = useState<Record<string, number[]>>({});
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [deep, setDeep] = useState<boolean>(true);

  // Load cached health once on mount; avoid auto API calls
  useEffect(() => {
    try {
      const raw = localStorage.getItem("health_cache");
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (cached?.data) setResults(cached.data);
      if (cached?.ts) setLastRefresh(cached.ts);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Prefer new summary endpoint
    const t0 = performance.now();
    const summary = await getHealthSummary(deep);
    const msSummary = Math.round(performance.now() - t0);

    // First try to fetch aggregate (legacy) and merge
    const aggregate = Object.keys(summary).length ? summary : await getAggregateHealth();
    const initialKeys = new Set(Object.keys(aggregate));

    // For cards not in aggregate, fetch individually and capture latency
    const missingCards = CARDS.filter((c) => !initialKeys.has(c.key));
    const fetchedMissing = await Promise.all(
      missingCards.map(async (c) => {
        const t0 = performance.now();
        const res = await c.fetcher();
        const ms = Math.round(performance.now() - t0);
        const k = `health_latency_${c.key}`;
        const prev = JSON.parse(localStorage.getItem(k) || "[]");
        const arr = [...prev, ms].slice(-10);
        localStorage.setItem(k, JSON.stringify(arr));
        return [c.key, res] as const;
      }),
    );

    const combined = { ...aggregate, ...Object.fromEntries(fetchedMissing) } as Record<string, HealthResult>;
    setResults(combined);

    // Load latency history for all cards from localStorage
    const newLatency: Record<string, number[]> = {};
    for (const c of CARDS) {
      const k = `health_latency_${c.key}`;
      let arr = JSON.parse(localStorage.getItem(k) || "[]");
      // If the service came from summary in this run, push msSummary
      if (initialKeys.has(c.key)) {
        arr = [...arr, msSummary].slice(-10);
        localStorage.setItem(k, JSON.stringify(arr));
      }
      if (Array.isArray(arr)) newLatency[c.key] = arr;
    }
    setLatency(newLatency);

    // Cache combined result and timestamp
    const ts = new Date().toISOString();
    try { localStorage.setItem("health_cache", JSON.stringify({ data: combined, ts })); } catch {}
    setLastRefresh(ts);

    // Update 24h distribution sample in localStorage
    try {
      const now = Date.now();
      const bucket = Math.floor(now / (60 * 60 * 1000)); // hourly bucket
      const storeKey = "health_dist";
      const raw = JSON.parse(localStorage.getItem(storeKey) || "{}");
      // prune >24h
      for (const k of Object.keys(raw)) {
        if (Number(k) < bucket - 24) delete raw[k];
      }
      const curr = raw[bucket] || { healthy: 0, unhealthy: 0, config: 0 };
      const vals = Object.values(combined);
      const unhealthy = vals.filter((v) => v && !v.ok && v.status !== "unknown").length;
      const config = vals.filter((v) => /config|credential|permission|key/i.test(v?.error || "")).length;
      const healthy = vals.filter((v) => v?.ok).length;
      raw[bucket] = {
        healthy: (curr.healthy || 0) + healthy,
        unhealthy: (curr.unhealthy || 0) + unhealthy,
        config: (curr.config || 0) + config,
      };
      localStorage.setItem(storeKey, JSON.stringify(raw));
    } catch {}

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      refresh();
    }, 30000); // 30s
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const anyDown = useMemo(() =>
    Object.values(results).some((r) => r && (r.status === "down" || r.ok === false)),
  [results]);

  return (
    <div className="space-y-4">
      {anyDown && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          One or more services are down or unavailable. Try refresh.
        </div>
      )}

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Health Monitoring</h2>
          <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 rounded-md border border-gray-300 bg-white px-2 py-1">
            <input type="checkbox" className="size-4 rounded border-gray-300" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
            Deep mode
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 rounded-md border border-gray-300 bg-white px-2 py-1">
            <input type="checkbox" className="size-4 rounded border-gray-300" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto refresh (30s)
          </label>
            <button
              type="button"
              onClick={refresh}
            className="btn-primary"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

      <dl className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((c) => {
          const r = results[c.key];
          const state: "ok" | "down" | "unknown" = r ? (r.ok ? "ok" : (r.status === "unknown" ? "unknown" : "down")) : "unknown";
          return (
            <div key={c.key} className="relative overflow-hidden rounded-lg bg-background px-4 pt-5 pb-12 shadow-xs border border-gray-200 sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary p-3">
                  <c.icon aria-hidden className="size-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{c.title}</p>
              </dt>
              <dd className="ml-16 pb-6 sm:pb-7">
                <div className="flex items-center gap-2">
                  <StatusDot state={state} />
                  <p className="text-base font-semibold text-gray-900">{r?.status ?? "unknown"}</p>
                  {r?.version && <span className="text-xs text-gray-500">{r.version}</span>}
                  {c.key === "pinecone" && r?.raw?.index_exists !== undefined && (
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.raw.index_exists ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {r.raw.index_exists ? "index_exists" : "index_missing"}
                    </span>
                  )}
                  {c.key === "storage" && r?.raw?.bucket_accessible !== undefined && (
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.raw.bucket_accessible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {r.raw.bucket_accessible ? "bucket accessible" : "bucket error"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {r?.timestamp && (
                    <div>Timestamp: <span className="font-mono">{r.timestamp}</span></div>
                  )}
                  {r?.error && <div className="text-red-600">{r.error}</div>}
                </div>
                {Array.isArray(latency[c.key]) && latency[c.key].length > 0 && (
                  <div className="mt-2">
                    <HealthLineChart points={latency[c.key]} height={28} />
                    <div className="mt-1 text-[10px] text-gray-500">latency last {latency[c.key].length} checks (ms)</div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gray-50/60 px-4 py-3 sm:px-6">
                  <div className="text-xs text-gray-600">Last checked just now</div>
                </div>
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Summary row to avoid empty space and give quick glance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {(() => {
          const vals = Object.values(results);
          const healthy = vals.filter((v) => v?.ok).length;
          const down = vals.filter((v) => v && !v.ok && v.status !== "unknown").length;
          const config = vals.filter((v) => /config|credential|permission|key/i.test(v?.error || "")).length;
          const items = [
            { label: "Healthy", value: healthy, icon: ServerIcon },
            { label: "Down", value: down, icon: BoltIcon },
            { label: "Config", value: config, icon: CpuChipIcon },
          ];
          const donut = { healthy, unhealthy: down, config };
          return [
            ...items.map((it) => (
              <div key={it.label} className="relative overflow-hidden rounded-lg bg-background px-4 pt-5 pb-4 shadow-xs border border-gray-200 sm:px-6 sm:pt-6">
                <dt>
                  <div className="absolute rounded-md bg-primary p-3">
                    <it.icon aria-hidden className="size-6 text-white" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">{it.label}</p>
                </dt>
                <dd className="ml-16">
                  <p className="text-2xl font-semibold text-gray-900">{it.value}</p>
                  {lastRefresh && (
                    <div className="mt-1 text-xs text-gray-600">Last refresh: <span className="font-mono">{lastRefresh}</span></div>
                  )}
                </dd>
              </div>
            )),
            <div key="donut" className="relative overflow-hidden rounded-lg bg-background px-4 pt-5 pb-4 shadow-xs border border-gray-200 sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary p-3">
                  <CloudIcon aria-hidden className="size-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">Last 24h status</p>
              </dt>
              <dd className="ml-16 flex items-center gap-4">
                <Donut {...donut} />
                <div className="text-xs text-gray-600 space-y-1">
                  <div><span className="inline-block size-2 rounded-full bg-green-500 mr-2" />Healthy</div>
                  <div><span className="inline-block size-2 rounded-full bg-red-500 mr-2" />Down</div>
                  <div><span className="inline-block size-2 rounded-full bg-amber-500 mr-2" />Config</div>
                </div>
              </dd>
            </div>
          ];
        })()}
      </div>
    </div>
  );
}
