"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getToken,
  meRequest,
  listDocuments,
  type DocumentsListResponse,
} from "@/lib/api";
import {
  AcademicCapIcon,
  EnvelopeIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  SparklesIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import {
  cardSurfaceClass,
  heroSectionClass,
  heroTitleClass,
  heroSubtitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  alertStyles,
  loadingToastClass,
  mutedBadgeClass,
} from "@/styles/design";

type NormalizedUser = {
  username: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  createdAt?: string;
  metadata?: Record<string, any> | null;
};

type ProfileState = "idle" | "loading" | "error" | "ready";

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>("idle");
  const [userPayload, setUserPayload] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setState("loading");
      setError(null);
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Missing authentication token.");
        }
        const [userResponse, docs] = await Promise.all([
          meRequest(token),
          listDocuments(token, { limit: 2000 }),
        ]);
        setUserPayload(userResponse);
        setDocuments(docs);
        setState("ready");
      } catch (err: any) {
        setError(err?.message || "Failed to load profile information.");
        setState("error");
      }
    };
    fetchProfile();
  }, []);

  const user: NormalizedUser | null = useMemo(() => {
    if (!userPayload) return null;
    const raw = userPayload.user ?? userPayload;
    return {
      username: raw?.username ?? "Unknown",
      fullName: raw?.full_name ?? raw?.name ?? raw?.username ?? "No Name",
      email: raw?.email ?? "—",
      role: (raw?.role ?? raw?.user_role ?? "member").toString(),
      active: Boolean(raw?.is_active ?? true),
      createdAt: raw?.created_at ?? raw?.joined_at ?? raw?.createdAt,
      metadata: raw?.metadata ?? null,
    };
  }, [userPayload]);

  const documentSummary = useMemo(() => {
    if (!documents) {
      return { total: 0, recent: 0, namespaces: 0 };
    }
    const docs = documents.documents ?? [];
    const total = documents.total_documents ?? docs.length;
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = docs.filter((doc) => {
      const ts =
        doc.client_upload_timestamp ||
        doc.metadata?.client_upload_timestamp ||
        doc.metadata?.upload_timestamp;
      if (!ts) return false;
      const parsed = new Date(ts);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() >= recentThreshold;
    }).length;
    const namespaces = new Set<string>();
    docs.forEach((doc) => {
      const namespace =
        doc.metadata?.namespace ??
        doc.metadata?.collection ??
        doc.metadata?.category ??
        "default";
      if (typeof namespace === "string") namespaces.add(namespace);
    });
    return { total, recent, namespaces: namespaces.size };
  }, [documents]);

  const profileBadges = useMemo(() => {
    if (!user) return [];
    const badges = [
      {
        label: user.role,
        tone: "text-primary bg-primary/10 border border-primary/10",
      },
      {
        label: user.active ? "Active" : "Suspended",
        tone: user.active
          ? "text-emerald-700 bg-emerald-100 border border-emerald-200"
          : "text-amber-700 bg-amber-100 border border-amber-200",
      },
    ];
    const metadataBadges =
      user.metadata && typeof user.metadata === "object"
        ? Object.entries(user.metadata)
            .slice(0, 3)
            .map(([key, value]) => ({
              label: `${key}: ${String(value)}`,
              tone: "text-secondary bg-secondary/10 border border-secondary/10",
            }))
        : [];
    return [...badges, ...metadataBadges];
  }, [user]);

  const timelineItems = useMemo(() => {
    const items = [];
    if (user?.createdAt) {
      const joined = new Date(user.createdAt);
      if (!Number.isNaN(joined.getTime())) {
        items.push({
          icon: <ClockIcon className="h-4 w-4 text-primary" />,
          title: "Joined the platform",
          time: joined.toLocaleString(),
          description: `Account created on ${joined.toLocaleDateString()}`,
        });
      }
    }
    if (documents?.documents?.length) {
      const latestDoc = documents.documents
        .map((doc) => ({
          ts:
            doc.client_upload_timestamp ||
            doc.metadata?.client_upload_timestamp ||
            doc.metadata?.upload_timestamp,
          name: doc.document_name ?? doc.document_id,
        }))
        .filter((item) => item.ts)
        .sort((a, b) => new Date(b.ts as string).getTime() - new Date(a.ts as string).getTime())[0];
      if (latestDoc) {
        items.push({
          icon: <SparklesIcon className="h-4 w-4 text-secondary" />,
          title: "Most recent ingestion",
          time: new Date(latestDoc.ts as string).toLocaleString(),
          description: latestDoc.name,
        });
      }
    }
    return items;
  }, [user?.createdAt, documents]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={`${heroSectionClass} py-6`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                <UserCircleIcon className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <div>
                  <h1 className={heroTitleClass}>
                    {user?.fullName || "Loading profile…"}
                  </h1>
                  <p className="text-sm text-secondary/70">
                    @{user?.username || "—"} · {user?.email || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className={`${secondaryButtonClass} justify-center px-5`}
              >
                <ShieldCheckIcon className="h-4 w-4" />
                Manage security
              </button>
              <button
                type="button"
                className={`${primaryButtonClass} justify-center px-5`}
              >
                <AcademicCapIcon className="h-4 w-4" />
                Edit profile
              </button>
            </div>
          </div>
        </section>

        <section className={`${cardSurfaceClass} min-h-[220px]`}>
          <h2 className="text-lg font-semibold text-secondary">Contribution Overview</h2>
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary/60">
                Documents Indexed
              </p>
              <p className="mt-2 text-2xl font-semibold text-secondary">
                {documents ? documentSummary.total.toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-xs text-secondary/60">
                {documentSummary.recent
                  ? `${documentSummary.recent} in the last 7 days`
                  : "No recent uploads"}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary/60">
                Namespaces
              </p>
              <p className="mt-2 text-xl font-semibold text-secondary">
                {documents ? documentSummary.namespaces : "—"}
              </p>
              <p className="mt-1 text-xs text-secondary/60">Active collection spaces you contribute to</p>
            </div>
          </div>
        </section>
      </div>

      {error && <div className={alertStyles.error}>{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className={`${cardSurfaceClass}`}>
          <h3 className="text-lg font-semibold text-secondary">Contact & Access</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">Email</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                <EnvelopeIcon className="h-4 w-4 text-primary" />
                <span>{user?.email || "Not set"}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">Role</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                <ShieldCheckIcon className="h-4 w-4 text-primary" />
                <span className="capitalize">{user?.role || "—"}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">Location</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                <MapPinIcon className="h-4 w-4 text-primary" />
                <span>
                  {user?.metadata?.location ? (
                    user.metadata.location
                  ) : (
                    <span className={mutedBadgeClass}>Belum diisi</span>
                  )}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">Direct Contact</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                <PhoneIcon className="h-4 w-4 text-primary" />
                <span>
                  {user?.metadata?.phone ? (
                    user.metadata.phone
                  ) : (
                    <span className={mutedBadgeClass}>Belum diisi</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <hr className="my-6 border-dashed border-secondary/10" />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-secondary">Teams & Spaces</h4>
              <p className="mt-2 text-sm text-secondary/70">
                {user?.metadata?.teams
                  ? Array.isArray(user.metadata.teams)
                    ? user.metadata.teams.join(", ")
                    : String(user.metadata.teams)
                  : "Assign this member to collaboration spaces to organise permissions."}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-secondary">Automation tokens</h4>
              <p className="mt-2 text-sm text-secondary/70">
                Manage API keys and personal tokens from the{" "}
                <Link href="/dashboard/api-key" className="text-primary underline-offset-2 hover:underline">
                  API Key centre
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardSurfaceClass}`}>
          <h3 className="text-lg font-semibold text-secondary">Activity Timeline</h3>
          <ul className="mt-6 space-y-4">
            {!timelineItems.length && (
              <li className="rounded-2xl bg-secondary/5 p-4 text-sm text-secondary/70">
                No tracked activity yet. Start ingesting documents or answering questions.
              </li>
            )}
            {timelineItems.map((item, index) => (
              <li key={`${item.title}-${index}`} className="rounded-2xl bg-secondary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-secondary">{item.title}</p>
                    <p className="text-xs text-secondary/50">{item.time}</p>
                    <p className="mt-2 text-sm text-secondary/70">{item.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${cardSurfaceClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary">Security snapshot</h3>
            <p className={heroSubtitleClass}>
              Review MFA, tokens, and policy compliance for this account.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10"
          >
            View access logs
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-secondary/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">MFA Status</p>
            <p className="mt-2 text-sm font-semibold text-secondary">
              {user?.metadata?.mfa_enabled ? "Enabled" : "Not enrolled"}
            </p>
            <p className="mt-1 text-xs text-secondary/60">
              {user?.metadata?.mfa_enabled
                ? "Recovery codes issued"
                : "Encourage this member to enable multi-factor auth."}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">API Keys</p>
            <p className="mt-2 text-sm font-semibold text-secondary">
              {user?.metadata?.api_keys ?? 0} active
            </p>
            <p className="mt-1 text-xs text-secondary/60">
              Rotate keys regularly to maintain compliance.
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/50">Last password update</p>
            <p className="mt-2 text-sm font-semibold text-secondary">
              {user?.metadata?.password_changed_at ? (
                new Date(user.metadata.password_changed_at).toLocaleDateString()
              ) : (
                <span className={mutedBadgeClass}>Belum diketahui</span>
              )}
            </p>
            <p className="mt-1 text-xs text-secondary/60">Ensure password is rotated every 90 days.</p>
          </div>
        </div>
      </section>
      {state === "loading" && (
        <div className={loadingToastClass}>
          <span className="size-3 animate-spin rounded-full border-2 border-secondary/60 border-t-transparent" />
          Memuat data profil…
        </div>
      )}
    </div>
  );
}
