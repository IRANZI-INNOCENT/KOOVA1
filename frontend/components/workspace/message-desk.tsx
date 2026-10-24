"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  PlatformBrandIcon,
  channelToPlatformBrand,
} from "@/components/social/platform-brand";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import {
  draftReply,
  getMessages,
  logMessage,
  replyToMessage,
  type SocialMessageRecord,
} from "@/lib/operations";

type KindFilter = "all" | "comment" | "message";

function sentReplyIds(messages: SocialMessageRecord[]): Set<number> {
  const ids = new Set<number>();
  for (const item of messages) {
    if (
      item.direction === "out" &&
      item.in_reply_to != null &&
      item.delivery_status === "sent"
    ) {
      ids.add(item.in_reply_to);
    }
  }
  return ids;
}

function isUnread(message: SocialMessageRecord, replied: Set<number>): boolean {
  return message.direction === "in" && !replied.has(message.id);
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function channelLabel(channel: string) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  if (channel === "facebook") return "Facebook";
  return channel;
}

export function MessageDesk({
  channels,
  title,
  intro,
}: {
  channels?: string[];
  /** When omitted, skip the page-style header (parent already titled the screen). */
  title?: string;
  intro?: string;
}) {
  const { accessToken, isAuthenticated } = useAuth();
  const { businessId: workspaceBusinessId, workspaceLoading } = useWorkspace();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SocialMessageRecord[]>([]);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState(channels?.[0] || "whatsapp");
  const [kind, setKind] = useState<"message" | "comment">("message");
  const [filter, setFilter] = useState<KindFilter>("all");
  const [reply, setReply] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  async function load(token: string, id: number) {
    const list = await getMessages(id, token);
    const visible = channels ? list.filter((item) => channels.includes(item.channel)) : list;
    setMessages(visible);
    setReply((current) => {
      const next = { ...current };
      for (const item of visible) {
        if (item.direction === "in" && item.draft_reply && next[item.id] === undefined) {
          next[item.id] = item.draft_reply;
        }
      }
      return next;
    });
  }

  useEffect(() => {
    if (!isAuthenticated || !accessToken || workspaceLoading) return;
    if (!workspaceBusinessId) return;
    const token = accessToken;
    const bizId = workspaceBusinessId;
    setBusinessId(bizId);
    load(token, bizId).catch(() => setError("Could not load the inbox."));
  }, [accessToken, isAuthenticated, workspaceBusinessId, workspaceLoading]);

  async function onLog(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !businessId || !body.trim()) return;
    setError("");
    try {
      await logMessage(businessId, accessToken, {
        body: body.trim(),
        channel,
        kind,
        customer_name: name.trim(),
      });
      setBody("");
      setName("");
      setLogOpen(false);
      await load(accessToken, businessId);
    } catch {
      setError("Could not save that item.");
    }
  }

  async function onDraft(messageId: number) {
    if (!accessToken || !businessId) return;
    setBusyId(messageId);
    setError("");
    try {
      const drafted = await draftReply(businessId, messageId, accessToken);
      setReply((current) => ({ ...current, [messageId]: drafted.draft_reply }));
      await load(accessToken, businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kova could not draft a reply.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReply(message: SocialMessageRecord) {
    if (!accessToken || !businessId) return;
    const text = (reply[message.id] || "").trim();
    if (!text) return;
    setBusyId(message.id);
    setError("");
    try {
      const sent = await replyToMessage(businessId, message.id, accessToken, text);
      if (sent.delivery_status === "failed") {
        setError(sent.reply_error || "The platform did not accept the reply.");
      }
      await load(accessToken, businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that reply.");
    } finally {
      setBusyId(null);
    }
  }

  const replied = useMemo(() => sentReplyIds(messages), [messages]);

  const inbound = useMemo(
    () => messages.filter((item) => item.direction === "in"),
    [messages],
  );

  const byId = useMemo(() => {
    const map = new Map<number, SocialMessageRecord>();
    for (const item of messages) {
      map.set(item.id, item);
    }
    return map;
  }, [messages]);

  const timeline = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [messages]);

  const unreadAll = inbound.filter((item) => isUnread(item, replied)).length;
  const unreadComments = inbound.filter(
    (item) => item.kind === "comment" && isUnread(item, replied),
  ).length;
  const unreadMessages = inbound.filter(
    (item) => item.kind === "message" && isUnread(item, replied),
  ).length;

  const shown = timeline.filter((item) => filter === "all" || item.kind === filter);

  const tabMeta: { value: KindFilter; label: string; unread: number }[] = [
    { value: "all", label: "All", unread: unreadAll },
    { value: "comment", label: "Comments", unread: unreadComments },
    { value: "message", label: "Messages", unread: unreadMessages },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {title ? (
        <header>
          <h2 className="text-lg font-semibold text-kova-dark">{title}</h2>
          {intro ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              {intro}
            </p>
          ) : null}
        </header>
      ) : null}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        className="flex gap-1 border-b border-kova-border"
        role="tablist"
        aria-label="Inbox filters"
      >
        {tabMeta.map(({ value, label, unread }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`inline-flex h-11 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors ${
              filter === value
                ? "border-kova-dark text-kova-dark"
                : "border-transparent text-gray-500 hover:text-kova-dark"
            }`}
          >
            {label}
            {unread > 0 ? (
              <span className="text-xs font-medium text-gray-500">
                {unread}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm leading-6 text-gray-500">
            {filter === "all"
              ? "No messages yet."
              : `No ${filter === "comment" ? "comments" : "messages"} yet.`}
          </p>
        )}
        {shown.map((message) => {
          if (message.direction === "out") {
            const parent =
              message.in_reply_to != null ? byId.get(message.in_reply_to) : undefined;
            return (
              <OutboundCard key={message.id} message={message} parent={parent} />
            );
          }

          const unread = isUnread(message, replied);
          const canSend =
            Boolean(message.reply_target_id) &&
            (message.channel === "instagram" || message.channel === "facebook");
          const sent = replied.has(message.id);
          const hasSavedReply = messages.some(
            (item) =>
              item.direction === "out" &&
              item.in_reply_to === message.id &&
              item.delivery_status === "saved",
          );

          return (
            <article
              key={message.id}
              className={`border bg-white p-4 ${
                unread ? "border-kova-dark" : "border-kova-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {unread ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-sm bg-kova-dark"
                        title="Needs a reply"
                      />
                    ) : null}
                    <p className="text-sm font-semibold text-kova-dark">
                      {message.customer_name || "Customer"}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatWhen(message.created_at)}
                    </span>
                    {sent ? (
                      <span className="text-xs font-medium text-kova-green">
                        Replied
                      </span>
                    ) : null}
                    {!sent && hasSavedReply ? (
                      <span className="text-xs font-medium text-gray-500">
                        Reply saved
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <PlatformBrandIcon
                      platform={channelToPlatformBrand(message.channel)}
                      size={14}
                    />
                    {channelLabel(message.channel)} ·{" "}
                    {message.kind === "comment" ? "Comment" : "Message"}
                    {message.intent && message.intent !== "other"
                      ? ` · ${message.intent}`
                      : ""}
                    {message.needs_review ? " · needs review" : ""}
                  </p>
                </div>
                {sent && <SentTick />}
              </div>

              <p className="mt-3 text-sm leading-6 text-kova-dark">{message.body}</p>

              {!sent && (
                <div className="mt-4 space-y-2 border-t border-kova-border/60 pt-4">
                  <textarea
                    value={reply[message.id] ?? message.draft_reply ?? ""}
                    onChange={(event) =>
                      setReply((current) => ({ ...current, [message.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="Kova’s reply"
                    className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => onDraft(message.id)}
                      disabled={busyId === message.id}
                      className="inline-flex h-11 w-full items-center justify-center rounded-md border border-kova-border px-3 text-xs font-bold text-kova-dark disabled:opacity-60 sm:w-auto"
                    >
                      {busyId === message.id ? "Reading…" : "Draft with Kova"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReply(message)}
                      disabled={busyId === message.id}
                      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-kova-green px-3 text-xs font-bold text-white disabled:opacity-60 sm:w-auto"
                    >
                      {canSend ? "Send reply" : "Save reply"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {canSend
                      ? "Send posts this reply on the connected account."
                      : "WhatsApp replies stay here for you to send in the chat."}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="border-t border-kova-border pt-4">
        <button
          type="button"
          onClick={() => setLogOpen((open) => !open)}
          className="text-sm font-semibold text-kova-green hover:underline"
        >
          {logOpen ? "Hide manual entry" : "Log a comment or message manually"}
        </button>
        {logOpen && (
          <form onSubmit={onLog} className="mt-3 space-y-3 rounded-lg bg-kova-orange/10 p-4">
            <p className="text-xs leading-5 text-gray-600">
              Paste something a customer sent outside the webhook. Kova will read it and draft a
              reply.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer name"
                className="h-10 rounded-md border border-kova-border bg-white px-3 text-sm"
              />
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="h-10 rounded-md border border-kova-border bg-white px-3 text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as "message" | "comment")}
                className="h-10 rounded-md border border-kova-border bg-white px-3 text-sm"
              >
                <option value="message">Direct message</option>
                <option value="comment">Comment</option>
              </select>
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Paste what the customer wrote"
              className="w-full rounded-md border border-kova-border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-green px-4 text-xs font-bold text-white sm:h-11 sm:w-auto"
            >
              Let Kova read it
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function deliveryLabel(status: SocialMessageRecord["delivery_status"]) {
  if (status === "sent") return "Sent on channel";
  if (status === "saved") return "Saved in Kova";
  if (status === "failed") return "Send failed";
  return "Received";
}

function OutboundCard({
  message,
  parent,
}: {
  message: SocialMessageRecord;
  parent?: SocialMessageRecord;
}) {
  return (
    <article className="rounded-lg border border-kova-green/25 bg-kova-green/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-kova-green">Your reply</p>
        <span className="text-xs text-gray-400">{formatWhen(message.created_at)}</span>
        <span className="text-xs text-gray-500">{deliveryLabel(message.delivery_status)}</span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <PlatformBrandIcon
          platform={channelToPlatformBrand(message.channel)}
          size={14}
        />
        {channelLabel(message.channel)} ·{" "}
        {message.kind === "comment" ? "Comment" : "Message"}
      </p>
      {parent && (
        <p className="mt-2 truncate text-xs text-gray-500">
          To {parent.customer_name || "customer"}: “{parent.body.slice(0, 120)}
          {parent.body.length > 120 ? "…" : ""}”
        </p>
      )}
      <p className="mt-3 text-sm leading-6 text-kova-dark">{message.body}</p>
      {message.reply_error && message.delivery_status === "failed" && (
        <p className="mt-2 text-xs text-red-600">{message.reply_error}</p>
      )}
    </article>
  );
}

function SentTick() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-kova-green" title="Replied">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="sr-only">Replied</span>
    </span>
  );
}
