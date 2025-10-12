"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChartBarIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import HealthLineChart from "@/components/HealthLineChart";
import {
  getToken,
  listDocuments,
  listChatSessions,
  type DocumentsListResponse,
  type DocumentSummary,
  type ChatSessionInfo,
} from "@/lib/api";
import { getHealthSummary, type HealthResult } from "@/lib/health";
import {
  cardSurfaceClass,
  heroSectionClass,
  heroTitleClass,
  heroSubtitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  alertStyles,
} from "@/styles/design";

type IconRenderer = (props: { className?: string }) => JSX.Element;

type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: IconRenderer;
};

type StatCard = {
  label: string;
  value: string;
  accent: string;
  delta?: string;
  deltaLabel?: string;
};

type HealthCard = {
  key: string;
  label: string;
  ok: boolean | null;
  status: string;
  detail: string;
  color: string;
};

type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  type: string;
  time: string;
  timestamp: number;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Add Source",
    description: "Ingest files, web pages, or APIs.",
    href: "/dashboard/vectorize",
    icon: (props) => <CloudArrowUpIcon {...props} />,
  },
  {
    label: "New Assistant",
    description: "Create a tailored AI assistant.",
    href: "/dashboard/settings",
    icon: (props) => <Cog6ToothIcon {...props} />,
  },
  {
    label: "Run Health Scan",
    description: "Trigger a new end-to-end check.",
    href: "/dashboard/health-check",
    icon: (props) => <BoltIcon {...props} />,
  },
];

const HEALTH_CARD_DEFINITIONS = [
  { key: "pinecone", label: "Vector DB" },
  { key: "openai", label: "Embeddings" },
  { key: "redis", label: "Redis Cache" },
  { key: "storage", label: "Object Storage" },
] as const;

const DEFAULT_USAGE_SERIES = [56, 72, 81, 68, 94, 83, 109, 116, 132, 144, 131, 140];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const RELATIVE_FORMATTER = typeof Intl !== "undefined"
  ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  : null;

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (RELATIVE_FORMATTER) {
    if (absDiff >= day) {
      return RELATIVE_FORMATTER.format(-Math.round(diffMs / day), "day");
    }
    if (absDiff >= hour) {
      return RELATIVE_FORMATTER.format(-Math.round(diffMs / hour), "hour");
    }
    if (absDiff >= minute) {
      return RELATIVE_FORMATTER.format(-Math.round(diffMs / minute), "minute");
    }
    return RELATIVE_FORMATTER.format(0, "minute");
  }
  return date.toLocaleString();
}

function extractLatency(result?: HealthResult): number | null {
  if (!result?.raw) return null;
  const raw = result.raw as Record<string, any>;
  const candidates = [
    raw.latency,
    raw.latency_ms,
    raw.average_latency,
    raw.avg_latency_ms,
    raw.response_time_ms,
    raw.avg_response_time,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    if (typeof candidate === "number" && !Number.isNaN(candidate)) {
      return Math.round(candidate);
    }
    if (typeof candidate === "object") {
      for (const key of ["average", "avg", "p50", "median", "value"]) {
        const value = candidate[key];
        if (typeof value === "number" && !Number.isNaN(value)) {
          return Math.round(value);
        }
      }
    }
  }
  if (typeof result.status === "number" && !Number.isNaN(result.status)) {
    return Math.round(result.status);
  }
  return null;
}

function documentsUploadedLast24h(documents: DocumentSummary[]): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return documents.filter((doc) => {
    const ts =
      parseDate(doc.client_upload_timestamp || doc.metadata?.client_upload_timestamp || doc.metadata?.upload_timestamp);
    return ts ? now - ts.getTime() <= dayMs : false;
  }).length;
}

function sourcesAddedLast24h(documents: DocumentSummary[]): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const set = new Set<string>();
  documents.forEach((doc) => {
    const ts =
      parseDate(doc.client_upload_timestamp || doc.metadata?.client_upload_timestamp || doc.metadata?.upload_timestamp);
    if (!ts || now - ts.getTime() > dayMs) return;
    (doc.source_links || []).forEach((link) => {
      if (link) set.add(link);
    });
  });
  return set.size;
}

function groupSessionsByDay(sessions: ChatSessionInfo[], days: number): number[] {
  const output = Array.from({ length: days }, () => 0);
  if (!sessions.length) return output;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const dayMs = 24 * 60 * 60 * 1000;
  sessions.forEach((session) => {
    const ts = parseDate(session.last_activity || session.created_at || session.metadata?.last_activity);
    if (!ts) return;
    if (ts < start) return;
    const index = Math.floor((ts.getTime() - start.getTime()) / dayMs);
    if (index >= 0 && index < days) {
      output[index] += 1;
    }
  });
  return output;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docData, setDocData] = useState<DocumentsListResponse | null>(null);
  const [sessions, setSessions] = useState<ChatSessionInfo[] | null>(null);
  const [healthData, setHealthData] = useState<Record<string, HealthResult>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Missing authentication token. Please log in again.");
      }
      const [documents, sessionList, healthSummary] = await Promise.all([
        listDocuments(token, { limit: 1000 }),
        listChatSessions(token, { limit: 1000 }),
        getHealthSummary(true),
      ]);
      setDocData(documents);
      setSessions(sessionList);
      setHealthData(healthSummary);
      setLastUpdated(new Date());
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards: StatCard[] = useMemo(() => {
    const documents = docData?.documents ?? [];
    const totalDocuments = docData?.total_documents ?? null;
    const uniqueSources = new Set<string>();
    documents.forEach((doc) => {
      (doc.source_links || []).forEach((link) => {
        if (link) uniqueSources.add(link);
      });
    });
    const newDocs = documentsUploadedLast24h(documents);
    const newSources = sourcesAddedLast24h(documents);
    const sessionList = sessions ?? [];
    const sessions24h = sessionList.filter((session) => {
      const ts = parseDate(session.last_activity || session.created_at);
      if (!ts) return false;
      return Date.now() - ts.getTime() <= 24 * 60 * 60 * 1000;
    }).length;
    const avgLatency = extractLatency(healthData?.api) ?? null;

    return [
      {
        label: "Active Sources",
        value: uniqueSources.size ? uniqueSources.size.toLocaleString() : "--",
        accent: "border-emerald-400 text-emerald-600",
        delta: newSources ? `+${newSources}` : undefined,
        deltaLabel: newSources ? "new 24h" : undefined,
      },
      {
        label: "Documents Indexed",
        value: totalDocuments != null ? totalDocuments.toLocaleString() : "--",
        accent: "border-primary text-primary",
        delta: newDocs ? `+${newDocs}` : undefined,
        deltaLabel: newDocs ? "24h" : undefined,
      },
      {
        label: "Avg Response Time",
        value: avgLatency != null ? `${avgLatency.toLocaleString()} ms` : "--",
        accent: "border-indigo-400 text-indigo-600",
      },
      {
        label: "Assistant Sessions",
        value: sessionList.length ? sessionList.length.toLocaleString() : "--",
        accent: "border-amber-400 text-amber-600",
        delta: sessions24h ? `+${sessions24h}` : undefined,
        deltaLabel: sessions24h ? "24h" : undefined,
      },
    ];
  }, [docData, sessions, healthData]);

  const healthCards: HealthCard[] = useMemo(() => {
    return HEALTH_CARD_DEFINITIONS.map(({ key, label }) => {
      const result = healthData?.[key];
      const ok = result?.ok ?? null;
      const status = result?.status ?? (result ? (result.ok ? "healthy" : "degraded") : "unknown");
      const timestamp = result?.timestamp ? parseDate(result.timestamp) : null;
      const detail =
        result?.error ||
        result?.raw?.message ||
        (timestamp ? `Updated ${timestamp.toLocaleTimeString()}` : "Awaiting data");
      return {
        key,
        label,
        ok,
        status: status.toString(),
        detail,
        color: ok === null ? "bg-gray-400" : ok ? "bg-emerald-500" : "bg-amber-500",
      };
    });
  }, [healthData]);

  const overallHealthLabel = useMemo(() => {
    if (!healthCards.length) return "Unknown";
    if (healthCards.some((card) => card.ok === false)) return "Attention";
    if (healthCards.some((card) => card.ok === null)) return "Syncing";
    return "Stable";
  }, [healthCards]);

  const usageSeries = useMemo(() => {
    if (!sessions?.length) return DEFAULT_USAGE_SERIES;
    const grouped = groupSessionsByDay(sessions, 14);
    return grouped.every((value) => value === 0) ? DEFAULT_USAGE_SERIES : grouped;
  }, [sessions]);

  const usageSummary = useMemo(() => {
    const peak = Math.max(...usageSeries);
    const last = usageSeries[usageSeries.length - 1] ?? 0;
    const prev = usageSeries[usageSeries.length - 2] ?? 0;
    const diff = last - prev;
    const deltaText =
      diff === 0 ? "No change vs previous day" : `${diff > 0 ? "+" : ""}${diff} vs previous day`;
    return {
      peakText: `Peak ${peak.toLocaleString()} requests`,
      deltaText,
    };
  }, [usageSeries]);

  const activities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    const pushDocActivities = () => {
      const documents = docData?.documents ?? [];
      documents.forEach((doc) => {
        const timestamp =
          parseDate(doc.client_upload_timestamp || doc.metadata?.client_upload_timestamp || doc.metadata?.upload_timestamp);
        if (!timestamp) return;
        items.push({
          id: `doc-${doc.document_id}`,
          actor: doc.author || doc.metadata?.author || doc.metadata?.Author || "Pipeline",
          action: `Indexed ${doc.document_name || doc.document_id}`,
          type: "Ingestion",
          time: formatRelative(timestamp),
          timestamp: timestamp.getTime(),
        });
      });
    };

    const pushSessionActivities = () => {
      (sessions ?? []).forEach((session) => {
        const timestamp = parseDate(session.last_activity || session.created_at);
        if (!timestamp) return;
        items.push({
          id: `session-${session.session_id}`,
          actor: session.metadata?.agent || "Assistant",
          action: `Handled session ${session.session_id}`,
          type: "Assistant",
          time: formatRelative(timestamp),
          timestamp: timestamp.getTime(),
        });
      });
    };

    const pushHealthActivities = () => {
      Object.entries(healthData).forEach(([key, result]) => {
        if (!result?.timestamp) return;
        const timestamp = parseDate(result.timestamp);
        if (!timestamp) return;
        items.push({
          id: `health-${key}`,
          actor: key.toUpperCase(),
          action: `Status ${result.status || (result.ok ? "healthy" : "unavailable")}`,
          type: "Health",
          time: formatRelative(timestamp),
          timestamp: timestamp.getTime(),
        });
      });
    };

    pushDocActivities();
    pushSessionActivities();
    pushHealthActivities();

    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
  }, [docData, sessions, healthData]);

  return (
    <div className="min-h-screen bg-background/95">
      <main className="flex flex-col gap-10 pb-16 pt-10">
        <header className={heroSectionClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">Welcome back</p>
                <h1 className={heroTitleClass}>
                  Your Vectorized Knowledge Universe
                </h1>
                <p className={heroSubtitleClass}>
                  Keep an eye on ingestion, systems health, and engagement all inside a responsive, bento-inspired
                  workspace.
                </p>
              </div>
              {lastUpdated && (
                <p className="text-xs text-secondary/50">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={loadDashboard}
                className={secondaryButtonClass}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <BoltIcon className="h-4 w-4" />
                    Refresh metrics
                  </>
                )}
              </button>
              <Link
                href="/dashboard/settings"
                className={primaryButtonClass}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                Configure
              </Link>
            </div>
          </div>
        </header>

        {loadError && <div className={alertStyles.error}>{loadError}</div>}

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="grid gap-6 xl:col-span-2 md:grid-cols-2">
            {statCards.map((stat) => (
              <div key={stat.label} className={`${cardSurfaceClass} overflow-hidden`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary/60">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-secondary">
                      {loading ? (
                        <span className="inline-block h-8 w-24 animate-pulse rounded bg-secondary/10" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  {stat.delta && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stat.accent}`}>
                      {stat.delta}{" "}
                      {stat.deltaLabel && (
                        <span className="font-normal text-secondary/60">{stat.deltaLabel}</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-4 h-[3px] w-full rounded-full bg-secondary/10">
                  <div className="h-full w-2/3 rounded-full bg-primary/60" />
                </div>
              </div>
            ))}
          </div>
          <div className={`${cardSurfaceClass} xl:col-span-1`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary">Systems Health</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {overallHealthLabel}
              </span>
            </div>
            <ul className="mt-6 space-y-4">
              {healthCards.map((service) => (
                <li key={service.key} className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-3">
                  <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${service.color}`} />
                  <div>
                    <p className="text-sm font-semibold text-secondary">{service.label}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">
                      {service.status}
                    </p>
                    <p className="mt-1 text-xs text-secondary/65">{service.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className={`${cardSurfaceClass} min-h-[260px]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary/60">Usage Stats</p>
                <h2 className="mt-2 text-lg font-semibold text-secondary">Assistant Interactions (14 days)</h2>
              </div>
              <ChartBarIcon className="h-6 w-6 text-primary/60" />
            </div>
            <div className="mt-6 h-48">
              <HealthLineChart points={usageSeries} color="#06337b" />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-secondary/60">
              <span>{usageSummary.peakText}</span>
              <span>{usageSummary.deltaText}</span>
            </div>
          </div>
          <div className={`${cardSurfaceClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary">Quick Actions</h2>
              <Squares2X2Icon className="h-5 w-5 text-primary/60" />
            </div>
            <div className="space-y-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 transition hover:border-primary/30 hover:bg-primary/10"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <action.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-secondary group-hover:text-primary">{action.label}</p>
                    <p className="text-xs text-secondary/65">{action.description}</p>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={`${cardSurfaceClass} overflow-hidden`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-secondary">Recent Activities</h2>
            <Link
              href="/dashboard/vectorize"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View detailed logs
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.25em] text-secondary/50">
                <tr>
                  <th className="py-3 pr-6">Actor</th>
                  <th className="py-3 pr-6">Action</th>
                  <th className="py-3 pr-6">Type</th>
                  <th className="py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-secondary/80">
                {!activities.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-secondary/60">
                      {loading ? "Loading activity feed..." : "No recent activity recorded."}
                    </td>
                  </tr>
                )}
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-secondary/5">
                    <td className="py-4 pr-6 font-semibold text-secondary">{activity.actor}</td>
                    <td className="py-4 pr-6">{activity.action}</td>
                    <td className="py-4 pr-6">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {activity.type}
                      </span>
                    </td>
                    <td className="py-4 text-right text-xs uppercase tracking-[0.2em] text-secondary/60">
                      {activity.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
