import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { ApiRequestError, login, startSignup } from "./api-client";

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
});

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
