import type { ApiNotificationApp } from "@notify/api-client";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import {
  ApiRequestError,
  createNotificationApp,
  getNotificationApp,
  listNotificationApps,
  listWorkspaces,
  login,
  startSignup,
  switchWorkspace,
} from "./api-client";

const apiBaseUrl = "http://localhost:4100";

describe("auth API client", () => {
  it("sends session credentials and preserves structured validation errors", async () => {
    expect.hasAssertions();
    let loginCredentials: RequestCredentials | undefined;

    server.use(
      http.post(`${apiBaseUrl}/api/auth/login`, ({ request }) => {
        loginCredentials = request.credentials;
        return HttpResponse.json(authResponse());
      }),
      http.post(`${apiBaseUrl}/api/auth/signup`, () =>
        HttpResponse.json(
          {
            errors: {
              code: "validation_failed",
              detail: "Request validation failed.",
              fields: { email: ["has invalid format"] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    await login({ email: "owner@example.com", password: "correct-password", remember: false });
    expect(loginCredentials).toBe("include");

    const error = await startSignup({ email: "invalid" }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      code: "validation_failed",
      fields: { email: ["has invalid format"] },
      status: 422,
    });
  });

  it("sends authenticated workspace requests with the expected credentials", async () => {
    expect.hasAssertions();
    let listAuthorization: string | null = null;
    let switchAuthorization: string | null = null;
    let switchCredentials: RequestCredentials | undefined;
    let switchBody: unknown;

    server.use(
      http.get(`${apiBaseUrl}/api/workspaces`, ({ request }) => {
        listAuthorization = request.headers.get("authorization");
        return HttpResponse.json({ workspaces: [] });
      }),
      http.post(`${apiBaseUrl}/api/auth/workspace/switch`, async ({ request }) => {
        switchAuthorization = request.headers.get("authorization");
        switchCredentials = request.credentials;
        switchBody = await request.json();
        return HttpResponse.json(authResponse());
      }),
    );

    await listWorkspaces("access-token");
    await switchWorkspace("access-token", { workspace_slug: "notify-labs" });

    expect(listAuthorization).toBe("Bearer access-token");
    expect(switchAuthorization).toBe("Bearer access-token");
    expect(switchCredentials).toBe("include");
    expect(switchBody).toEqual({ workspace_slug: "notify-labs" });
  });

  it("uses the generated app contracts for list, create, and detail requests", async () => {
    expect.hasAssertions();
    let listAuthorization: string | null = null;
    let createAuthorization: string | null = null;
    let createBody: unknown;
    let detailAuthorization: string | null = null;

    server.use(
      http.get(`${apiBaseUrl}/api/apps`, ({ request }) => {
        listAuthorization = request.headers.get("authorization");
        return HttpResponse.json({ apps: [notificationApp()] });
      }),
      http.post(`${apiBaseUrl}/api/apps`, async ({ request }) => {
        createAuthorization = request.headers.get("authorization");
        createBody = await request.json();
        return HttpResponse.json(notificationApp(), { status: 201 });
      }),
      http.get(`${apiBaseUrl}/api/apps/payments-service`, ({ request }) => {
        detailAuthorization = request.headers.get("authorization");
        return HttpResponse.json(notificationApp());
      }),
    );

    await expect(listNotificationApps("access-token")).resolves.toEqual({
      apps: [notificationApp()],
    });
    await expect(
      createNotificationApp("access-token", { name: "Payments Service" }),
    ).resolves.toEqual(notificationApp());
    await expect(getNotificationApp("access-token", "payments-service")).resolves.toEqual(
      notificationApp(),
    );

    expect(listAuthorization).toBe("Bearer access-token");
    expect(createAuthorization).toBe("Bearer access-token");
    expect(createBody).toEqual({ name: "Payments Service" });
    expect(detailAuthorization).toBe("Bearer access-token");
  });
});

function notificationApp(): ApiNotificationApp {
  return {
    id: "3dc20706-9944-4743-8121-c0429c622c0b",
    name: "Payments Service",
    slug: "payments-service",
    environments: [
      {
        id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
        name: "Development",
        slug: "development",
        production: false,
      },
    ],
  };
}

function authResponse() {
  return {
    access_token: "access-token",
    expires_in: 900,
    role: "owner",
    token_type: "Bearer",
    user: { email: "owner@example.com", id: "3dc20706-9944-4743-8121-c0429c622c0b" },
    workspace: { id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4", name: "Acme Cloud" },
  };
}
