"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getBusiness } from "@/lib/commerce";
import {
  disconnectSocialAccount,
  getMetaOAuthURL,
  getSocialAccounts,
  metaOAuthRedirectUri,
  submitMetaOAuthCode,
  verifySocialAccount,
  type SocialAccount,
} from "@/lib/social";

const PLATFORM_LABELS: Record<string, string> = {
  facebook_page: "Facebook Page",
  instagram: "Instagram Professional",
};

const PLATFORM_SHORT: Record<string, string> = {
  facebook_page: "FB",
  instagram: "IG",
};

function oauthPlatformForAccount(
  platform: SocialAccount["platform"],
): "facebook" | "instagram" {
  return platform === "instagram" ? "instagram" : "facebook";
}

function permissionSummary(account: SocialAccount) {
  const caps = account.capabilities ?? [];
  const granted = caps.filter((item) => item.available).length;
  const total = caps.length;
  const missing = caps.filter((item) => !item.available);
  return { granted, total, missing, hasGap: missing.length > 0 };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  connected: {
    label: "Connected",
    dot: "bg-kova-green",
    bg: "bg-kova-green/10",
    text: "text-kova-green",
  },
  expired: {
    label: "Token expired",
    dot: "bg-kova-orange",
    bg: "bg-kova-orange/10",
    text: "text-kova-orange",
  },
  revoked: {
    label: "Disconnected",
    dot: "bg-gray-300",
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
  error: {
    label: "Error",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
  },
};

export default function ChannelsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [verifyNote, setVerifyNote] = useState("");
  const finishingMeta = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function load() {
      try {
        const business = await getBusiness(token);
        setBusinessId(business.id);
        const list = await getSocialAccounts(business.id, token);
        setAccounts(list);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load channels.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, isAuthenticated, accessToken, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !accessToken || !businessId || finishingMeta.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("meta_code");
    const metaError = params.get("meta_error");
    const state = params.get("meta_state");
    if (metaError) {
      setError("Facebook did not complete the connection.");
      window.history.replaceState({}, "", "/workspace/social/channels");
      return;
    }
    if (!code) return;
    const stateBusiness = Number((state || "").split(":")[0]);
    const statePlatform = (state || "").split(":")[1];
    const platform =
      statePlatform === "instagram" || statePlatform === "facebook"
        ? statePlatform
        : "both";
    if (state && stateBusiness !== businessId) {
      setError("This connection was started for a different business.");
      window.history.replaceState({}, "", "/workspace/social/channels");
      return;
    }
    const guard = `kova-meta-${code.slice(0, 16)}`;
    if (sessionStorage.getItem(guard) === "1") return;
    sessionStorage.setItem(guard, "1");
    finishingMeta.current = true;
    const token = accessToken;
    const id = businessId;

    submitMetaOAuthCode(id, code, metaOAuthRedirectUri(), token, platform)
      .then(() => getSocialAccounts(id, token))
      .then((list) => {
        setAccounts(list);
        setError("");
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not finish connecting the account.",
        );
      })
      .finally(() => {
        window.history.replaceState({}, "", "/workspace/social/channels");
      });
  }, [authLoading, isAuthenticated, accessToken, businessId]);

  async function connectMeta(
    platform: "facebook" | "instagram",
    reconnect = false,
  ) {
    if (!businessId || !accessToken) return;
    setError("");
    try {
      const { url } = await getMetaOAuthURL(
        businessId,
        accessToken,
        platform,
        reconnect,
      );
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not start the connection. Try again later.",
      );
    }
  }

  async function handleDisconnect(account: SocialAccount) {
    if (!businessId || !accessToken) return;
    setActionLoading(account.id);
    setError("");
    try {
      await disconnectSocialAccount(businessId, account.id, accessToken);
      setAccounts((current) =>
        current.map((a) =>
          a.id === account.id
            ? {
                ...a,
                connection_status: "revoked" as const,
                is_healthy: false,
              }
            : a,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not disconnect account.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerify(account: SocialAccount) {
    if (!businessId || !accessToken) return;
    setActionLoading(account.id);
    setError("");
    try {
      const updated = await verifySocialAccount(
        businessId,
        account.id,
        accessToken,
      );
      setAccounts((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)),
      );
      const summary = permissionSummary(updated);
      if (updated.connection_status === "connected") {
        if (summary.hasGap) {
          setVerifyNote(
            `${updated.account_name || "This account"} is connected, but only ${summary.granted} of ${summary.total} permissions are granted. Use “Allow missing permissions” so Kova can reply to comments and messages.`,
          );
        } else {
          setVerifyNote(
            `${updated.account_name || "This account"} is connected with all ${summary.total} permissions Kova needs.`,
          );
        }
      } else {
        setVerifyNote(
          `${updated.account_name || "This account"} needs to be connected again.`,
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not verify account.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ──── Header ──── */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              Channels
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Connect your social accounts
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Link your Facebook Page and Instagram so Kova can help draft
              content, schedule posts, monitor engagement, and grow your
              audience.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => connectMeta("facebook")}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
            >
              Connect Facebook
            </button>
            <button
              type="button"
              onClick={() => connectMeta("instagram")}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-kova-orange bg-white px-5 text-sm font-bold text-kova-dark transition hover:bg-kova-orange/10"
            >
              Connect Instagram
            </button>
          </div>
        </header>

        <div className="h-px bg-kova-border" />

        {verifyNote && (
          <p className="rounded-lg border border-kova-green/30 bg-kova-green/5 px-4 py-3 text-sm text-kova-dark">
            {verifyNote}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* ──── Account list ──── */}
        {accounts.length === 0 ? (
          <section className="rounded-lg border-2 border-dashed border-kova-orange/40 bg-kova-orange/5 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/20">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-kova-orange"
              >
                <path d="M17 2H7a2 2 0 00-2 2v16l7-4 7 4V4a2 2 0 00-2-2z" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-kova-dark">
              No accounts connected yet
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Connect your first social account so Kova can start working for
              you.
            </p>
          </section>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => {
              const status = STATUS_CONFIG[account.connection_status] ?? {
                label: account.connection_status,
                dot: "bg-gray-300",
                bg: "bg-gray-100",
                text: "text-gray-500",
              };
              const busy = actionLoading === account.id;
              const permissions = permissionSummary(account);

              return (
                <li
                  key={account.id}
                  className="overflow-hidden rounded-lg border border-kova-border bg-white"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      {account.profile_picture_url ? (
                        <img
                          src={account.profile_picture_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-kova-orange/30"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kova-orange/15 text-sm font-bold text-kova-orange ring-2 ring-kova-orange/20">
                          {PLATFORM_SHORT[account.platform] ?? "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-kova-dark">
                          {account.account_name ||
                            account.account_username ||
                            account.platform_account_id}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-gray-500">
                            {PLATFORM_LABELS[account.platform] ??
                              account.platform}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${status.bg} ${status.text}`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`}
                            />
                            {permissions.hasGap && account.connection_status === "connected"
                              ? "Partial access"
                              : status.label}
                          </span>
                          {permissions.total > 0 && (
                            <span className="text-gray-400">
                              {permissions.granted}/{permissions.total} permissions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {account.connection_status !== "revoked" && (
                        <>
                          {permissions.hasGap && (
                            <button
                              type="button"
                              onClick={() =>
                                connectMeta(
                                  oauthPlatformForAccount(account.platform),
                                  true,
                                )
                              }
                              disabled={busy}
                              className="inline-flex h-9 items-center rounded-md bg-kova-orange px-3 text-sm font-semibold text-kova-dark transition hover:bg-[#f0a46e] disabled:opacity-60"
                            >
                              Allow missing permissions
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleVerify(account)}
                            disabled={busy}
                            className="inline-flex h-9 items-center rounded-md border border-kova-border bg-white px-3 text-sm font-semibold text-kova-dark transition hover:border-kova-green disabled:opacity-60"
                          >
                            {busy ? "Checking…" : "Verify token"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(account)}
                            disabled={busy}
                            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-gray-400 transition hover:text-red-600 disabled:opacity-60"
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {account.connection_error && (
                    <div className="border-t border-kova-border bg-red-50 px-5 py-3 text-sm text-red-600">
                      {account.connection_error}
                    </div>
                  )}
                  {account.capabilities?.length > 0 && (
                    <div className="border-t border-kova-border px-5 py-4">
                      {permissions.hasGap && (
                        <div className="mb-4 rounded-lg border border-kova-orange/35 bg-kova-orange/10 px-4 py-3 text-sm leading-6 text-kova-dark">
                          <p className="font-semibold">
                            Kova needs a few more Facebook permissions
                          </p>
                          <p className="mt-1 text-gray-700">
                            Publishing and reading comments work today. To reply
                            to comments and Page messages, open Facebook again
                            and approve the remaining permissions.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              connectMeta(
                                oauthPlatformForAccount(account.platform),
                                true,
                              )
                            }
                            disabled={busy}
                            className="mt-3 inline-flex h-9 items-center rounded-md bg-kova-orange px-4 text-sm font-semibold text-kova-dark hover:bg-[#f0a46e] disabled:opacity-60"
                          >
                            Allow missing permissions
                          </button>
                        </div>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        What Kova can do on this account
                      </p>
                      <ul className="mt-3 space-y-1 text-sm">
                        {account.capabilities.map((item) => (
                          <li
                            key={item.scope}
                            className="flex items-center justify-between gap-3 rounded-md px-2 py-2 even:bg-kova-background/80"
                          >
                            <span className="text-kova-dark">{item.label}</span>
                            <span
                              className={
                                item.available
                                  ? "font-semibold text-kova-green"
                                  : "font-medium text-kova-orange"
                              }
                            >
                              {item.available ? "Granted" : "Not granted yet"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
