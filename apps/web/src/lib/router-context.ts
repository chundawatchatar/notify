import type { AuthClient } from "./auth";
import type { InvitationAcceptanceClient } from "./invitation-acceptance";
import type { PasswordResetClient } from "./password-reset";
import type { SignupVerificationClient } from "./signup-verification";

type RouterContext = {
  auth: AuthClient;
  invitationAcceptance: InvitationAcceptanceClient;
  passwordReset: PasswordResetClient;
  signupVerification: SignupVerificationClient;
};

export type { RouterContext };
