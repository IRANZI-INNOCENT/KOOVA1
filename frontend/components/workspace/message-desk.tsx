"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getBusiness } from "@/lib/commerce";
import {
  draftReply,
  getMessages,
  logMessage,
  replyToMessage,
  type SocialMessageRecord,
} from "@/lib/operations";

type KindFilter = "all" | "comment" | "message";

export function MessageDesk({
  channels,
  title,
  intro,
}: {
  channels?: string[];
  title: string;
  intro: string;
}) {
  const { accessToken, isAuthenticated } = useAuth();
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
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then(async (business) => {
        setBusinessId(business.id);
        await load(token, business.id);
      })
      .catch(() => setError("Could not load the inbox."));
  }, [accessToken, isAuthenticated]);

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

  const shown = messages.filter((item) => filter === "all" || item.kind === filter);
  const commentCount = messages.filter((item) => item.kind === "comment" && item.direction === "in").length;
  const messageCount = messages.filter((item) => item.kind === "message" && item.direction === "in").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
          Customers
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-kova-dark">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">{intro}</p>
        <p className="mt-2 text-sm text-kova-dark">
          {commentCount} comment{commentCount === 1 ? "" : "s"} · {messageCount} message
          {messageCount === 1 ? "" : "s"}
        </p>
      </header>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["comment", "Comments"],
            ["message", "Messages"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-bold ${
              filter === value
                ? "bg-kova-orange text-kova-dark"
                : "border border-kova-border bg-white text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={onLog} className="space-y-3 rounded-lg border border-kova-border bg-white p-4">
        <p className="text-sm font-semibold text-kova-dark">Log a comment or message</p>
        <p className="text-xs leading-5 text-gray-500">
          Kova reads it, decides if the person is buying, and drafts the reply.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Customer name"
            className="h-10 rounded-md border border-kova-border px-3 text-sm"
          />
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="h-10 rounded-md border border-kova-border px-3 text-sm"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as "message" | "comment")}
            className="h-10 rounded-md border border-kova-border px-3 text-sm"
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
          className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-kova-green px-4 text-xs font-bold text-white"
        >
          Let Kova read it
        </button>
      </form>
      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="rounded-lg border border-dashed border-kova-orange/40 bg-kova-orange/5 px-4 py-8 text-center text-sm text-gray-500">
            Comments and direct messages show up here. Likes stay on Performance.
          </p>
        )}
        {shown.map((message) => {
          const canSend =
            message.direction === "in" &&
            Boolean(message.reply_target_id) &&
            (message.channel === "instagram" || message.channel === "facebook");
          return (
            <article key={message.id} className="rounded-lg border border-kova-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-kova-dark">
                  {message.customer_name || (message.direction === "out" ? "Kova" : "Customer")}
                </p>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-kova-orange">
                  <span>
                    {message.channel} · {message.kind === "comment" ? "comment" : "message"}
                    {message.intent === "buying" ? " · buying" : ""}
                  </span>
                  {(message.delivery_status === "sent" ||
                    messages.some(
                      (item) => item.in_reply_to === message.id && item.delivery_status === "sent",
                    )) && <SentTick />}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-700">{message.body}</p>
              {message.reply_error && message.direction === "out" && (
                <p className="mt-2 text-xs text-red-600">{message.reply_error}</p>
              )}
              {message.direction === "in" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={reply[message.id] ?? message.draft_reply ?? ""}
                    onChange={(event) =>
                      setReply((current) => ({ ...current, [message.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="Kova’s reply"
                    className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDraft(message.id)}
                      disabled={busyId === message.id}
                      className="inline-flex h-9 items-center rounded-md border border-kova-border px-3 text-xs font-bold text-kova-dark disabled:opacity-60"
                    >
                      {busyId === message.id ? "Reading…" : "Draft with Kova"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReply(message)}
                      disabled={busyId === message.id}
                      className="inline-flex h-9 items-center rounded-md bg-kova-orange px-3 text-xs font-bold text-kova-dark disabled:opacity-60"
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
    </div>
  );
}

function SentTick() {
  return (
    <span className="inline-flex items-center gap-1 text-red-600" title="Sent">
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
      <span className="sr-only">Sent</span>
    </span>
  );
}
