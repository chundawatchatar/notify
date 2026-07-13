import type { AuthClient } from "./auth";
import type { SignupVerificationClient } from "./signup-verification";

type RouterContext = {
  auth: AuthClient;
  signupVerification: SignupVerificationClient;
};

export type { RouterContext };
