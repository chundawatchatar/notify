import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blur, change, cleanup, click, render, waitForText } from "@/test/render";
import { CompleteSignupForm, SignupForm } from "./auth-page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("signup form", () => {
  it("starts email verification and keeps the response enumeration-safe", async () => {
    expect.hasAssertions();

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "verification_sent" }), {
        headers: { "content-type": "application/json" },
        status: 202,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

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

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/auth/signup",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("owner@example.com");
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
