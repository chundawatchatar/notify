import type { ApiAuthResponse, ApiLoginRequest } from "@notify/api-client";
import { createContext, type ReactNode, useContext, useSyncExternalStore } from "react";
import {
  ApiRequestError,
  login as requestLogin,
  logout as requestLogout,
  refreshSession as requestRefreshSession,
} from "./api-client";

type AuthStatus = "anonymous" | "authenticated" | "error" | "initializing" | "unsupported";

type AuthPrincipal = Pick<ApiAuthResponse, "role" | "user" | "workspace">;

type AuthState = {
  accessToken?: string;
  error?: string;
  expiresAt?: number;
  principal?: AuthPrincipal;
  reason?: "expired";
  status: AuthStatus;
};

type AuthContextValue = AuthState & {
  authenticatedRequest: <Result>(
    request: (accessToken: string) => Promise<Result>,
  ) => Promise<Result>;
  retrySession: () => Promise<AuthState>;
  signIn: (request: ApiLoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const refreshLockName = "notify-auth-refresh";
const authChannelName = "notify-auth-events";
const refreshEarlyMilliseconds = 60_000;

class UnsupportedBrowserError extends Error {
  constructor() {
    super(
      "This browser cannot safely manage a rotating Notify session. Use a browser with Web Locks support.",
    );
    this.name = "UnsupportedBrowserError";
  }
}

class AuthClient {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<() => void>();
  private refreshPromise: Promise<ApiAuthResponse> | null = null;
  private refreshTimer: number | undefined;
  private started = false;
  private state: AuthState = { status: "initializing" };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    if (this.listeners.size === 1) {
      this.start();
    }

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  };

  getSnapshot = () => this.state;

  private start = () => {
    if (this.started || typeof window === "undefined") {
      return;
    }

    this.started = true;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(authChannelName);
      this.channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
        if (event.data?.type === "logout") {
          this.clearSession();
        }
      };
    }

    this.scheduleRefresh();
    void this.ensureSession();
  };

  private stop = () => {
    this.started = false;
    this.clearRefreshTimer();
    this.channel?.close();
    this.channel = null;
  };

  ensureSession = async (): Promise<AuthState> => {
    const sessionWasActive = this.state.status === "authenticated";

    if (
      sessionWasActive &&
      this.state.accessToken &&
      this.state.expiresAt &&
      this.state.expiresAt > Date.now()
    ) {
      return this.state;
    }

    if (this.state.status !== "initializing" && !sessionWasActive) {
      return this.state;
    }

    if (!sessionWasActive) {
      return this.retrySession();
    }

    try {
      await this.refreshCredential();
    } catch (error) {
      this.handleSessionFailure(error, true);
    }

    return this.state;
  };

  retrySession = async (): Promise<AuthState> => {
    const sessionWasActive = Boolean(this.state.accessToken);
    this.setState((current) => ({ ...current, error: undefined, status: "initializing" }));

    try {
      await this.refreshCredential();
    } catch (error) {
      this.handleSessionFailure(error, sessionWasActive);
    }

    return this.state;
  };

  signIn = async (request: ApiLoginRequest) => {
    if (typeof navigator === "undefined" || !navigator.locks) {
      throw new UnsupportedBrowserError();
    }

    const response = await requestLogin(request);
    this.applyAuthResponse(response);
  };

  signOut = async () => {
    await requestLogout(this.state.accessToken);
    this.clearSession();
    this.channel?.postMessage({ type: "logout" });
  };

  authenticatedRequest = async <Result,>(
    request: (accessToken: string) => Promise<Result>,
  ): Promise<Result> => {
    let accessToken = this.state.accessToken;

    if (!accessToken || !this.state.expiresAt || this.state.expiresAt <= Date.now()) {
      try {
        const refreshed = await this.refreshCredential();
        accessToken = refreshed.access_token;
      } catch (error) {
        this.handleSessionFailure(error, true);
        throw error;
      }
    }

    try {
      return await request(accessToken);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401) {
        throw error;
      }

      try {
        const refreshed = await this.refreshCredential();
        return request(refreshed.access_token);
      } catch (refreshError) {
        this.handleSessionFailure(refreshError, true);
        throw refreshError;
      }
    }
  };

  private applyAuthResponse(response: ApiAuthResponse) {
    this.setState({
      accessToken: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
      principal: {
        role: response.role,
        user: response.user,
        workspace: response.workspace,
      },
      status: "authenticated",
    });
  }

  private clearSession(reason?: "expired") {
    this.setState({ reason, status: "anonymous" });
  }

  private async refreshCredential() {
    if (typeof navigator === "undefined" || !navigator.locks) {
      throw new UnsupportedBrowserError();
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const promise = navigator.locks.request(refreshLockName, async () => {
      const response = await requestRefreshSession();
      this.applyAuthResponse(response);
      return response;
    });

    this.refreshPromise = promise;

    try {
      return await promise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private handleSessionFailure(error: unknown, sessionWasActive = false) {
    if (error instanceof UnsupportedBrowserError) {
      this.setState({ error: error.message, status: "unsupported" });
      return;
    }

    if (error instanceof ApiRequestError && error.status === 401) {
      this.clearSession(sessionWasActive ? "expired" : undefined);
      return;
    }

    this.setState((current) => ({
      ...current,
      error: errorMessage(error),
      status: "error",
    }));
  }

  private setState(next: AuthState | ((current: AuthState) => AuthState)) {
    this.state = typeof next === "function" ? next(this.state) : next;
    this.scheduleRefresh();

    for (const listener of this.listeners) {
      listener();
    }
  }

  private scheduleRefresh() {
    this.clearRefreshTimer();

    if (
      !this.started ||
      this.state.status !== "authenticated" ||
      !this.state.expiresAt ||
      typeof window === "undefined"
    ) {
      return;
    }

    const delay = Math.max(this.state.expiresAt - Date.now() - refreshEarlyMilliseconds, 1_000);

    this.refreshTimer = window.setTimeout(() => {
      void this.refreshCredential().catch((error: unknown) =>
        this.handleSessionFailure(error, true),
      );
    }, delay);
  }

  private clearRefreshTimer() {
    if (this.refreshTimer !== undefined && typeof window !== "undefined") {
      window.clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = undefined;
  }
}

function createAuthClient() {
  return new AuthClient();
}

function AuthProvider({ children, client }: Readonly<{ children: ReactNode; client: AuthClient }>) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const value: AuthContextValue = {
    ...state,
    authenticatedRequest: client.authenticatedRequest,
    retrySession: client.retrySession,
    signIn: client.signIn,
    signOut: client.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to reach Notify. Check your connection and try again.";
}

export type { AuthPrincipal, AuthState, AuthStatus };
export { AuthClient, AuthProvider, createAuthClient, UnsupportedBrowserError, useAuth };
