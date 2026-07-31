import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, createAuthClient } from "@/lib/auth";
import { change, cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { server } from "@/test/server";
import { WorkspaceSecurityPage } from "./workspace-security-page";

const apiBaseUrl = "http://localhost:4100";
const originalLocksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  cleanup();

  if (originalLocksDescriptor) {
    Object.defineProperty(navigator, "locks", originalLocksDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "locks");
  }

  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }

  vi.unstubAllGlobals();
});

describe("workspace security page", () => {
  it("switches the selected environment, updates search state, and reveals a new secret exactly once", async () => {
    installBrowserCoordination();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    let developmentListRequests = 0;
    let productionListRequests = 0;
    let createBody: unknown;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse("owner"))),
      http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
      http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [notificationApp()] })),
      http.get(
        `${apiBaseUrl}/api/apps/${appId}/environments/${developmentEnvironmentId}/server-api-keys`,
        () => {
          developmentListRequests += 1;
          return HttpResponse.json({ api_keys: [serverApiKey("Development worker")] });
        },
      ),
      http.get(
        `${apiBaseUrl}/api/apps/${appId}/environments/${productionEnvironmentId}/server-api-keys`,
        () => {
          productionListRequests += 1;
          return HttpResponse.json({ api_keys: [serverApiKey("Production worker")] });
        },
      ),
      http.post(
        `${apiBaseUrl}/api/apps/${appId}/environments/${productionEnvironmentId}/server-api-keys`,
        async ({ request }) => {
          createBody = await request.json();
          return HttpResponse.json(serverApiKeySecret("Production worker"), { status: 201 });
        },
      ),
    );

    const { container, router } = await renderSecurityPage(
      "/w/acme-cloud/security?app=missing&environment=bad",
    );
    await waitFor(() => router.state.location.search.app === "payments-service", "default app");
    await waitFor(
      () => router.state.location.search.environment === "development",
      "default environment",
    );
    await waitForText(container, "Development worker");

    click(buttonByLabel(container, "Select notification app environment"));
    click(textMatch(document.body, "Production (production)"));

    await waitFor(
      () => router.state.location.search.environment === "production",
      "production search state",
    );
    await waitForText(container, "Production worker");

    click(buttonByText(container, "New key"));
    const nameInput = document.body.querySelector<HTMLInputElement>('input[name="name"]');
    expect(nameInput).toBeInstanceOf(HTMLInputElement);
    change(nameInput as HTMLInputElement, "Production ingest");

    const createButton = document.body.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(createButton).toBeInstanceOf(HTMLButtonElement);
    await waitFor(() => !(createButton as HTMLButtonElement).disabled, "enabled create key button");
    click(createButton as HTMLButtonElement);

    await waitForText(document.body, "Copy this secret now");
    await waitForText(document.body, "nfy_sk_BaW4lCGg6lgBZW02rPpxT-m9q8qv8SxrwP7pvA8h8KQ");
    click(buttonByText(document.body, "Copy secret"));
    await waitFor(() => writeText.mock.calls.length === 1, "copied secret");
    click(buttonByText(document.body, "I copied the secret"));

    await waitFor(
      () => document.body.textContent?.includes("Copy this secret now") === false,
      "closed reveal dialog",
    );

    expect(createBody).toEqual({ name: "Production ingest" });
    expect(developmentListRequests).toBe(1);
    expect(productionListRequests).toBeGreaterThanOrEqual(1);
  });

  it("asks for confirmation before revoking a key", async () => {
    installBrowserCoordination();
    let revokeRequests = 0;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse("owner"))),
      http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
      http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [notificationApp()] })),
      http.get(
        `${apiBaseUrl}/api/apps/${appId}/environments/${developmentEnvironmentId}/server-api-keys`,
        () => HttpResponse.json({ api_keys: [serverApiKey("Development worker")] }),
      ),
      http.delete(
        `${apiBaseUrl}/api/apps/${appId}/environments/${developmentEnvironmentId}/server-api-keys/${serverApiKeyId}`,
        () => {
          revokeRequests += 1;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const { container } = await renderSecurityPage(
      "/w/acme-cloud/security?app=payments-service&environment=development",
    );
    await waitForText(container, "Development worker");

    click(buttonByText(container, "Revoke"));
    await waitForText(document.body, "Revoke this server API key?");
    expect(revokeRequests).toBe(0);

    click(buttonByText(document.body, "Cancel"));
    await waitFor(
      () => document.body.textContent?.includes("Revoke this server API key?") === false,
      "closed revoke confirmation",
    );
    expect(revokeRequests).toBe(0);
  });

  it("keeps mutation controls unavailable for viewers", async () => {
    installBrowserCoordination();

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse("viewer"))),
      http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
      http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [notificationApp()] })),
      http.get(
        `${apiBaseUrl}/api/apps/${appId}/environments/${developmentEnvironmentId}/server-api-keys`,
        () => HttpResponse.json({ api_keys: [serverApiKey("Development worker")] }),
      ),
    );

    const { container } = await renderSecurityPage(
      "/w/acme-cloud/security?app=payments-service&environment=development",
    );
    await waitForText(container, "Server API key management is read-only");
    expect(container.textContent?.includes("New key")).toBe(false);
    expect(container.textContent?.includes("Rotate")).toBe(false);
    expect(container.textContent?.includes("Revoke")).toBe(false);
  });
});

async function renderSecurityPage(initialEntry: string) {
  const rootRoute = createRootRoute();
  const securityRoute = createRoute({
    component: DynamicWorkspaceSecurityPage,
    getParentRoute: () => rootRoute,
    path: "/w/$workspaceSlug/$section",
    validateSearch: (search) => ({
      app: typeof search.app === "string" ? search.app : undefined,
      environment: typeof search.environment === "string" ? search.environment : undefined,
    }),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: rootRoute.addChildren([securityRoute]),
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const authClient = createAuthClient();
  await authClient.retrySession();

  return {
    container: render(
      <AuthProvider client={authClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AuthProvider>,
    ),
    router,
  };
}

function DynamicWorkspaceSecurityPage() {
  const { section, workspaceSlug } = useParams({ strict: false });
  const search = useSearch({ strict: false });

  if (!workspaceSlug || section !== "security") {
    throw new Error("Expected security route parameters.");
  }

  return (
    <WorkspaceSecurityPage
      search={search as { app?: string; environment?: string }}
      workspaceSlug={workspaceSlug}
    />
  );
}

function buttonByLabel(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.getAttribute("aria-label") === label,
  );

  if (!button) {
    throw new Error(`Expected button with aria-label ${label}.`);
  }

  return button;
}

function buttonByText(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!button) {
    throw new Error(`Expected ${text} button.`);
  }

  return button;
}

function textMatch(container: HTMLElement, text: string) {
  const match = [...container.querySelectorAll("*")].find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!match) {
    throw new Error(`Expected text: ${text}`);
  }

  return match as HTMLElement;
}

function notificationApp() {
  return {
    environments: [
      {
        id: developmentEnvironmentId,
        name: "Development",
        production: false,
        readiness: { missing_requirements: ["client_key", "trusted_origin"], ready: false },
        slug: "development",
      },
      {
        id: productionEnvironmentId,
        name: "Production",
        production: true,
        readiness: { missing_requirements: [], ready: true },
        slug: "production",
      },
    ],
    id: appId,
    name: "Payments Service",
    slug: "payments-service",
  };
}

function serverApiKey(name: string) {
  return {
    created_at: "2026-07-30T10:00:00Z",
    id: serverApiKeyId,
    masked_hint: "...8KQ",
    name,
    revoked_at: null,
    status: "active",
  } as const;
}

function serverApiKeySecret(name: string) {
  return {
    ...serverApiKey(name),
    secret: "nfy_sk_BaW4lCGg6lgBZW02rPpxT-m9q8qv8SxrwP7pvA8h8KQ",
  } as const;
}

function authResponse(role: "owner" | "viewer") {
  return {
    access_token: "access-token",
    expires_in: 900,
    role,
    token_type: "Bearer",
    user: { email: "owner@example.com", id: "3dc20706-9944-4743-8121-c0429c622c0b" },
    workspace: {
      id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
      name: "Acme Cloud",
      slug: "acme-cloud",
    },
  };
}

function installBrowserCoordination() {
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: async <Result,>(_name: string, callback: () => Promise<Result>) => callback(),
    },
  });
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  class BroadcastChannelMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    close() {}
    postMessage() {}
  }

  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
}

const appId = "3dc20706-9944-4743-8121-c0429c622c0b";
const developmentEnvironmentId = "7ad7137b-d5a5-4411-9993-463c7f7e71f4";
const productionEnvironmentId = "e09a5bbe-2a92-47d2-ae75-8878d1b224d5";
const serverApiKeyId = "a6c977c6-8eb6-41ae-82dc-90f10ff134ce";
