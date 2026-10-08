import {
  apiRequest,
  authenticatedApiRequest,
} from "./api";


/**
 * Information about the authenticated Kova user.
 */
export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}


/**
 * Response returned by the login endpoint.
 *
 * The refresh token is not included because Django stores it
 * inside an HttpOnly cookie.
 */
export interface LoginResponse {
  access: string;
  user: AuthUser;
}


/**
 * Credentials required to authenticate a Kova user.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}


/**
 * Information required to create a Kova account.
 */
export interface SignupCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}


/**
 * Authenticate an existing Kova user.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/auth/login/",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );
}


/**
 * Create a new Kova user account.
 *
 * Account creation is handled by Django. Authentication is
 * intentionally separate and will be performed by the signup
 * page after the account has been successfully created.
 */
export async function signup(
  credentials: SignupCredentials,
): Promise<AuthUser> {
  return apiRequest<AuthUser>(
    "/auth/signup/",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );
}

/**
 * Retrieve the currently authenticated Kova user.
 *
 * The backend determines the user's identity from the supplied
 * access token rather than accepting a user ID from the frontend.
 */
export async function getCurrentUser(
  accessToken: string,
): Promise<AuthUser> {
  return authenticatedApiRequest<AuthUser>(
    "/auth/me/",
    accessToken,
  );
}

/**
 * End the current Kova authentication session.
 *
 * The access token is required because the backend only allows
 * authenticated users to explicitly terminate their session.
 *
 * Django then removes the HttpOnly refresh-token cookie.
 */
export async function logout(
  accessToken: string,
): Promise<void> {
  await authenticatedApiRequest<void>(
    "/auth/logout/",
    accessToken,
    {
      method: "POST",
    },
  );
}