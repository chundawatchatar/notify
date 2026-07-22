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
import { NotificationAppsPage } from "./notification-apps-page";

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

describe("notification apps page", () => {
  it("clears a failed create attempt when the dialog is cancelled", async () => {
    installBrowserCoordination();
    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
      http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [] })),
      http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
      http.post(`${apiBaseUrl}/api/apps`, () =>
        HttpResponse.json(
          { errors: { code: "validation_failed", detail: "App creation failed." } },
          { status: 422 },
        ),
      ),
    );

    const container = await renderAppsPage();
    const newApp = buttonByText(container, "New app");

    click(newApp);
    const input = document.body.querySelector<HTMLInputElement>('input[name="name"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    change(input as HTMLInputElement, "Payments service");
    const createApp = document.body.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(createApp).toBeInstanceOf(HTMLButtonElement);
    await waitFor(() => !(createApp as HTMLButtonElement).disabled, "enabled create app button");
    click(createApp as HTMLButtonElement);
    await waitForText(document.body, "App creation failed");

    click(buttonByText(document.body, "Cancel"));
    click(newApp);

    await waitFor(() => document.body.textContent?.includes("App creation failed") === false);
    expect(document.body.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe("");
  });
});

async function renderAppsPage() {
  const rootRoute = createRootRoute();
  const appsRoute = createRoute({
    component: () => <NotificationAppsPage workspaceSlug="acme-cloud" />,
    getParentRoute: () => rootRoute,
    path: "/w/$workspaceSlug/apps",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/w/acme-cloud/apps"] }),
    routeTree: rootRoute.addChildren([appsRoute]),
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const authClient = createAuthClient();
  await authClient.retrySession();
  const container = render(
    <AuthProvider client={authClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>,
  );

  await waitForText(container, "Create your first notification app");
  return container;
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
