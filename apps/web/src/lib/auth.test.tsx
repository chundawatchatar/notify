import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { server } from "@/test/server";
import { AuthProvider, createAuthClient, useAuth } from "./auth";

const originalLocks = navigator.locks;
const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: originalLocks,
  });
  vi.unstubAllGlobals();
});

describe("authentication session", () => {
  it("restores the principal and clears it only after logout succeeds", async () => {
    expect.hasAssertions();
    installBrowserCoordination();
    let logoutCredentials: RequestCredentials | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
      http.delete(`${apiBaseUrl}/api/auth/session`, ({ request }) => {
        logoutCredentials = request.credentials;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const container = render(
      <AuthProvider client={createAuthClient()}>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitForText(container, "authenticated:Acme Cloud");
    click(container.querySelector("button") as HTMLButtonElement);
    await waitForText(container, "anonymous");

    expect(logoutCredentials).toBe("include");
  });

  it("serializes refresh rotation across provider instances", async () => {
    expect.hasAssertions();
    const coordination = installBrowserCoordination();
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    let refreshRequests = 0;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, async () => {
        refreshRequests += 1;
        activeRequests += 1;
        maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
        await Promise.resolve();
        activeRequests -= 1;
        return HttpResponse.json(authResponse());
      }),
    );

    const container = render(
      <>
        <AuthProvider client={createAuthClient()}>
          <AuthHarness />
        </AuthProvider>
        <AuthProvider client={createAuthClient()}>
          <AuthHarness />
        </AuthProvider>
      </>,
    );

    await waitFor(
      () =>
        Array.from(container.querySelectorAll("span")).filter(
          (element) => element.textContent === "authenticated:Acme Cloud",
        ).length === 2,
      "both providers to authenticate",
    );

    expect(refreshRequests).toBe(2);
    expect(coordination.request).toHaveBeenCalledTimes(2);
    expect(maximumActiveRequests).toBe(1);
  });
});

function AuthHarness() {
  const auth = useAuth();

  return (
    <div>
      <span>
        {auth.status}:{auth.principal?.workspace.name}
      </span>
      <button onClick={() => void auth.signOut()} type="button">
        Sign out
      </button>
    </div>
  );
}

function installBrowserCoordination() {
  let queue = Promise.resolve();
  const request = vi.fn(
    async <Result,>(_name: string, callback: () => Promise<Result>): Promise<Result> => {
      const result = queue.then(callback);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  );

  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request },
  });

  class BroadcastChannelMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    close() {}
    postMessage() {}
  }

  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
  return { request };
}

function authResponse() {
  return {
    access_token: "access-token",
    expires_in: 900,
    role: "owner",
    token_type: "Bearer",
    user: { email: "owner@example.com", id: "3dc20706-9944-4743-8121-c0429c622c0b" },
    workspace: { id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4", name: "Acme Cloud" },
  };
}
