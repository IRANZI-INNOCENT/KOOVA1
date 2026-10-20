import { authenticatedApiRequest, apiRequest } from "./api";

export interface EmailPreference {
  account: boolean;
  alerts: boolean;
  commerce: boolean;
  reports: boolean;
  updated_at?: string;
  email?: string;
}

export async function getEmailPreferences(
  token: string,
): Promise<EmailPreference> {
  return authenticatedApiRequest<EmailPreference>(
    "/notifications/preferences/",
    token,
  );
}

export async function updateEmailPreferences(
  token: string,
  data: Partial<EmailPreference>,
): Promise<EmailPreference> {
  return authenticatedApiRequest<EmailPreference>(
    "/notifications/preferences/",
    token,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function getEmailPreferencesByToken(
  token: string,
): Promise<EmailPreference> {
  return apiRequest<EmailPreference>(
    `/notifications/preferences/public/?token=${encodeURIComponent(token)}`,
  );
}

export async function updateEmailPreferencesByToken(
  token: string,
  data: Partial<EmailPreference>,
): Promise<EmailPreference> {
  return apiRequest<EmailPreference>("/notifications/preferences/public/", {
    method: "PATCH",
    body: JSON.stringify({ token, ...data }),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/notifications/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(input: {
  uid: string;
  token: string;
  password: string;
}): Promise<void> {
  await apiRequest("/notifications/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
