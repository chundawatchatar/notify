import { describe, expect, it } from "vitest";
import { PasswordResetClient } from "@/lib/password-reset";
import { loadPasswordResetState } from "./forgot-password";

describe("forgot-password route", () => {
  it("keeps ordinary navigation synchronous when there is no reset token", () => {
    const result = loadPasswordResetState(new PasswordResetClient());

    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual({ passwordResetState: undefined });
  });
});
