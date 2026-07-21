import type {
  ApiAuthResponse,
  ApiCompletePasswordResetRequest,
  ApiCompleteSignupRequest,
  ApiConfirmEmailRequest,
  ApiConfirmPasswordResetRequest,
  ApiCurrentUserResponse,
  ApiLoginRequest,
  ApiPasswordResetCompletionResponse,
  ApiPasswordResetRequest,
  ApiPasswordResetRequestResponse,
  ApiPasswordResetTokenResponse,
  ApiReadinessResponse,
  ApiResendVerificationRequest,
  ApiSignupCompletionResponse,
  ApiSignupRequest,
  ApiSignupResponse,
  ApiSignupTokenResponse,
  ApiSwitchWorkspaceRequest,
  ApiVersionResponse,
  ApiWorkspaceListResponse,
} from "@notify/api-client";
import { ApiRequestError, deleteRequest, get, post } from "./http-client";

function startSignup(body: ApiSignupRequest) {
  return post<ApiSignupResponse, ApiSignupRequest>("/api/auth/signup", body);
}

function resendVerification(body: ApiResendVerificationRequest) {
  return post<ApiSignupResponse, ApiResendVerificationRequest>(
    "/api/auth/email-verification/resend",
    body,
  );
}

function confirmEmail(body: ApiConfirmEmailRequest) {
  return post<ApiSignupTokenResponse, ApiConfirmEmailRequest>(
    "/api/auth/email-verification/confirm",
    body,
  );
}

function completeSignup(body: ApiCompleteSignupRequest) {
  return post<ApiSignupCompletionResponse, ApiCompleteSignupRequest>(
    "/api/auth/signup/complete",
    body,
  );
}

function requestPasswordReset(body: ApiPasswordResetRequest) {
  return post<ApiPasswordResetRequestResponse, ApiPasswordResetRequest>(
    "/api/auth/password-reset",
    body,
  );
}

function confirmPasswordReset(body: ApiConfirmPasswordResetRequest) {
  return post<ApiPasswordResetTokenResponse, ApiConfirmPasswordResetRequest>(
    "/api/auth/password-reset/confirm",
    body,
  );
}

function completePasswordReset(body: ApiCompletePasswordResetRequest) {
  return post<ApiPasswordResetCompletionResponse, ApiCompletePasswordResetRequest>(
    "/api/auth/password-reset/complete",
    body,
  );
}

function login(body: ApiLoginRequest) {
  return post<ApiAuthResponse, ApiLoginRequest>("/api/auth/login", body, {
    credentials: "include",
  });
}

function refreshSession() {
  return post<ApiAuthResponse>("/api/auth/refresh", undefined, {
    credentials: "include",
  });
}

function getCurrentUser(accessToken: string) {
  return get<ApiCurrentUserResponse>("/api/auth/me", { accessToken });
}

function listWorkspaces(accessToken: string) {
  return get<ApiWorkspaceListResponse>("/api/workspaces", { accessToken });
}

function switchWorkspace(accessToken: string, body: ApiSwitchWorkspaceRequest) {
  return post<ApiAuthResponse, ApiSwitchWorkspaceRequest>("/api/auth/workspace/switch", body, {
    accessToken,
    credentials: "include",
  });
}

function logout(accessToken?: string) {
  return deleteRequest<void>("/api/auth/session", undefined, {
    accessToken,
    credentials: "include",
  });
}

function getApiReadiness() {
  return get<ApiReadinessResponse>("/api/health/ready");
}

function getApiVersion() {
  return get<ApiVersionResponse>("/api/version");
}

export {
  ApiRequestError,
  completePasswordReset,
  completeSignup,
  confirmEmail,
  confirmPasswordReset,
  getApiReadiness,
  getApiVersion,
  getCurrentUser,
  listWorkspaces,
  login,
  logout,
  refreshSession,
  requestPasswordReset,
  resendVerification,
  startSignup,
  switchWorkspace,
};
