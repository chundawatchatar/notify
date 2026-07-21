import type { operations, paths } from "./generated/schema";

type ApiPaths = paths;
type ApiPath = keyof ApiPaths;
type ApiOperations = operations;
type ApiOperationId = keyof ApiOperations;
type ApiOperation<OperationId extends ApiOperationId> = ApiOperations[OperationId];

type JsonResponse<
  OperationId extends ApiOperationId,
  Status extends keyof ApiOperation<OperationId>["responses"],
> = ApiOperation<OperationId>["responses"][Status] extends {
  content: { "application/json": infer Body };
}
  ? Body
  : never;

type JsonRequestBody<OperationId extends ApiOperationId> =
  ApiOperation<OperationId> extends {
    requestBody: { content: { "application/json": infer Body } };
  }
    ? Body
    : never;

type ApiLivenessResponse = JsonResponse<"getApiLiveness", 200>;
type ApiReadinessResponse = JsonResponse<"getApiReadiness", 200>;
type ApiVersionResponse = JsonResponse<"getApiVersion", 200>;
type ApiSignupRequest = JsonRequestBody<"signup">;
type ApiSignupResponse = JsonResponse<"signup", 202>;
type ApiResendVerificationRequest = JsonRequestBody<"resendEmailVerification">;
type ApiConfirmEmailRequest = JsonRequestBody<"confirmEmail">;
type ApiSignupTokenResponse = JsonResponse<"confirmEmail", 200>;
type ApiCompleteSignupRequest = JsonRequestBody<"completeSignup">;
type ApiSignupCompletionResponse = JsonResponse<"completeSignup", 201>;
type ApiAcceptInvitationRequest = JsonRequestBody<"acceptInvitation">;
type ApiCompleteInvitationSignupRequest = JsonRequestBody<"completeInvitationSignup">;
type ApiInvitationSignupResponse = JsonResponse<"completeInvitationSignup", 201>;
type ApiPasswordResetRequest = JsonRequestBody<"requestPasswordReset">;
type ApiPasswordResetRequestResponse = JsonResponse<"requestPasswordReset", 202>;
type ApiConfirmPasswordResetRequest = JsonRequestBody<"confirmPasswordReset">;
type ApiPasswordResetTokenResponse = JsonResponse<"confirmPasswordReset", 200>;
type ApiCompletePasswordResetRequest = JsonRequestBody<"completePasswordReset">;
type ApiPasswordResetCompletionResponse = JsonResponse<"completePasswordReset", 200>;
type ApiLoginRequest = JsonRequestBody<"login">;
type ApiAuthResponse = JsonResponse<"login", 200>;
type ApiCurrentUserResponse = JsonResponse<"getCurrentUser", 200>;
type ApiWorkspaceListResponse = JsonResponse<"listWorkspaces", 200>;
type ApiSwitchWorkspaceRequest = JsonRequestBody<"switchWorkspace">;
type ApiWorkspaceMembersResponse = JsonResponse<"listWorkspaceMembers", 200>;
type ApiWorkspaceMember = JsonResponse<"updateWorkspaceMemberRole", 200>;
type ApiUpdateWorkspaceMemberRoleRequest = JsonRequestBody<"updateWorkspaceMemberRole">;
type ApiWorkspaceInvitationsResponse = JsonResponse<"listWorkspaceInvitations", 200>;
type ApiWorkspaceInvitation = JsonResponse<"createWorkspaceInvitation", 201>;
type ApiCreateWorkspaceInvitationRequest = JsonRequestBody<"createWorkspaceInvitation">;
type ApiErrorResponse = JsonResponse<"login", 401>;
type ApiValidationErrorResponse = JsonResponse<"login", 422>;

export type {
  ApiAcceptInvitationRequest,
  ApiAuthResponse,
  ApiCompleteInvitationSignupRequest,
  ApiCompletePasswordResetRequest,
  ApiCompleteSignupRequest,
  ApiConfirmEmailRequest,
  ApiConfirmPasswordResetRequest,
  ApiCreateWorkspaceInvitationRequest,
  ApiCurrentUserResponse,
  ApiErrorResponse,
  ApiInvitationSignupResponse,
  ApiLivenessResponse,
  ApiLoginRequest,
  ApiOperation,
  ApiOperationId,
  ApiOperations,
  ApiPasswordResetCompletionResponse,
  ApiPasswordResetRequest,
  ApiPasswordResetRequestResponse,
  ApiPasswordResetTokenResponse,
  ApiPath,
  ApiPaths,
  ApiReadinessResponse,
  ApiResendVerificationRequest,
  ApiSignupCompletionResponse,
  ApiSignupRequest,
  ApiSignupResponse,
  ApiSignupTokenResponse,
  ApiSwitchWorkspaceRequest,
  ApiUpdateWorkspaceMemberRoleRequest,
  ApiValidationErrorResponse,
  ApiVersionResponse,
  ApiWorkspaceInvitation,
  ApiWorkspaceInvitationsResponse,
  ApiWorkspaceListResponse,
  ApiWorkspaceMember,
  ApiWorkspaceMembersResponse,
  JsonRequestBody,
  JsonResponse,
};
