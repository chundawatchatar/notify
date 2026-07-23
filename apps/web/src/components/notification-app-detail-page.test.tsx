import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, createAuthClient } from "@/lib/auth";
import { change, cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { server } from "@/test/server";
import { NotificationAppDetailPage } from "./notification-app-detail-page";

const apiBaseUrl = "http://localhost:4100";
const originalLocksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");

afterEach(() => {
  cleanup();
  if (originalLocksDescriptor) {
    Object.defineProperty(navigator, "locks", originalLocksDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "locks");
  }
  vi.unstubAllGlobals();
});

describe("notification app detail page", () => {
  it("refreshes setup readiness after environment configuration changes", async () => {
    installBrowserCoordination();
    let hasClientKey = false;
    let hasTrustedOrigin = false;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
      http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
      http.get(`${apiBaseUrl}/api/apps/payments-service`, () =>
        HttpResponse.json(notificationApp(hasClientKey, hasTrustedOrigin)),
      ),
      http.get(`${apiBaseUrl}/api/apps/payments-service/environments/development/client-keys`, () =>
        HttpResponse.json({ client_keys: hasClientKey ? [clientKey()] : [] }),
      ),
      http.post(
        `${apiBaseUrl}/api/apps/payments-service/environments/development/client-keys`,
        () => {
          hasClientKey = true;
          return HttpResponse.json(clientKey(), { status: 201 });
        },
      ),
      http.get(
        `${apiBaseUrl}/api/apps/payments-service/environments/development/trusted-origins`,
        () => HttpResponse.json({ trusted_origins: hasTrustedOrigin ? [trustedOrigin()] : [] }),
      ),
      http.post(
        `${apiBaseUrl}/api/apps/payments-service/environments/development/trusted-origins`,
        () => {
          hasTrustedOrigin = true;
          return HttpResponse.json(trustedOrigin(), { status: 201 });
        },
      ),
    );

    const container = await renderDetailPage();
    await waitForText(container, "Setup incomplete");
    expect(checklistItem(container, "Active client key").textContent).toContain("Missing");
    expect(checklistItem(container, "Trusted origin").textContent).toContain("Missing");

    click(buttonByText(container, "Create client key"));
    await waitFor(
      () =>
        checklistItem(container, "Active client key").textContent?.includes("Configured") === true,
      "client-key readiness refresh",
    );

    const originInput = container.querySelector<HTMLInputElement>('input[name="origin"]');
    expect(originInput).toBeInstanceOf(HTMLInputElement);
    change(originInput as HTMLInputElement, "https://console.example.com");
    const addOriginButton = buttonByText(container, "Add origin");
    await waitFor(() => !addOriginButton.disabled, "enabled add-origin button");
    click(addOriginButton);

    await waitForText(container, "Ready");
    expect(checklistItem(container, "Trusted origin").textContent).toContain("Configured");
  });
});

async function renderDetailPage() {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    component: () => (
      <NotificationAppDetailPage
        appSlug="payments-service"
        environmentSlug="development"
        workspaceSlug="acme-cloud"
      />
    ),
    getParentRoute: () => rootRoute,
    path: "/w/acme-cloud/apps/payments-service/environments/development",
  });
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: ["/w/acme-cloud/apps/payments-service/environments/development"],
    }),
    routeTree: rootRoute.addChildren([detailRoute]),
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const authClient = createAuthClient();
  await authClient.retrySession();

  return render(
    <AuthProvider client={authClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>,
  );
}

function checklistItem(container: HTMLElement, label: string) {
  const labelElement = [...container.querySelectorAll("span")].find(
    (candidate) => candidate.textContent === label,
  );
  const item = labelElement?.parentElement?.parentElement;

  if (!item) {
    throw new Error(`Expected checklist item: ${label}`);
  }

  return item;
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

function notificationApp(hasClientKey: boolean, hasTrustedOrigin: boolean) {
  const missingRequirements = [
    ...(hasClientKey ? [] : ["client_key"]),
    ...(hasTrustedOrigin ? [] : ["trusted_origin"]),
  ];

  return {
    environments: [
      {
        id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
        name: "Development",
        production: false,
        readiness: {
          missing_requirements: missingRequirements,
          ready: missingRequirements.length === 0,
        },
        slug: "development",
      },
    ],
    id: "3dc20706-9944-4743-8121-c0429c622c0b",
    name: "Payments Service",
    slug: "payments-service",
  };
}

function clientKey() {
  return {
    created_at: "2026-07-23T12:00:00Z",
    id: "a6c977c6-8eb6-41ae-82dc-90f10ff134ce",
    key: "nfy_pk_7K9fjNdZOzLkQenP2tHaBi8vWcXRm1sA",
    revoked_at: null,
  };
}

function trustedOrigin() {
  return {
    created_at: "2026-07-23T12:00:00Z",
    id: "17bd25a8-3bfe-4cf4-ae94-1fd39518d568",
    origin: "https://console.example.com",
  };
}

function authResponse() {
  return {
    access_token: "access-token",
    expires_in: 900,
    role: "owner",
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

  class BroadcastChannelMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    close() {}
    postMessage() {}
  }

  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
}
