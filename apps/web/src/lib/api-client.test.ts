import type { ApiNotificationApp } from "@notify/api-client";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import {
  ApiRequestError,
  archiveNotificationApp,
  createEnvironmentClientKey,
  createEnvironmentTrustedOrigin,
  createNotificationApp,
  getNotificationApp,
  listEnvironmentClientKeys,
  listEnvironmentTrustedOrigins,
  listNotificationApps,
  listWorkspaces,
  login,
  removeEnvironmentTrustedOrigin,
  revokeEnvironmentClientKey,
  startSignup,
  switchWorkspace,
  updateNotificationApp,
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

  it("uses the generated app contracts for app lifecycle requests", async () => {
    expect.hasAssertions();
    let listAuthorization: string | null = null;
    let createAuthorization: string | null = null;
    let createBody: unknown;
    let detailAuthorization: string | null = null;
    let updateAuthorization: string | null = null;
    let updateBody: unknown;
    let archiveAuthorization: string | null = null;

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
      http.patch(`${apiBaseUrl}/api/apps/payments-service`, async ({ request }) => {
        updateAuthorization = request.headers.get("authorization");
        updateBody = await request.json();
        return HttpResponse.json({ ...notificationApp(), name: "Payments Platform" });
      }),
      http.delete(`${apiBaseUrl}/api/apps/payments-service`, ({ request }) => {
        archiveAuthorization = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
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
    await expect(
      updateNotificationApp("access-token", "payments-service", { name: "Payments Platform" }),
    ).resolves.toEqual({ ...notificationApp(), name: "Payments Platform" });
    await expect(
      archiveNotificationApp("access-token", "payments-service"),
    ).resolves.toBeUndefined();

    expect(listAuthorization).toBe("Bearer access-token");
    expect(createAuthorization).toBe("Bearer access-token");
    expect(createBody).toEqual({ name: "Payments Service" });
    expect(detailAuthorization).toBe("Bearer access-token");
    expect(updateAuthorization).toBe("Bearer access-token");
    expect(updateBody).toEqual({ name: "Payments Platform" });
    expect(archiveAuthorization).toBe("Bearer access-token");
  });

  it("uses typed environment configuration endpoints", async () => {
    expect.hasAssertions();
    const appSlug = "payments-service";
    const environmentSlug = "development";
    const clientKeyId = "a6c977c6-8eb6-41ae-82dc-90f10ff134ce";
    const trustedOriginId = "17bd25a8-3bfe-4cf4-ae94-1fd39518d568";
    let originBody: unknown;

    server.use(
      http.get(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/client-keys`,
        () => HttpResponse.json({ client_keys: [clientKey()] }),
      ),
      http.post(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/client-keys`,
        () => HttpResponse.json(clientKey(), { status: 201 }),
      ),
      http.delete(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/client-keys/${clientKeyId}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/trusted-origins`,
        () => HttpResponse.json({ trusted_origins: [trustedOrigin()] }),
      ),
      http.post(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/trusted-origins`,
        async ({ request }) => {
          originBody = await request.json();
          return HttpResponse.json(trustedOrigin(), { status: 201 });
        },
      ),
      http.delete(
        `${apiBaseUrl}/api/apps/${appSlug}/environments/${environmentSlug}/trusted-origins/${trustedOriginId}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(
      listEnvironmentClientKeys("access-token", appSlug, environmentSlug),
    ).resolves.toEqual({ client_keys: [clientKey()] });
    await expect(
      createEnvironmentClientKey("access-token", appSlug, environmentSlug),
    ).resolves.toEqual(clientKey());
    await expect(
      revokeEnvironmentClientKey("access-token", appSlug, environmentSlug, clientKeyId),
    ).resolves.toBeUndefined();
    await expect(
      listEnvironmentTrustedOrigins("access-token", appSlug, environmentSlug),
    ).resolves.toEqual({ trusted_origins: [trustedOrigin()] });
    await expect(
      createEnvironmentTrustedOrigin("access-token", appSlug, environmentSlug, {
        origin: "https://console.example.com",
      }),
    ).resolves.toEqual(trustedOrigin());
    await expect(
      removeEnvironmentTrustedOrigin("access-token", appSlug, environmentSlug, trustedOriginId),
    ).resolves.toBeUndefined();

    expect(originBody).toEqual({ origin: "https://console.example.com" });
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
        readiness: {
          missing_requirements: ["client_key", "trusted_origin"],
          ready: false,
        },
      },
    ],
  };
}

function clientKey() {
  return {
    id: "a6c977c6-8eb6-41ae-82dc-90f10ff134ce",
    key: "nfy_pk_7K9fjNdZOzLkQenP2tHaBi8vWcXRm1sA",
    created_at: "2026-07-22T12:00:00Z",
    revoked_at: null,
  };
}

function trustedOrigin() {
  return {
    id: "17bd25a8-3bfe-4cf4-ae94-1fd39518d568",
    origin: "https://console.example.com",
    created_at: "2026-07-22T12:00:00Z",
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
