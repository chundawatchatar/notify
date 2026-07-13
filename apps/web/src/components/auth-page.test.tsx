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
import { blur, change, cleanup, click, render, waitForText } from "@/test/render";
import { server } from "@/test/server";
import { CompleteSignupForm, LoginForm, SignupForm } from "./auth-page";

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

describe("authentication forms", () => {
  it("starts email verification and keeps the response enumeration-safe", async () => {
    expect.hasAssertions();
    let submittedEmail: string | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/signup`, async ({ request }) => {
        const body = (await request.json()) as { email?: string };
        submittedEmail = body.email;
        return HttpResponse.json({ status: "verification_sent" }, { status: 202 });
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const container = render(
      <QueryClientProvider client={queryClient}>
        <SignupForm />
      </QueryClientProvider>,
    );
    const email = container.querySelector('input[type="email"]');
    const submit = container.querySelector('button[type="submit"]');

    expect(email).toBeInstanceOf(HTMLInputElement);
    expect(submit).toBeInstanceOf(HTMLButtonElement);

    change(email as HTMLInputElement, "Owner@Example.com");
    click(submit as HTMLButtonElement);
    await waitForText(container, "If this email can be registered");

    expect(submittedEmail).toBe("Owner@Example.com");
    expect(container.textContent).toContain("owner@example.com");
  });

  it("does not apply signup password-length rules during login", () => {
    expect.hasAssertions();
    installBrowserCoordination();
    server.use(
      http.post(`${apiBaseUrl}/api/auth/refresh`, () =>
        HttpResponse.json(
          { errors: { code: "invalid_session", detail: "Authentication is required." } },
          { status: 401 },
        ),
      ),
    );

    const container = renderLogin();
    const password = container.querySelector<HTMLInputElement>(
      'input[autocomplete="current-password"]',
    );

    expect(password).toBeInstanceOf(HTMLInputElement);
    change(password as HTMLInputElement, "short");
    blur(password as HTMLInputElement);

    expect(container.textContent).not.toContain("Password must be at least 8 characters.");
  });

  it("validates passwords on blur and requires a matching confirmation", async () => {
    expect.hasAssertions();

    const container = renderCompleteSignup();
    await waitForText(container, "Confirm password");

    const [password, confirmation] = container.querySelectorAll<HTMLInputElement>(
      'input[autocomplete="new-password"]',
    );

    expect(password).toBeInstanceOf(HTMLInputElement);
    expect(confirmation).toBeInstanceOf(HTMLInputElement);

    change(password as HTMLInputElement, "short");
    expect(container.textContent).not.toContain("Password must be at least 8 characters.");

    blur(password as HTMLInputElement);
    await waitForText(container, "Password must be at least 8 characters.");

    change(password as HTMLInputElement, "valid-password");
    blur(password as HTMLInputElement);
    change(confirmation as HTMLInputElement, "different-password");
    expect(container.textContent).not.toContain("Passwords do not match.");

    blur(confirmation as HTMLInputElement);
    await waitForText(container, "Passwords do not match.");
  });
});

function renderCompleteSignup() {
  const rootRoute = createRootRoute();
  const completionRoute = createRoute({
    component: () => <CompleteSignupForm signupToken="signup-token" />,
    getParentRoute: () => rootRoute,
    path: "/auth/verify-email",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/auth/verify-email"] }),
    routeTree: rootRoute.addChildren([completionRoute]),
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function renderLogin() {
  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    component: LoginForm,
    getParentRoute: () => rootRoute,
    path: "/auth/login",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/auth/login"] }),
    routeTree: rootRoute.addChildren([loginRoute]),
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <AuthProvider client={createAuthClient()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>,
  );
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
