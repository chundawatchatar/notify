import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import {
  blur,
  buttonByText,
  change,
  cleanup,
  click,
  installBrowserCoordination,
  render,
  restoreBrowserCoordination,
  waitFor,
} from "@/test/render";
import { server } from "@/test/server";
import { NotificationAppLifecycleControls } from "./notification-app-lifecycle-controls";

const apiBaseUrl = "http://localhost:4100";

afterEach(() => {
  cleanup();
  restoreBrowserCoordination();
});

describe("notification app lifecycle controls", () => {
  it("renames an app successfully", async () => {
    expect.hasAssertions();
    let updatedName: string | undefined;
    installBrowserCoordination({ includeScrollMocks: true });

    server.use(
      http.patch(`${apiBaseUrl}/api/apps/payments-service`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        updatedName = body.name;

        return HttpResponse.json({ ...notificationApp(), name: body.name });
      }),
    );

    renderLifecycleControls();

    const nameInput = document.body.querySelector<HTMLInputElement>("#notification-app-name");
    expect(nameInput).toBeInstanceOf(HTMLInputElement);
    change(nameInput as HTMLInputElement, "Payments API");
    click(buttonByText(document.body, "Save name"));

    await waitFor(() => updatedName === "Payments API", "rename request");
    expect(updatedName).toBe("Payments API");
  });

  it("shows validation and api field errors when renaming fails", async () => {
    expect.hasAssertions();
    installBrowserCoordination({ includeScrollMocks: true });

    server.use(
      http.patch(`${apiBaseUrl}/api/apps/payments-service`, () =>
        HttpResponse.json(
          {
            errors: {
              code: "validation_failed",
              detail: "Name already exists.",
              fields: { name: ["Name already exists."] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderLifecycleControls();

    const nameInput = document.body.querySelector<HTMLInputElement>("#notification-app-name");
    expect(nameInput).toBeInstanceOf(HTMLInputElement);
    change(nameInput as HTMLInputElement, "   ");
    blur(nameInput as HTMLInputElement);
    await waitFor(() => document.body.textContent?.includes("Enter an app name.") === true);

    change(nameInput as HTMLInputElement, "Payments API");
    blur(nameInput as HTMLInputElement);
    await waitFor(
      () => buttonByText(document.body, "Save name").disabled === false,
      "enabled save name button",
    );
    click(buttonByText(document.body, "Save name"));
    await waitFor(() => document.body.textContent?.includes("Name already exists.") === true);
  });

  it("hides management controls when app management is disabled", () => {
    installBrowserCoordination({ includeScrollMocks: true });
    renderLifecycleControls({ canManageApps: false });

    expect(document.body.textContent?.includes("Save name")).toBe(false);
    expect(document.body.textContent?.includes("Archive app")).toBe(false);
  });

  it("requires confirmation and prevents duplicate archive submissions", async () => {
    expect.hasAssertions();
    installBrowserCoordination({ includeScrollMocks: true });
    let archiveCalls = 0;
    let archived = false;
    let resolveArchive: ((response: Response) => void) | undefined;
    const archiveResponse = new Promise<Response>((resolve) => {
      resolveArchive = resolve;
    });

    server.use(
      http.delete(`${apiBaseUrl}/api/apps/payments-service`, () => {
        archiveCalls += 1;
        return archiveResponse;
      }),
    );

    renderLifecycleControls({
      onArchived: () => {
        archived = true;
      },
    });

    click(buttonByText(document.body, "Archive app"));
    expect(archiveCalls).toBe(0);

    const dialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
    expect(dialog).toBeInstanceOf(HTMLElement);

    const confirmButton = buttonByText(dialog as HTMLElement, "Archive app");
    click(confirmButton);
    await waitFor(() => archiveCalls === 1, "archive request");

    expect(confirmButton.disabled).toBe(true);
    click(confirmButton);
    expect(archiveCalls).toBe(1);

    resolveArchive?.(new HttpResponse(null, { status: 204 }));
    await waitFor(() => archived, "archive completion");
    expect(archived).toBe(true);
  });
});

function renderLifecycleControls({
  canManageApps = true,
  onArchived,
}: Readonly<{
  canManageApps?: boolean;
  onArchived?: () => void;
}> = {}) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <NotificationAppLifecycleControls
        app={notificationApp()}
        authenticatedRequest={(request) => request("access-token")}
        canManageApps={canManageApps}
        onArchived={onArchived}
      />
    </QueryClientProvider>,
  );
}

function notificationApp() {
  return {
    environments: [],
    id: "3dc20706-9944-4743-8121-c0429c622c0b",
    name: "Payments Service",
    slug: "payments-service",
  };
}
