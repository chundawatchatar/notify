import { confirmEmail } from "./api-client";

type SignupVerificationState =
  | { error: string; status: "error" }
  | { signupToken: string; status: "confirmed" };

class SignupVerificationClient {
  private pending: Promise<SignupVerificationState> | undefined;
  private pendingToken: string | undefined;
  private state: SignupVerificationState | undefined;

  exchange = (token: string): Promise<SignupVerificationState> => {
    if (this.pending && this.pendingToken === token) {
      return this.pending;
    }

    const pending = this.confirm(token);
    this.pending = pending;
    this.pendingToken = token;

    return pending.finally(() => {
      if (this.pending === pending) {
        this.pending = undefined;
        this.pendingToken = undefined;
      }
    });
  };

  getState = () => this.state;

  clear = () => {
    this.state = undefined;
  };

  private async confirm(token: string): Promise<SignupVerificationState> {
    try {
      const response = await confirmEmail({ token });
      this.state = { signupToken: response.signup_token, status: "confirmed" };
    } catch (error) {
      this.state = {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify this email. Request a new verification link.",
        status: "error",
      };
    }

    return this.state;
  }
}

function createSignupVerificationClient() {
  return new SignupVerificationClient();
}

export type { SignupVerificationState };
export { createSignupVerificationClient, SignupVerificationClient };
