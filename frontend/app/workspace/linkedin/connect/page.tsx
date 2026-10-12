"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PlatformAvatar } from "@/components/social/platform-avatar";
import { PlatformBrandIcon } from "@/components/social/platform-brand";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
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

function ConnectContent() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectConfig, setConnectConfig] = useState<{
    redirect_uri: string;
    redirect_source: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function reloadProfile() {
    if (!accessToken) return;
    setProfile(await getProfessionalProfile(accessToken));
  }

  useEffect(() => {
    if (!accessToken) return;
    reloadProfile();
    getLinkedInConnectConfig(accessToken)
      .then((data) =>
        setConnectConfig({
          redirect_uri: data.redirect_uri,
          redirect_source: data.redirect_source,
        }),
      )
      .catch(() => setConnectConfig(null));
  }, [accessToken]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setMessage("LinkedIn connected.");
      void reloadProfile();
    }
    const err = searchParams.get("error");
    if (err) {
      const messages: Record<string, string> = {
        callback: "We couldn't finish connecting LinkedIn. Please try again.",
        token: "We couldn't finish connecting LinkedIn. Please try again.",
        state: "This link expired. Click Connect LinkedIn again.",
        state_expired: "This session expired. Click Connect LinkedIn again.",
        profile: "Complete your LinkedIn workspace setup, then try connecting again.",
        member: "LinkedIn connected, but we couldn't load your profile. Try Sync profile.",
        proxy: "We couldn't finish connecting LinkedIn. Please try again.",
        api_unreachable: "We couldn't finish connecting LinkedIn. Please try again.",
      };
      setMessage(
        messages[err] ??
          "We couldn't finish connecting LinkedIn. Please try again.",
      );
    }
  }, [searchParams]);

  async function connect() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { url } = await getLinkedInOAuthUrl(accessToken);
      window.location.href = url;
    } catch {
      setMessage(
        "We couldn't start LinkedIn sign-in. Please try again later.",
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
      setMessage("LinkedIn profile refreshed for Kova's brain.");
    } catch {
      setMessage("Could not refresh LinkedIn profile. Try reconnecting.");
    } finally {
      setRefreshing(false);
    }
  }

  async function disconnect() {
    if (!accessToken) return;
    await disconnectLinkedIn(accessToken);
    await reloadProfile();
    setMessage("Disconnected.");
  }

  const linkedin = profile?.linkedin;
  const statusKey = linkedin?.connection_status ?? "disconnected";
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.disconnected;
  const displayName =
    linkedin?.display_name ||
    linkedin?.profile_knowledge?.name ||
    "LinkedIn account";
  const photoUrl = linkedin?.profile_knowledge?.photo_url;

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          eyebrow="Connect"
          title="LinkedIn"
          description="Optional for v1: copy drafts into LinkedIn anytime. With OAuth, Kova can publish text posts and run your schedule."
          actions={
            <button
              type="button"
              disabled={loading}
              onClick={connect}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-kova-orange/15 px-3 text-sm font-semibold text-kova-dark ring-1 ring-kova-orange/40 transition hover:bg-kova-orange/25 disabled:opacity-60"
            >
              <PlatformBrandIcon platform="linkedin" size={18} />
              {loading ? "Opening LinkedIn…" : "Connect LinkedIn"}
            </button>
          }
        />

        <div className="h-px bg-kova-border" />

        {message && (
          <p className="rounded-lg border border-kova-green/30 bg-kova-green/5 px-4 py-3 text-sm text-kova-dark">
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
                <p className="font-semibold text-kova-dark">{displayName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-gray-500">
                    <PlatformBrandIcon platform="linkedin" size={14} />
                    LinkedIn
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${status.bg} ${status.text}`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`}
                    />
                    {status.label}
                  </span>
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
                  onClick={disconnect}
                  className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-gray-400 transition hover:text-red-600"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {!linkedin?.configured && (
            <div className="border-t border-kova-border bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Server env LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not
              set yet.
            </div>
          )}

          {connectConfig?.redirect_uri && (
            <div className="border-t border-kova-border px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
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
