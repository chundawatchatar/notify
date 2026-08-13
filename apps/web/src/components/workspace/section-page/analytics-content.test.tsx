import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AnalyticsContent } from "./analytics-content";

const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  restoreBrowserCoordination();
});

describe("analytics content", () => {
  it("shows loading before rendering the real analytics response", async () => {
    installBrowserCoordination();
    let releaseAnalytics = () => {};
    const analyticsGate = new Promise<void>((resolve) => {
      releaseAnalytics = resolve;
    });

    server.use(
      ...authHandlers(),
      http.get(analyticsPath(), async ({ request }) => {
        expect(new URL(request.url).searchParams.get("window")).toBe("24h");
        await analyticsGate;
        return HttpResponse.json(analyticsResponse());
      }),
    );

    const container = await renderAnalytics();

    await waitForText(container, "Loading analytics...");
    releaseAnalytics();
    await waitForText(container, "Payments Service");
    expect(container.textContent).toContain("75%");
    expect(container.textContent).toContain("1,250 ms");
    expect(container.textContent).toContain("PubSub handoffs");
    expect(container.textContent).not.toContain("Delivered");
    expect(container.textContent).not.toContain("Retries");
    expect(container.textContent).not.toContain("Failure rate");
  });

  it("shows zero counts and unavailable derived metrics for an empty window", async () => {
    installBrowserCoordination();
    server.use(
      ...authHandlers(),
      http.get(analyticsPath(), () => HttpResponse.json(analyticsResponse({ empty: true }))),
    );

    const container = await renderAnalytics();

    await waitForText(container, "No accepted events in this window.");
    expect(container.textContent).toContain("0 of 0 accepted events");
    expect(container.textContent).toContain("No data");
  });

  it("shows an error when analytics cannot be loaded", async () => {
    installBrowserCoordination();
    server.use(
      ...authHandlers(),
      http.get(analyticsPath(), () =>
        HttpResponse.json(
          { errors: { code: "permission_denied", detail: "Analytics are unavailable." } },
          { status: 403 },
        ),
      ),
    );

    const container = await renderAnalytics();

    await waitForText(container, "Analytics could not be loaded");
    expect(container.textContent).toContain("Analytics are unavailable.");
  });
});

async function renderAnalytics() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const authClient = createAuthClient();
  await authClient.retrySession();

  return render(
    <AuthProvider client={authClient}>
      <QueryClientProvider client={queryClient}>
        <AnalyticsContent workspaceSlug="acme-cloud" />
      </QueryClientProvider>
    </AuthProvider>,
  );
}

function authHandlers() {
  return [
    http.post(`${apiBaseUrl}/api/auth/refresh`, () => HttpResponse.json(authResponse())),
    http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
  ];
}

function analyticsPath() {
  return `${apiBaseUrl}/api/analytics`;
}

function analyticsResponse({ empty = false }: Readonly<{ empty?: boolean }> = {}) {
  const counts = empty
    ? {
        accepted: 0,
        pending: 0,
        processing: 0,
        publication_rate: { denominator: 0, numerator: 0, value: null },
        published: 0,
        unpublished: 0,
      }
    : {
        accepted: 4,
        pending: 1,
        processing: 0,
        publication_rate: { denominator: 4, numerator: 3, value: 0.75 },
        published: 3,
        unpublished: 1,
      };
  const publicationLatency = empty
    ? { p50_ms: null, p95_ms: null, sample_count: 0 }
    : { p50_ms: 800, p95_ms: 1_250, sample_count: 3 };

  return {
    apps: empty
      ? []
      : [
          {
            app_id: "3dc20706-9944-4743-8121-c0429c622c0b",
            archived: false,
            metrics: { counts, publication_latency: publicationLatency },
            name: "Payments Service",
          },
        ],
    filters: { app_id: null, environment_id: null },
    totals: { counts, publication_latency: publicationLatency },
    trend: [
      {
        counts,
        end_at: "2026-08-13T08:00:00Z",
        start_at: "2026-08-13T07:00:00Z",
      },
    ],
    window: {
      as_of: "2026-08-13T08:00:00Z",
      name: "24h" as const,
      start_at: "2026-08-12T08:00:00Z",
    },
  };
}
