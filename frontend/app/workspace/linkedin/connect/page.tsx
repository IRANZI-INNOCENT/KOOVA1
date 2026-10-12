"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!accessToken) return;
    getProfessionalProfile(accessToken).then(setProfile);
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
    }
    const err = searchParams.get("error");
    if (err) {
      const messages: Record<string, string> = {
        callback: "LinkedIn returned but Kova could not finish connecting. Try again.",
        token:
          "LinkedIn rejected the token exchange. Confirm Client ID/Secret on the API service and that the redirect URL matches exactly.",
        state: "This sign-in link expired or was invalid. Click Connect LinkedIn again.",
        state_expired: "This sign-in session expired. Click Connect LinkedIn again.",
        profile: "Kova could not find your professional profile. Complete LinkedIn setup first.",
        member: "LinkedIn connected but Kova could not read your profile. Try Sync profile after connecting.",
        proxy:
          "The site is not proxying to the API. Set API_PROXY_TARGET on the site service and redeploy.",
        api_unreachable:
          "Kova could not reach the API service. Check that the API is running and API_PROXY_TARGET is correct.",
      };
      setMessage(messages[err] ?? `Connection issue: ${err}`);
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
        "LinkedIn OAuth is not configured on the server. Use Copy to publish posts manually.",
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
      setProfile(await getProfessionalProfile(accessToken));
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
    setProfile(await getProfessionalProfile(accessToken));
    setMessage("Disconnected.");
  }

  const linkedin = profile?.linkedin;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Connect LinkedIn</h1>
      <p className="mt-2 text-sm text-kova-muted">
        Optional for v1: you can always copy drafts into LinkedIn. When OAuth
        is configured, Kova can publish text posts and run your schedule.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-kova-cream px-3 py-2 text-sm">{message}</p>
      )}

      <div className="mt-6 rounded-xl border border-kova-border bg-white p-5">
        <p className="text-sm">
          Status:{" "}
          <span className="font-medium capitalize">
            {linkedin?.connection_status ?? "disconnected"}
          </span>
        </p>
        {linkedin?.display_name && (
          <p className="mt-1 text-sm text-kova-muted">{linkedin.display_name}</p>
        )}
        {!linkedin?.configured && (
          <p className="mt-3 text-sm text-amber-700">
            Server env LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not set
            yet.
          </p>
        )}
        {connectConfig?.redirect_uri && (
          <div className="mt-4 rounded-lg bg-kova-cream/80 px-3 py-2 text-xs text-kova-ink">
            <p className="font-semibold">LinkedIn redirect URL (must match exactly)</p>
            <p className="mt-1 break-all font-mono">{connectConfig.redirect_uri}</p>
            <p className="mt-2 text-kova-muted">
              Add this in LinkedIn Developer → Auth → Authorized redirect URLs.
              Kova builds it from{" "}
              <span className="font-medium">{connectConfig.redirect_source}</span>{" "}
              on the API service.
            </p>
          </div>
        )}
        {linkedin?.profile_knowledge?.available && (
          <div className="mt-4 space-y-1 text-sm text-kova-muted">
            {linkedin.profile_knowledge.headline && (
              <p>
                <span className="font-medium text-kova-ink">Headline: </span>
                {linkedin.profile_knowledge.headline}
              </p>
            )}
            {(linkedin.profile_knowledge.positions?.length ?? 0) > 0 && (
              <p>
                <span className="font-medium text-kova-ink">Roles: </span>
                {linkedin.profile_knowledge.positions?.slice(0, 4).join(" · ")}
              </p>
            )}
            {linkedin.profile_synced_at && (
              <p className="text-xs">
                Last synced{" "}
                {new Date(linkedin.profile_synced_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={loading} onClick={connect}>
            Connect LinkedIn
          </Button>
          {linkedin?.connection_status === "connected" && (
            <Button
              type="button"
              variant="outline"
              disabled={refreshing}
              onClick={refreshProfile}
            >
              {refreshing ? "Syncing…" : "Sync profile to brain"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LinkedInConnectPage() {
  return (
    <WorkspacePageFrame>
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
