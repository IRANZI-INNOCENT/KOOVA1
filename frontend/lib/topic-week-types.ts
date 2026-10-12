export interface TopicWeekPlanPost {
  arc_index: number;
  post_role: string;
  format: string;
  title: string;
  summary: string;
  hook_hint?: string;
  suggested_day: string;
}

export interface TopicWeekPlan {
  title: string;
  posts: TopicWeekPlanPost[];
}

export function parseTopicWeekPlan(raw: Record<string, unknown>): TopicWeekPlan {
  const posts = Array.isArray(raw.posts) ? raw.posts : [];
  return {
    title: typeof raw.title === "string" ? raw.title : "This week on LinkedIn",
    posts: posts.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        arc_index: Number(row.arc_index ?? index + 1),
        post_role: String(row.post_role ?? "authority"),
        format: String(row.format ?? "text"),
        title: String(row.title ?? `Post ${index + 1}`),
        summary: String(row.summary ?? ""),
        hook_hint:
          typeof row.hook_hint === "string" ? row.hook_hint : undefined,
        suggested_day: String(row.suggested_day ?? "Tuesday"),
      };
    }),
  };
}

export const POST_ROLE_LABELS: Record<string, string> = {
  authority: "Authority",
  take: "Point of view",
  story: "Story",
  conversation: "Conversation",
  event: "Event",
};

export const FORMAT_LABELS: Record<string, string> = {
  text: "Text post",
  carousel_outline: "Carousel outline",
};
