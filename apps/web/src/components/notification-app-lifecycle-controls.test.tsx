import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, click, render, waitFor } from "@/test/render";
import { server } from "@/test/server";
import { NotificationAppLifecycleControls } from "./notification-app-lifecycle-controls";

const apiBaseUrl = "http://localhost:4100";

afterEach(cleanup);

describe("notification app lifecycle controls", () => {
  it("requires confirmation and prevents duplicate archive submissions", async () => {
    expect.hasAssertions();
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

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
      >
        <NotificationAppLifecycleControls
          app={notificationApp()}
          authenticatedRequest={(request) => request("access-token")}
          canManageApps
          onArchived={() => {
            archived = true;
          }}
        />
      </QueryClientProvider>,
    );

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

function buttonByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!button) {
    throw new Error(`Could not find button: ${text}`);
  }

  return button;
}

function notificationApp() {
  return {
    environments: [],
    id: "3dc20706-9944-4743-8121-c0429c622c0b",
    name: "Payments Service",
    slug: "payments-service",
  };
}
