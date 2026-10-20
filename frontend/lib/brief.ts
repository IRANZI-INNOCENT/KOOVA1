import { authenticatedApiRequest } from "./api";

export interface BriefMetric {
  label: string;
  value: number | string;
  change: "up" | "down" | "steady" | null;
}

export interface BriefItem {
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
}

export interface BriefSections {
  pulse: {
    summary: string;
    metrics: BriefMetric[];
  };
  pending: {
    summary: string;
    items: BriefItem[];
  };
  opportunities: {
    summary: string;
    items: BriefItem[];
  };
  performance: {
    summary: string;
    highlights: string[];
  };
  plan: {
    summary: string;
    steps: string[];
  };
  kova_actions: {
    completed: string[];
    planned: string[];
    needs_approval: string[];
  };
}

export interface MorningBrief {
  id: number;
  business: number;
  date: string;
  status: "generating" | "ready" | "failed";
  greeting: string;
  sections: BriefSections;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportSections {
  summary: {
    headline: string;
    metrics: BriefMetric[];
  };
  wins: {
    summary: string;
    items: BriefItem[];
  };
  gaps: {
    summary: string;
    items: BriefItem[];
  };
  channels: {
    summary: string;
    highlights: string[];
  };
  commerce: {
    summary: string;
    highlights: string[];
  };
  next_week: {
    summary: string;
    steps: string[];
  };
}

export interface WeeklyReport {
  id: number;
  business: number;
  week_start: string;
  status: "generating" | "ready" | "failed";
  greeting: string;
  sections: WeeklyReportSections;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export async function getLatestBrief(
  businessId: number,
  token: string,
): Promise<MorningBrief> {
  return authenticatedApiRequest<MorningBrief>(
    `/brief/${businessId}/latest/`,
    token,
  );
}

export async function generateBrief(
  businessId: number,
  token: string,
  force = false,
): Promise<MorningBrief> {
  return authenticatedApiRequest<MorningBrief>(
    `/brief/${businessId}/latest/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    },
  );
}

export async function getBriefHistory(
  businessId: number,
  token: string,
): Promise<MorningBrief[]> {
  return authenticatedApiRequest<MorningBrief[]>(
    `/brief/${businessId}/history/`,
    token,
  );
}

export async function getLatestWeeklyReport(
  businessId: number,
  token: string,
): Promise<WeeklyReport> {
  return authenticatedApiRequest<WeeklyReport>(
    `/brief/${businessId}/weekly/latest/`,
    token,
  );
}

export async function generateWeeklyReport(
  businessId: number,
  token: string,
  force = false,
): Promise<WeeklyReport> {
  return authenticatedApiRequest<WeeklyReport>(
    `/brief/${businessId}/weekly/latest/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    },
  );
}

export async function getWeeklyReportHistory(
  businessId: number,
  token: string,
): Promise<WeeklyReport[]> {
  return authenticatedApiRequest<WeeklyReport[]>(
    `/brief/${businessId}/weekly/history/`,
    token,
  );
}
