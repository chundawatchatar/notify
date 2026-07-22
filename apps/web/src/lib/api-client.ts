import type {
  ApiAcceptInvitationRequest,
  ApiAuthResponse,
  ApiCompleteInvitationSignupRequest,
  ApiCompletePasswordResetRequest,
  ApiCompleteSignupRequest,
  ApiConfirmEmailRequest,
  ApiConfirmPasswordResetRequest,
  ApiCreateNotificationAppRequest,
  ApiCreateWorkspaceInvitationRequest,
  ApiCurrentUserResponse,
  ApiInvitationPreviewResponse,
  ApiInvitationSignupResponse,
  ApiLoginRequest,
  ApiNotificationApp,
  ApiNotificationAppsResponse,
  ApiPasswordResetCompletionResponse,
  ApiPasswordResetRequest,
  ApiPasswordResetRequestResponse,
  ApiPasswordResetTokenResponse,
  ApiReadinessResponse,
  ApiResendVerificationRequest,
  ApiResolveInvitationRequest,
  ApiSignupCompletionResponse,
  ApiSignupRequest,
  ApiSignupResponse,
  ApiSignupTokenResponse,
  ApiSwitchWorkspaceRequest,
  ApiUpdateWorkspaceMemberRoleRequest,
  ApiVersionResponse,
  ApiWorkspaceInvitation,
  ApiWorkspaceInvitationsResponse,
  ApiWorkspaceListResponse,
  ApiWorkspaceMember,
  ApiWorkspaceMembersResponse,
} from "@notify/api-client";
import { ApiRequestError, deleteRequest, get, patch, post } from "./http-client";

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

function acceptInvitation(accessToken: string, body: ApiAcceptInvitationRequest) {
  return post<ApiAuthResponse, ApiAcceptInvitationRequest>("/api/auth/invitations/accept", body, {
    accessToken,
    credentials: "include",
  });
}

function resolveInvitation(body: ApiResolveInvitationRequest) {
  return post<ApiInvitationPreviewResponse, ApiResolveInvitationRequest>(
    "/api/auth/invitations/resolve",
    body,
  );
}

function completeInvitationSignup(body: ApiCompleteInvitationSignupRequest) {
  return post<ApiInvitationSignupResponse, ApiCompleteInvitationSignupRequest>(
    "/api/auth/invitations/signup",
    body,
    { credentials: "include" },
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

function listNotificationApps(accessToken: string) {
  return get<ApiNotificationAppsResponse>("/api/apps", { accessToken });
}

function createNotificationApp(accessToken: string, body: ApiCreateNotificationAppRequest) {
  return post<ApiNotificationApp, ApiCreateNotificationAppRequest>("/api/apps", body, {
    accessToken,
  });
}

function getNotificationApp(accessToken: string, appSlug: string) {
  return get<ApiNotificationApp>(`/api/apps/${appSlug}`, { accessToken });
}

function switchWorkspace(accessToken: string, body: ApiSwitchWorkspaceRequest) {
  return post<ApiAuthResponse, ApiSwitchWorkspaceRequest>("/api/auth/workspace/switch", body, {
    accessToken,
    credentials: "include",
  });
}

function listWorkspaceMembers(accessToken: string, workspaceSlug: string) {
  return get<ApiWorkspaceMembersResponse>(`/api/workspaces/${workspaceSlug}/members`, {
    accessToken,
  });
}

function updateWorkspaceMemberRole(
  accessToken: string,
  workspaceSlug: string,
  membershipId: string,
  body: ApiUpdateWorkspaceMemberRoleRequest,
) {
  return patch<ApiWorkspaceMember, ApiUpdateWorkspaceMemberRoleRequest>(
    `/api/workspaces/${workspaceSlug}/members/${membershipId}`,
    body,
    { accessToken },
  );
}

function removeWorkspaceMember(accessToken: string, workspaceSlug: string, membershipId: string) {
  return deleteRequest<void>(
    `/api/workspaces/${workspaceSlug}/members/${membershipId}`,
    undefined,
    {
      accessToken,
    },
  );
}

function listWorkspaceInvitations(accessToken: string, workspaceSlug: string) {
  return get<ApiWorkspaceInvitationsResponse>(`/api/workspaces/${workspaceSlug}/invitations`, {
    accessToken,
  });
}

function createWorkspaceInvitation(
  accessToken: string,
  workspaceSlug: string,
  body: ApiCreateWorkspaceInvitationRequest,
) {
  return post<ApiWorkspaceInvitation, ApiCreateWorkspaceInvitationRequest>(
    `/api/workspaces/${workspaceSlug}/invitations`,
    body,
    { accessToken },
  );
}

function revokeWorkspaceInvitation(
  accessToken: string,
  workspaceSlug: string,
  invitationId: string,
) {
  return deleteRequest<void>(
    `/api/workspaces/${workspaceSlug}/invitations/${invitationId}`,
    undefined,
    {
      accessToken,
    },
  );
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
  acceptInvitation,
  completeInvitationSignup,
  completePasswordReset,
  completeSignup,
  confirmEmail,
  confirmPasswordReset,
  createNotificationApp,
  createWorkspaceInvitation,
  getApiReadiness,
  getApiVersion,
  getCurrentUser,
  getNotificationApp,
  listNotificationApps,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  listWorkspaces,
  login,
  logout,
  refreshSession,
  removeWorkspaceMember,
  requestPasswordReset,
  resendVerification,
  resolveInvitation,
  revokeWorkspaceInvitation,
  startSignup,
  switchWorkspace,
  updateWorkspaceMemberRole,
};
