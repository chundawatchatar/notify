import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { server } from "@/test/server";
import { AuthProvider, createAuthClient, useAuth } from "./auth";

const originalLocks = navigator.locks;
const apiBaseUrl = "http://localhost:4100";
const defaultWorkspace = {
  id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
  name: "Acme Cloud",
  slug: "acme-cloud",
};

afterEach(() => {
  cleanup();
  localStorage.clear();
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
    click(container.querySelector("button[value='logout']") as HTMLButtonElement);
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

  it("switches sessions after a refresh and replaces the authenticated principal", async () => {
    expect.hasAssertions();
    installBrowserCoordination();
    let switchAuthorization: string | null = null;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () =>
        HttpResponse.json(authResponse({ accessToken: "refreshed-access-token" })),
      ),
      http.post(`${apiBaseUrl}/api/auth/workspace/switch`, async ({ request }) => {
        switchAuthorization = request.headers.get("authorization");
        return HttpResponse.json(
          authResponse({
            accessToken: "notify-labs-access-token",
            workspace: { name: "Notify Labs", slug: "notify-labs" },
          }),
        );
      }),
    );

    const container = render(
      <AuthProvider client={createAuthClient()}>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitForText(container, "authenticated:Acme Cloud");
    click(container.querySelector("button[value='refresh']") as HTMLButtonElement);
    click(container.querySelector("button[value='switch']") as HTMLButtonElement);
    await waitForText(container, "authenticated:Notify Labs");

    expect(switchAuthorization).toBe("Bearer refreshed-access-token");
  });

  it("processes a later request for a different workspace after the active switch", async () => {
    expect.hasAssertions();
    installBrowserCoordination();
    const requestedWorkspaces: string[] = [];

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
      http.post(`${apiBaseUrl}/api/auth/workspace/switch`, async ({ request }) => {
        const body = (await request.json()) as { workspace_slug: string };
        requestedWorkspaces.push(body.workspace_slug);

        return HttpResponse.json(
          authResponse({
            workspace:
              body.workspace_slug === "notify-labs"
                ? { name: "Notify Labs", slug: "notify-labs" }
                : { name: "Other Workspace", slug: "other-workspace" },
          }),
        );
      }),
    );

    const container = render(
      <AuthProvider client={createAuthClient()}>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitForText(container, "authenticated:Acme Cloud");
    click(container.querySelector("button[value='switch']") as HTMLButtonElement);
    click(container.querySelector("button[value='switch-other']") as HTMLButtonElement);
    await waitForText(container, "authenticated:Other Workspace");

    expect(requestedWorkspaces).toEqual(["notify-labs", "other-workspace"]);
  });

  it("restores this browser's remembered workspace after sign-in", async () => {
    expect.hasAssertions();
    installBrowserCoordination();
    localStorage.setItem(activeWorkspaceStorageKey(), "a7d7137b-d5a5-4411-9993-463c7f7e71f4");
    let requestedWorkspace: string | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/login`, () => HttpResponse.json(authResponse())),
      http.get(`${apiBaseUrl}/api/workspaces`, () =>
        HttpResponse.json({
          workspaces: [
            {
              id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
              name: "Acme Cloud",
              role: "owner",
              slug: "acme-cloud",
            },
            {
              id: "a7d7137b-d5a5-4411-9993-463c7f7e71f4",
              name: "Notify Labs",
              role: "owner",
              slug: "notify-labs",
            },
          ],
        }),
      ),
      http.post(`${apiBaseUrl}/api/auth/workspace/switch`, async ({ request }) => {
        requestedWorkspace = ((await request.json()) as { workspace_slug: string }).workspace_slug;

        return HttpResponse.json(
          authResponse({
            workspace: {
              id: "a7d7137b-d5a5-4411-9993-463c7f7e71f4",
              name: "Notify Labs",
              slug: "notify-labs",
            },
          }),
        );
      }),
    );

    const client = createAuthClient();
    await client.signIn({
      email: "owner@example.com",
      password: "correct-password",
      remember: false,
    });

    expect(requestedWorkspace).toBe("notify-labs");
    expect(client.getSnapshot().principal?.workspace.slug).toBe("notify-labs");
  });

  it("clears a revoked remembered workspace and keeps the API fallback workspace", async () => {
    expect.hasAssertions();
    installBrowserCoordination();
    localStorage.setItem(activeWorkspaceStorageKey(), "a7d7137b-d5a5-4411-9993-463c7f7e71f4");

    server.use(
      http.post(`${apiBaseUrl}/api/auth/login`, () => HttpResponse.json(authResponse())),
      http.get(`${apiBaseUrl}/api/workspaces`, () =>
        HttpResponse.json({
          workspaces: [
            {
              id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
              name: "Acme Cloud",
              role: "owner",
              slug: "acme-cloud",
            },
            {
              id: "a7d7137b-d5a5-4411-9993-463c7f7e71f4",
              name: "Revoked workspace",
              role: "developer",
              slug: "revoked-workspace",
            },
          ],
        }),
      ),
      http.post(`${apiBaseUrl}/api/auth/workspace/switch`, () =>
        HttpResponse.json(
          { errors: { code: "workspace_not_found", message: "Workspace unavailable." } },
          { status: 404 },
        ),
      ),
    );

    const client = createAuthClient();
    await client.signIn({
      email: "owner@example.com",
      password: "correct-password",
      remember: false,
    });

    expect(client.getSnapshot().principal?.workspace.slug).toBe("acme-cloud");
    expect(localStorage.getItem(activeWorkspaceStorageKey())).toBeNull();
  });
});

function AuthHarness() {
  const auth = useAuth();

  return (
    <div>
      <span>
        {auth.status}:{auth.principal?.workspace.name}
      </span>
      <button onClick={() => void auth.retrySession()} type="button" value="refresh">
        Refresh
      </button>
      <button onClick={() => void auth.switchWorkspace("notify-labs")} type="button" value="switch">
        Switch workspace
      </button>
      <button
        onClick={() => void auth.switchWorkspace("other-workspace")}
        type="button"
        value="switch-other"
      >
        Switch other workspace
      </button>
      <button onClick={() => void auth.signOut()} type="button" value="logout">
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

function authResponse({
  accessToken = "access-token",
  workspace,
}: {
  accessToken?: string;
  workspace?: Partial<typeof defaultWorkspace>;
} = {}) {
  return {
    access_token: accessToken,
    expires_in: 900,
    role: "owner",
    token_type: "Bearer",
    user: { email: "owner@example.com", id: "3dc20706-9944-4743-8121-c0429c622c0b" },
    workspace: { ...defaultWorkspace, ...workspace },
  };
}

function activeWorkspaceStorageKey() {
  return "notify-active-workspace:3dc20706-9944-4743-8121-c0429c622c0b";
}
