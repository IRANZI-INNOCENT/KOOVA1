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

        <div className="bg-kova-orange/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-2">
              {TASK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTask(opt.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    task === opt.value
                      ? "bg-kova-green text-white"
                      : "bg-white/80 text-gray-600 hover:text-kova-green"
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kova-green/10">
        <span className="text-xl font-bold text-kova-green">K</span>
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-kova-dark">
        Talk to Kova
      </h2>
      <p className="mt-1 text-sm text-gray-500">{businessName}</p>

      {desk && (
        <div className="mt-4 flex max-w-md flex-col items-center gap-2">
          <span className="rounded-full bg-kova-green/10 px-3 py-0.5 text-xs font-medium text-kova-green">
            {MODE_LABEL[desk.mode]}
          </span>
          {desk.mode === "autopilot" && (
            <Link
              href="/workspace/social/autopilot"
              className="text-xs font-medium text-kova-green hover:underline"
            >
              See what Kova is doing
            </Link>
          )}
          {desk.paused && (
            <p className="text-sm leading-6 text-amber-800">
              {desk.pauseReason.trim() ||
                "Scheduled publishing is paused until you resume it."}
            </p>
          )}
          {desk.plan.trim() && (
            <p className="text-sm leading-6 text-kova-dark/75">{desk.plan}</p>
          )}
        </div>
      )}

      {(loading || suggestions.length > 0) && (
        <div className="mt-8 w-full max-w-md space-y-3 text-left">
          {loading && (
            <p className="text-sm text-gray-500">Finding a few questions to start with…</p>
          )}
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestion(text)}
              className="block w-full text-left text-sm leading-6 text-kova-dark/80 transition-colors hover:text-kova-green"
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
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
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kova-green text-xs font-bold text-white">
          K
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-kova-green text-white"
              : "border border-kova-orange/40 bg-kova-orange/25 text-kova-dark"
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

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-1 text-xs text-gray-500"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    tc.status === "success" ? "bg-kova-green" : "bg-red-400"
                  }`}
                />
                <span>{TOOL_LABELS[tc.tool_name] || tc.tool_name}</span>
                <span className="text-gray-300">·</span>
                <span className={tc.status === "success" ? "text-kova-green" : "text-red-500"}>
                  {tc.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-1 px-1 text-xs text-gray-400">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kova-dark text-xs font-bold text-white">
          U
        </div>
      )}
    </div>
  );
}


function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kova-green text-xs font-bold text-white">
        K
      </div>
      <div className="rounded-lg border border-kova-orange/40 bg-kova-orange/25 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-bounce rounded-full bg-kova-green/40" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-kova-green/40" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-kova-green/40" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
