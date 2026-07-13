import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { AuthProvider, createAuthClient, useAuth } from "./auth";

const originalLocks = navigator.locks;

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

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(authResponse()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const container = render(
      <AuthProvider client={createAuthClient()}>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitForText(container, "authenticated:Acme Cloud");
    click(container.querySelector("button") as HTMLButtonElement);
    await waitForText(container, "anonymous");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4100/api/auth/session",
      expect.objectContaining({ credentials: "include", method: "DELETE" }),
    );
  });

  it("serializes refresh rotation across provider instances", async () => {
    expect.hasAssertions();
    const coordination = installBrowserCoordination();
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return jsonResponse(authResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

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

    expect(fetchMock).toHaveBeenCalledTimes(2);
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

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
