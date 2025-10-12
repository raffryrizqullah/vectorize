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
import { secondaryButtonClass, toggleInputClass } from "@/styles/design";
import dynamic from "next/dynamic";
const MagicBento = dynamic(() => import("@/components/MagicBento"), { ssr: false });
const CountUp = dynamic(() => import("@/components/CountUp"), { ssr: false });

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

  const latencyStats = useMemo(() => {
    const stats: Record<
      CardKey,
      { latest: number | null; average: number | null; min: number | null; max: number | null }
    > = {} as any;
    CARDS.forEach((c) => {
      const series = latency[c.key] ?? [];
      if (!series.length) {
        stats[c.key] = { latest: null, average: null, min: null, max: null };
        return;
      }
      const sum = series.reduce((acc, val) => acc + val, 0);
      stats[c.key] = {
        latest: series[series.length - 1] ?? null,
        average: Math.round(sum / series.length),
        min: Math.min(...series),
        max: Math.max(...series),
      };
    });
    return stats;
  }, [latency]);

  const cardsData = useMemo(() => {
    return CARDS.map((c) => {
      const r = results[c.key];
      const stat = latencyStats[c.key];
      const statusLabel = r ? (r.ok ? "Healthy" : r.status ?? "Unknown") : "Pending";
      const descriptionParts: string[] = [];
      if (r?.version) descriptionParts.push(`Version ${r.version}`);
      if (stat?.latest != null) descriptionParts.push(`Latency ${stat.latest}ms`);
      if (r?.timestamp) descriptionParts.push(new Date(r.timestamp).toLocaleTimeString());
      if (r?.error) descriptionParts.push(r.error);
      const description = descriptionParts.join(" | ") || "Awaiting recent health data.";
      const timestampText = r?.timestamp
        ? `Updated ${new Date(r.timestamp).toLocaleTimeString()}`
        : "Awaiting sample";
      const footerMeta = [statusLabel, r?.version ? `Version ${r.version}` : null].filter(Boolean).join(" | ");

      const body = (
        <div className="flex h-full flex-col gap-4 text-secondary">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-primary">{c.title}</h3>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">{timestampText}</p>
          </div>
          {stat?.latest != null ? (
            <div className="flex items-end gap-2 text-primary">
              <CountUp
                to={stat.latest}
                from={Math.max(0, stat.latest - 50)}
                duration={0.8}
                className="text-3xl font-bold tracking-tight"
              />
              <span className="pb-1 text-sm font-semibold text-secondary">ms</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-secondary">No latency data</span>
          )}
          <div className="grid grid-cols-3 gap-3 text-[11px] text-secondary/70">
            <div>
              <div className="font-semibold text-secondary">Avg</div>
              {stat?.average != null ? (
                <div className="flex items-end gap-1">
                  <CountUp to={stat.average} duration={0.9} className="font-medium text-secondary" />
                  <span className="text-[10px] uppercase text-secondary/50">ms</span>
                </div>
              ) : (
                <span>--</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-secondary">Min</div>
              {stat?.min != null ? (
                <div className="flex items-end gap-1">
                  <CountUp to={stat.min} duration={0.7} className="font-medium text-secondary" />
                  <span className="text-[10px] uppercase text-secondary/50">ms</span>
                </div>
              ) : (
                <span>--</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-secondary">Max</div>
              {stat?.max != null ? (
                <div className="flex items-end gap-1">
                  <CountUp to={stat.max} duration={1.05} className="font-medium text-secondary" />
                  <span className="text-[10px] uppercase text-secondary/50">ms</span>
                </div>
              ) : (
                <span>--</span>
              )}
            </div>
          </div>
          <div className="mt-auto text-[11px] text-secondary/60">{footerMeta || statusLabel}</div>
        </div>
      );

      return {
        color: "#ffffff",
        title: c.title,
        description,
        label: statusLabel,
        body,
      };
    });
  }, [results, latencyStats]);

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
            <label className="flex items-center gap-2 rounded-2xl border border-secondary/10 bg-secondary/5 px-3 py-2 text-sm text-secondary/70">
              <input
                type="checkbox"
                className={toggleInputClass}
                checked={deep}
                onChange={(e) => setDeep(e.target.checked)}
              />
              Deep mode
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-secondary/10 bg-secondary/5 px-3 py-2 text-sm text-secondary/70">
              <input
                type="checkbox"
                className={toggleInputClass}
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto refresh (30s)
            </label>
            <button
              type="button"
              onClick={refresh}
              className={secondaryButtonClass}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

      <div className="mt-6">
        <MagicBento
          cards={cardsData}
          glowColor="6, 51, 123"
          textAutoHide
          enableTilt
          enableMagnetism
          particleCount={10}
        />
      </div>
    </div>
  );
}
