"use client";

import { useEffect, useState } from "react";

import { PostCard } from "@/components/linkedin/post-card";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import {
  approvePost,
  getProfessionalProfile,
  listProfessionalPosts,
  markPostCopied,
  publishPost,
  schedulePost,
  updateProfessionalPost,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function LinkedInCalendarPage() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      listProfessionalPosts(accessToken),
      getProfessionalProfile(accessToken),
    ]).then(([postList, prof]) => {
      setPosts(postList);
      setProfile(prof);
    });
  }, [accessToken]);

  function refreshPost(updated: ProfessionalPost) {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }

  const scheduled = posts.filter((p) => p.scheduled_at);
  const drafts = posts.filter((p) => !p.scheduled_at && p.status !== "published");

  const mode = profile?.operating_mode ?? "approval";

  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <h1 className="text-2xl font-semibold">Calendar</h1>

        <section>
          <h2 className="text-lg font-semibold">Scheduled</h2>
          {scheduled.length === 0 ? (
            <p className="mt-2 text-sm text-kova-muted">Nothing scheduled yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {scheduled.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  operatingMode={mode}
                  onSave={async (body) => {
                    if (!accessToken) return;
                    refreshPost(
                      await updateProfessionalPost(accessToken, post.id, {
                        body,
                      }),
                    );
                  }}
                  onApprove={async () => {
                    if (!accessToken) return;
                    refreshPost(await approvePost(accessToken, post.id));
                  }}
                  onSchedule={async (iso) => {
                    if (!accessToken) return;
                    refreshPost(await schedulePost(accessToken, post.id, iso));
                  }}
                  onPublish={async () => {
                    if (!accessToken) return;
                    const result = await publishPost(accessToken, post.id);
                    refreshPost(result.post);
                  }}
                  onCopied={async () => {
                    if (!accessToken) return;
                    refreshPost(await markPostCopied(accessToken, post.id));
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Drafts & queue</h2>
          <div className="mt-4 space-y-4">
            {drafts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                operatingMode={mode}
                onSave={async (body) => {
                  if (!accessToken) return;
                  refreshPost(
                    await updateProfessionalPost(accessToken, post.id, { body }),
                  );
                }}
                onApprove={async () => {
                  if (!accessToken) return;
                  refreshPost(await approvePost(accessToken, post.id));
                }}
                onSchedule={async (iso) => {
                  if (!accessToken) return;
                  refreshPost(await schedulePost(accessToken, post.id, iso));
                }}
                onPublish={async () => {
                  if (!accessToken) return;
                  const result = await publishPost(accessToken, post.id);
                  refreshPost(result.post);
                }}
                onCopied={async () => {
                  if (!accessToken) return;
                  refreshPost(await markPostCopied(accessToken, post.id));
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </WorkspacePageFrame>
  );
}
