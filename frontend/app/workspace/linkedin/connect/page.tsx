"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PlatformAvatar } from "@/components/social/platform-avatar";
import { PlatformBrandIcon } from "@/components/social/platform-brand";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  disconnectLinkedIn,
  getLinkedInConnectConfig,
  getLinkedInOAuthUrl,
  refreshLinkedInProfile,
  getProfessionalProfile,
  type ProfessionalProfile,
} from "@/lib/professional";

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
  disconnected: {
    label: "Not connected",
    dot: "bg-gray-300",
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
  expired: {
    label: "Token expired",
    dot: "bg-kova-orange",
    bg: "bg-kova-orange/10",
    text: "text-kova-orange",
  },
  error: {
    label: "Error",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
  },
};

const RETURN_MESSAGES: Record<string, string> = {
  access_denied: "LinkedIn sign-in was cancelled. Connect again when you're ready.",
  scope:
    "LinkedIn refused a permission. The app needs Sign In with OpenID and Share on LinkedIn.",
  token:
    "LinkedIn didn't accept the connection. The redirect URL in the app must match the one below.",
  member: "LinkedIn is connected. Use Sync profile to load your name and photo.",
  state: "That connection link expired. Click Connect LinkedIn again.",
  state_expired: "That connection link expired. Click Connect LinkedIn again.",
  profile: "Sign in again, then connect LinkedIn.",
  proxy: "We couldn't finish connecting LinkedIn. Please try again.",
  api_unreachable: "We couldn't reach Kova to finish connecting LinkedIn.",
  callback: "We couldn't finish connecting LinkedIn. Please try again.",
};

function ConnectContent() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [connectConfig, setConnectConfig] = useState<{
    redirect_uri: string;
    redirect_source: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function reloadProfile() {
    if (!accessToken) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      setProfile(await getProfessionalProfile(accessToken));
    } catch (err) {
      setMessageTone("error");
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Could not load the LinkedIn connection.",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) {
      setProfileLoading(false);
      return;
    }
    void reloadProfile();
    getLinkedInConnectConfig(accessToken)
      .then((data) =>
        setConnectConfig({
          redirect_uri: data.redirect_uri,
          redirect_source: data.redirect_source,
        }),
      )
      .catch(() => setConnectConfig(null));
    // Reload when the session token changes, including after OAuth returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    const connected = searchParams.get("connected") === "1";
    const err = searchParams.get("error");
    const detail = searchParams.get("detail");
    const profilePending = searchParams.get("profile") === "pending";
    if (!connected && !err) return;

    if (connected) {
      setMessageTone("success");
      setMessage(
        profilePending
          ? "LinkedIn is connected. Use Sync profile if your name does not appear yet."
          : "LinkedIn connected.",
      );
      if (accessToken) void reloadProfile();
    } else if (err) {
      setMessageTone("error");
      setMessage(
        detail ||
          RETURN_MESSAGES[err] ||
          "We couldn't finish connecting LinkedIn. Please try again.",
      );
    }
    router.replace("/workspace/linkedin/connect");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, accessToken, router]);

  async function connect() {
    if (!accessToken) return;
    setLoading(true);
    setMessage("");
    try {
      const { url } = await getLinkedInOAuthUrl(accessToken);
      window.location.href = url;
    } catch (err) {
      setMessageTone("error");
      setMessage(
        err instanceof ApiError
          ? err.message
          : "We couldn't start LinkedIn sign-in. Please try again later.",
      );
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (!accessToken) return;
    setRefreshing(true);
    setMessage("");
    try {
      await refreshLinkedInProfile(accessToken);
      await reloadProfile();
      setMessageTone("success");
      setMessage("LinkedIn profile refreshed.");
    } catch (err) {
      setMessageTone("error");
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Could not refresh LinkedIn profile. Try reconnecting.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function disconnect() {
    if (!accessToken || disconnecting) return;
    if (!window.confirm("Disconnect LinkedIn? Kova will stop publishing to this account.")) {
      return;
    }
    setDisconnecting(true);
    setMessage("");
    try {
      await disconnectLinkedIn(accessToken);
      await reloadProfile();
      setMessageTone("success");
      setMessage("LinkedIn disconnected.");
    } catch (err) {
      setMessageTone("error");
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Could not disconnect LinkedIn. Please try again.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  const linkedin = profile?.linkedin;
  const statusKey = profileLoading
    ? "disconnected"
    : (linkedin?.connection_status ?? "disconnected");
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.disconnected;
  const needsReconnect = statusKey === "expired" || statusKey === "error";
  const connectLabel = loading
    ? "Opening LinkedIn…"
    : statusKey === "connected" || needsReconnect
      ? "Reconnect LinkedIn"
      : "Connect LinkedIn";
  const displayName =
    linkedin?.display_name ||
    linkedin?.profile_knowledge?.name ||
    "LinkedIn account";
  const photoUrl = linkedin?.profile_knowledge?.photo_url;

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title="Connect LinkedIn"
          description="Copy drafts anytime — or connect so Kova can publish for you."
          actions={
            <button
              type="button"
              disabled={loading || profileLoading || linkedin?.configured === false}
              onClick={connect}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-kova-border bg-white px-3 text-sm font-semibold text-kova-dark transition hover:border-kova-dark disabled:opacity-60"
            >
              <PlatformBrandIcon platform="linkedin" size={18} />
              {connectLabel}
            </button>
          }
        />

        <div className="h-px bg-kova-border" />

        {message && (
          <p
            role={messageTone === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm ${
              messageTone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-kova-green/30 bg-kova-green/5 text-kova-dark"
            }`}
          >
            {message}
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <PlatformAvatar
                platform="linkedin"
                imageUrl={photoUrl}
                name={displayName}
                size="md"
              />
              <div>
                <p className="font-semibold text-kova-dark">
                  {profileLoading ? "Checking LinkedIn…" : displayName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-gray-500">
                    <PlatformBrandIcon platform="linkedin" size={14} />
                    LinkedIn
                  </span>
                  {!profileLoading && (
                    <span className={`font-medium ${status.text}`}>
                      {status.label}
                    </span>
                  )}
                </div>
                {linkedin?.profile_knowledge?.headline && (
                  <p className="mt-2 text-sm text-gray-600">
                    {linkedin.profile_knowledge.headline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {linkedin?.connection_status === "connected" && (
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={refreshProfile}
                  className="inline-flex h-9 items-center rounded-md border border-kova-border bg-white px-3 text-sm font-semibold text-kova-dark transition hover:border-kova-green disabled:opacity-60"
                >
                  {refreshing ? "Syncing…" : "Sync profile"}
                </button>
              )}
              {linkedin?.connection_status === "connected" && (
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={disconnect}
                  className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-gray-400 transition hover:text-red-600 disabled:opacity-60"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              )}
            </div>
          </div>

          {profile && linkedin && !linkedin.configured && (
            <div className="border-t border-kova-border bg-amber-50 px-5 py-3 text-sm text-amber-800">
              LinkedIn sign-in is not turned on for this workspace yet.
            </div>
          )}

          {connectConfig?.redirect_uri &&
            ((profile && linkedin && !linkedin.configured) ||
              messageTone === "error") && (
            <div className="border-t border-kova-border px-5 py-4">
              <p className="text-xs font-medium text-gray-500">
                Redirect URL (must match LinkedIn app)
              </p>
              <p className="mt-1 break-all font-mono text-xs text-kova-ink">
                {connectConfig.redirect_uri}
              </p>
              <p className="mt-2 text-xs text-kova-muted">
                Built from{" "}
                <span className="font-medium">{connectConfig.redirect_source}</span>{" "}
                on the API service.
              </p>
            </div>
          )}

          {linkedin?.profile_knowledge?.available && (
            <div className="border-t border-kova-border px-5 py-4 text-sm text-kova-muted">
              {(linkedin.profile_knowledge.positions?.length ?? 0) > 0 && (
                <p>
                  <span className="font-medium text-kova-ink">Roles: </span>
                  {linkedin.profile_knowledge.positions?.slice(0, 4).join(" · ")}
                </p>
              )}
              {linkedin.profile_synced_at && (
                <p className="mt-1 text-xs">
                  Last synced{" "}
                  {new Date(linkedin.profile_synced_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkedInConnectPage() {
  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-kova-muted">Loading…</div>
        }
      >
        <ConnectContent />
      </Suspense>
    </WorkspacePageFrame>
  );
}
