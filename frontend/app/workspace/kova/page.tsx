"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  getBusiness,
  getKovaStarters,
  sendKovaMessage,
  type Business,
  type KovaToolCall,
} from "@/lib/commerce";
import {
  getBusinessPolicy,
  getSocialOverview,
  type OperatingMode,
} from "@/lib/social";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: KovaToolCall[];
  model?: string | null;
}

const TOOL_LABELS: Record<string, string> = {
  create_content: "Created content",
  publish_content: "Published content",
  create_lead: "Captured a lead",
  manage_product: "Managed product",
  manage_commerce: "Queried commerce data",
  get_analytics: "Pulled analytics",
  get_social_activity: "Checked social activity",
  respond_to_customer: "Prepared response",
  manage_order: "Managed order",
  get_business_context: "Read business context",
};

const TASK_OPTIONS = [
  { value: "general", label: "General" },
  { value: "content_creation", label: "Content" },
  { value: "customer_response", label: "Customer" },
  { value: "commerce", label: "Commerce" },
];

export default function KovaChatPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [task, setTask] = useState("general");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [desk, setDesk] = useState<{
    mode: OperatingMode;
    paused: boolean;
    pauseReason: string;
    plan: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    getBusiness(accessToken)
      .then((current) => {
        setBusiness(current);
        void getKovaStarters(current.id, accessToken)
          .then(setSuggestions)
          .catch(() => setSuggestions([]))
          .finally(() => setSuggestionsLoading(false));
        void Promise.all([
          getSocialOverview(current.id, accessToken),
          getBusinessPolicy(current.id, accessToken),
        ])
          .then(([overview, policy]) => {
            setDesk({
              mode: policy.social_operating_mode,
              paused: policy.automation_paused,
              pauseReason: policy.automation_pause_reason,
              plan: overview.command.plan,
            });
          })
          .catch(() => setDesk(null));
      })
      .catch(() => router.replace("/workspace/setup"))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, accessToken, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !business || !accessToken) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const response = await sendKovaMessage(business.id, accessToken, text, task);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        toolCalls: response.tool_calls,
        model: response.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err instanceof ApiError ? err.message : "Kova couldn't process that. Try again.";
      setError(errMsg);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestion(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Starting Kova...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <EmptyState
                businessName={business?.name || "your business"}
                desk={desk}
                suggestions={suggestions}
                loading={suggestionsLoading}
                onSuggestion={handleSuggestion}
              />
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {sending && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-kova-border bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-2">
              {TASK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTask(opt.value)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    task === opt.value
                      ? "border-kova-dark bg-kova-dark text-white"
                      : "border-kova-border bg-white text-gray-600 hover:border-kova-dark"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kova anything about your business..."
                rows={1}
                disabled={sending}
                className="w-full resize-none rounded-md border border-kova-orange/40 bg-white px-4 py-2.5 pr-12 text-sm text-kova-dark placeholder:text-gray-400 focus:border-kova-green focus:outline-none focus:ring-1 focus:ring-kova-green disabled:bg-gray-50 disabled:text-gray-400"
                style={{ minHeight: 44, maxHeight: 120 }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-kova-green text-white transition-colors hover:bg-[#12583f] disabled:bg-gray-200 disabled:text-gray-400"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


const MODE_LABEL: Record<OperatingMode, string> = {
  assist: "Assist",
  approval: "Approval",
  autopilot: "Autopilot",
};

function EmptyState({
  businessName,
  desk,
  suggestions,
  loading,
  onSuggestion,
}: {
  businessName: string;
  desk: {
    mode: OperatingMode;
    paused: boolean;
    pauseReason: string;
    plan: string;
  } | null;
  suggestions: string[];
  loading: boolean;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col justify-center px-2 py-8">
      <h2 className="text-2xl font-semibold tracking-tight text-kova-dark">
        Talk to Kova
      </h2>
      <p className="mt-1 text-sm text-gray-500">{businessName}</p>

      {desk ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-gray-600">{MODE_LABEL[desk.mode]}</p>
          {desk.mode === "autopilot" ? (
            <Link
              href="/workspace/social"
              className="text-sm font-medium text-kova-green hover:underline"
            >
              See what Kova is doing
            </Link>
          ) : null}
          {desk.paused ? (
            <p className="text-amber-800">
              {desk.pauseReason.trim() ||
                "Scheduled publishing is paused until you resume it."}
            </p>
          ) : null}
          {desk.plan.trim() ? (
            <p className="text-kova-dark/80">{desk.plan}</p>
          ) : null}
        </div>
      ) : null}

      {loading || suggestions.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-kova-dark">Suggestions</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Tap to fill the box — edit before you send.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="h-14 animate-pulse border border-kova-border bg-white"
                  />
                ))
              : null}
            {!loading
              ? suggestions.map((text) => (
                  <SuggestionCard
                    key={text}
                    text={text}
                    onSelect={() => onSuggestion(text)}
                  />
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function suggestionCategory(text: string): { tag: string; tone: "green" | "orange" } {
  const lower = text.toLowerCase();
  if (
    lower.includes("message") ||
    lower.includes("inbox") ||
    lower.includes("reply") ||
    lower.includes("customer")
  ) {
    return { tag: "Inbox & customers", tone: "green" };
  }
  if (
    lower.includes("content") ||
    lower.includes("post") ||
    lower.includes("draft") ||
    lower.includes("schedule") ||
    lower.includes("marketing")
  ) {
    return { tag: "Content & social", tone: "orange" };
  }
  if (
    lower.includes("product") ||
    lower.includes("promote") ||
    lower.includes("store") ||
    lower.includes("commerce") ||
    lower.includes("order")
  ) {
    return { tag: "Commerce", tone: "orange" };
  }
  if (lower.includes("lead")) {
    return { tag: "Leads", tone: "green" };
  }
  return { tag: "General", tone: "green" };
}

function SuggestionCard({
  text,
  onSelect,
}: {
  text: string;
  onSelect: () => void;
}) {
  const { tag } = suggestionCategory(text);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="border border-kova-border bg-white px-3 py-2.5 text-left transition hover:border-kova-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kova-green"
    >
      <span className="text-xs text-gray-500">{tag}</span>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-kova-dark">
        {text}
      </p>
    </button>
  );
}


function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function ChatText({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  function flushList() {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="mt-2 space-y-1 pl-4">
        {items.map((item, index) => (
          <li key={index} className="list-disc">
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
  }

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      return;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      flushList();
      blocks.push(<hr key={`rule-${blocks.length}`} className="my-3 border-kova-orange/50" />);
      return;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      flushList();
      blocks.push(
        <p key={`heading-${blocks.length}`} className="mt-3 font-semibold text-kova-dark">
          {renderInline(heading[1])}
        </p>,
      );
      return;
    }
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    blocks.push(
      <p key={`line-${blocks.length}`} className="mt-2 first:mt-0">
        {renderInline(line)}
      </p>,
    );
  });
  flushList();

  return <div>{blocks}</div>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : ""}`}>
      <div className="max-w-[85%]">
        <p className="mb-1 text-xs text-gray-500">
          {isUser ? "You" : "Kova"} ·{" "}
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-kova-green text-white"
              : "border border-kova-border bg-white text-kova-dark"
          }`}
        >
          {isUser ? (
            message.content.split("\n").map((line, i) => (
              <p key={i} className={i > 0 ? "mt-2" : ""}>
                {line}
              </p>
            ))
          ) : (
            <ChatText content={message.content} />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 ? (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-gray-500"
              >
                <span>{TOOL_LABELS[tc.tool_name] || tc.tool_name}</span>
                <span className="text-gray-300">·</span>
                <span
                  className={
                    tc.status === "success" ? "text-kova-green" : "text-red-500"
                  }
                >
                  {tc.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">Kova</p>
      <div className="border border-kova-border bg-white px-4 py-3 text-sm text-gray-500">
        Thinking…
      </div>
    </div>
  );
}
