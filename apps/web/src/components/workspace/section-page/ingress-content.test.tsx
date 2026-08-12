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
  buttonByText,
  cleanup,
  click,
  installBrowserCoordination,
  render,
  restoreBrowserCoordination,
  waitForText,
} from "@/test/render";
import { server } from "@/test/server";
import { IngressContent } from "./ingress-content";

const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  restoreBrowserCoordination();
});

describe("ingress content", () => {
  it("shows an empty state when no accepted events exist", async () => {
    installBrowserCoordination();
    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), () => HttpResponse.json({ events: [] })),
    );

    const { container } = await renderIngressContent();

    await waitForText(container, "No accepted events yet.");
    expect(container.textContent).toContain("POST /api/v1/notifications");
  });

  it("renders accepted events and sends a dashboard test event", async () => {
    installBrowserCoordination();
    let testEventCalls = 0;
    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), () =>
        HttpResponse.json({
          events: [
            {
              accepted_at: "2026-08-05T10:00:00Z",
              delivery_status: "published",
              event: "invoice.payment_failed",
              event_id: "3dc20706-9944-4743-8121-c0429c622c0b",
              occurred_at: null,
              recipient_id: "user_123",
              source: "public_api",
            },
          ],
        }),
      ),
      http.post(testEventPath(), () => {
        testEventCalls += 1;
        return HttpResponse.json(
          {
            data: {
              accepted_at: "2026-08-05T10:01:00Z",
              duplicate: false,
              event_id: "aed74a36-7a3b-4a8b-90d6-510b20633a4c",
            },
          },
          { status: 202 },
        );
      }),
    );

    const { container } = await renderIngressContent();

    await waitForText(container, "invoice.payment_failed");
    expect(container.textContent).toContain("PubSub handoff complete");
    click(buttonByText(container, "Send test event"));
    await waitForText(container, "Test event accepted");
    expect(testEventCalls).toBe(1);
  });

  it("shows an error when accepted events cannot be loaded", async () => {
    installBrowserCoordination();
    server.use(
      ...commonHandlers(),
      http.get(eventsPath(), () =>
        HttpResponse.json(
          { errors: { code: "request_failed", detail: "Events unavailable." } },
          { status: 400 },
        ),
      ),
    );

    const { container } = await renderIngressContent();

    await waitForText(container, "Ingress data could not be loaded");
    expect(container.textContent).toContain("Events unavailable.");
  });
});

async function renderIngressContent() {
  const rootRoute = createRootRoute();
  const ingressRoute = createRoute({
    component: () => (
      <IngressContent
        search={{ app: "payments-service", environment: "development" }}
        workspaceSlug="acme-cloud"
      />
    ),
    getParentRoute: () => rootRoute,
    path: "/w/$workspaceSlug/ingress",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/w/acme-cloud/ingress"] }),
    routeTree: rootRoute.addChildren([ingressRoute]),
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const authClient = createAuthClient();
  await authClient.retrySession();

  const container = render(
    <AuthProvider client={authClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>,
  );

  return { container, router };
}

function commonHandlers() {
  return [
    http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
    http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
    http.get(`${apiBaseUrl}/api/apps`, () => HttpResponse.json({ apps: [notificationApp()] })),
    http.get(detailsPath(), () =>
      HttpResponse.json({
        data: {
          app_id: "3dc20706-9944-4743-8121-c0429c622c0b",
          endpoint: "POST /api/v1/notifications",
          environment_id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
          idempotency_window_hours: 24,
          source: "server_api_key",
        },
      }),
    ),
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

function detailsPath() {
  return `${apiBaseUrl}/api/apps/3dc20706-9944-4743-8121-c0429c622c0b/environments/7ad7137b-d5a5-4411-9993-463c7f7e71f4/ingress`;
}

function eventsPath() {
  return `${detailsPath()}/events`;
}

function testEventPath() {
  return `${detailsPath()}/test-events`;
}
