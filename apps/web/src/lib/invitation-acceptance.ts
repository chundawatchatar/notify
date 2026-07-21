import type { ApiInvitationPreviewResponse } from "@notify/api-client";
import { ApiRequestError, resolveInvitation } from "./api-client";

type InvitationAcceptanceState =
  | { preview: ApiInvitationPreviewResponse; status: "ready"; token: string }
  | { error: string; status: "retryable-error"; token: string }
  | { error: string; status: "error" };

class InvitationAcceptanceClient {
  private state: InvitationAcceptanceState | undefined;

  capture = async (token: string) => {
    try {
      const preview = await resolveInvitation({ token });
      this.state = { preview, status: "ready", token };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "This invitation link is invalid or expired.";

      this.state =
        error instanceof ApiRequestError && error.status === 400
          ? { error: message, status: "error" }
          : { error: message, status: "retryable-error", token };
    }

    return this.state;
  };

  getState = () => this.state;
  clear = () => {
    this.state = undefined;
  };
}

function createInvitationAcceptanceClient() {
  return new InvitationAcceptanceClient();
}

export type { InvitationAcceptanceState };
export { createInvitationAcceptanceClient, InvitationAcceptanceClient };
