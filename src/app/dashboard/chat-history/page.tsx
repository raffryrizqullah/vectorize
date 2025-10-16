"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearChatHistory,
  getChatHistory,
  getChatSessionMeta,
  getToken,
  listChatSessions,
  meRequest,
  type ChatHistoryMessage,
  type ChatHistoryResult,
  type ChatSessionInfo,
} from "@/lib/api";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { isAdminRole, normalizeRoleValue } from "@/lib/roles";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatTtl(ttl?: number | null) {
  if (ttl === null || ttl === undefined) return "Expired";
  if (ttl <= 0) return "Expired";
  const hours = Math.floor(ttl / 3600);
  const minutes = Math.floor((ttl % 3600) / 60);
  const seconds = ttl % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes) parts.push(`${seconds}s`);
  return parts.join(" ") || `${seconds}s`;
}

type HistoryState = {
  loading: boolean;
  error: string | null;
  data: ChatHistoryResult | null;
};

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [manualSessionId, setManualSessionId] = useState("");
  const [historyState, setHistoryState] = useState<HistoryState>({ loading: false, error: null, data: null });
  const [sessionMeta, setSessionMeta] = useState<ChatSessionInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const refreshSessions = useCallback(
    async (preserveSelected: string | null = selectedSessionId) => {
      setSessionsLoading(true);
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Administrator or super administrator token not found. Please log in again.");
        }
        const normalizedRole = currentRole ?? null;
        if (normalizedRole && !isAdminRole(normalizedRole)) {
          throw new Error("Only administrator or super administrator roles can access the session list.");
        }
        setSessionsError(null);
        const data = await listChatSessions(token, { limit: 200, actorRole: normalizedRole });
        const sorted = [...data].sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""));
        if (preserveSelected && !sorted.some((item) => item.session_id === preserveSelected)) {
          sorted.unshift({ session_id: preserveSelected });
        }
        setSessions(sorted);
      } catch (err: any) {
        setSessions([]);
        setSessionsError(err?.message || "Failed to load session list.");
      } finally {
        setSessionsLoading(false);
      }
    },
    [currentRole, selectedSessionId],
  );

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setCurrentRole(null);
      setSessionsError("Administrator or super administrator token not found. Please log in again.");
      setRoleLoaded(true);
      return undefined;
    }
    meRequest(token)
      .then((me) => {
        if (cancelled) return;
        const normalizedRole = normalizeRoleValue(me?.role ?? me?.user?.role);
        setCurrentRole(normalizedRole);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCurrentRole(null);
        setSessionsError(err?.message || "Failed to verify account role.");
      })
      .finally(() => {
        if (cancelled) return;
        setRoleLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roleLoaded) return;
    refreshSessions();
  }, [roleLoaded, refreshSessions]);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    setHistoryState({ loading: true, error: null, data: null });
    setSessionMeta(null);
    try {
      const [history, meta] = await Promise.all([
        getChatHistory(sessionId),
        getChatSessionMeta(sessionId).catch(() => null),
      ]);
      setHistoryState({ loading: false, error: null, data: history });
      setSessionMeta(meta);
      setSessions((prev) =>
        prev.map((item) => {
          if (item.session_id !== sessionId) return item;
          const lastMessage = history.messages[history.messages.length - 1];
          return {
            ...item,
            message_count: history.message_count ?? history.messages.length,
            ttl: history.ttl ?? meta?.ttl ?? item.ttl,
            last_activity: history.messages.length ? lastMessage?.timestamp ?? lastMessage?.created_at ?? item.last_activity : item.last_activity,
          };
        }),
      );
    } catch (err: any) {
      setHistoryState({ loading: false, error: err?.message || "Failed to load conversation.", data: null });
    }
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    loadSessionDetails(selectedSessionId);
  }, [loadSessionDetails, selectedSessionId]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSessions((prev) => {
      if (prev.some((s) => s.session_id === sessionId)) return prev;
      return [{ session_id: sessionId }, ...prev];
    });
  }, []);

  const handleManualSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = manualSessionId.trim();
      if (!trimmed) return;
      handleSelectSession(trimmed);
      setManualSessionId("");
    },
    [handleSelectSession, manualSessionId],
  );

  const historyMessages = useMemo<ChatHistoryMessage[]>(() => historyState.data?.messages ?? [], [historyState.data]);

  const messageCount = historyState.data?.message_count ?? sessionMeta?.message_count ?? historyMessages.length;
  const ttl = historyState.data?.ttl ?? sessionMeta?.ttl ?? null;

  const clearConversation = useCallback(async () => {
    if (!selectedSessionId) return;
    const confirmed = window.confirm(`Delete all conversations for session ${selectedSessionId}?`);
    if (!confirmed) return;
    setClearing(true);
    try {
      await clearChatHistory(selectedSessionId);
      await refreshSessions();
      setHistoryState({ loading: false, error: null, data: { session_id: selectedSessionId, messages: [], message_count: 0, ttl: null } });
      setSessionMeta((prev) => (prev ? { ...prev, exists: false, message_count: 0, ttl: null } : prev));
    } catch (err: any) {
      setHistoryState((prev) => ({ ...prev, error: err?.message || "Failed to delete conversation." }));
    } finally {
      setClearing(false);
    }
  }, [refreshSessions, selectedSessionId]);

  const renderMessage = (message: ChatHistoryMessage, index: number) => {
    const normalizedRole = String(message.role || "unknown").toLowerCase();
    const isUser = normalizedRole === "user" || normalizedRole === "human";
    const bubbleColor = isUser ? "bg-primary text-white" : "bg-gray-100 text-gray-900";
    const metadata =
      message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
        ? message.metadata
        : null;
    return (
      <li key={`${message.timestamp || "ts"}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-xl rounded-lg px-3 py-2 text-sm shadow-sm ${bubbleColor}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold capitalize">{isUser ? "User" : normalizedRole || "AI"}</span>
            <span className="text-xs opacity-70">{message.timestamp ? formatDate(message.timestamp) : ""}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
          {metadata && Object.keys(metadata).length > 0 && (
            <pre className="mt-2 rounded bg-white/20 p-2 text-xs opacity-80">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Chat History</h2>
          <p className="mt-1 text-sm text-gray-600">Monitor chat widget conversations, review transcripts, and clean them up when needed.</p>
        </div>
        <button
          type="button"
          onClick={() => refreshSessions()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          disabled={sessionsLoading}
        >
          <ArrowPathIcon className={`h-4 w-4 ${sessionsLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-gray-200 bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Sessions
          </div>

          <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={manualSessionId}
              onChange={(e) => setManualSessionId(e.target.value)}
              placeholder="Enter session_id manually"
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Open
            </button>
          </form>

          <div className="mt-4 h-[420px] overflow-y-auto rounded-md border border-dashed border-gray-200">
            {sessionsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading sessions...</div>
            ) : sessionsError ? (
              <div className="p-4 text-sm text-red-600">{sessionsError}</div>
            ) : sessions.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                No sessions available on the server yet. Start a conversation through the widget to generate a new session_id.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 text-sm">
                {sessions.map((session) => {
                  const active = session.session_id === selectedSessionId;
                  return (
                    <li key={session.session_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSession(session.session_id)}
                        className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left ${active ? "bg-primary/10" : "hover:bg-gray-50"}`}
                      >
                        <span className="font-semibold text-gray-900">{session.session_id}</span>
                        <span className="text-xs text-gray-500">Messages: {session.message_count ?? "?"}</span>
                        {session.last_activity && (
                          <span className="text-xs text-gray-400">Last activity: {formatDate(session.last_activity)}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-background p-6 shadow-sm">
          {!selectedSessionId ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center text-sm text-gray-500">
              <DocumentMagnifyingGlassIcon className="h-10 w-10 text-gray-400" />
              <p className="mt-3">Select a session to view the conversation.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Session {selectedSessionId}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      {messageCount} messages
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      TTL: {formatTtl(ttl)}
                    </span>
                    {sessionMeta?.created_at && <span>Created: {formatDate(sessionMeta.created_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadSessionDetails(selectedSessionId)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    disabled={historyState.loading}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${historyState.loading ? "animate-spin" : ""}`} />
                    Reload
                  </button>
                  <button
                    type="button"
                    onClick={clearConversation}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    disabled={historyMessages.length === 0 || clearing}
                  >
                    <TrashIcon className={`h-4 w-4 ${clearing ? "animate-spin" : ""}`} />
                    Delete conversation
                  </button>
                </div>
              </div>

              {historyState.error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {historyState.error}
                </div>
              )}

              <div className="mt-4 flex-1 overflow-y-auto rounded-md border border-gray-100 bg-white p-4">
                {historyState.loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading conversation...</div>
                ) : historyMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-500">
                    No messages for this session yet or the history has expired.
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {historyMessages.map((message, index) => renderMessage(message, index))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
