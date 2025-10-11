"use client";

import { useEffect, useRef, useState } from "react";
import "./widget.css";
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { formatQueryResponseToMarkdown, type QueryApiResponse } from "@/lib/format";
import MarkdownLite from "@/components/chat/MarkdownLite";

type Msg = { role: "user" | "ai" | "error"; text: string };

const QUERY_URL = "http://127.0.0.1:8000/api/v1/query";
const SESSION_KEY = "chat_widget_session";
const TOKEN_KEY = "jwt_token";

export default function ChatWidget() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi there! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatListRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const inputInitHeight = useRef<number>(0);

  useEffect(() => {
    if (!inputRef.current) return;
    inputInitHeight.current = inputRef.current.scrollHeight;
  }, []);

  function ensureSession(): string {
    if (typeof window === "undefined") return "session";
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function scrollBottom() {
    if (!chatListRef.current) return;
    chatListRef.current.scrollTo(0, chatListRef.current.scrollHeight);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setTimeout(scrollBottom, 0);

    // temp "Thinking..."
    const thinking: Msg = { role: "ai", text: "Thinking..." };
    setMessages((m) => [...m, thinking]);
    setSending(true);

    try {
      const session_id = ensureSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: text, session_id, include_sources: false }),
      });
      const data: QueryApiResponse = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.detail || data?.message || "Query failed");
      const answer = formatQueryResponseToMarkdown(data, { topK: 3 });
      setMessages((m) => {
        // replace last "Thinking..." with answer
        const copy = m.slice();
        const idx = copy.findIndex((mm) => mm === thinking);
        if (idx >= 0) copy[idx] = { role: "ai", text: answer };
        else copy.push({ role: "ai", text: answer });
        return copy;
      });
    } catch (e: any) {
      setMessages((m) => {
        const copy = m.slice();
        const idx = copy.findIndex((mm) => mm.text === "Thinking..." && mm.role === "ai");
        if (idx >= 0) copy[idx] = { role: "error", text: e?.message || "Something went wrong" };
        else copy.push({ role: "error", text: e?.message || "Something went wrong" });
        return copy;
      });
    } finally {
      setSending(false);
      setTimeout(scrollBottom, 0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
      e.preventDefault();
      sendMessage();
    }
  }

  useEffect(() => {
    // auto-resize textarea
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = `${inputInitHeight.current}px`;
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  return (
    <div ref={rootRef} className={`cw ${open ? "show" : ""}`}>
      <button className="chatbot-toggler" aria-label="Toggle chat" onClick={() => setOpen((v) => !v)}>
        <ChatBubbleLeftRightIcon />
        <XMarkIcon />
      </button>

      <div className="chatbot">
        <header>
          <h2>Chatbot</h2>
          <button aria-label="Close" onClick={() => setOpen(false)}>
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </header>
        <ul ref={chatListRef} className="chatbox">
          {messages.map((m, i) => (
            <li key={i} className={`chat ${m.role === "user" ? "outgoing" : "incoming"}`}>
              {m.role === "user" ? (
                <p>{m.text}</p>
              ) : m.role === "error" ? (
                <p className="error">{m.text}</p>
              ) : (
                <div className="bubble">
                  <MarkdownLite text={m.text} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="chat-input">
          <textarea
            ref={inputRef}
            placeholder="Enter a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            required
          />
          <button className="send" onClick={sendMessage} aria-label="Send">
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
