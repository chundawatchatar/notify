import type {
  ApiAuthResponse,
  ApiCompleteSignupRequest,
  ApiConfirmEmailRequest,
  ApiCurrentUserResponse,
  ApiLoginRequest,
  ApiReadinessResponse,
  ApiResendVerificationRequest,
  ApiSignupCompletionResponse,
  ApiSignupRequest,
  ApiSignupResponse,
  ApiSignupTokenResponse,
  ApiVersionResponse,
} from "@notify/api-client";

type ApiErrorFields = Record<string, string[]>;

type RequestOptions = {
  accessToken?: string;
  body?: unknown;
  credentials?: RequestCredentials;
  method?: "DELETE" | "GET" | "POST";
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

class ApiRequestError extends Error {
  readonly code: string;
  readonly fields?: ApiErrorFields;
  readonly status: number;

  constructor(status: number, code: string, detail: string, fields?: ApiErrorFields) {
    super(detail);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function requestJson<ResponseBody>(
  path: string,
  options: RequestOptions = {},
): Promise<ResponseBody> {
  const headers = new Headers({ accept: "application/json" });

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: options.credentials,
      headers,
      method: options.method ?? "GET",
    });
  } catch {
    throw new ApiRequestError(
      0,
      "network_error",
      "Unable to reach Notify. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  if (response.status === 204) {
    return undefined as ResponseBody;
  }

  return response.json() as Promise<ResponseBody>;
}

async function apiErrorFromResponse(response: Response) {
  try {
    const body = (await response.json()) as {
      errors?: { code?: string; detail?: string; fields?: ApiErrorFields };
    };

    return new ApiRequestError(
      response.status,
      body.errors?.code ?? "request_failed",
      body.errors?.detail ?? `API request failed with status ${response.status}.`,
      body.errors?.fields,
    );
  } catch {
    return new ApiRequestError(
      response.status,
      "request_failed",
      `API request failed with status ${response.status}.`,
    );
  }
}

function startSignup(body: ApiSignupRequest) {
  return requestJson<ApiSignupResponse>("/api/auth/signup", { body, method: "POST" });
}

function resendVerification(body: ApiResendVerificationRequest) {
  return requestJson<ApiSignupResponse>("/api/auth/email-verification/resend", {
    body,
    method: "POST",
  });
}

function confirmEmail(body: ApiConfirmEmailRequest) {
  return requestJson<ApiSignupTokenResponse>("/api/auth/email-verification/confirm", {
    body,
    method: "POST",
  });
}

function completeSignup(body: ApiCompleteSignupRequest) {
  return requestJson<ApiSignupCompletionResponse>("/api/auth/signup/complete", {
    body,
    method: "POST",
  });
}

function login(body: ApiLoginRequest) {
  return requestJson<ApiAuthResponse>("/api/auth/login", {
    body,
    credentials: "include",
    method: "POST",
  });
}

function refreshSession() {
  return requestJson<ApiAuthResponse>("/api/auth/refresh", {
    credentials: "include",
    method: "POST",
  });
}

function getCurrentUser(accessToken: string) {
  return requestJson<ApiCurrentUserResponse>("/api/auth/me", { accessToken });
}

function logout(accessToken?: string) {
  return requestJson<void>("/api/auth/session", {
    accessToken,
    credentials: "include",
    method: "DELETE",
  });
}

function getApiReadiness() {
  return requestJson<ApiReadinessResponse>("/api/health/ready");
}

function getApiVersion() {
  return requestJson<ApiVersionResponse>("/api/version");
}

export {
  ApiRequestError,
  completeSignup,
  confirmEmail,
  getApiReadiness,
  getApiVersion,
  getCurrentUser,
  login,
  logout,
  refreshSession,
  resendVerification,
  startSignup,
};
