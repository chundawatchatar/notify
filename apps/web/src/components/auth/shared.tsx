import { Alert, AlertTitle, Label } from "@notify/ui";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  apiFieldError,
  firstFieldError,
  formSubmitHandler,
  requestErrorMessage,
  zodError,
} from "@/lib/form-utils";

const emailSchema = z.email("Enter a valid work email.").max(160, "Email is too long.");
const loginPasswordSchema = z.string().min(1, "Enter your password.");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");
const workspaceNameSchema = z
  .string()
  .min(2, "Workspace name must be at least 2 characters.")
  .max(100, "Workspace name must be at most 100 characters.");
const acceptTermsSchema = z.literal(true, "Accept the terms to create a workspace.");

function FormField({
  action,
  children,
  error,
  errorId,
  inputId,
  label,
}: Readonly<{
  action?: ReactNode;
  children: ReactNode;
  error?: string;
  errorId?: string;
  inputId: string;
  label: string;
}>) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        {action}
      </div>
      {children}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function FieldError({ id, message }: Readonly<{ id?: string; message?: string }>) {
  return message ? (
    <p className="text-destructive text-sm" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function MutationMessage({ error }: Readonly<{ error: unknown }>) {
  return error ? (
    <Alert severity="error">
      <AlertTitle>Request failed</AlertTitle>
      {requestErrorMessage(error)}
    </Alert>
  ) : null;
}

function passwordConfirmationError(value: string, password: string) {
  if (!value) {
    return "Confirm your password.";
  }

  return value === password ? undefined : "Passwords do not match.";
}

export {
  acceptTermsSchema,
  apiFieldError,
  emailSchema,
  FieldError,
  FormField,
  firstFieldError,
  formSubmitHandler,
  loginPasswordSchema,
  MutationMessage,
  passwordConfirmationError,
  passwordSchema,
  requestErrorMessage,
  workspaceNameSchema,
  zodError,
};
