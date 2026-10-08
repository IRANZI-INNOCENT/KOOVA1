"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  login,
  logout,
  type AuthUser,
  type LoginCredentials,
} from "./auth";

import {
  apiRequest,
  registerAccessTokenUpdater,
} from "./api";


/**
 * Authentication state and actions exposed to the Kova frontend.
 */
interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  signIn: (
    credentials: LoginCredentials,
  ) => Promise<void>;

  signOut: () => Promise<void>;
}


/**
 * React context used to make authentication state available
 * throughout the Kova application.
 */
const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);


/**
 * Props accepted by the authentication provider.
 */
interface AuthProviderProps {
  children: ReactNode;
}


/**
 * Provide authentication state to the Kova frontend.
 *
 * The access token is intentionally kept in React memory rather
 * than localStorage.
 *
 * The longer-lived refresh token is handled by Django through
 * an HttpOnly cookie.
 */
export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);


  /**
   * Register AuthProvider's token state with the API layer.
   *
   * This allows apiRequest() to update the same access token
   * whenever it performs an automatic token refresh.
   */
  useEffect(() => {
    const unregister =
      registerAccessTokenUpdater(
        setAccessToken,
      );

    return unregister;
  }, []);


  /**
   * Attempt to restore an existing authentication session.
   *
   * The refresh token remains inside Django's HttpOnly cookie.
   * We exchange that cookie for a short-lived access token,
   * then use the access token to retrieve the authenticated user.
   */
  useEffect(() => {
    async function restoreSession() {
      try {
        const response =
          await apiRequest<{
            access: string;
          }>(
            "/auth/refresh/",
            {
              method: "POST",
            },
          );

        const restoredUser =
          await getCurrentUser(
            response.access,
          );

        setAccessToken(
          response.access,
        );

        setUser(
          restoredUser,
        );

      } catch (error) {
        /**
         * A missing or expired refresh session is normal for
         * a new visitor. In that case Kova starts unauthenticated.
         */
        console.error(
          "Kova session restoration failed:",
          error,
        );

        setAccessToken(null);
        setUser(null);

      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);


  /**
   * Authenticate a user through Django.
   *
   * Successful authentication updates the application state
   * with the user information and short-lived access token.
   */
  async function signIn(
    credentials: LoginCredentials,
  ): Promise<void> {
    const response =
      await login(credentials);

    setAccessToken(
      response.access,
    );

    setUser(
      response.user,
    );
  }


  /**
   * End the current Kova authentication session.
   *
   * The backend requires the current access token to authenticate
   * the logout request. Once the backend removes the refresh cookie,
   * the frontend clears its in-memory authentication state.
   */
  async function signOut(): Promise<void> {
    try {
      if (accessToken) {
        await logout(accessToken);
      }
    } finally {
      /**
       * Clear the frontend state even if the backend request fails.
       */
      setAccessToken(null);
      setUser(null);
    }
  }


  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    isAuthenticated:
      accessToken !== null &&
      user !== null,
    signIn,
    signOut,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


/**
 * Access Kova authentication state from a React component.
 *
 * Components must be rendered inside AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}