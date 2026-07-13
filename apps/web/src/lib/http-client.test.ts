import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { ApiRequestError, deleteRequest, get, patch, post, put } from "./http-client";

const apiBaseUrl = "http://localhost:4100";

describe("HTTP client", () => {
  it("exposes each JSON request method through one transport", async () => {
    expect.hasAssertions();
    const methods: string[] = [];

    server.use(
      http.all(`${apiBaseUrl}/api/method`, async ({ request }) => {
        methods.push(request.method);
        return HttpResponse.json({ method: request.method });
      }),
    );

    await get("/api/method");
    await post("/api/method", { value: 1 });
    await put("/api/method", { value: 1 });
    await patch("/api/method", { value: 1 });
    await deleteRequest("/api/method");

    expect(methods).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE"]);
  });

  it("retries a transient GET response with bounded retry policy", async () => {
    expect.hasAssertions();
    let attempts = 0;

    server.use(
      http.get(`${apiBaseUrl}/api/retry`, () => {
        attempts += 1;
        return attempts < 3
          ? HttpResponse.json({ error: "temporary" }, { status: 503 })
          : HttpResponse.json({ status: "ready" });
      }),
    );

    const response = await get<{ status: string }>("/api/retry", {
      retry: { baseDelayMs: 0 },
    });

    expect(response).toEqual({ status: "ready" });
    expect(attempts).toBe(3);
  });

  it("does not automatically retry a failed POST", async () => {
    expect.hasAssertions();
    let attempts = 0;

    server.use(
      http.post(`${apiBaseUrl}/api/mutation`, () => {
        attempts += 1;
        return HttpResponse.json({ errors: { detail: "Try later." } }, { status: 503 });
      }),
    );

    const error = await post("/api/mutation", {}).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 503 });
    expect(attempts).toBe(1);
  });
});
