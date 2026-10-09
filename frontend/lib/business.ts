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

  return businesses[0] ?? null;
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