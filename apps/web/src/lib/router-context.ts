import type { AuthClient } from "./auth";
import type { PasswordResetClient } from "./password-reset";
import type { SignupVerificationClient } from "./signup-verification";

type RouterContext = {
  auth: AuthClient;
  passwordReset: PasswordResetClient;
  signupVerification: SignupVerificationClient;
};

export type { RouterContext };
