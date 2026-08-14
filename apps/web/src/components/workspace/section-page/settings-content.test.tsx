import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider, createAuthClient } from "@/lib/auth";
import {
  authResponse,
  buttonByText,
  change,
  cleanup,
  click,
  installBrowserCoordination,
  render,
  restoreBrowserCoordination,
  waitFor,
  waitForText,
} from "@/test/render";
import { server } from "@/test/server";
import { roleCanManageWorkspace, SettingsContent } from "./settings-content";

const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  restoreBrowserCoordination();
});

describe("settings content", () => {
  it("loads settings and saves valid workspace changes", async () => {
    installBrowserCoordination();
    let releaseSettings = () => {};
    let settingsReads = 0;
    let submittedBody: unknown;
    const settingsGate = new Promise<void>((resolve) => {
      releaseSettings = resolve;
    });

    server.use(
      ...authHandlers("owner"),
      http.get(settingsPath(), async () => {
        settingsReads += 1;
        if (settingsReads === 1) await settingsGate;
        return HttpResponse.json(settingsResponse(settingsReads > 1));
      }),
      http.patch(settingsPath(), async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(settingsResponse(true));
      }),
    );

    const container = await renderSettings();

    await waitForText(container, "Loading settings...");
    releaseSettings();
    await waitForText(container, "Workspace routing");

    change(inputByName(container, "name"), "Acme Platform");
    change(inputByName(container, "timezone"), "Asia/Kolkata");
    click(buttonByText(container, "Save settings"));

    await waitForText(container, "Settings saved");
    await waitFor(() => settingsReads === 2, "refreshed settings query");
    expect(submittedBody).toEqual({ name: "Acme Platform", timezone: "Asia/Kolkata" });
    expect(container.textContent).toContain("acme-cloud");
    expect(container.textContent).toContain("Development");
    expect(container.textContent).not.toContain("Delivery alerts");
  });

  it("blocks invalid timezone values without losing the entered value", async () => {
    installBrowserCoordination();
    let updateCalls = 0;
    server.use(
      ...authHandlers("admin"),
      http.get(settingsPath(), () => HttpResponse.json(settingsResponse(false))),
      http.patch(settingsPath(), () => {
        updateCalls += 1;
        return HttpResponse.json(settingsResponse(false));
      }),
    );

    const container = await renderSettings();
    await waitForText(container, "Workspace details");

    const timezoneInput = inputByName(container, "timezone");
    change(timezoneInput, "IST");

    await waitForText(container, "Enter an IANA timezone such as UTC or Asia/Kolkata.");
    expect(buttonByText(container, "Save settings").hasAttribute("disabled")).toBe(true);
    expect(timezoneInput.value).toBe("IST");
    expect(updateCalls).toBe(0);
  });

  it("shows developer and viewer settings as read-only", async () => {
    installBrowserCoordination();
    server.use(
      ...authHandlers("viewer"),
      http.get(settingsPath(), () => HttpResponse.json(settingsResponse(false))),
    );

    const container = await renderSettings();
    await waitForText(container, "An owner or admin can update them.");

    expect(container.textContent).toContain("Acme Cloud");
    expect(container.textContent).toContain("UTC");
    expect(container.querySelector("input")).toBeNull();
    expect(container.textContent).not.toContain("Save settings");
    expect(roleCanManageWorkspace("developer")).toBe(false);
    expect(roleCanManageWorkspace("viewer")).toBe(false);
    expect(roleCanManageWorkspace("admin")).toBe(true);
    expect(roleCanManageWorkspace("owner")).toBe(true);
  });
});

async function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const authClient = createAuthClient();
  await authClient.retrySession();

  return render(
    <AuthProvider client={authClient}>
      <QueryClientProvider client={queryClient}>
        <SettingsContent workspaceSlug="acme-cloud" />
      </QueryClientProvider>
    </AuthProvider>,
  );
}

function authHandlers(role: "admin" | "owner" | "viewer") {
  return [
    http.post(`${apiBaseUrl}/api/auth/refresh`, () =>
      HttpResponse.json({ ...authResponse(role === "viewer" ? "viewer" : "owner"), role }),
    ),
    http.get(`${apiBaseUrl}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
  ];
}

function settingsPath() {
  return `${apiBaseUrl}/api/workspaces/acme-cloud/settings`;
}

function settingsResponse(updated: boolean) {
  return {
    settings: {
      default_environment: "development" as const,
      name: updated ? "Acme Platform" : "Acme Cloud",
      slug: "acme-cloud",
      timezone: updated ? "Asia/Kolkata" : "UTC",
    },
  };
}

function inputByName(container: HTMLElement, name: string) {
  const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);

  if (!input) throw new Error(`Expected ${name} input.`);
  return input;
}
