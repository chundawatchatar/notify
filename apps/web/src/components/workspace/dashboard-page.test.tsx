import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider, createAuthClient } from "@/lib/auth";
import {
  authResponse,
  cleanup,
  installBrowserCoordination,
  render,
  restoreBrowserCoordination,
  waitForText,
} from "@/test/render";
import { server } from "@/test/server";
import { DashboardPage } from "./dashboard-page";

const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  restoreBrowserCoordination();
});

describe("dashboard page", () => {
  it("shows loading before rendering real delivery state", async () => {
    installBrowserCoordination();
    let releaseEvents = () => {};
    const eventGate = new Promise<void>((resolve) => {
      releaseEvents = resolve;
    });

    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), async () => {
        await eventGate;
        return HttpResponse.json({
          events: [
            {
              accepted_at: "2026-08-11T09:30:00Z",
              delivery_status: "published",
              event: "invoice.payment_failed",
              event_id: "3dc20706-9944-4743-8121-c0429c622c0b",
              occurred_at: null,
              recipient_id: "user_123",
              source: "public_api",
            },
          ],
        });
      }),
    );

    const container = await renderDashboard();

    await waitForText(container, "Loading dashboard data...");
    releaseEvents();
    await waitForText(container, "invoice.payment_failed");
    expect(container.textContent).toContain("PubSub handoff complete");
    expect(container.textContent).toContain(
      "It does not confirm that a client received or rendered the notification.",
    );
    expect(container.textContent).not.toContain("48,214");
  });

  it("shows an empty state when the workspace has no accepted events", async () => {
    installBrowserCoordination();
    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), () => HttpResponse.json({ events: [] })),
    );

    const container = await renderDashboard();

    await waitForText(container, "No accepted events yet.");
    expect(container.textContent).toContain("Ready environments");
  });

  it("shows an error when delivery summaries cannot be loaded", async () => {
    installBrowserCoordination();
    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), () =>
        HttpResponse.json(
          { errors: { code: "request_failed", detail: "Delivery summaries unavailable." } },
          { status: 400 },
        ),
      ),
    );

    const container = await renderDashboard();

    await waitForText(container, "Dashboard data could not be loaded");
    expect(container.textContent).toContain("Delivery summaries unavailable.");
  });
});

async function renderDashboard() {
  const rootRoute = createRootRoute();
  const dashboardRoute = createRoute({
    component: DashboardPage,
    getParentRoute: () => rootRoute,
    path: "/w/$workspaceSlug/dashboard",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/w/acme-cloud/dashboard"] }),
    routeTree: rootRoute.addChildren([dashboardRoute]),
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

function commonHandlers() {
  return [
    http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
    http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
    http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [notificationApp()] })),
  ];
}

function notificationApp() {
  return {
    environments: [
      {
        id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
        name: "Development",
        production: false,
        readiness: { missing_requirements: [], ready: true },
        slug: "development",
      },
    ],
    id: "3dc20706-9944-4743-8121-c0429c622c0b",
    name: "Payments Service",
    slug: "payments-service",
  };
}

function eventsPath() {
  return `${apiBaseUrl}/api/apps/3dc20706-9944-4743-8121-c0429c622c0b/environments/7ad7137b-d5a5-4411-9993-463c7f7e71f4/ingress/events`;
}
