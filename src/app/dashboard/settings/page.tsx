"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getToken,
  meRequest,
} from "@/lib/api";
import {
  AdjustmentsVerticalIcon,
  BellAlertIcon,
  CloudArrowDownIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  SparklesIcon,
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
  toggleInputClass,
} from "@/styles/design";

type PreferenceState = {
  theme: "system" | "light" | "dark";
  language: string;
  timezone: string;
  weeklyDigest: boolean;
  healthAlerts: boolean;
  chatTranscripts: boolean;
  autoIngest: boolean;
  autoUpdates: boolean;
  multiFactor: boolean;
  sessionTimeout: number;
};

const DEFAULT_PREFS: PreferenceState = {
  theme: "system",
  language: "en-US",
  timezone: "UTC",
  weeklyDigest: true,
  healthAlerts: true,
  chatTranscripts: false,
  autoIngest: false,
  autoUpdates: true,
  multiFactor: true,
  sessionTimeout: 30,
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<PreferenceState>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) throw new Error("Missing authentication token.");
        const current = await meRequest(token);
        const storedPrefs =
          current?.user?.preferences ??
          current?.preferences ??
          current?.user?.metadata?.preferences;
        if (storedPrefs && typeof storedPrefs === "object") {
          setPrefs((prev) => ({
            ...prev,
            ...storedPrefs,
          }));
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load preferences.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = (key: keyof PreferenceState) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: typeof prev[key] === "boolean" ? !prev[key] : prev[key],
    }));
  };

  const handleSelect = <K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      // Placeholder: integrate with PATCH endpoint when available.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMessage("Preferences saved. (No backend mutation performed yet.)");
    } catch (err: any) {
      setError(err?.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = useMemo(
    () => [
      { label: "System", value: "system" },
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
    ],
    [],
  );

  const timezoneOptions = useMemo(
    () => [
      "UTC",
      "Asia/Jakarta",
      "Asia/Singapore",
      "Europe/London",
      "America/Chicago",
      "America/Los_Angeles",
    ],
    [],
  );

  const languages = useMemo(
    () => [
      { label: "English", value: "en-US" },
      { label: "Bahasa Indonesia", value: "id-ID" },
      { label: "Deutsch", value: "de-DE" },
      { label: "日本語", value: "ja-JP" },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <header className={heroSectionClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">Preferences</p>
            <h1 className={`${heroTitleClass} mt-2`}>
              Tailor Your Workspace
            </h1>
            <p className={`${heroSubtitleClass} max-w-xl`}>
              Control the way Vectorize behaves for you. Update visual settings, alerts, and data management policies
              in one place.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPrefs(DEFAULT_PREFS)}
              className={secondaryButtonClass}
            >
              <SparklesIcon className="h-4 w-4" />
              Reset defaults
            </button>
            <button
              type="button"
              onClick={savePreferences}
              disabled={saving}
              className={primaryButtonClass}
            >
              {saving ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <AdjustmentsVerticalIcon className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {message && <div className={alertStyles.success}>{message}</div>}
      {error && <div className={alertStyles.error}>{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={`${cardSurfaceClass}`}>
          <h2 className="text-lg font-semibold text-secondary">General</h2>
          <p className="mt-2 text-sm text-secondary/70">
            Configure how the dashboard looks and behaves on your devices.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/50">
                Theme preference
              </label>
              <div className="mt-3 flex gap-2">
                {themeOptions.map((option) => {
                  const active = prefs.theme === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleSelect("theme", option.value)}
                      className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-secondary/10 bg-secondary/5 text-secondary/70 hover:border-primary/30"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/50">
                Interface language
              </label>
              <select
                value={prefs.language}
                onChange={(event) => handleSelect("language", event.target.value)}
                className="mt-3 w-full rounded-2xl border border-secondary/10 bg-secondary/5 px-4 py-3 text-sm text-secondary"
              >
                {languages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/50">
                Timezone
              </label>
              <select
                value={prefs.timezone}
                onChange={(event) => handleSelect("timezone", event.target.value)}
                className="mt-3 w-full rounded-2xl border border-secondary/10 bg-secondary/5 px-4 py-3 text-sm text-secondary"
              >
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/50">
                Session timeout (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={prefs.sessionTimeout}
                onChange={(event) => handleSelect("sessionTimeout", Number(event.target.value))}
                className="mt-3 w-full rounded-2xl border border-secondary/10 bg-secondary/5 px-4 py-3 text-sm text-secondary"
              />
              <p className="mt-2 text-xs text-secondary/60">
                After this period of inactivity users will be prompted to re-authenticate.
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardSurfaceClass}`}>
          <h2 className="text-lg font-semibold text-secondary">Automations</h2>
          <p className="mt-2 text-sm text-secondary/70">
            Control ingestion and update routines across your knowledge base.
          </p>
          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4">
              <input
                type="checkbox"
                checked={prefs.autoIngest}
                onChange={() => handleToggle("autoIngest")}
                className={toggleInputClass}
              />
              <span className="text-sm text-secondary/80">
                Automatically ingest files dropped into synced cloud folders.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4">
              <input
                type="checkbox"
                checked={prefs.autoUpdates}
                onChange={() => handleToggle("autoUpdates")}
                className={toggleInputClass}
              />
              <span className="text-sm text-secondary/80">
                Enable silent updates for the Vectorize CLI and ingestion agents.
              </span>
            </label>
            <div className="rounded-2xl border border-secondary/10 bg-secondary/5 p-4 text-xs text-secondary/60">
              <p>
                Automations can be fine tuned per-source from the{" "}
                <Link href="/dashboard/vectorize" className="text-primary underline-offset-2 hover:underline">
                  Vectorize centre
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className={`${cardSurfaceClass}`}>
          <h2 className="text-lg font-semibold text-secondary">Notifications</h2>
          <p className="mt-2 text-sm text-secondary/70">
            Decide how Vectorize keeps you in the loop about ingestion and outages.
          </p>
          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4">
              <input
                type="checkbox"
                checked={prefs.weeklyDigest}
                onChange={() => handleToggle("weeklyDigest")}
                className={toggleInputClass}
              />
              <span>
                <span className="block text-sm font-semibold text-secondary">Weekly insights digest</span>
                <span className="mt-1 block text-xs text-secondary/60">
                  Summarise new documents, clusters, and agent handoffs each Friday.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4">
              <input
                type="checkbox"
                checked={prefs.healthAlerts}
                onChange={() => handleToggle("healthAlerts")}
                className={toggleInputClass}
              />
              <span>
                <span className="block text-sm font-semibold text-secondary">Realtime health alerts</span>
                <span className="mt-1 block text-xs text-secondary/60">
                  Receive a push notification if ingestion or vector DB health drops below threshold.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4">
              <input
                type="checkbox"
                checked={prefs.chatTranscripts}
                onChange={() => handleToggle("chatTranscripts")}
                className={toggleInputClass}
              />
              <span>
                <span className="block text-sm font-semibold text-secondary">Assistant transcript recap</span>
                <span className="mt-1 block text-xs text-secondary/60">
                  Send a focused recap for assistant sessions that exceeded 10 minutes.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className={`${cardSurfaceClass}`}>
          <h2 className="text-lg font-semibold text-secondary">Security controls</h2>
          <p className="mt-2 text-sm text-secondary/70">
            Fine tune MFA and alerting for your account. Organisation-wide policies apply automatically.
          </p>
          <div className="mt-6 space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-secondary/5 px-4 py-3">
              <span className="text-sm text-secondary/80">Require multi-factor authentication</span>
              <input
                type="checkbox"
                checked={prefs.multiFactor}
                onChange={() => handleToggle("multiFactor")}
                className={`${toggleInputClass} mt-0`}
              />
            </label>
            <div className="rounded-2xl border border-secondary/10 bg-secondary/5 p-4 text-xs text-secondary/60">
              <p className="flex items-start gap-2">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 text-primary" />
                Enforcement is managed by your workspace admin. Use the security centre to issue recovery codes or lock
                access in emergencies.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
              <p className="flex items-start gap-2">
                <ShieldExclamationIcon className="mt-0.5 h-4 w-4" />
                Remember to rotate API keys after resetting security settings.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-secondary/5 p-4 text-xs text-secondary/60">
            <p className="flex items-start gap-2">
              <LockClosedIcon className="mt-0.5 h-4 w-4 text-primary" />
              Session timeout currently set to {prefs.sessionTimeout} minutes. You can increase the limit from admin
              policies if you require longer-running consoles.
            </p>
          </div>
        </div>
      </section>

      <section className={`${cardSurfaceClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-secondary">Data export</h2>
            <p className="text-sm text-secondary/70">
              Generate exports of your profile metadata, automation policies, and assistant transcripts.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10"
          >
            <CloudArrowDownIcon className="h-4 w-4" />
            Request export
          </button>
        </div>
        <div className="mt-6 text-xs text-secondary/60">
          <p>
            Exports are prepared asynchronously. You will be notified via email once your archive is ready to download.
            All generated archives expire in 7 days.
          </p>
        </div>
      </section>

      {loading && (
        <div className={loadingToastClass}>
          <span className="size-3 animate-spin rounded-full border-2 border-secondary/60 border-t-transparent" />
          Loading personal settings…
        </div>
      )}
    </div>
  );
}
