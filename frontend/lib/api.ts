import { getBrowserApiBaseUrl } from "./api-config";

function apiUrl(): string {
  return getBrowserApiBaseUrl();
}


export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}


let updateAccessToken:
  | ((token: string | null) => void)
  | null = null;


export function registerAccessTokenUpdater(
  updater: (token: string | null) => void,
): () => void {
  updateAccessToken = updater;

  return () => {
    updateAccessToken = null;
  };
}


function extractApiErrorMessage(
  data: unknown,
): string {
  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.includes("<head>")
    ) {
      return "Kova could not finish that request. Please try again.";
    }
    return trimmed.length > 400
      ? "Kova could not finish that request. Please try again."
      : trimmed;
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const values = Object.values(
      data as Record<string, unknown>,
    );

    for (const value of values) {
      if (typeof value === "string") {
        return value;
      }

      if (
        Array.isArray(value) &&
        value.length > 0
      ) {
        const firstMessage = value[0];

        if (typeof firstMessage === "string") {
          return firstMessage;
        }
      }
    }
  }

  return "Something went wrong. Please try again.";
}


async function readErrorResponse(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}


async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(
      `${apiUrl()}/auth/refresh/`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.access !== "string"
    ) {
      return null;
    }

    updateAccessToken?.(
      data.access,
    );

    return data.access;

  } catch {
    return null;
  }
}


export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  async function makeRequest(
    requestOptions: RequestInit,
  ): Promise<Response> {

    const isFormData =
      requestOptions.body instanceof FormData;

    const headers = new Headers(
      requestOptions.headers,
    );

    /*
     * Never manually set Content-Type for FormData.
     *
     * The browser must add the multipart boundary itself.
     */
    if (isFormData) {
      headers.delete(
        "Content-Type",
      );
    } else if (
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    return fetch(
      `${apiUrl()}${endpoint}`,
      {
        ...requestOptions,
        credentials: "include",
        headers,
      },
    );
  }


  let response =
    await makeRequest(options);


  if (
    response.status === 401 &&
    endpoint !== "/auth/refresh/"
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      response = await makeRequest({
        ...options,

        headers: {
          ...(options.headers || {}),
          Authorization:
            `Bearer ${newAccessToken}`,
        },
      });
    }
  }


  if (!response.ok) {
    const errorData =
      await readErrorResponse(response);

    throw new ApiError(
      extractApiErrorMessage(
        errorData,
      ),
      response.status,
      errorData,
    );
  }


  if (response.status === 204) {
    return undefined as T;
  }


  return response.json();
}


export async function authenticatedApiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  return apiRequest<T>(
    endpoint,
    {
      ...options,

      headers: {
        ...(options.headers || {}),
        Authorization:
          `Bearer ${accessToken}`,
      },
    },
  );
}