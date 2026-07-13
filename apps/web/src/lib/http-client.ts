type ApiErrorFields = Record<string, string[]>;
type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

type RetryOptions = {
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxRetries?: number;
  statuses?: readonly number[];
};

type RequestOptions = Omit<RequestInit, "body" | "headers" | "method"> & {
  accessToken?: string;
  headers?: HeadersInit;
  retry?: false | RetryOptions;
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4100";
const retryableMethods = new Set<HttpMethod>(["DELETE", "GET", "PUT"]);
const defaultRetryableStatuses = [408, 429, 500, 502, 503, 504] as const;
const defaultBaseDelayMs = 250;
const defaultMaxDelayMs = 2_000;
const defaultMaxRetries = 2;

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

function get<ResponseBody>(path: string, options?: RequestOptions) {
  return request<ResponseBody>("GET", path, undefined, options);
}

function post<ResponseBody, RequestBody = unknown>(
  path: string,
  body?: RequestBody,
  options?: RequestOptions,
) {
  return request<ResponseBody>("POST", path, body, options);
}

function put<ResponseBody, RequestBody = unknown>(
  path: string,
  body?: RequestBody,
  options?: RequestOptions,
) {
  return request<ResponseBody>("PUT", path, body, options);
}

function patch<ResponseBody, RequestBody = unknown>(
  path: string,
  body?: RequestBody,
  options?: RequestOptions,
) {
  return request<ResponseBody>("PATCH", path, body, options);
}

function deleteRequest<ResponseBody, RequestBody = unknown>(
  path: string,
  body?: RequestBody,
  options?: RequestOptions,
) {
  return request<ResponseBody>("DELETE", path, body, options);
}

async function request<ResponseBody>(
  method: HttpMethod,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<ResponseBody> {
  const { accessToken, headers: initialHeaders, retry, ...requestOptions } = options;
  const headers = new Headers(initialHeaders);
  headers.set("accept", "application/json");

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const retryPolicy = resolveRetryPolicy(method, retry);

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...requestOptions,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers,
        method,
      });
    } catch (error) {
      if (requestOptions.signal?.aborted) {
        throw error;
      }

      if (attempt < retryPolicy.maxRetries) {
        await retryDelay(attempt, retryPolicy, undefined, requestOptions.signal);
        continue;
      }

      throw new ApiRequestError(
        0,
        "network_error",
        "Unable to reach Notify. Check your connection and try again.",
      );
    }

    if (response.ok) {
      return responseBody<ResponseBody>(response);
    }

    if (attempt < retryPolicy.maxRetries && retryPolicy.statuses.includes(response.status)) {
      await retryDelay(attempt, retryPolicy, response, requestOptions.signal);
      continue;
    }

    throw await apiErrorFromResponse(response);
  }
}

function resolveRetryPolicy(
  method: HttpMethod,
  retry: false | RetryOptions | undefined,
): Required<RetryOptions> {
  const defaultRetries = retryableMethods.has(method) ? defaultMaxRetries : 0;

  if (retry === false) {
    return {
      baseDelayMs: defaultBaseDelayMs,
      maxDelayMs: defaultMaxDelayMs,
      maxRetries: 0,
      statuses: defaultRetryableStatuses,
    };
  }

  return {
    baseDelayMs: Math.max(0, retry?.baseDelayMs ?? defaultBaseDelayMs),
    maxDelayMs: Math.max(0, retry?.maxDelayMs ?? defaultMaxDelayMs),
    maxRetries: Math.max(0, Math.floor(retry?.maxRetries ?? defaultRetries)),
    statuses: retry?.statuses ?? defaultRetryableStatuses,
  };
}

async function retryDelay(
  attempt: number,
  policy: Required<RetryOptions>,
  response: Response | undefined,
  signal: AbortSignal | null | undefined,
) {
  const retryAfter = response ? retryAfterMilliseconds(response.headers.get("retry-after")) : null;
  const exponentialDelay = Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs);
  await wait(Math.min(retryAfter ?? exponentialDelay, policy.maxDelayMs), signal);
}

function retryAfterMilliseconds(value: string | null) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function wait(delayMs: number, signal: AbortSignal | null | undefined) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = globalThis.setTimeout(finish, delayMs);

    function finish() {
      signal?.removeEventListener("abort", abort);
      resolve();
    }

    function abort() {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason);
    }

    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function responseBody<ResponseBody>(response: Response): Promise<ResponseBody> {
  if (response.status === 204 || response.status === 205) {
    return undefined as ResponseBody;
  }

  const text = await response.text();

  if (!text) {
    return undefined as ResponseBody;
  }

  if (response.headers.get("content-type")?.includes("application/json")) {
    return JSON.parse(text) as ResponseBody;
  }

  return text as ResponseBody;
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

export type { ApiErrorFields, RequestOptions, RetryOptions };
export { ApiRequestError, deleteRequest, deleteRequest as delete, get, patch, post, put };
