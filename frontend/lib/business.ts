import {
  authenticatedApiRequest,
} from "@/lib/api";


export interface Business {
  id: number;
  owner: number;
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  has_facebook_page?: boolean;
  created_at: string;
  updated_at: string;
}


export interface CreateBusinessPayload {
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
}


export const ACTIVE_BUSINESS_STORAGE_KEY = "kova_active_business_id";

export function getStoredActiveBusinessId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function setStoredActiveBusinessId(businessId: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    ACTIVE_BUSINESS_STORAGE_KEY,
    String(businessId),
  );
}

export type BusinessPickCandidate = {
  id: number;
  created_at?: string;
};

/** First-created business is the default brain; user can switch in the shell. */
export function pickActiveBusiness<T extends BusinessPickCandidate>(
  businesses: readonly T[],
  preferredId?: number | null,
): T {
  if (!businesses.length) {
    throw new Error("No business is configured.");
  }
  const preferred =
    preferredId ?? getStoredActiveBusinessId();
  if (preferred != null) {
    const match = businesses.find((item) => item.id === preferred);
    if (match) {
      return match;
    }
  }
  const sorted = [...businesses].sort((a, b) => {
    const aTime = a.created_at
      ? new Date(a.created_at).getTime()
      : 0;
    const bTime = b.created_at
      ? new Date(b.created_at).getTime()
      : 0;
    return aTime - bTime;
  });
  return sorted[0];
}

export async function getBusinesses(
  token: string,
): Promise<Business[]> {
  return authenticatedApiRequest<Business[]>(
    "/businesses/",
    token,
  );
}


export async function getCurrentBusiness(
  token: string,
): Promise<Business | null> {
  const businesses =
    await getBusinesses(token);

  if (!businesses.length) {
    return null;
  }
  return pickActiveBusiness(businesses);
}


export async function updateBusiness(
  token: string,
  businessId: number,
  payload: Partial<CreateBusinessPayload>,
): Promise<Business> {
  return authenticatedApiRequest<Business>(
    `/businesses/${businessId}/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function createBusiness(
  token: string,
  payload: CreateBusinessPayload,
): Promise<Business> {
  return authenticatedApiRequest<Business>(
    "/businesses/",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}