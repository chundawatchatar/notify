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
import { blur, change, cleanup, click, render, waitFor, waitForText } from "@/test/render";
import { server } from "@/test/server";
import {
  CompleteSignupForm,
  ForgotPasswordForm,
  LoginForm,
  ResetPasswordForm,
  SignupForm,
} from "./auth-page";

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

  it("does not apply signup password-length rules during login", async () => {
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

    const container = await renderLogin();
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

  it("requests password recovery without revealing account existence", async () => {
    expect.hasAssertions();
    let submittedEmail: string | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/password-reset`, async ({ request }) => {
        const body = (await request.json()) as { email?: string };
        submittedEmail = body.email;
        return HttpResponse.json({ status: "password_reset_requested" }, { status: 202 });
      }),
    );

    const container = await renderForgotPassword();
    const email = container.querySelector<HTMLInputElement>('input[type="email"]');
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(email).toBeInstanceOf(HTMLInputElement);
    expect(submit).toBeInstanceOf(HTMLButtonElement);

    change(email as HTMLInputElement, "Owner@Example.com");
    click(submit as HTMLButtonElement);
    await waitForText(container, "If an account exists");

    expect(submittedEmail).toBe("Owner@Example.com");
  });

  it("submits a confirmed password reset and returns to login", async () => {
    expect.hasAssertions();
    let submittedBody: Record<string, unknown> | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/password-reset/complete`, async ({ request }) => {
        submittedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ status: "password_reset" });
      }),
    );

    const container = await renderResetPassword();
    const [password, confirmation] = container.querySelectorAll<HTMLInputElement>(
      'input[autocomplete="new-password"]',
    );
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(password).toBeInstanceOf(HTMLInputElement);
    expect(confirmation).toBeInstanceOf(HTMLInputElement);
    expect(submit).toBeInstanceOf(HTMLButtonElement);

    change(password as HTMLInputElement, "new-correct-password");
    change(confirmation as HTMLInputElement, "new-correct-password");
    click(submit as HTMLButtonElement);
    await waitForText(container, "Password reset complete");

    expect(submittedBody).toEqual({
      password: "new-correct-password",
      password_confirmation: "new-correct-password",
      reset_token: "reset-token",
    });
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

async function renderLogin() {
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

  const container = render(
    <AuthProvider client={createAuthClient()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>,
  );

  await waitFor(
    () => container.querySelector('input[autocomplete="current-password"]') !== null,
    "login form",
  );

  return container;
}

async function renderForgotPassword() {
  const rootRoute = createRootRoute();
  const forgotPasswordRoute = createRoute({
    component: ForgotPasswordForm,
    getParentRoute: () => rootRoute,
    path: "/auth/forgot-password",
  });
  const loginRoute = createRoute({
    component: () => <p>Login</p>,
    getParentRoute: () => rootRoute,
    path: "/auth/login",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/auth/forgot-password"] }),
    routeTree: rootRoute.addChildren([forgotPasswordRoute, loginRoute]),
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const container = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await waitFor(
    () => container.querySelector('input[type="email"]') !== null,
    "forgot password form",
  );

  return container;
}

async function renderResetPassword() {
  const rootRoute = createRootRoute();
  const resetRoute = createRoute({
    component: () => <ResetPasswordForm resetToken="reset-token" />,
    getParentRoute: () => rootRoute,
    path: "/auth/reset-password",
  });
  const loginRoute = createRoute({
    component: () => <p>Password reset complete</p>,
    getParentRoute: () => rootRoute,
    path: "/auth/login",
    validateSearch: (search) => ({ reset: search.reset === true }),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/auth/reset-password"] }),
    routeTree: rootRoute.addChildren([resetRoute, loginRoute]),
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  const container = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await waitFor(
    () => container.querySelector('input[autocomplete="new-password"]') !== null,
    "reset password form",
  );

  return container;
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
