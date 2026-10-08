const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";


/**
 * Structured error returned by the Kova API layer.
 *
 * Keeping the error format consistent means UI components do not
 * need to understand Django REST Framework's response structure.
 */
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


/**
 * AuthProvider registers this callback so the API layer can
 * update the access token held in React memory after a refresh.
 */
let updateAccessToken:
  | ((token: string | null) => void)
  | null = null;


/**
 * Register the function used to update the access token.
 *
 * The returned cleanup function is used when AuthProvider
 * is unmounted.
 */
export function registerAccessTokenUpdater(
  updater: (token: string | null) => void,
): () => void {
  updateAccessToken = updater;

  return () => {
    updateAccessToken = null;
  };
}


/**
 * Extract a human-readable message from a Django REST Framework
 * error response.
 */
function extractApiErrorMessage(
  data: unknown,
): string {
  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data === "string") {
    return data;
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


/**
 * Safely read an API error response.
 *
 * We read the body only once. Django normally returns JSON,
 * but this also handles plain-text responses.
 */
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


/**
 * Refresh the short-lived access token using Django's
 * HttpOnly refresh-token cookie.
 *
 * The refresh token itself is never exposed to JavaScript.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_URL}/auth/refresh/`,
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

    /**
     * Keep AuthProvider synchronized with the new token.
     */
    updateAccessToken?.(data.access);

    return data.access;

  } catch {
    return null;
  }
}


/**
 * Make an HTTP request to the Kova API.
 *
 * credentials: "include" allows the browser to send Kova's
 * HttpOnly refresh-token cookie to Django.
 *
 * If the server returns 401, we attempt one access-token refresh
 * and retry the original request.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  /**
   * Keep the actual fetch operation in one place so the same
   * request can safely be retried after token refresh.
   */
  async function makeRequest(
    requestOptions: RequestInit,
  ): Promise<Response> {
    return fetch(
      `${API_URL}${endpoint}`,
      {
        ...requestOptions,

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          ...(requestOptions.headers || {}),
        },
      },
    );
  }


  let response =
    await makeRequest(options);


  /**
   * If Django rejects the current access token, attempt to
   * obtain a fresh token from the HttpOnly refresh cookie.
   *
   * We do not attempt this for the refresh endpoint itself,
   * which prevents an infinite refresh loop.
   */
  if (
    response.status === 401 &&
    endpoint !== "/auth/refresh/"
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      /**
       * Retry the original request with the newly issued token.
       */
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


  /**
   * Convert Django's error response into our consistent ApiError.
   *
   * The body is read exactly once, avoiding the
   * "body stream already read" browser error.
   */
  if (!response.ok) {
    const errorData =
      await readErrorResponse(response);

    throw new ApiError(
      extractApiErrorMessage(errorData),
      response.status,
      errorData,
    );
  }


  /**
   * Some endpoints, such as logout, may intentionally return
   * an empty response body.
   */
  if (response.status === 204) {
    return undefined as T;
  }


  return response.json();
}


/**
 * Make an authenticated HTTP request to the Kova API.
 *
 * The short-lived access token is sent as a Bearer token.
 * The refresh token remains inside Django's HttpOnly cookie.
 */
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