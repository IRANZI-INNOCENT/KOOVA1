"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import {
  getProfessionalProfile,
  listProfessionalPosts,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function LinkedInHomePage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      getProfessionalProfile(accessToken),
      listProfessionalPosts(accessToken),
    ])
      .then(([prof, postList]) => {
        setProfile(prof);
        setPosts(postList.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <WorkspacePageFrame>
        <PageSkeleton />
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-kova-ink">
            LinkedIn workspace
          </h1>
          <p className="mt-1 text-sm text-kova-muted">
            {profile?.headline ||
              "Set up your profile and pillars, then run a topic week or capture an event."}
          </p>
          <p className="mt-2 text-xs text-kova-muted">
            Mode:{" "}
            <span className="font-medium capitalize">
              {profile?.operating_mode ?? "approval"}
            </span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/workspace/linkedin/topic-week"
            className="rounded-xl border border-kova-border bg-white p-4 shadow-sm hover:border-kova-green/40"
          >
            <h2 className="font-semibold">Topic week</h2>
            <p className="mt-1 text-sm text-kova-muted">
              Plan three posts around one theme for the week.
            </p>
          </Link>
          <Link
            href="/workspace/linkedin/event"
            className="rounded-xl border border-kova-border bg-white p-4 shadow-sm hover:border-kova-green/40"
          >
            <h2 className="font-semibold">Event moment</h2>
            <p className="mt-1 text-sm text-kova-muted">
              Upload a photo, answer one question, get a post arc.
            </p>
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-semibold">Recent posts</h2>
          {posts.length === 0 ? (
            <p className="mt-2 text-sm text-kova-muted">
              No drafts yet. Start a program above.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-lg border border-kova-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{post.title || "Untitled"}</span>
                  <span className="ml-2 capitalize text-kova-muted">
                    {post.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/workspace/linkedin/calendar"
            className="mt-3 inline-block text-sm font-medium text-kova-green"
          >
            Open calendar →
          </Link>
        </section>
      </div>
    </WorkspacePageFrame>
  );
}
