import { confirmPasswordReset } from "./api-client";

type PasswordResetState =
  | { error: string; status: "error" }
  | { resetToken: string; status: "confirmed" };

class PasswordResetClient {
  private pending: Promise<PasswordResetState> | undefined;
  private pendingToken: string | undefined;
  private state: PasswordResetState | undefined;

  exchange = (token: string): Promise<PasswordResetState> => {
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

  private async confirm(token: string): Promise<PasswordResetState> {
    try {
      const response = await confirmPasswordReset({ token });
      this.state = { resetToken: response.reset_token, status: "confirmed" };
    } catch (error) {
      this.state = {
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm this password reset link. Request a new link.",
        status: "error",
      };
    }

    return this.state;
  }
}

function createPasswordResetClient() {
  return new PasswordResetClient();
}

export type { PasswordResetState };
export { createPasswordResetClient, PasswordResetClient };
