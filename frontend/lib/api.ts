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
    const record = data as Record<string, unknown>;
    const nonField = record.non_field_errors;
    if (
      Array.isArray(nonField) &&
      typeof nonField[0] === "string"
    ) {
      return nonField[0];
    }
    if (typeof record.detail === "string") {
      return record.detail;
    }

    const values = Object.values(record);

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(
        `${apiUrl()}/auth/refresh/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }

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


function cloneRequestBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (!(body instanceof FormData)) {
    return body;
  }
  /*
   * FormData can only be reliably sent once in some browsers. Clone before
   * each fetch so a 401 → retry still includes the file.
   */
  const clone = new FormData();
  for (const [key, value] of body.entries()) {
    clone.append(key, value);
  }
  return clone;
}


const DEFAULT_TIMEOUT_MS = 20000;

type ApiRequestInit = RequestInit & { timeoutMs?: number };

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = options;

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

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );
    if (requestOptions.signal) {
      if (requestOptions.signal.aborted) {
        controller.abort();
      } else {
        requestOptions.signal.addEventListener(
          "abort",
          () => controller.abort(),
          { once: true },
        );
      }
    }

    try {
      return await fetch(
        `${apiUrl()}${endpoint}`,
        {
          ...requestOptions,
          body: cloneRequestBody(requestOptions.body),
          credentials: "include",
          headers,
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new ApiError(
          "Kova took too long to respond. Refresh and try again.",
          408,
        );
      }
      throw new ApiError(
        "We could not reach Kova. Check your connection and try again.",
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }


  let response =
    await makeRequest(requestInit);


  if (
    response.status === 401 &&
    endpoint !== "/auth/refresh/"
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      response = await makeRequest({
        ...requestInit,

        headers: {
          ...(requestInit.headers || {}),
          Authorization:
            `Bearer ${newAccessToken}`,
        },
      });
    }
  }


  if (!response.ok) {
    const errorData =
      await readErrorResponse(response);

    let message = extractApiErrorMessage(errorData);
    if (
      (response.status === 502 ||
        response.status === 503 ||
        response.status === 504) &&
      message.includes("could not finish")
    ) {
      message =
        "The Kova API is restarting or unavailable. Wait a minute, then refresh.";
    }

    throw new ApiError(message, response.status, errorData);
  }


  if (response.status === 204) {
    return undefined as T;
  }


  return response.json();
}


export async function authenticatedApiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: ApiRequestInit = {},
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