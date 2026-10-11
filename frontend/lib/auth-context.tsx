"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  registerAccessTokenUpdater,
} from "./api";

import {
  renewSession,
  startSessionKeepAlive,
} from "./session-keep-alive";


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


const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );


interface AuthProviderProps {
  children: ReactNode;
}


/**
 * Central authentication provider for Kova.
 *
 * Authentication architecture:
 *
 * - Access token lives only in React memory.
 * - Refresh token lives inside Django's HttpOnly cookie.
 * - The provider restores the session once when the application starts.
 * - Protected pages must wait until isLoading becomes false before
 *   deciding whether to redirect.
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
   * Prevent duplicate session initialization.
   *
   * React Strict Mode can mount/effect components more than once
   * during development. This guard ensures that Kova does not
   * perform competing session restoration requests.
   */
  const initializationStarted =
    useRef(false);


  /**
   * Keep the API layer synchronized with the access token
   * held by this provider.
   */
  useEffect(() => {
    return registerAccessTokenUpdater(
      setAccessToken,
    );
  }, []);


  /**
   * Restore an existing authentication session.
   *
   * The refresh token is never exposed to JavaScript.
   * Django reads the HttpOnly cookie and returns a new
   * short-lived access token.
   */
  useEffect(() => {

    if (initializationStarted.current) {
      return;
    }

    initializationStarted.current = true;


    async function restoreSession(): Promise<void> {

      const restored = await renewSession();

      if (restored.ok) {
        const restoredUser = await getCurrentUser(
          restored.access,
        );

        setAccessToken(restored.access);
        setUser(restoredUser);
      } else {
        /**
         * A missing refresh session is normal for a new
         * or signed-out visitor.
         */
        setAccessToken(null);
        setUser(null);
      } finally {

        /**
         * Protected routes may now safely evaluate
         * isAuthenticated.
         */
        setIsLoading(false);

      }
    }


    restoreSession();

  }, []);


  /**
   * While signed in, renew tokens in the background so the installed PWA
   * and browser tab stay authenticated without manual login.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return startSessionKeepAlive(
      (token) => {
        setAccessToken(token);
      },
      () => {
        setAccessToken(null);
        setUser(null);
      },
    );
  }, [user]);


  /**
   * Authenticate a user.
   *
   * Login returns:
   *
   * - a short-lived access token
   * - authenticated user information
   *
   * Django simultaneously creates the HttpOnly
   * refresh-token cookie.
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
   * End the current authentication session.
   */
  async function signOut(): Promise<void> {

    try {

      if (accessToken) {

        await logout(
          accessToken,
        );

      }

    } finally {

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
 * Access the Kova authentication state.
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