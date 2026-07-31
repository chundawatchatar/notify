import type { FormEvent } from "react";
import type { z } from "zod";
import { ApiRequestError } from "@/lib/api-client";

function apiFieldError(error: unknown, field: string) {
  return error instanceof ApiRequestError ? error.fields?.[field]?.[0] : undefined;
}

function firstFieldError(errors: unknown[]) {
  const [error] = errors;

  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

function zodError(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? undefined : (result.error.issues[0]?.message ?? "Invalid value.");
}

function formSubmitHandler(handleSubmit: () => Promise<void>) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit();
  };
}

function requestErrorMessage(
  error: unknown,
  fallback = "Unable to complete the request. Try again.",
) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

export {
  apiFieldError,
  firstFieldError,
  formatDate,
  formSubmitHandler,
  requestErrorMessage,
  zodError,
};
