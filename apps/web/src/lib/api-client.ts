import type { ApiReadinessResponse, ApiVersionResponse } from "@notify/api-client";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

async function getJson<ResponseBody>(path: string): Promise<ResponseBody> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<ResponseBody>;
}

function getApiReadiness() {
  return getJson<ApiReadinessResponse>("/api/health/ready");
}

function getApiVersion() {
  return getJson<ApiVersionResponse>("/api/version");
}

export { getApiReadiness, getApiVersion };
