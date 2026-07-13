import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, login, startSignup } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth API client", () => {
  it("sends session credentials and preserves structured validation errors", async () => {
    expect.hasAssertions();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(authResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            errors: {
              code: "validation_failed",
              detail: "Request validation failed.",
              fields: { email: ["has invalid format"] },
            },
          },
          422,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: "owner@example.com", password: "correct-password", remember: false });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4100/api/auth/login",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
